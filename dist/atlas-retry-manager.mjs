/**
 * Reconstructed implementation, 2026-10-23. This is not a recovered historical
 * candidate. It has no game/save dependencies and never enumerates an atlas roster.
 */

export const ATLAS_RETRY_POLICY = Object.freeze({
  maxAttempts: 3,
  backoffMs: Object.freeze([500, 1500]),
  timeoutMs: 5000,
});

/** @typedef {{naturalWidth?: number, naturalHeight?: number, width?: number, height?: number}} AtlasImage */
/** @typedef {{signal: AbortSignal, attempt: number, generation: number}} LoadContext */
/** @typedef {(src: string, context: LoadContext) => AtlasImage | PromiseLike<AtlasImage>} AtlasLoader */
/** @typedef {'idle'|'loading'|'backoff'|'paused'|'ready'|'failed'|'disposed'} AtlasStatus */
/** @typedef {{name: string, message: string}} ErrorSummary */
/** @typedef {{src: string, width: number, height: number, status: AtlasStatus, attempts: number, generation: number, needed: boolean, image: AtlasImage|null, error: ErrorSummary|null, revision: number}} StatusSnapshot */
/** @typedef {{width: number, height: number, loader?: AtlasLoader}} RequestOptions */
/** @typedef {{setTimeout: (fn: () => void, ms: number) => any, clearTimeout: (id: any) => void, now?: () => number}} Timers */
/** @typedef {{loader?: AtlasLoader, timers?: Timers, isActive?: () => boolean}} ManagerOptions */
/** @typedef {{controller: AbortController, timeout: any, generation: number}} Attempt */
/** @typedef {{src: string, width: number, height: number, loader: AtlasLoader, status: AtlasStatus, attempts: number, generation: number, needed: boolean, image: AtlasImage|null, error: ErrorSummary|null, revision: number, promise: Promise<AtlasImage|null>, resolve: ((image: AtlasImage|null) => void)|null, attempt: Attempt|null, retryTimer: any, retryDue: number, remainingDelay: number}} Entry */

/** @param {unknown} error @returns {ErrorSummary} */
function errorSummary(error) {
  return Object.freeze({
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
  });
}

/**
 * Browser Image loader. All image and abort listeners are detached on every exit.
 * Timeout ownership stays with the manager. Aborting is best-effort network
 * cancellation; correctness does not depend on the browser actually cancelling.
 * @type {AtlasLoader}
 */
export function loadAtlasImage(src, {signal}) {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('A browser Image constructor or injected loader is required'));
      return;
    }
    const image = new Image();
    let settled = false;
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      try { image.removeAttribute('src'); } catch { /* handler cleanup already completed */ }
      const error = new Error('Atlas load aborted');
      error.name = 'AbortError';
      reject(error);
    };
    image.onload = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Atlas image load failed: ${src}`));
    };
    signal.addEventListener('abort', onAbort, {once: true});
    if (signal.aborted) onAbort();
    else {
      try { image.src = src; }
      catch (error) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      }
    }
  });
}

/**
 * Exact URL-string identity dedupes requests. Only request() creates entries.
 * Every automatic cycle is bounded to three loader invocations, including any
 * invocation interrupted by pause/release. Only retryFailed() resets that budget.
 * @param {ManagerOptions} [options]
 */
export function createAtlasRetryManager(options = {}) {
  const defaultLoader = options.loader ?? loadAtlasImage;
  if (typeof defaultLoader !== 'function') throw new TypeError('loader must be a function');
  const timers = options.timers ?? {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: id => globalThis.clearTimeout(id),
    now: () => Date.now(),
  };
  const now = timers.now ?? (() => Date.now());
  const isActive = options.isActive ?? (() => true);
  /** @type {Map<string, Entry>} */
  const entries = new Map();
  /** @type {Set<(status: StatusSnapshot, revision: number) => void>} */
  const subscribers = new Set();
  /** @type {Set<string>} */
  const pauseReasons = new Set();
  /** @type {Set<() => void>} */
  const lifecycleCleanups = new Set();
  /** @type {StatusSnapshot[]} */
  const notificationQueue = [];
  let notifying = false;
  let revision = 0;
  let disposed = false;

  const active = () => !disposed && pauseReasons.size === 0 && Boolean(isActive());
  /** @param {Entry} entry @returns {StatusSnapshot} */
  const snapshot = entry => Object.freeze({
    src: entry.src, width: entry.width, height: entry.height,
    status: entry.status, attempts: entry.attempts, generation: entry.generation,
    needed: entry.needed, image: entry.image, error: entry.error,
    revision: entry.revision,
  });
  /** @param {Entry} entry */
  const notify = entry => {
    entry.revision = ++revision;
    notificationQueue.push(snapshot(entry));
    if (notifying) return;
    notifying = true;
    try {
      while (notificationQueue.length) {
        const value = notificationQueue.shift();
        for (const listener of [...subscribers]) {
          if (!subscribers.has(listener)) continue;
          // Reentrant updates are queued to keep observers' revisions ordered.
          // A renderer exception must not turn a successful load into failure.
          try { listener(value, value.revision); } catch { /* observer isolation */ }
        }
      }
    } finally {
      notifying = false;
    }
  };
  /** @param {Entry} entry */
  const beginPromise = entry => {
    entry.promise = new Promise(resolve => { entry.resolve = resolve; });
  };
  /** @param {Entry} entry @param {AtlasImage|null} value */
  const settle = (entry, value) => {
    const resolve = entry.resolve;
    entry.resolve = null;
    resolve?.(value);
  };
  /** @param {Entry} entry @param {boolean} [abort] */
  const clearAttempt = (entry, abort = false) => {
    const attempt = entry.attempt;
    // Invalidate before abort: custom loaders may reject synchronously on abort.
    entry.attempt = null;
    if (attempt) {
      timers.clearTimeout(attempt.timeout);
      if (abort) attempt.controller.abort();
    }
  };
  /** @param {Entry} entry */
  const clearRetry = entry => {
    if (entry.retryTimer !== null) {
      timers.clearTimeout(entry.retryTimer);
      entry.retryTimer = null;
    }
  };
  /** @param {Entry} entry */
  const failTerminal = entry => {
    clearAttempt(entry, true);
    clearRetry(entry);
    entry.status = 'failed';
    entry.remainingDelay = 0;
    // Settle before notify so a subscriber can safely initiate a manual new cycle.
    settle(entry, null);
    notify(entry);
  };
  /** @param {Entry} entry */
  const pauseEntry = entry => {
    if (!['loading', 'backoff', 'idle'].includes(entry.status)) return;
    if (entry.status === 'backoff') {
      entry.remainingDelay = Math.max(0, entry.retryDue - now());
    } else if (entry.status === 'loading') {
      entry.remainingDelay = ATLAS_RETRY_POLICY.backoffMs[entry.attempts - 1] ?? 0;
      entry.error = errorSummary(Object.assign(new Error('Atlas load paused'), {name: 'AbortError'}));
    }
    clearRetry(entry);
    clearAttempt(entry, true);
    entry.status = 'paused';
    notify(entry);
  };
  /** @param {Entry} entry @param {Attempt} token */
  const current = (entry, token) => !disposed && entry.status === 'loading'
    && entry.attempt === token && entry.generation === token.generation;

  /** @param {Entry} entry */
  function schedule(entry) {
    if (disposed || entry.status === 'ready' || entry.status === 'failed') return;
    if (!entry.needed || !active()) {
      if (entry.status !== 'paused') { entry.status = 'paused'; notify(entry); }
      return;
    }
    if (entry.attempts >= ATLAS_RETRY_POLICY.maxAttempts) { failTerminal(entry); return; }
    if (entry.remainingDelay > 0) {
      const delay = entry.remainingDelay;
      entry.status = 'backoff';
      entry.retryDue = now() + delay;
      const generation = entry.generation;
      const retryTimer = timers.setTimeout(() => {
        if (entry.retryTimer !== retryTimer) return;
        entry.retryTimer = null;
        if (disposed || entry.generation !== generation || entry.status !== 'backoff') return;
        entry.remainingDelay = 0;
        start(entry);
      }, delay);
      entry.retryTimer = retryTimer;
      notify(entry);
    } else start(entry);
  }

  /** @param {Entry} entry @param {Attempt} token @param {unknown} error */
  function failAttempt(entry, token, error) {
    if (!current(entry, token)) return;
    clearAttempt(entry, true);
    entry.error = errorSummary(error);
    if (entry.attempts >= ATLAS_RETRY_POLICY.maxAttempts) { failTerminal(entry); return; }
    entry.remainingDelay = ATLAS_RETRY_POLICY.backoffMs[entry.attempts - 1];
    schedule(entry);
  }

  /** @param {Entry} entry */
  function start(entry) {
    if (disposed || entry.status === 'ready' || entry.status === 'failed') return;
    if (!entry.needed || !active()) { pauseEntry(entry); return; }
    if (entry.attempts >= ATLAS_RETRY_POLICY.maxAttempts) { failTerminal(entry); return; }
    clearRetry(entry);
    const token = {controller: new AbortController(), timeout: null, generation: entry.generation};
    entry.attempt = token;
    entry.status = 'loading';
    entry.remainingDelay = 0;
    entry.attempts += 1;
    token.timeout = timers.setTimeout(() => {
      const error = new Error(`Atlas load timed out after ${ATLAS_RETRY_POLICY.timeoutMs} ms`);
      error.name = 'TimeoutError';
      failAttempt(entry, token, error);
    }, ATLAS_RETRY_POLICY.timeoutMs);
    notify(entry);
    // A listener can pause/dispose/release during the loading notification.
    if (!current(entry, token)) return;
    let result;
    try {
      result = entry.loader(entry.src, {
        signal: token.controller.signal,
        attempt: entry.attempts,
        generation: entry.generation,
      });
    } catch (error) { failAttempt(entry, token, error); return; }
    Promise.resolve(result).then(image => {
      if (!current(entry, token)) return;
      if (!entry.needed || !active()) { pauseEntry(entry); return; }
      let width, height;
      try {
        width = image?.naturalWidth ?? image?.width;
        height = image?.naturalHeight ?? image?.height;
      } catch (error) { failAttempt(entry, token, error); return; }
      if (width !== entry.width || height !== entry.height) {
        failAttempt(entry, token, new Error(
          `Atlas dimensions mismatch: expected ${entry.width}x${entry.height}, got ${width}x${height}`,
        ));
        return;
      }
      clearAttempt(entry);
      entry.status = 'ready';
      entry.image = image;
      entry.error = null;
      settle(entry, image);
      notify(entry);
    }, error => failAttempt(entry, token, error));
  }

  /** @param {string} src @param {RequestOptions} requestOptions */
  function request(src, requestOptions) {
    if (typeof src !== 'string' || !src.trim()) throw new TypeError('A nonempty atlas URL is required');
    const {width, height, loader = defaultLoader} = requestOptions ?? {};
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new TypeError('Positive integer atlas dimensions are required');
    }
    if (typeof loader !== 'function') throw new TypeError('loader must be a function');
    let entry = entries.get(src);
    if (entry) {
      if (entry.width !== width || entry.height !== height) {
        throw new TypeError(`Conflicting dimensions for shared atlas URL: ${src}`);
      }
      if (disposed) return entry.status === 'ready' ? entry.promise : Promise.resolve(null);
      if (!entry.needed) {
        entry.needed = true;
        if (entry.status === 'paused') schedule(entry);
        else notify(entry);
      }
      return entry.promise;
    }
    if (disposed) return Promise.resolve(null);
    entry = {
      src, width, height, loader, status: 'idle', attempts: 0, generation: 1,
      needed: true, image: null, error: null, revision: 0,
      promise: Promise.resolve(null), resolve: null, attempt: null,
      retryTimer: null, retryDue: 0, remainingDelay: 0,
    };
    beginPromise(entry);
    entries.set(src, entry);
    schedule(entry);
    return entry.promise;
  }

  /**
   * Start a fresh bounded cycle for failed, still-needed entries only.
   * @param {string} [src] @returns {Promise<AtlasImage|null>[]}
   */
  function retryFailed(src) {
    if (disposed) return [];
    const targets = [...entries.values()].filter(entry =>
      entry.status === 'failed' && entry.needed && (src === undefined || entry.src === src));
    const promises = [];
    for (const entry of targets) {
      // A subscriber may synchronously retry another target during an earlier notify.
      if (entry.status !== 'failed' || !entry.needed) continue;
      entry.generation += 1;
      entry.attempts = 0;
      entry.error = null;
      entry.status = 'idle';
      entry.remainingDelay = 0;
      beginPromise(entry);
      promises.push(entry.promise);
      schedule(entry);
    }
    return promises;
  }

  /** @param {string} src @param {boolean} needed */
  function setNeeded(src, needed) {
    const entry = entries.get(src);
    if (!entry || disposed || entry.needed === Boolean(needed)) return;
    entry.needed = Boolean(needed);
    if (!entry.needed && ['loading', 'backoff', 'idle'].includes(entry.status)) pauseEntry(entry);
    else if (entry.needed && entry.status === 'paused') schedule(entry);
    else notify(entry);
  }

  function syncActivity() {
    if (disposed) return;
    const canRun = active();
    for (const entry of entries.values()) {
      if (!canRun || !entry.needed) pauseEntry(entry);
      else if (entry.status === 'paused') schedule(entry);
    }
  }
  /** @param {string} [reason] */
  function pause(reason = 'manual') { if (!disposed) { pauseReasons.add(reason); syncActivity(); } }
  /** @param {string} [reason] */
  function resume(reason = 'manual') { if (!disposed) { pauseReasons.delete(reason); syncActivity(); } }

  /** @param {(status: StatusSnapshot, revision: number) => void} listener */
  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('subscriber must be a function');
    if (!disposed) subscribers.add(listener);
    return () => subscribers.delete(listener);
  }

  /**
   * No global browser listeners are installed until this method is called.
   * @param {{document?: Pick<Document, 'hidden'|'addEventListener'|'removeEventListener'>, window?: Pick<Window, 'addEventListener'|'removeEventListener'>}} [targets]
   */
  function bindLifecycle(targets = {}) {
    if (disposed) return () => {};
    const documentTarget = targets.document ?? globalThis.document;
    const windowTarget = targets.window ?? globalThis.window;
    // Unique reasons prevent one lifecycle binding from resuming another's pause.
    const key = `lifecycle-${++lifecycleSequence}`;
    const hiddenReason = `${key}:hidden`;
    const pagehideReason = `${key}:pagehide`;
    const onVisibility = () => {
      if (documentTarget?.hidden) pause(hiddenReason);
      else resume(hiddenReason);
    };
    const onPageHide = () => pause(pagehideReason);
    const onPageShow = () => { onVisibility(); resume(pagehideReason); };
    documentTarget?.addEventListener('visibilitychange', onVisibility);
    windowTarget?.addEventListener('pagehide', onPageHide);
    windowTarget?.addEventListener('pageshow', onPageShow);
    let attached = true;
    const cleanup = () => {
      if (!attached) return;
      attached = false;
      documentTarget?.removeEventListener('visibilitychange', onVisibility);
      windowTarget?.removeEventListener('pagehide', onPageHide);
      windowTarget?.removeEventListener('pageshow', onPageShow);
      lifecycleCleanups.delete(cleanup);
      pauseReasons.delete(hiddenReason);
      pauseReasons.delete(pagehideReason);
      syncActivity();
    };
    lifecycleCleanups.add(cleanup);
    onVisibility();
    return cleanup;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const cleanup of [...lifecycleCleanups]) cleanup();
    for (const entry of entries.values()) {
      clearRetry(entry);
      clearAttempt(entry, true);
      if (!['ready', 'failed'].includes(entry.status)) {
        entry.status = 'disposed';
        settle(entry, null);
        notify(entry);
      }
    }
    subscribers.clear();
    pauseReasons.clear();
  }

  return Object.freeze({
    request, retryFailed, setNeeded, pause, resume, syncActivity, subscribe,
    bindLifecycle, dispose,
    /** @param {string} src */
    getStatus: src => { const entry = entries.get(src); return entry ? snapshot(entry) : null; },
    getStatuses: () => Object.freeze([...entries.values()].map(snapshot)),
    getRevision: () => revision,
    isDisposed: () => disposed,
  });
}

let lifecycleSequence = 0;

/** @param {ReturnType<typeof createAtlasRetryManager>} manager @param {Parameters<ReturnType<typeof createAtlasRetryManager>['bindLifecycle']>[0]} [targets] */
export function bindAtlasPageLifecycle(manager, targets) {
  return manager.bindLifecycle(targets);
}
