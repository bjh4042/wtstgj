// Owner-only selection lease for the unmodified original center controller.
// No geometry, canonical command, clock, party-size or animation rules live here.
const brands=new WeakSet();
export const isS4OwnedCenterHealBinding=value=>brands.has(value);
export function createS4OwnedCenterHealBinding({getWorld,readSelection,canHeal,acquireVisualLock,canCommit,heal}){
 for(const fn of [getWorld,readSelection,canHeal,acquireVisualLock,canCommit,heal])if(typeof fn!=='function')throw Error('S4_CENTER_BINDING_DEPENDENCIES');
 let disposed=false,visual=null,committing=null,completion=null,commitWindow=null,lastCapture=null;
 const captures=new WeakMap();
 const snapshot=w=>JSON.stringify(w.snapshot());
 const read=()=>{const s=readSelection();return s===null?null:JSON.stringify(s)};
 function current(token,w){const c=captures.get(token);return!!c&&!disposed&&w===getWorld()&&w===c.world&&read()===c.source&&(committing?.world===w&&committing.source===c.source&&committing.before===c.canonical||snapshot(w)===c.canonical||completion?.world===w&&completion.source===c.source&&completion.before===c.canonical&&snapshot(w)===completion.after)}
 const binding=Object.freeze({pointId:'heal:S4',
  canHeal:()=>!disposed&&!visual&&!committing&&canHeal()===true,
  capture(w){if(disposed||w!==getWorld()||!binding.canHeal())throw Error('S4_CENTER_CAPTURE');const source=read();if(source===null)throw Error('S4_CENTER_CAPTURE');const token=Object.freeze({}),c={world:w,source,canonical:snapshot(w)};captures.set(token,c);lastCapture=token;return token},
  isCurrent:current,stop(){},
  acquireVisualLock(){if(disposed||visual||committing||!current(lastCapture,getWorld()))throw Error('S4_CENTER_VISUAL_NOT_READY');lastCapture=null;const release=acquireVisualLock();if(typeof release!=='function')throw Error('S4_CENTER_VISUAL_RELEASE');const lease={release,world:getWorld(),source:read(),canonical:snapshot(getWorld())};visual=lease;let done=false;return()=>{if(done)return;done=true;if(visual===lease){visual=null;release();commitWindow=lease;queueMicrotask(()=>{if(commitWindow===lease)commitWindow=null})}}},
  async heal(transactionId){const window=commitWindow;commitWindow=null;const w=getWorld(),source=read(),before=snapshot(w);if(disposed||committing||visual||!window||window.world!==w||window.source!==source||window.canonical!==before||canCommit()!==true||source===null)throw Error('S4_CENTER_HEAL_NOT_READY');committing={world:w,source,before};try{const result=await heal(transactionId);if(!disposed&&w===getWorld()&&read()===source){completion={world:w,source,before,after:snapshot(w)}}return result}finally{committing=null}},
  dispose(){if(disposed)return;disposed=true;const lease=visual;visual=null;lease?.release();completion=null;commitWindow=null}
 });brands.add(binding);return binding;
}
