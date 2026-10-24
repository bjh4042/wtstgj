import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';

const {parseHTML}=createRequire(import.meta.url)('linkedom');
const source=readFileSync(new URL('../dist/ui/atlas-recovery-status.mjs',import.meta.url),'utf8');
const executable=source.replace(/^import .*;\n/gm,'').replace('export function installAtlasRecoveryStatus','function installAtlasRecoveryStatus');
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};

function fixture({markup='',states=[{status:'failed',needed:true}],retry=null,load=null,repaint=null}={}){
 const {document,window}=parseHTML('<html><body>'+markup+'</body></html>');
 let visibility='visible',listener=null;
 Object.defineProperty(document,'visibilityState',{get:()=>visibility});
 const counts={retry:0,load:0,repaint:0,invalidations:0,unsubscribes:0,disconnects:0,observerCalls:0};
 const listeners=new Map();
 function track(target,label){
  const add=target.addEventListener.bind(target),remove=target.removeEventListener.bind(target);
  target.addEventListener=(type,fn,options)=>{const key=label+':'+type;if(!listeners.has(key))listeners.set(key,new Set());listeners.get(key).add(fn);return add(type,fn,options)};
  target.removeEventListener=(type,fn,options)=>{listeners.get(label+':'+type)?.delete(fn);return remove(type,fn,options)};
 }
 track(document,'document');track(window,'window');
 const win={
  addEventListener:window.addEventListener.bind(window),removeEventListener:window.removeEventListener.bind(window),
  MutationObserver:class{
   constructor(callback){this.observer=new window.MutationObserver(()=>{counts.observerCalls++;assert.ok(counts.observerCalls<100,'mount mutation feedback loop');callback()})}
   observe(...args){this.observer.observe(...args)}
   disconnect(){counts.disconnects++;this.observer.disconnect()}
  },
  setInterval(){assert.fail('production recovery must not poll')},
 };
 const bindings={
  approvedAtlasStatuses:()=>states,
  retryFailedApprovedAtlases:()=>{counts.retry++;return retry?.()??Promise.resolve()},
  subscribeApprovedAtlases:fn=>{listener=fn;return()=>{counts.unsubscribes++;listener=null}},
  loadApprovedPlayers:()=>{counts.load++;return load?.()??Promise.resolve()},
  repaintApprovedIntroAfterRetry:options=>{counts.repaint++;return repaint?.(options)??Promise.resolve(true)},
  invalidateApprovedIntroRepaints:()=>counts.invalidations++,
 };
 const install=Function(...Object.keys(bindings),executable+'\nreturn installAtlasRecoveryStatus;')(...Object.values(bindings));
 const control=install(document,win),button=control.box.querySelector('button');
 function send(target,type,values={}){const event=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(event,values);target.dispatchEvent(event);return event}
 return {document,window,control,button,counts,listeners,send,
  states(next){states=next;listener?.()},
  visibility(next){visibility=next;send(document,'visibilitychange')},
  hide(persisted){send(window,'pagehide',{persisted})},show(){send(window,'pageshow',{persisted:true})},
 };
}

test('ordinary recovery is failure-only, readable, in-flow, and has no QA/storage/polling dependencies',async()=>{
 assert.doesNotMatch(source,/approvedPlayerDrawStatus|dataset|localStorage|sessionStorage|setInterval|setTimeout|\.focus\s*\(|qa\//);
 const f=fixture({states:[]});
 assert.equal(f.control.box.tagName,'DIV');assert.equal(f.control.box.hidden,true);
 assert.equal(f.control.box.id,'ordinary-atlas-recovery-status');
 assert.equal(f.control.box.getAttribute('role'),'status');
 assert.equal(f.button.type,'button');assert.equal(f.button.style.minHeight,'44px');
 assert.equal(f.control.box.style.font,'16px/1.5 system-ui,sans-serif');
 assert.match(f.control.box.textContent,/인물 이미지.*연결.*다시/);
 assert.notEqual(f.control.box.style.position,'absolute');assert.notEqual(f.control.box.style.position,'fixed');
 for(const status of ['idle','loading','backoff','ready','disposed']){f.states([{status,needed:true}]);assert.equal(f.control.box.hidden,true,status)}
 for(const status of ['failed','paused']){f.states([{status,needed:true}]);assert.equal(f.control.box.hidden,false,status)}
 f.states([{status:'failed',needed:false}]);assert.equal(f.control.box.hidden,true);
 await f.button.onclick();assert.equal(f.counts.retry,0,'hidden healthy control cannot create a retry cycle');
 f.control.dispose();
});

test('mount follows the newest open dialog, then canonical header, then body without focus or mutation loops',async()=>{
 const f=fixture({markup:'<main id="canonical-world"><header id="header"></header><div class="world-play"><canvas></canvas></div><aside></aside></main><dialog id="first" open></dialog><dialog id="latest" open></dialog>'});
 assert.equal(f.control.box.parentElement.id,'latest');
 f.document.getElementById('latest').removeAttribute('open');await flush();assert.equal(f.control.box.parentElement.id,'first');
 f.document.getElementById('first').removeAttribute('open');await flush();assert.equal(f.control.box.parentElement.id,'header');
 f.document.getElementById('header').remove();await flush();assert.equal(f.control.box.parentElement.id,'canonical-world');
 assert.equal(f.control.box.closest('.world-play,aside'),null);
 f.document.getElementById('canonical-world').remove();await flush();assert.equal(f.control.box.parentElement,f.document.body);
 const before=f.counts.observerCalls;await flush();assert.equal(f.counts.observerCalls,before,'settled observer stays idle');
 assert.equal(f.counts.repaint,0,'mounting alone never repaints or shifts focus');f.control.dispose();
});

test('button keydown isolates game input without canceling native Enter/Space/Tab; keyup releases propagate',()=>{
 const f=fixture();let keydowns=0,keyups=0;
 f.document.addEventListener('keydown',()=>keydowns++);f.document.addEventListener('keyup',()=>keyups++);
 for(const key of ['Enter',' ','Tab','ArrowLeft','w','z']){
  const event=f.send(f.button,'keydown',{key});assert.equal(event.defaultPrevented,false,key);
  f.send(f.button,'keyup',{key});
 }
 assert.equal(keydowns,0);assert.equal(keyups,6);f.control.dispose();
});

test('manual retry awaits each production API in order and suppresses repeated activation',async()=>{
 const retry=deferred(),load=deferred(),repaint=deferred();let active;
 const f=fixture({retry:()=>retry.promise,load:()=>load.promise,repaint:options=>{active=options.isActive;return repaint.promise}});
 const click=f.button.onclick();assert.equal(f.button.disabled,true);
 await f.button.onclick();assert.deepEqual([f.counts.retry,f.counts.load,f.counts.repaint],[1,0,0]);
 retry.resolve();await flush();assert.deepEqual([f.counts.retry,f.counts.load,f.counts.repaint],[1,1,0]);
 load.resolve();await flush();assert.deepEqual([f.counts.retry,f.counts.load,f.counts.repaint],[1,1,1]);assert.equal(active(),true);
 f.states([{status:'ready',needed:true}]);repaint.resolve();await click;
 assert.equal(f.control.box.hidden,true);assert.equal(f.button.disabled,false);f.control.dispose();assert.equal(active(),false);
});

for(const stage of ['retry','load','repaint'])for(const interruption of ['dispose','hidden','persisted','terminal']){
 test(`pending ${stage} is guarded across ${interruption}`,async()=>{
  const gate=deferred();let active;
  const f=fixture({[stage]:options=>{active=options?.isActive;return gate.promise}});
  const click=f.button.onclick();await flush();
  assert.equal(f.counts[stage],1);
  if(interruption==='dispose')f.control.dispose();
  if(interruption==='hidden')f.visibility('hidden');
  if(interruption==='persisted')f.hide(true);
  if(interruption==='terminal')f.hide(false);
  if(active)assert.equal(active(),false);
  gate.resolve();await click;await flush();
  assert.equal(f.counts.load,stage==='retry'?0:1);
  assert.equal(f.counts.repaint,stage==='repaint'?1:0);
  if(['dispose','terminal'].includes(interruption)){
   assert.equal(f.control.box.isConnected,false);assert.equal(f.counts.unsubscribes,1);assert.equal(f.counts.disconnects,1);
   assert.ok([...f.listeners.values()].every(value=>value.size===0));
  }else{assert.equal(f.control.box.hidden,true);assert.equal(f.counts.unsubscribes,0)}
  f.control.dispose();assert.equal(f.counts.unsubscribes,1);assert.equal(f.counts.disconnects,1);
 });
}

test('visibility and repeated persisted Back retain and resume one control; terminal pagehide cleans once',async()=>{
 const f=fixture();const box=f.control.box,button=f.button;
 const sizes=()=>Object.fromEntries([...f.listeners].map(([key,value])=>[key,value.size]));
 const listeners=sizes();
 for(let i=0;i<3;i++){
  f.hide(true);assert.equal(box.hidden,true);assert.equal(box.isConnected,true);
  f.visibility('visible');await flush();assert.equal(f.counts.repaint,i,'visibility alone cannot resume a persisted page');
  f.show();await flush();assert.equal(f.counts.repaint,i+1);assert.equal(box.hidden,false);
  assert.equal(f.control.box,box);assert.equal(f.button,button);assert.deepEqual(sizes(),listeners);
 }
 f.visibility('hidden');assert.equal(box.hidden,true);f.visibility('visible');await flush();assert.equal(f.counts.repaint,4);
 f.hide(false);f.hide(false);f.show();f.control.dispose();
 assert.equal(f.counts.unsubscribes,1);assert.equal(f.counts.disconnects,1);assert.equal(box.isConnected,false);
 assert.ok([...f.listeners.values()].every(value=>value.size===0));assert.equal(f.counts.repaint,4);
});

for(const mode of ['manual','dispose','hidden','terminal','oldcanvas','closed','current','hiddenreturn','healthyreturn','persistedreturn']){
 test('actual intro renderer and real bounded atlas manager: '+mode,()=>{
  const result=spawnSync(process.execPath,['tests/fixtures/ordinary-retry/intro-lifecycle.mjs',mode],{encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/pendingImages/);
 });
}
