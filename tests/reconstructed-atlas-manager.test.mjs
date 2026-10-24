import test from 'node:test';
import assert from 'node:assert/strict';
import {ATLAS_RETRY_POLICY, createAtlasRetryManager, loadAtlasImage} from '../dist/atlas-retry-manager.mjs';

const dimensions = Object.freeze({width: 96, height: 64});
const goodImage = () => ({naturalWidth: 96, naturalHeight: 64});
const flush = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };

class Clock {
  time = 0;
  sequence = 0;
  tasks = new Map();
  timers = {
    now: () => this.time,
    setTimeout: (fn, ms) => {
      const id = ++this.sequence;
      this.tasks.set(id, {fn, due: this.time + ms});
      return id;
    },
    clearTimeout: id => this.tasks.delete(id),
  };
  async advance(ms) {
    await flush();
    const until = this.time + ms;
    for (;;) {
      const next = [...this.tasks].filter(([, task]) => task.due <= until)
        .sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      if (!next) break;
      const [id, task] = next;
      this.tasks.delete(id);
      this.time = task.due;
      task.fn();
      await flush();
    }
    this.time = until;
    await flush();
  }
}

function setup(options = {}) {
  const clock = new Clock();
  const calls = [];
  const loader = (src, context) => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    calls.push({src, ...context, resolve, reject, at: clock.time});
    return promise; // Deliberately ignores abort to exercise stale completion guards.
  };
  return {clock, calls, manager: createAtlasRetryManager({timers: clock.timers, loader, ...options})};
}

async function exhaustFailures(harness, src = 'one.png') {
  const {manager, calls, clock} = harness;
  const pending = manager.request(src, dimensions);
  calls.at(-1).reject(new Error('first failure'));
  await flush();
  await clock.advance(500);
  calls.at(-1).reject(new Error('second failure'));
  await flush();
  await clock.advance(1500);
  calls.at(-1).reject(new Error('terminal failure'));
  await flush();
  assert.equal(await pending, null);
  assert.equal(manager.getStatus(src).status, 'failed');
  return pending;
}

test('policy is fixed: 3 attempts, 500/1500 ms backoff, 5 second timeout', () => {
  assert.deepEqual(ATLAS_RETRY_POLICY, {maxAttempts: 3, backoffMs: [500, 1500], timeoutMs: 5000});
  assert.ok(Object.isFrozen(ATLAS_RETRY_POLICY.backoffMs));
});

test('actual failure → terminal failure → manual retry success; ready cache is permanent', async () => {
  const h = setup();
  await exhaustFailures(h);
  assert.deepEqual(h.calls.map(call => [call.at, call.attempt, call.generation]), [[0, 1, 1], [500, 2, 1], [2000, 3, 1]]);
  assert.equal(await h.manager.request('one.png', dimensions), null);
  await h.clock.advance(100000);
  assert.equal(h.calls.length, 3);
  const pending = h.manager.retryFailed();
  assert.equal(pending.length, 1);
  assert.equal(h.calls[3].generation, 2);
  assert.equal(h.calls[3].attempt, 1);
  const image = goodImage();
  h.calls[3].resolve(image);
  assert.deepEqual(await Promise.all(pending), [image]);
  assert.equal(h.manager.getStatus('one.png').status, 'ready');
  const cached = h.manager.request('one.png', dimensions);
  for (let i = 0; i < 30; i += 1) assert.equal(h.manager.request('one.png', dimensions), cached);
  assert.equal(await cached, image);
  assert.deepEqual(h.manager.retryFailed(), []);
  h.manager.pause();
  h.manager.setNeeded('one.png', false);
  h.manager.resume();
  assert.equal(h.manager.getStatus('one.png').image, image);
  assert.equal(h.calls.length, 4);
  assert.equal(h.clock.tasks.size, 0);
});

test('simultaneous requests dedupe by URL, including different consumers/loaders', async () => {
  const {manager, calls, clock} = setup();
  const a = manager.request('same.png', dimensions);
  const b = manager.request('same.png', {...dimensions, loader: () => { throw Error('must not run'); }});
  assert.equal(a, b);
  assert.equal(calls.length, 1);
  const image = goodImage();
  calls[0].resolve(image);
  assert.equal(await a, image);
  assert.equal(await b, image);
  assert.equal(manager.getStatuses().length, 1);
  assert.equal(clock.tasks.size, 0);
});

test('a hanging loader times out, cleans signals and terminates after exactly 3 calls', async () => {
  const {manager, calls, clock} = setup();
  const result = manager.request('hang.png', dimensions);
  await clock.advance(4999);
  assert.equal(manager.getStatus('hang.png').status, 'loading');
  await clock.advance(1);
  assert.equal(calls[0].signal.aborted, true);
  assert.equal(manager.getStatus('hang.png').status, 'backoff');
  await clock.advance(11999);
  assert.equal(manager.getStatus('hang.png').status, 'loading');
  await clock.advance(1);
  assert.equal(await result, null);
  assert.deepEqual(calls.map(call => call.at), [0, 5500, 12000]);
  assert.ok(calls.every(call => call.signal.aborted));
  assert.equal(manager.getStatus('hang.png').error.name, 'TimeoutError');
  await clock.advance(100000);
  assert.equal(calls.length, 3);
  assert.equal(clock.tasks.size, 0);
});

test('wrong natural dimensions fail validation even if CSS dimensions are correct', async () => {
  const {manager, calls, clock} = setup();
  const pending = manager.request('bad.png', dimensions);
  calls[0].resolve({naturalWidth: 0, naturalHeight: 0, ...dimensions});
  await flush();
  assert.equal(manager.getStatus('bad.png').status, 'backoff');
  assert.match(manager.getStatus('bad.png').error.message, /dimensions mismatch/);
  await clock.advance(500);
  calls[1].resolve({width: 96, height: 63});
  await flush();
  await clock.advance(1500);
  calls[2].resolve({width: 96, height: 64});
  assert.deepEqual(await pending, dimensions);
  assert.equal(manager.getStatus('bad.png').status, 'ready');
});

test('null and missing images consume bounded failures rather than becoming ready', async () => {
  const {manager, calls, clock} = setup();
  const pending = manager.request('missing.png', dimensions);
  calls[0].resolve(null);
  await flush();
  await clock.advance(500);
  calls[1].resolve({});
  await flush();
  await clock.advance(1500);
  calls[2].resolve(undefined);
  assert.equal(await pending, null);
  assert.equal(manager.getStatus('missing.png').status, 'failed');
});

test('synchronous loader errors follow the same bounded retry schedule', async () => {
  const clock = new Clock();
  let calls = 0;
  const manager = createAtlasRetryManager({timers: clock.timers, loader: () => { calls += 1; throw Error('sync'); }});
  const pending = manager.request('sync.png', dimensions);
  await clock.advance(2000);
  assert.equal(await pending, null);
  assert.equal(calls, 3);
  assert.equal(clock.tasks.size, 0);
});

test('an old timed-out attempt cannot overwrite a later successful attempt', async () => {
  const {manager, calls, clock} = setup();
  const pending = manager.request('race.png', dimensions);
  await clock.advance(5500);
  const image = goodImage();
  calls[1].resolve(image);
  assert.equal(await pending, image);
  const revision = manager.getRevision();
  calls[0].resolve({naturalWidth: 1, naturalHeight: 1});
  await flush();
  assert.equal(manager.getStatus('race.png').image, image);
  assert.equal(manager.getRevision(), revision);
  assert.equal(clock.tasks.size, 0);
});

test('a stale rejection cannot mutate ready or create a new retry', async () => {
  const {manager, calls, clock} = setup();
  const pending = manager.request('race.png', dimensions);
  await clock.advance(5500);
  calls[1].resolve(goodImage());
  await pending;
  const status = manager.getStatus('race.png');
  calls[0].reject(new Error('late failure'));
  await flush();
  await clock.advance(100000);
  assert.deepEqual(manager.getStatus('race.png'), status);
  assert.equal(calls.length, 2);
});

test('manual new generation excludes old timeout, success, and failure completions', async () => {
  const {manager, calls, clock} = setup();
  const pending = manager.request('generation.png', dimensions);
  await clock.advance(17000);
  assert.equal(await pending, null);
  const retries = manager.retryFailed('generation.png');
  const image = goodImage();
  calls[3].resolve(image);
  await Promise.all(retries);
  const revision = manager.getRevision();
  calls[0].resolve(goodImage());
  calls[1].reject(new Error('old rejected load'));
  calls[2].resolve({width: 1, height: 1});
  await flush();
  assert.equal(manager.getStatus('generation.png').image, image);
  assert.equal(manager.getStatus('generation.png').generation, 2);
  assert.equal(manager.getRevision(), revision);
});

test('initially inactive managers create no network or timer work until activated', async () => {
  let active = false;
  const {manager, calls, clock} = setup({isActive: () => active});
  const pending = manager.request('hidden.png', dimensions);
  assert.equal(manager.getStatus('hidden.png').status, 'paused');
  assert.equal(calls.length, 0);
  assert.equal(clock.tasks.size, 0);
  await clock.advance(100000);
  active = true;
  manager.syncActivity();
  assert.equal(calls.length, 1);
  calls[0].resolve(goodImage());
  await pending;
});

test('pause aborts work; resume waits bounded backoff and ignores stale completion', async () => {
  const {manager, calls, clock} = setup();
  const pending = manager.request('pause.png', dimensions);
  manager.pause();
  assert.equal(calls[0].signal.aborted, true);
  assert.equal(manager.getStatus('pause.png').status, 'paused');
  assert.equal(clock.tasks.size, 0);
  calls[0].resolve(goodImage());
  await clock.advance(100000);
  assert.equal(manager.getStatus('pause.png').image, null);
  manager.resume();
  await clock.advance(499);
  assert.equal(calls.length, 1);
  await clock.advance(1);
  calls[1].resolve(goodImage());
  assert.ok(await pending);
  assert.equal(calls.length, 2);
});

test('pausing a backoff freezes its remaining delay instead of running hidden', async () => {
  const {manager, calls, clock} = setup();
  const pending = manager.request('backoff.png', dimensions);
  calls[0].reject(new Error('offline'));
  await flush();
  await clock.advance(200);
  manager.pause();
  await clock.advance(30000);
  manager.resume();
  await clock.advance(299);
  assert.equal(calls.length, 1);
  await clock.advance(1);
  assert.equal(calls.length, 2);
  calls[1].resolve(goodImage());
  await pending;
});

test('pause/resume churn cannot exceed three invocations in one cycle', async () => {
  const {manager, calls, clock} = setup();
  const pending = manager.request('bounded.png', dimensions);
  for (let i = 0; i < 20; i += 1) {
    manager.pause();
    manager.resume();
    manager.request('bounded.png', dimensions);
    manager.retryFailed('not-requested.png');
    await clock.advance(1500);
  }
  assert.equal(await pending, null);
  assert.equal(calls.length, 3);
  assert.equal(manager.getStatus('bounded.png').status, 'failed');
  assert.equal(clock.tasks.size, 0);
});

test('only needed requests resume, and release does not clear the successful cache', async () => {
  const {manager, calls, clock} = setup();
  const a = manager.request('needed.png', dimensions);
  const b = manager.request('released.png', dimensions);
  manager.pause();
  manager.setNeeded('released.png', false);
  manager.resume();
  await clock.advance(500);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].src, 'needed.png');
  calls[2].resolve(goodImage());
  await a;
  manager.setNeeded('needed.png', false);
  assert.equal(manager.getStatus('needed.png').status, 'ready');
  await clock.advance(100000);
  assert.equal(calls.length, 3);
  assert.equal(manager.request('released.png', dimensions), b);
  await clock.advance(500);
  calls[3].resolve(goodImage());
  await b;
});

test('manual retry skips successful, active, unknown, and failed-but-no-longer-needed URLs', async () => {
  const h = setup();
  const ready = h.manager.request('ready.png', dimensions);
  h.calls[0].resolve(goodImage());
  await ready;
  await exhaustFailures(h, 'failed.png');
  const active = h.manager.request('active.png', dimensions);
  h.manager.setNeeded('failed.png', false);
  const count = h.calls.length;
  assert.deepEqual(h.manager.retryFailed(), []);
  assert.deepEqual(h.manager.retryFailed('unknown.png'), []);
  assert.equal(h.calls.length, count);
  h.manager.setNeeded('failed.png', true);
  assert.equal(h.calls.length, count);
  const retries = h.manager.retryFailed('failed.png');
  assert.equal(retries.length, 1);
  assert.deepEqual(h.manager.retryFailed(), []);
  h.calls.at(-1).resolve(goodImage());
  await Promise.all(retries);
  h.calls[count - 1].resolve(goodImage());
  await active;
});

test('revision/subscriptions expose immutable requested-only snapshots without cache-hit recursion', async () => {
  const {manager, calls} = setup();
  const observed = [];
  let recursiveRequests = 0;
  const unsubscribe = manager.subscribe((status, revision) => {
    observed.push([status.status, revision]);
    assert.equal(status.revision, revision);
    assert.ok(Object.isFrozen(status));
    if (status.status === 'ready') {
      recursiveRequests += 1;
      manager.request(status.src, dimensions);
    }
  });
  manager.subscribe(() => { throw new Error('renderer error must be isolated'); });
  assert.equal(manager.getRevision(), 0);
  assert.deepEqual(manager.getStatuses(), []);
  assert.equal(manager.getStatus('unrequested.png'), null);
  const pending = manager.request('observed.png', dimensions);
  calls[0].resolve(goodImage());
  await pending;
  assert.deepEqual(observed, [['loading', 1], ['ready', 2]]);
  assert.equal(recursiveRequests, 1);
  unsubscribe();
  manager.setNeeded('observed.png', false);
  assert.equal(manager.getRevision(), 3);
  assert.equal(observed.length, 2);
  assert.ok(Object.isFrozen(manager.getStatuses()));
  assert.equal(manager.getStatuses().length, 1);
});

test('dispose aborts loading, removes timers, settles pending, and ignores later work', async () => {
  const {manager, calls, clock} = setup();
  const ready = manager.request('ready.png', dimensions);
  const image = goodImage();
  calls[0].resolve(image);
  await ready;
  const a = manager.request('loading.png', dimensions);
  const b = manager.request('backoff.png', dimensions);
  calls[2].reject(new Error('retry later'));
  await flush();
  manager.dispose();
  manager.dispose();
  assert.deepEqual(await Promise.all([a, b]), [null, null]);
  assert.ok(calls[1].signal.aborted);
  assert.equal(clock.tasks.size, 0);
  const revision = manager.getRevision();
  calls[1].resolve(goodImage());
  manager.resume();
  manager.syncActivity();
  manager.setNeeded('loading.png', true);
  assert.deepEqual(manager.retryFailed(), []);
  assert.equal(await manager.request('new.png', dimensions), null);
  assert.equal(await manager.request('ready.png', dimensions), image);
  await clock.advance(100000);
  assert.equal(manager.getRevision(), revision);
  assert.equal(manager.getStatuses().length, 3);
  assert.equal(calls.length, 3);
});

class EventTargetFake {
  hidden = false;
  listeners = new Map();
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  emit(type) { for (const fn of [...(this.listeners.get(type) ?? [])]) fn(); }
  get count() { return [...this.listeners.values()].reduce((n, listeners) => n + listeners.size, 0); }
}

test('hidden/pagehide pause independently; pageshow resumes only needed URLs and removes all listeners', async () => {
  const {manager, calls, clock} = setup();
  const document = new EventTargetFake();
  const window = new EventTargetFake();
  const detach = manager.bindLifecycle({document, window});
  assert.equal(document.count + window.count, 3);
  const pending = manager.request('visible.png', dimensions);
  document.hidden = true;
  document.emit('visibilitychange');
  window.emit('pagehide');
  document.hidden = false;
  document.emit('visibilitychange');
  await clock.advance(100000);
  assert.equal(calls.length, 1);
  window.emit('pageshow');
  await clock.advance(500);
  assert.equal(calls.length, 2);
  calls[1].resolve(goodImage());
  await pending;
  manager.dispose();
  assert.equal(document.count + window.count, 0);
  detach();
  window.emit('pageshow');
  assert.equal(calls.length, 2);
});

test('manual pause is not cleared by visibility/pageshow or lifecycle detach', async () => {
  const {manager, calls, clock} = setup();
  const document = new EventTargetFake();
  const window = new EventTargetFake();
  const detach = manager.bindLifecycle({document, window});
  manager.pause();
  const pending = manager.request('manual.png', dimensions);
  window.emit('pageshow');
  detach();
  await clock.advance(100000);
  assert.equal(calls.length, 0);
  manager.resume();
  assert.equal(calls.length, 1);
  calls[0].resolve(goodImage());
  await pending;
});

test('no roster preload: status and retries never create entries; one demand means one URL', async () => {
  const {manager, calls} = setup();
  for (let i = 0; i < 214; i += 1) {
    assert.equal(manager.getStatus(`species-${i}.png`), null);
    manager.setNeeded(`species-${i}.png`, true);
    assert.deepEqual(manager.retryFailed(`species-${i}.png`), []);
  }
  assert.equal(calls.length, 0);
  const pending = manager.request('species-9.png', dimensions);
  calls[0].resolve(goodImage());
  await pending;
  assert.deepEqual(manager.getStatuses().map(status => status.src), ['species-9.png']);
  assert.equal(calls.length, 1);
});

test('invalid metadata and conflicting same-URL dimensions cannot poison ready cache', async () => {
  const {manager, calls} = setup();
  assert.throws(() => manager.request('', dimensions), TypeError);
  assert.throws(() => manager.request('bad.png', {width: 0, height: 64}), TypeError);
  assert.throws(() => manager.request('bad.png', {width: 96.5, height: 64}), TypeError);
  assert.equal(manager.getStatuses().length, 0);
  const pending = manager.request('same.png', dimensions);
  calls[0].resolve(goodImage());
  await pending;
  const revision = manager.getRevision();
  assert.throws(() => manager.request('same.png', {width: 1, height: 1}), /Conflicting dimensions/);
  assert.equal(manager.getStatus('same.png').status, 'ready');
  assert.equal(manager.getRevision(), revision);
  assert.equal(calls.length, 1);
});

test('browser Image loader detaches handlers on success, failure, and cancellation', async () => {
  const originalImage = globalThis.Image;
  const images = [];
  class ImageFake {
    onload = null;
    onerror = null;
    src = '';
    naturalWidth = 96;
    naturalHeight = 64;
    removed = false;
    constructor() { images.push(this); }
    removeAttribute(name) { assert.equal(name, 'src'); this.removed = true; }
  }
  globalThis.Image = ImageFake;
  try {
    for (const mode of ['success', 'error', 'abort', 'already-aborted']) {
      const controller = new AbortController();
      if (mode === 'already-aborted') controller.abort();
      const promise = loadAtlasImage('native.png', {signal: controller.signal, attempt: 1, generation: 1});
      const image = images.at(-1);
      const checked = mode === 'success' ? promise : assert.rejects(promise, mode === 'error' ? /failed/ : /aborted/);
      if (mode === 'success') image.onload();
      if (mode === 'error') image.onerror();
      if (mode === 'abort') controller.abort();
      await checked;
      assert.equal(image.onload, null);
      assert.equal(image.onerror, null);
      if (mode.includes('abort')) assert.equal(image.removed, true);
      if (mode === 'already-aborted') assert.equal(image.src, '');
      const removed = image.removed;
      controller.abort();
      assert.equal(image.removed, removed, 'successful/error completion removed abort listener');
    }
  } finally { globalThis.Image = originalImage; }
});

test('reentrant subscriber actions deliver increasing revisions without notification recursion', async () => {
  const {manager, calls, clock} = setup();
  const observed = [];
  let callbackDepth = 0;
  let maxDepth = 0;
  manager.subscribe(status => {
    callbackDepth += 1;
    maxDepth = Math.max(maxDepth, callbackDepth);
    if (status.status === 'failed') manager.retryFailed(status.src);
    callbackDepth -= 1;
  });
  manager.subscribe(status => observed.push(status.revision));
  const pending = manager.request('subscriber.png', dimensions);
  await clock.advance(17000);
  assert.equal(await pending, null);
  assert.equal(calls.length, 4);
  calls[3].resolve(goodImage());
  await flush();
  assert.equal(maxDepth, 1);
  assert.deepEqual(observed, [...observed].sort((a, b) => a - b));
  assert.equal(manager.getStatus('subscriber.png').status, 'ready');
});

test('a cancelled queued backoff callback cannot fire a newer retry early or clear its timer', async () => {
  const {manager, calls, clock} = setup();
  const pending = manager.request('timer-race.png', dimensions);
  calls[0].reject(new Error('offline'));
  await flush();
  const staleCallback = [...clock.tasks.values()][0].fn;
  manager.pause();
  manager.resume();
  staleCallback();
  assert.equal(calls.length, 1);
  assert.equal(clock.tasks.size, 1);
  await clock.advance(500);
  assert.equal(calls.length, 2);
  calls[1].resolve(goodImage());
  await pending;
  assert.equal(clock.tasks.size, 0);
});

test('dimension getter exceptions are contained as bounded load failures', async () => {
  const {manager, calls, clock} = setup();
  const pending = manager.request('getter.png', dimensions);
  calls[0].resolve({get naturalWidth() { throw new Error('bad image getter'); }});
  await flush();
  assert.equal(manager.getStatus('getter.png').status, 'backoff');
  assert.match(manager.getStatus('getter.png').error.message, /bad image getter/);
  await clock.advance(500);
  calls[1].resolve(goodImage());
  assert.ok(await pending);
});

test('isActive is checked before accepting completion even without an explicit lifecycle event', async () => {
  let active = true;
  const {manager, calls, clock} = setup({isActive: () => active});
  const pending = manager.request('activity.png', dimensions);
  active = false;
  calls[0].resolve(goodImage());
  await flush();
  assert.equal(manager.getStatus('activity.png').status, 'paused');
  assert.equal(clock.tasks.size, 0);
  active = true;
  manager.syncActivity();
  await clock.advance(500);
  calls[1].resolve(goodImage());
  assert.ok(await pending);
});
