// Isolated production-control copy of the reconstructed intro lifecycle fixture.
// It imports the actual renderer, player cache and retry manager, with only DOM,
// image network completion and time replaced. No artificial retry draw is called.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {APPROVED_ATLAS_DATA} from '../../../dist/approved-atlas-data.mjs';
const {parseHTML}=createRequire(import.meta.url)('linkedom');
const mode=process.argv[2],nativeTimeout=globalThis.setTimeout;
const {document,window}=parseHTML('<html><body><dialog open><canvas id="opening-world"></canvas></dialog></body></html>');
globalThis.document=document;globalThis.window=window;globalThis.MutationObserver=window.MutationObserver;
Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});
globalThis.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,[500,1500].includes(ms)?1:ms,...args);
let fail=mode!=='healthyreturn',paints=0;
const pending=[],requests=[];
globalThis.Image=class{
 set src(src){
  this._src=src;requests.push(src);
  const atlas=Object.values(APPROVED_ATLAS_DATA.atlases).find(a=>a.src===src);
  this.naturalWidth=atlas?.width??256;this.naturalHeight=atlas?.height??256;
  if(atlas)queueMicrotask(()=>fail?this.onerror?.():this.onload?.());
  else if(mode==='manual')queueMicrotask(()=>this.onload?.());
  else pending.push(this);
 }
 get src(){return this._src}
 removeAttribute(){}
};
const canvas=document.getElementById('opening-world'),dialog=canvas.closest('dialog');
canvas.width=960;canvas.height=640;
Object.defineProperty(dialog,'open',{get:()=>dialog.hasAttribute('open')});
const context=new Proxy({canvas,globalAlpha:1,drawImage:image=>{if(image.src?.includes('/player/'))paints++}},{get:(object,key)=>key in object?object[key]:()=>{}});
canvas.getContext=()=>context;
const intro=await import('../../../dist/art/approved-intro.mjs');
const runtime=await import('../../../dist/approved-atlas-runtime.mjs');
const {installAtlasRecoveryStatus}=await import('../../../dist/ui/atlas-recovery-status.mjs');
const until=async predicate=>{for(let i=0;i<300&&!predicate();i++)await new Promise(r=>nativeTimeout(r,2));assert.ok(predicate())};
intro.drawApprovedIntroWorld(canvas,{scene:'room',gender:'boy',x:4,y:3,facing:'down',steps:0});
await until(()=>runtime.approvedAtlasStatuses().filter(s=>s.status===(mode==='healthyreturn'?'ready':'failed')).length===2);
if(mode==='manual'){await intro.loadApprovedIntro();await new Promise(r=>nativeTimeout(r,10))}
else assert.ok(pending.length>=21);
assert.equal(paints,0);
if(mode!=='healthyreturn')assert.equal(requests.filter(src=>src.includes('/player/')).length,6,'automatic failure cycle is bounded to three attempts per atlas');
const control=installAtlasRecoveryStatus(document,window),button=control.box.querySelector('button');
assert.equal(control.box.hidden,mode==='healthyreturn');
fail=false;
const click=mode==='healthyreturn'?Promise.resolve():button.onclick();
await until(()=>runtime.approvedAtlasStatuses().filter(s=>s.status==='ready').length===2);
if(mode==='dispose')control.dispose();
if(['hidden','hiddenreturn','healthyreturn'].includes(mode)){
 Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));
}
if(mode==='terminal'||mode==='persistedreturn'){
 const event=new window.Event('pagehide');event.persisted=mode==='persistedreturn';window.dispatchEvent(event);
}
if(mode==='oldcanvas'){const replacement=document.createElement('canvas');replacement.id='opening-world';canvas.replaceWith(replacement)}
if(mode==='closed')dialog.removeAttribute('open');
for(const image of pending)image.onload?.();
await click;await new Promise(r=>nativeTimeout(r,10));
if(['manual','current'].includes(mode))assert.ok(paints>0,'retry must repaint the stationary actual intro without an artificial draw call');
else assert.equal(paints,0,mode+' must not paint after final await');
if(['hiddenreturn','healthyreturn'].includes(mode)){
 Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));await until(()=>paints>0);
}
if(mode==='persistedreturn'){
 assert.equal(control.box.isConnected,true,'Back keeps the existing control');
 for(let i=0;i<3;i++){
  const before=paints;const show=new window.Event('pageshow');show.persisted=true;window.dispatchEvent(show);await until(()=>paints>before);
  if(i<2){const hide=new window.Event('pagehide');hide.persisted=true;window.dispatchEvent(hide)}
 }
}
if(mode==='manual'){
 assert.equal(runtime.approvedAtlasStatuses().filter(s=>s.status==='ready').length,2);
 assert.equal(requests.filter(src=>src.includes('/player/')).length,8,'one fresh successful attempt per failed atlas');
 assert.equal(control.box.hidden,true,'successful recovery leaves no persistent strip');
 const before=paints;canvas.remove();assert.equal(await intro.repaintApprovedIntroAfterRetry(),false);assert.equal(paints,before);
}
control.dispose();control.dispose();globalThis.setTimeout=nativeTimeout;
console.log(JSON.stringify({mode,pendingImages:pending.length,playerRequests:requests.filter(src=>src.includes('/player/')).length,paints}));
