import {popupTimers} from './helpers/region-popup-timers.mjs';
import {createRegionEntryPopup} from '../dist/ui/region-entry-popup.mjs';
import {installNearbySafeBand} from '../docs/nearby-safe-band.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

// Execute the complete actual entry, not a second implementation of its RAF loop.
// Only its module bindings are injected so DOM, paint and time are deterministic.
// Controls, world, saves, battle rules and the terminal presentation tail are real.
const patchRoot=new URL('../',import.meta.url);
const overlayBase=process.env.ORDINARY_OVERLAY_BASE?pathToFileURL(process.env.ORDINARY_OVERLAY_BASE.replace(/\/$/,'')+'/'):patchRoot;
const {installOrdinaryMenu}=await import(new URL('dist/ui/ordinary-menu.mjs',overlayBase));
const base=process.env.CANONICAL_LIFECYCLE_BASE?pathToFileURL(process.env.CANONICAL_LIFECYCLE_BASE.replace(/\/$/,'')+'/'):
 patchRoot;
const mod=path=>import(new URL(path,base));
const require=createRequire(import.meta.url);
const {parseHTML}=require(process.env.LINKEDOM_PATH??'linkedom');
const {CanonicalWorld}=await mod('dist/world/service.mjs');
const {bindFieldControls}=await mod('dist/field-controls.mjs');
const {createPresentationTail}=await mod('dist/battle-v3/presentation-tail.mjs');
const {createWorldStore}=await mod('dist/world/save-store.mjs');
const {positionCell}=await mod('dist/world/definition.mjs');
const {itemUseChoices}=await mod('dist/economy/item-use-choices.mjs');
const {activeEconomyPolicy,shopItems,itemUnlocked}=await mod('dist/economy/contract.mjs');
const {battleStats,createBattleRules,calculateDamage}=await mod('dist/battle-v3/rules.mjs');
const {createCanonicalCreature}=await mod('dist/canonical-session.mjs');
const {loadCanonicalRuntimeAdapter}=await mod('dist/compatibility/canonical-runtime-adapter.mjs');
const {createEnvironmentService,createMockEnvironment,TIME_STATES,WEATHER_STATES}=await mod('dist/environment-service.mjs');
const adapter=await loadCanonicalRuntimeAdapter({readText:async p=>readFileSync(new URL('dist/data/canonical-handoff-v1/'+p,base),'utf8')});
const sourcePath=new URL('dist/world/entry.mjs',overlayBase);
const source=readFileSync(sourcePath,'utf8');
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};

async function fixture({entry=source,runtime=null,paintFailure=false,ordinary=false,firstRaf=1}={}){
 const {document,window}=parseHTML('<html><body></body></html>');
 let visibility='visible',focus=document.body,clock=1000,nextRaf=firstRaf-1;
 Object.defineProperty(document,'visibilityState',{get:()=>visibility});
 Object.defineProperty(document,'activeElement',{get:()=>focus});
 window.HTMLElement.prototype.focus=function(options){focus=this;this.lastFocusOptions=options;this.dispatchEvent(new window.Event('focusin',{bubbles:true}))};
 window.HTMLElement.prototype.setPointerCapture=function(){};
 window.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,setTransform(){}}};
 const queue=new Map(),allFrames=new Map(),listeners=new Map(),memoryStore=memory(),captures=new Map();
 const counts={ticks:0,draws:0,worldDisposes:0,controlDisposes:0,environmentStops:0,evolutionStops:0,battleStops:0,battleCreates:0,saves:0,finishes:0};
 const state={worlds:[],dt:[],visuals:[],controls:null,hooks:null,tail:null,persistGate:null,terminalGate:null,paintFailure};
 function track(target,label){
  const add=target.addEventListener.bind(target),remove=target.removeEventListener.bind(target);
  target.addEventListener=(type,fn,options)=>{if(options===true||options?.capture){if(!captures.has(type))captures.set(type,new Set());captures.get(type).add(fn)}const key=label+':'+type;if(!listeners.has(key))listeners.set(key,new Set());listeners.get(key).add(fn);return add(type,fn,options)};
  target.removeEventListener=(type,fn,options)=>{if(options===true||options?.capture)captures.get(type)?.delete(fn);listeners.get(label+':'+type)?.delete(fn);return remove(type,fn,options)};
 }
 track(window,'window');track(document,'document');
 class World extends CanonicalWorld{
  constructor(options){
   const hooks=options.hooks;
   super({...options,runtime:runtime??options.runtime,rng:()=>.99,persist:async s=>{if(state.persistGate)await state.persistGate.promise;await options.persist(s)},hooks:{...hooks,battleFinished:async outcome=>{if(state.terminalGate)await state.terminalGate.promise;hooks.battleFinished(outcome)}}});
   state.worlds.push(this);state.hooks=hooks;
  }
  tick(dt){counts.ticks++;state.dt.push(dt);return super.tick(dt)}
  dispose(){counts.worldDisposes++;return super.dispose()}
 }
 const environment=createEnvironmentService(createMockEnvironment());await environment.refresh();const stop=environment.stop;
 environment.stop=()=>{counts.environmentStops++;stop()};
 const timers=popupTimers();
 const bindings={installOrdinaryMenu:options=>{
   // Linkedom has no capture-before-target ordering. Record the application's
   // real root/document capture functions, then run them before modeled native
   // pointer focus and target click. No alternate application guard is injected.
   track(options.root,'root');
   return installOrdinaryMenu(options);
  },createRegionEntryPopup:options=>createRegionEntryPopup({...options,...timers,reducedMotion:()=>false}),document,window,location:{search:'?qa=1',reload(){throw Error('Unexpected reload')}},localStorage:memoryStore,
  performance:{now:()=>clock},URLSearchParams,setTimeout:fn=>{queueMicrotask(fn);return 1},
  requestAnimationFrame:fn=>{const id=++nextRaf;queue.set(id,fn);allFrames.set(id,fn);return id},cancelAnimationFrame:id=>queue.delete(id),
  createEvolutionPresentation:()=>({busy:false,stop(){counts.evolutionStops++},play:async()=>{}}),
  preRivalGuidance:()=>'',LOSS_RECOVERY_GUIDANCE:'loss recovery',
  createPresentationTail:options=>{state.tail=createPresentationTail({...options,onFinish:(...args)=>{counts.finishes++;options.onFinish(...args)}});return state.tail},
  bindFieldControls:options=>{state.controls=bindFieldControls(options);const dispose=state.controls.dispose;state.controls.dispose=()=>{counts.controlDisposes++;dispose()};return state.controls},
  itemUseChoices,activeEconomyPolicy,shopItems,itemUnlocked,positionCell,battleStats,TIME_STATES,WEATHER_STATES,
  installIntegratedBattleLayout:()=>({refresh:()=>({width:432,height:240}),setText(){}}),
  installPolishedBattleChrome:()=>({hud:document.createElement('div'),heading:document.createElement('h2'),update(){}}),styleDialogueAdvance(){},
  loadCanonicalRuntimeAdapter:async()=>adapter,CanonicalWorld:World,
  createWorldStore:(...args)=>{const store=createWorldStore(...args),save=store.save;store.save=(...args)=>{counts.saves++;return save(...args)};return store},
  drawWorld:(context,world)=>{if(state.paintFailure)throw Error('QA paint failure');counts.draws++;context.canvas.dataset.paintPosition=JSON.stringify(world.snapshot().position)},
  createBattlePresentation:()=>{counts.battleCreates++;const visual={busy:false,consume(s){this.snapshot=s},draw(){return {label:''}},stop(){counts.battleStops++;this.busy=false}};state.visuals.push(visual);return visual},
  createSessionEnvironment:()=>environment,createMapAudioRouter:()=>({update(){}}),createLocalTimeProvider:()=>({read:()=>({minutes:600})}),devRequestId:()=>`qa-request-${clock}`,
 };
 const executable=entry.replace(/^import .*;\n/gm,'').replace('export async function startCanonicalWorld','async function startCanonicalWorld').replaceAll('import.meta.env.DEV','false');
 assert.ok(executable.includes('function frame(now)'),'fixture must execute actual full entry');
 const start=Function(...Object.keys(bindings),executable+'\nreturn startCanonicalWorld;')(...Object.values(bindings));
 let ordinarySession=null;
 if(ordinary){
  if(!runtime){const seed=new CanonicalWorld({adapter});runtime=seed.snapshot();seed.dispose()}
  const ordinaryStore=()=>{const w=state.worlds.at(-1);return createWorldStore(memoryStore,w.catalog,w.host,{qa:true})};
  ordinarySession={slot:'SLOT_1',runtime,api:{adapterFor:()=>adapter,store:{save:(slot,s)=>{counts.saves++;return ordinaryStore().save(slot,s)}},read:slot=>({runtime:ordinaryStore().load(slot)})}};
 }
 await start({ordinary:ordinarySession});
 const root=document.getElementById('canonical-world'),el=id=>root.querySelector(`[data-w="${id}"]`);
 el('starter').querySelector('option').selected=true;for(const option of el('slot').querySelectorAll('option'))option.value=option.textContent;el('slot').querySelector('option').selected=true;
 if(!ordinary)await el('new').onclick();
 assert.ok(state.worlds.length,'real CanonicalWorld must be created');
 function send(target,type,values={}){const event=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{key:'',code:'',button:0,pointerId:1,clientX:0,clientY:0,...values});target.dispatchEvent(event);return event}
 function captured(type,node,values={}){
  const event={type,target:node,button:0,defaultPrevented:false,stopped:false,...values,preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){this.stopped=true},stopPropagation(){this.stopped=true}};
  for(const fn of captures.get(type)??[]){fn(event);if(event.stopped)break}return event;
 }
 const f={timers,document,window,root,el,counts,state,queue,allFrames,listeners,memoryStore,environment,captured,
  async browserOrderClick(node){const event=captured('click',node);if(!event.stopped&&!node.disabled)await node.onclick?.(event);await flush();return event},
  async browserOrderPointerClick(node,{pointerType='mouse',compatibilityOnly=false}={}){
   const pointer=compatibilityOnly?null:captured('pointerdown',node,{pointerType});
   const mouse=pointer?.defaultPrevented?null:captured('mousedown',node);
   if(!(pointer?.defaultPrevented||mouse?.defaultPrevented)&&!node.disabled)node.focus();
   const click=await f.browserOrderClick(node);return {pointer,mouse,click};
  },
  get world(){return state.worlds.at(-1)},get clock(){return clock},get pending(){return queue.size},advance(ms=300){clock+=ms},
  send,hide:persisted=>send(window,'pagehide',{persisted}),show:(persisted=true)=>send(window,'pageshow',{persisted}),
  visibility(value){visibility=value;send(document,'visibilitychange')},
  key(key,type='keydown',extra={}){return send(document,type,{key,code:key,...extra})},
  pointer(dir,type='pointerdown',extra={}){return send(root.querySelector(`[data-dir="${dir}"]`),type,extra)},
  async frame(ms=16){clock+=ms;const batch=[...queue.entries()];queue.clear();for(const [,fn]of batch)fn(clock);await flush()},
  async press(key){clock+=300;f.key(key);f.key(key,'keyup');await flush()},
  async cleanup(){f.hide(false);await flush()},
 };
 await flush();return f;
}


const phase=f=>f.el('location').dataset.regionState;
test('combined actual canonical entry menu -> Dex -> details and Back preserves base stats, focus, state and popup suppression',async()=>{
 const seed=new CanonicalWorld({adapter,hooks:{dialogue:async()=>{}}});for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await seed.story.runEvent(id);const runtime=seed.snapshot();runtime.dex.seen.push('SPECIES_020');seed.dispose();
 const f=await fixture({ordinary:true,runtime});try{
  const before=f.world.snapshot(),saves=f.counts.saves;assert.equal(phase(f),'visible');f.el('menu').click();assert.equal(phase(f),'idle');
  const click=q=>{const b=f.root.querySelector(q);assert.ok(b,q);b.click()};
  click('[data-menu-page="dex"]');assert.equal(f.root.querySelectorAll('[data-dex-id]').length,151);
  const unseen=f.root.querySelector('[data-dex-id="SPECIES_002"]');assert.equal(unseen.disabled,true);unseen.onclick();assert.equal(f.root.querySelector('[data-dex-detail]'),null);
  for(const id of ['SPECIES_001','SPECIES_020']){
   click(`[data-dex-id="${id}"]`);assert.equal(f.root.querySelector('[data-dex-detail]').dataset.dexDetail,id);
   assert.deepEqual([...f.root.querySelectorAll('[data-stat] dd')].map(n=>Number(n.textContent)),f.world.catalog.getBaseStats(id));
   assert.equal(f.root.querySelectorAll('[data-stat]').length,6);assert.equal(phase(f),'idle');
   click('[data-menu-focus="back"]');assert.equal(f.document.activeElement.dataset.dexId,id);
  }
  click('[data-menu-focus="back"]');assert.equal(f.document.activeElement.dataset.menuPage,'dex');
  click('[data-menu-focus="back"]');await f.frame();assert.equal(phase(f),'idle');
  assert.deepEqual(f.world.snapshot(),before);assert.equal(f.counts.saves,saves);assert.equal(f.timers.pending.size,0);
 }finally{await f.cleanup()}
});
async function areaFixture(){const w=new CanonicalWorld({adapter});const runtime=w.snapshot();runtime.position={scene:'world:hub:PROLOGUE',x:4*48+24,y:4*48+24,facing:'up'};w.dispose();return fixture({ordinary:true,runtime})}
async function clickWarp(f,target){const p=f.world.nearby().find(p=>p.kind==='warp'&&p.targetMapId===target);assert.ok(p,'actual adjacent warp must exist');const b=[...f.el('choices').querySelectorAll('button')].find(b=>b.textContent===p.label);assert.ok(b,'actual authored warp button must exist');await b.onclick()}
test('full canonical entry uses initial and actual warp events, with one newest label and no popup save writes',async()=>{
 const f=await areaFixture();try{assert.equal(phase(f),'visible');assert.equal(f.el('location').textContent,f.world.map.label);const first=[...f.timers.all.values()][0].fn,saves=f.counts.saves;
 await clickWarp(f,'world:area:P_ECO_CENTER_EDGE');assert.equal(f.world.map.id,'world:area:P_ECO_CENTER_EDGE');assert.equal(f.el('location').textContent,f.world.map.label);assert.equal(phase(f),'visible');assert.equal(f.counts.saves,saves+1,'the sole save is the real warp transaction');first();assert.equal(phase(f),'visible');
 await clickWarp(f,'world:hub:PROLOGUE');assert.equal(f.el('location').textContent,f.world.map.label);const after=f.world.snapshot(),writes=f.counts.saves;f.timers.advance(3180);await f.frame();assert.equal(phase(f),'idle');assert.deepEqual(f.world.snapshot(),after);assert.equal(f.counts.saves,writes);
 }finally{await f.cleanup()}
});
test('full entry does not renew popup on actual movement/menu close, held input or BFCache Back',async()=>{
 const f=await fixture({ordinary:true});try{const initialTimers=f.timers.all.size;await f.press('ArrowLeft');assert.equal(f.timers.all.size,initialTimers);f.el('menu').onclick();assert.equal(phase(f),'idle');f.el('menu').onclick();assert.equal(phase(f),'idle');f.pointer('up');await flush();f.hide(true);assert.equal(f.state.controls.direction,null);f.show();await f.frame();assert.equal(phase(f),'idle');assert.equal(f.root.querySelectorAll('.eco-region-popup').length,1);
 }finally{await f.cleanup()}assert.equal(f.timers.pending.size,0);assert.ok([...f.listeners.values()].every(v=>v.size===0));
});
test('full entry hides immediately on actual story dialogue and battle, and teardown cancels stale callbacks',async()=>{
 const seed=new CanonicalWorld({adapter,hooks:{dialogue:async()=>{}}});for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await seed.story.runEvent(id);const runtime=seed.snapshot();seed.dispose();const f=await fixture({ordinary:true,runtime});try{
 const stale=[...f.timers.all.values()][0].fn;assert.equal(phase(f),'visible');const op=f.world.story.runTrainer('RIVAL_00',f.world.options());
 for(let i=0;i<100&&!f.state.visuals.length;i++){await flush();assert.equal(phase(f),'idle');if(!f.el('dialogue').hidden)f.el('continue').onclick()}
 assert.equal(f.state.visuals.length,1);assert.equal(f.el('battle-panel').hidden,false);stale();assert.equal(phase(f),'idle');await f.cleanup();stale();assert.equal(f.timers.pending.size,0);void op;
 }finally{await f.cleanup()}
});
test('full entry visibility resume keeps stale popup suppressed without relocating or saving',async()=>{
 const f=await fixture({ordinary:true});try{const before=f.world.snapshot(),saves=f.counts.saves;f.visibility('hidden');f.timers.advance(60000);f.visibility('visible');await f.frame();assert.equal(phase(f),'idle');assert.deepEqual(f.world.snapshot(),before);assert.equal(f.counts.saves,saves)}finally{await f.cleanup()}
});


test('real canonical entry + pinned shell Help suppresses actual warps, consumes keys and never replays on close',async()=>{
 const f=await areaFixture();let owner=null,band=null;try{
  const shell=readFileSync(new URL('../docs/assets/mobile-viewport-CKi2spbv.js',import.meta.url),'utf8');
  const installShell=Function(shell.slice(0,shell.indexOf('typeof document<'))+';return s;')();
  const {installNearbySafeBand}=await import('../docs/nearby-safe-band.mjs');
  f.window.HTMLElement.prototype.getBoundingClientRect=function(){return {width:960,height:83,top:0,left:0,right:960,bottom:83}};
  f.window.requestAnimationFrame=()=>1;f.window.cancelAnimationFrame=()=>{};f.window.innerWidth=960;f.window.innerHeight=800;
  owner=installShell(f.document,f.window);band=installNearbySafeBand({document:f.document,window:f.window});
  const header=f.root.querySelector('.shared-shell-header'),help=header.querySelector('.shared-shell-help'),near=f.el('choices'),popup=f.el('location');
  assert.equal(popup.parentElement,header);assert.equal(near.parentElement,header);assert.equal(near.classList.contains('qa-safe-nearby-band'),true);
  const helpButton=f.root.querySelector('[data-shell-control="help"]');assert.ok(helpButton);helpButton.onclick();assert.equal(help.open,true);f.send(help,'toggle');assert.equal(phase(f),'idle');
  const oldCallbacks=[...f.timers.all.values()].map(t=>t.fn),saves=f.counts.saves;
  await clickWarp(f,'world:area:P_ECO_CENTER_EDGE');assert.equal(help.open,true);assert.equal(f.world.map.id,'world:area:P_ECO_CENTER_EDGE');assert.equal(popup.textContent,f.world.map.label);assert.equal(phase(f),'idle');assert.equal(f.timers.pending.size,0);assert.equal(f.counts.saves,saves+1,'only the authorized real warp transaction saves');
  await clickWarp(f,'world:hub:PROLOGUE');assert.equal(phase(f),'idle');assert.equal(f.timers.pending.size,0);assert.equal(f.counts.saves,saves+2);for(const callback of oldCallbacks)callback();assert.equal(phase(f),'idle');
  f.timers.advance(60000);helpButton.onclick();assert.equal(help.open,false);f.send(help,'toggle');await f.frame();assert.equal(phase(f),'idle');assert.equal(popup.hidden,false);assert.equal(popup.parentElement,header);assert.equal(near.parentElement,header);
  // An actual later visible map entry still works; no permanent suppression.
  await clickWarp(f,'world:area:P_ECO_CENTER_EDGE');assert.equal(phase(f),'visible');assert.equal(popup.textContent,f.world.map.label);assert.equal(f.timers.pending.size,1);
 }finally{band?.dispose();owner?.destroy();await f.cleanup()}assert.equal(f.timers.pending.size,0);
});

// Exact retained shell DOM/handlers, with explicit browser-order click capture.
// Linkedom has no layout, native focus or summary default and no capture ordering.
// The fixture explicitly models pointer/mousedown focus, focusin, capture-before-
// target and native summary toggle. These are deterministic contracts, not browser proof.
function exactShell(f){
 const shell=readFileSync(new URL('../docs/assets/mobile-viewport-CKi2spbv.js',import.meta.url),'utf8');
 const installShell=Function(shell.slice(0,shell.indexOf('typeof document<'))+';return s;')();
 f.window.HTMLElement.prototype.getBoundingClientRect=function(){return {width:960,height:83,top:0,left:0,right:960,bottom:83}};
 f.window.requestAnimationFrame=()=>1;f.window.cancelAnimationFrame=()=>{};f.window.innerWidth=960;f.window.innerHeight=800;
 const shellOwner=installShell(f.document,f.window),band=installNearbySafeBand(f),owner={destroy(){band.dispose();shellOwner.destroy()}},help=f.root.querySelector('#canonical-shell-help'),toggle=f.root.querySelector('[data-shell-control="help"]'),close=help.querySelector('.shared-shell-help-content button');
 return {owner,help,toggle,close,header:f.root.querySelector('.shared-shell-header'),aside:f.root.querySelector('aside'),click:n=>f.browserOrderClick(n)};
}
async function preparedOverlayFixture(){
 const seed=new CanonicalWorld({adapter,hooks:{dialogue:async()=>{}}});for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await seed.story.runEvent(id);
 const runtime=seed.snapshot();runtime.party=[createCanonicalCreature(seed.catalog,'SPECIES_001',100)];runtime.party[0].hp=1;runtime.box=[createCanonicalCreature(seed.catalog,'SPECIES_020',5)];runtime.dex.seen.push('SPECIES_020');runtime.dex.caught.push('SPECIES_020');runtime.progress.items.potion=2;runtime.position={scene:'world:hub:PROLOGUE',x:4*48+24,y:4*48+24,facing:'up'};seed.dispose();
 return fixture({ordinary:true,runtime});
}
async function pendingSave(f){
 f.state.persistGate={promise:Promise.reject(Error('검수 저장 오류'))};await assert.rejects(f.world.story.worldCommand({type:'face',facing:'left'}),/검수 저장 오류/);
 assert.equal(f.world.story.pendingCommit,true);assert.equal(f.world.inputLocked,true);
 f.el('menu').onclick();f.root.querySelector('[data-menu-page="save"]').click();await f.el('retry').onclick();await flush();
 assert.match(f.el('status').textContent,/검수 저장 오류/);
}
test('single-overlay exact shell Help -> menu -> Help alternation keeps one visible owner and correct return focus',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  const before=f.world.snapshot(),saves=f.counts.saves;
  for(let i=0;i<3;i++){
   await s.click(s.toggle);assert.equal(s.help.open,true);assert.equal(s.help.getAttribute('aria-modal'),'true');assert.equal(s.help.getAttribute('role'),'dialog');assert.ok(f.document.activeElement===s.close,'exact DOM identity: f.document.activeElement === s.close');
   await s.click(f.el('menu'));assert.equal(s.help.open,false);assert.equal(s.help.getAttribute('aria-modal'),null);assert.equal(s.help.getAttribute('role'),null);assert.equal(s.toggle.getAttribute('aria-expanded'),'false');assert.equal(s.aside.hidden,false);assert.equal(f.document.activeElement.dataset.menuPage,'dex');
   await s.click(s.toggle);assert.equal(s.aside.hidden,true);assert.equal(s.help.open,true);assert.ok(f.document.activeElement===s.close,'exact DOM identity: f.document.activeElement === s.close');assert.equal(f.world.field.menu,null);
   f.key('Escape');assert.equal(s.help.open,false);assert.ok(f.document.activeElement===s.toggle,'exact DOM identity: f.document.activeElement === s.toggle');
   await s.click(f.el('menu'));f.key('Escape');assert.equal(s.aside.hidden,true);assert.ok(f.document.activeElement===f.el('field'));
  }
  assert.deepEqual(f.world.snapshot(),before);assert.equal(f.counts.saves,saves);assert.equal(phase(f),'idle');
 }finally{s.owner.destroy();await f.cleanup()}
});
test('single-overlay exact shell Tab, held activation, M/Back and field movement remain owned by visible Help',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  const before=f.world.snapshot();await s.click(s.toggle);
  for(const key of ['ArrowUp','ArrowDown','w','a','s','d']){const event=f.key(key);assert.equal(event.defaultPrevented,true);await f.frame();assert.deepEqual(f.world.snapshot(),before)}
  f.pointer('up');await f.frame();assert.equal(f.state.controls.direction,null);assert.deepEqual(f.world.snapshot(),before);
  s.close.focus();for(const key of ['Enter',' ']){assert.equal(f.key(key,'keydown',{repeat:true}).defaultPrevented,true);assert.equal(s.help.open,true)}
  const last=[...s.help.querySelectorAll('summary,button,a[href]')].at(-1);last.focus();assert.equal(f.key('Tab').defaultPrevented,true);assert.ok(f.document.activeElement===s.help.querySelector('summary'));
  assert.equal(f.key('Tab','keydown',{shiftKey:true}).defaultPrevented,true);assert.ok(f.document.activeElement===last,'exact DOM identity: f.document.activeElement === last');
  f.key('m','keydown',{repeat:true});assert.equal(s.help.open,true);assert.equal(s.aside.hidden,true);
  f.world.pending=true;f.key('m');assert.equal(s.help.open,true);assert.equal(s.aside.hidden,true);assert.ok(f.document.activeElement===s.close);f.world.pending=false;
  f.key('m');assert.equal(s.help.open,false);assert.equal(s.aside.hidden,false);assert.equal(f.document.activeElement.dataset.menuPage,'dex');
  await s.click(s.toggle);await s.click(f.el('cancel'));assert.equal(s.help.open,false);assert.ok(f.document.activeElement===s.toggle,'exact DOM identity: f.document.activeElement === s.toggle');assert.deepEqual(f.world.snapshot(),before);
 }finally{s.owner.destroy();await f.cleanup()}
});
test('single-overlay exact shell native summary toggle and delayed/coalesced closing events cannot steal menu focus',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  await s.click(f.el('menu'));s.help.open=true;f.send(s.help,'toggle');assert.equal(s.aside.hidden,true);assert.ok(f.document.activeElement===s.close,'exact DOM identity: f.document.activeElement === s.close');
  await s.click(f.el('menu'));const selected=f.document.activeElement;f.send(s.help,'toggle');await flush();assert.equal(s.help.open,false);assert.ok(f.document.activeElement===selected,'exact DOM identity: f.document.activeElement === selected');
  f.key('Escape');s.toggle.onclick();f.el('menu').onclick();f.send(s.help,'toggle');await flush();assert.equal(s.aside.hidden,false);assert.equal(s.help.open,false);assert.equal(f.document.activeElement.dataset.menuPage,'dex');
  f.visibility('hidden');s.help.open=true;f.send(s.help,'toggle');const hiddenFocus=f.document.activeElement;await flush();assert.ok(f.document.activeElement===hiddenFocus,'exact DOM identity: f.document.activeElement === hiddenFocus');f.visibility('visible');f.key('Tab');assert.ok(s.help.contains(f.document.activeElement));
 }finally{s.owner.destroy();await f.cleanup()}
});
test('single-overlay capture blocks background warp/action clicks while Help owns focus without changing popup state',async()=>{
 const f=await areaFixture(),s=exactShell(f);try{
  const before=f.world.snapshot(),saves=f.counts.saves;await s.click(s.toggle);f.send(s.help,'toggle');assert.equal(phase(f),'idle');
  const warp=f.world.nearby().find(p=>p.kind==='warp'),button=[...f.el('choices').querySelectorAll('button')].find(n=>n.textContent===warp.label);
  const event=await s.click(button);assert.equal(event.defaultPrevented,true);assert.equal(event.stopped,true);assert.deepEqual(f.world.snapshot(),before);assert.equal(f.counts.saves,saves);
  await s.click(f.el('action'));assert.equal(s.help.open,false);assert.deepEqual(f.world.snapshot(),before);assert.equal(phase(f),'idle');
  await s.click(f.el('menu'));const menuEvent=await s.click(button);assert.equal(menuEvent.stopped,true);assert.deepEqual(f.world.snapshot(),before);assert.equal(f.counts.saves,saves);
 }finally{s.owner.destroy();await f.cleanup()}
});
test('single-overlay save success keeps one exact status node in menu and restores original order; retry remains in actual save view',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  const status=f.el('status'),marker=f.document.createComment('original following sibling');status.after(marker);const parent=status.parentNode,next=status.nextSibling,retry=f.el('retry');assert.ok(next===marker);
  await s.click(f.el('menu'));f.root.querySelector('[data-menu-page="save"]').click();await s.click(f.root.querySelector('[data-ordinary-save]'));
  assert.ok(f.el('status')===status);assert.ok(status.parentNode===s.aside,'exact DOM identity: status.parentNode === s.aside');assert.ok(status.nextSibling===s.aside.querySelector('.eco-menu-content'));assert.match(status.textContent,/SLOT_1 저장 완료/);assert.equal(status.hidden,false);assert.equal(f.root.querySelectorAll('[data-w="status"]').length,1);
  assert.ok(f.el('retry')===retry);assert.ok(s.aside.querySelector('[aria-label="저장 메뉴"]').contains(retry));assert.equal(retry.closest('[aria-label="저장 메뉴"]').hidden,false);
  // Future actionable status children retain their actual node/listener; no
  // pointer-events blanket, cloned live region, or content replacement is used.
  let actions=0;const action=f.document.createElement('button');action.textContent='상태 동작';action.onclick=()=>actions++;status.append(action);await s.click(action);assert.equal(actions,1);
  f.key('Escape');f.key('Escape');assert.ok(status.parentNode===s.header,'outside-menu status reserves a measured header row');assert.ok(status.previousElementSibling===f.el('choices'));assert.ok(status.querySelector('button')===action);
  await s.click(f.el('menu'));assert.ok(status.parentNode===s.aside,'exact DOM identity: status.parentNode === s.aside');s.owner.destroy();await f.cleanup();assert.ok(status.parentNode===parent,'exact DOM identity: status.parentNode === parent');assert.ok(status.nextSibling===next,'exact DOM identity: status.nextSibling === next');assert.ok(status.querySelector('button')===action);
 }finally{s.owner.destroy();await f.cleanup()}
});
test('single-overlay pending-save read-only menu never unlocks item/evolution/party/warp/battle mutations',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  const before=f.world.snapshot();await pendingSave(f);assert.equal(f.el('menu').disabled,false);assert.equal(f.world.inputLocked,true);assert.equal(f.root.querySelector('[data-ordinary-save]').disabled,true);
  f.key('Escape');f.root.querySelector('[data-menu-page="party"]').click();
  const item=f.root.querySelector('[data-menu-focus^="item-use:"]'),evolve=f.root.querySelector('[data-menu-focus^="party-evolve:"]');assert.ok(item,'real item use control exists');assert.ok(evolve,'real evolution control exists');assert.equal(item.disabled,true);assert.equal(evolve.disabled,true);await s.click(item);await s.click(evolve);
  await assert.rejects(f.world.evolve(before.party[0].instanceId),/WORLD_BUSY/);await assert.rejects(f.world.useItem('potion',before.party[0].instanceId,'blocked-item'),/WORLD_BUSY/);
  const warp=f.world.nearby().find(p=>p.kind==='warp');await assert.rejects(f.world.interact(warp.id),/WORLD_BUSY/);await assert.rejects(f.world.story.worldCommand({type:'storage-exchange'}),/uncommitted transaction/);
  await assert.rejects(f.world.story.runTrainer('RIVAL_00',f.world.options()),/uncommitted transaction/);assert.equal(await f.world.startDetectedBattle(),null);
  await s.click(s.toggle);assert.equal(s.help.open,true);assert.equal(f.world.story.pendingCommit,true);f.key('m');assert.equal(s.aside.hidden,false);assert.equal(s.help.open,false);assert.equal(f.world.inputLocked,true);
  assert.deepEqual(f.world.snapshot(),before);assert.equal(f.counts.saves,0);
 }finally{s.owner.destroy();await f.cleanup()}
});
test('single-overlay in-flight retry retains original transaction through Help/menu changes and stale error updates then commits once',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  const before=f.world.snapshot();await pendingSave(f);const status=f.el('status'),retry=f.el('retry');
  let reject;f.state.persistGate={promise:new Promise((resolve,rejectFn)=>{reject=rejectFn})};const pending=retry.onclick();await flush();
  assert.equal(f.world.story.busy,true);assert.equal(retry.disabled,true);const focused=f.document.activeElement;await f.browserOrderPointerClick(f.root.querySelector('[data-shell-control="up"]'));assert.ok(f.document.activeElement===focused);f.el('field').focus();assert.ok(s.aside.contains(f.document.activeElement));const count=f.counts.saves;await s.click(retry);assert.equal(f.counts.saves,count,'disabled retry cannot start a duplicate persistence');
  await s.click(s.toggle);assert.equal(s.aside.hidden,true);assert.equal(s.help.open,true);assert.equal(f.world.story.pendingCommit,true);f.key('m');assert.equal(s.aside.hidden,false);assert.equal(s.help.open,false);assert.equal(f.world.story.pendingCommit,true);
  f.root.querySelector('[data-menu-page="save"]').click();assert.ok(f.el('retry')===retry);assert.equal(retry.disabled,true);
  await f.browserOrderPointerClick(s.toggle);f.el('field').focus();assert.ok(s.help.contains(f.document.activeElement));await f.browserOrderPointerClick(f.root.querySelector('[data-shell-control="up"]'));assert.ok(s.help.contains(f.document.activeElement));reject(Error('늦게 도착한 저장 오류'));await pending;await flush();assert.ok(f.el('status')===status);assert.match(status.textContent,/늦게 도착한 저장 오류/);assert.ok(status.parentNode===s.header,'late error stays in measured header outside menu');assert.equal(s.help.open,true);assert.equal(f.world.story.pendingCommit,true);assert.deepEqual(f.world.snapshot(),before);
  f.key('m');f.root.querySelector('[data-menu-page="save"]').click();assert.ok(status.parentNode===s.aside,'exact DOM identity: status.parentNode === s.aside');assert.match(status.textContent,/늦게 도착한 저장 오류/);assert.ok(f.el('retry')===retry);assert.equal(retry.disabled,false);
  f.state.persistGate=null;await s.click(retry);assert.equal(f.world.story.pendingCommit,false);assert.equal(f.world.story.busy,false);assert.equal(f.counts.saves,count+1);assert.equal(f.world.snapshot().revision,before.revision+1);assert.equal(f.world.snapshot().position.facing,'left');assert.deepEqual(f.world.snapshot().party,before.party);assert.equal(f.root.querySelector('[data-ordinary-save]').disabled,false);
  f.key('Escape');f.key('Escape');assert.equal(f.world.inputLocked,false);assert.ok(f.document.activeElement===f.el('field'));assert.ok(status.parentNode===s.header,'closed menu restores measured header status row');
 }finally{s.owner.destroy();await f.cleanup()}
});
test('single-overlay teardown cancels deferred Help focus, restores status and removes all owned listeners',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);const status=f.el('status'),parent=status.parentNode,next=status.nextSibling;
 await s.click(f.el('menu'));s.toggle.click();s.owner.destroy();await f.cleanup();const focus=f.document.activeElement;await flush();
 assert.ok(f.document.activeElement===focus,'exact DOM identity: f.document.activeElement === focus');assert.ok(status.parentNode===parent,'exact DOM identity: status.parentNode === parent');assert.ok(status.nextSibling===next,'exact DOM identity: status.nextSibling === next');assert.ok([...f.listeners.values()].every(v=>v.size===0));
});


for(const mode of ['menu','help'])test(`focus-guard exact shell ${mode} blocks mouse/touch/pen and compatibility mouse background focus before click`,async()=>{
 const f=await areaFixture(),s=exactShell(f);try{
  const before=f.world.snapshot(),writes=f.counts.saves;await s.click(mode==='menu'?f.el('menu'):s.toggle);if(mode==='help')f.send(s.help,'toggle');
  const owner=mode==='menu'?s.aside:s.help,selected=f.document.activeElement;
  let externalActions=0;const external=f.document.createElement('button');external.onclick=()=>externalActions++;f.document.body.append(external);
  const targets=[f.root.querySelector('[data-shell-control="up"]'),f.el('choices').querySelector('button'),external];
  assert.ok(targets.every(Boolean));
  for(const target of targets)for(const options of [{pointerType:'mouse'},{pointerType:'touch'},{pointerType:'pen'},{compatibilityOnly:true}]){
   const result=await f.browserOrderPointerClick(target,options);
   assert.equal((result.pointer??result.mouse).defaultPrevented,true);assert.equal((result.pointer??result.mouse).stopped,true,'background pointer handlers must not run');assert.equal(result.click.defaultPrevented,true);assert.equal(result.click.stopped,true);
   assert.ok(f.document.activeElement===selected,'background pointer must not steal selected overlay focus');assert.ok(owner.contains(f.document.activeElement));
   await f.frame();assert.deepEqual(f.world.snapshot(),before);assert.equal(f.counts.saves,writes);assert.equal(f.state.controls.direction,null);
  }
  assert.equal(externalActions,0);assert.equal(phase(f),'idle');assert.equal(f.el('dialogue').hidden,true);
 }finally{s.owner.destroy();await f.cleanup()}
});
for(const mode of ['menu','help'])test(`focus-guard exact shell ${mode} repairs programmatic outside focus synchronously with preventScroll`,async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  await s.click(mode==='menu'?f.el('menu'):s.toggle);const owner=mode==='menu'?s.aside:s.help;
  const selected=mode==='menu'?f.root.querySelector('[data-menu-page="save"]'):s.close;selected.focus();
  const external=f.document.createElement('input');f.document.body.append(external);
  for(const target of [f.root.querySelector('[data-shell-control="up"]'),f.el('choices').querySelector('button'),s.toggle,f.el('menu'),f.el('action'),f.el('cancel'),external,f.document.body]){
   assert.ok(target);target.focus();assert.ok(f.document.activeElement===selected,'focusin must synchronously restore the previous owned control');assert.equal(selected.lastFocusOptions.preventScroll,true);
  }
  selected.disabled=true;external.focus();assert.ok(owner.contains(f.document.activeElement));assert.ok(f.document.activeElement!==selected,'disabled real selection cannot be refocused');assert.notEqual(f.document.activeElement.disabled,true);
  selected.disabled=false;selected.focus();selected.remove();external.focus();assert.ok(owner.contains(f.document.activeElement));assert.ok(f.document.activeElement!==selected,'removed selection cannot be refocused');
  f.key('Escape');assert.equal(mode==='menu'?s.aside.hidden:!s.help.open,true);assert.ok(f.document.activeElement===(mode==='menu'?f.el('field'):s.toggle));
  external.focus();assert.ok(f.document.activeElement===external,'closed overlays must not retain focus ownership');
 }finally{s.owner.destroy();await f.cleanup()}
});
test('focus-guard exact shell pointer handoffs preserve Help/menu/B and dock A selected action across repeated transitions',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  const before=f.world.snapshot(),writes=f.counts.saves;
  for(let i=0;i<3;i++){
   await f.browserOrderPointerClick(s.toggle);assert.equal(s.help.open,true);assert.ok(f.document.activeElement===s.close);
   let result=await f.browserOrderPointerClick(f.el('menu'));assert.equal(result.pointer.defaultPrevented,true);assert.equal(result.pointer.stopped,false,'intentional handoff pointer propagation remains native');assert.equal(result.click.defaultPrevented,false);assert.equal(s.help.open,false);assert.equal(s.aside.hidden,false);
   const save=f.root.querySelector('[data-menu-page="save"]');save.focus();
   result=await f.browserOrderPointerClick(f.el('action'));assert.equal(result.pointer.defaultPrevented,true);assert.equal(result.pointer.stopped,false,'intentional handoff pointer propagation remains native');assert.equal(result.click.defaultPrevented,false);assert.equal(f.root.querySelector('[aria-label="저장 메뉴"]').hidden,false,'dock A must activate selected Save, not first Dex');
   result=await f.browserOrderPointerClick(s.toggle);assert.equal(result.pointer.defaultPrevented,true);assert.equal(result.pointer.stopped,false,'intentional handoff pointer propagation remains native');assert.equal(result.click.defaultPrevented,false);assert.equal(s.aside.hidden,true);assert.equal(s.help.open,true);assert.ok(f.document.activeElement===s.close);
   result=await f.browserOrderPointerClick(f.el('cancel'));assert.equal(result.pointer.defaultPrevented,true);assert.equal(result.pointer.stopped,false,'intentional handoff pointer propagation remains native');assert.equal(result.click.defaultPrevented,false);assert.equal(s.help.open,false);assert.ok(f.document.activeElement===s.toggle);
   await f.browserOrderPointerClick(f.el('menu'));await f.browserOrderPointerClick(f.el('cancel'));assert.equal(s.aside.hidden,true);assert.ok(f.document.activeElement===f.el('field'));
  }
  assert.deepEqual(f.world.snapshot(),before);assert.equal(f.counts.saves,writes);
 }finally{s.owner.destroy();await f.cleanup()}
});
test('focus-guard exact shell preserves internal search caret/filter and actionable status pointer input plus keyboard trap',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  await s.click(f.el('menu'));await f.browserOrderPointerClick(f.root.querySelector('[data-menu-page="dex"]'));
  const search=f.root.querySelector('[data-dex-search]');let result=await f.browserOrderPointerClick(search);assert.equal(result.pointer.defaultPrevented,false);assert.equal(result.mouse.defaultPrevented,false);assert.ok(f.document.activeElement===search);
  search.value='삵';search.selectionStart=1;search.selectionEnd=1;search.oninput();s.aside.scrollTop=77;
  await f.browserOrderPointerClick(f.root.querySelector('[data-shell-control="up"]'));assert.ok(f.document.activeElement===search);assert.equal(search.value,'삵');assert.equal(search.selectionStart,1);assert.equal(search.selectionEnd,1);assert.equal(s.aside.scrollTop,77);
  const filter=f.root.querySelector('[data-dex-filter]');result=await f.browserOrderPointerClick(filter);assert.equal(result.pointer.defaultPrevented,false);assert.ok(f.document.activeElement===filter);filter.querySelector('[value="caught"]').selected=true;filter.onchange();assert.equal(f.root.querySelector('[data-dex-filter]').value,'caught');
  const status=f.el('status');status.hidden=false;let actions=0;const action=f.document.createElement('button');action.textContent='상태 동작';action.onclick=()=>actions++;status.append(action);
  result=await f.browserOrderPointerClick(action);assert.equal(result.pointer.defaultPrevented,false);assert.equal(result.click.defaultPrevented,false);assert.equal(actions,1);assert.ok(f.document.activeElement===action);
  f.root.querySelector('[data-menu-focus="back"]').focus();assert.equal(f.key('Tab','keydown',{shiftKey:true}).defaultPrevented,true);assert.ok(s.aside.contains(f.document.activeElement));
  for(const key of ['Enter',' '])assert.equal(f.key(key,'keydown',{repeat:true}).defaultPrevented,true);
  f.key('Escape');f.key('Escape');assert.equal(s.aside.hidden,true);assert.ok(f.document.activeElement===f.el('field'));
 }finally{s.owner.destroy();await f.cleanup()}
});
test('focus-guard exact shell native summary activation stays uncancelled and cannot leave stale owner focus',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  await s.click(f.el('menu'));const summary=s.help.querySelector('summary');const event=f.captured('click',summary);
  assert.equal(event.defaultPrevented,false);assert.equal(event.stopped,false);assert.equal(s.aside.hidden,true);
  // Native details default action is modeled explicitly; pinned production CSS
  // hides this summary, so actual-browser summary activation remains NOT_RUN.
  s.help.open=true;f.send(s.help,'toggle');await flush();assert.ok(f.document.activeElement===s.close);
  await f.browserOrderPointerClick(f.el('menu'));f.send(s.help,'toggle');await flush();assert.equal(s.help.open,false);assert.equal(s.aside.hidden,false);assert.ok(s.aside.contains(f.document.activeElement));
 }finally{s.owner.destroy();await f.cleanup()}
});
test('focus-guard exact shell suspension, resume, disconnected root and teardown release ownership without stale focus or attributes',async()=>{
 const f=await preparedOverlayFixture(),s=exactShell(f);try{
  const external=f.document.createElement('button');let actions=0;external.onclick=()=>actions++;f.document.body.append(external);
  const background=f.root.querySelector('[data-shell-control="up"]'),attrs=[...background.attributes].map(a=>[a.name,a.value]);
  for(const mode of ['menu','help']){
   await s.click(mode==='menu'?f.el('menu'):s.toggle);const owner=mode==='menu'?s.aside:s.help,selected=f.document.activeElement;
   f.hide(true);external.focus();assert.ok(f.document.activeElement===external);assert.equal(f.captured('pointerdown',external).defaultPrevented,false);f.show();assert.ok(f.document.activeElement===selected);
   f.visibility('hidden');external.focus();assert.ok(f.document.activeElement===external);f.visibility('visible');assert.ok(owner.contains(f.document.activeElement));
   const parent=f.root.parentNode,next=f.root.nextSibling;f.root.remove();external.focus();assert.ok(f.document.activeElement===external);assert.equal(f.captured('pointerdown',external).defaultPrevented,false);parent.insertBefore(f.root,next);selected.focus();f.key('Escape');
  }
  await s.click(f.el('menu'));const status=f.el('status');assert.ok(status.parentNode===s.aside);s.owner.destroy();await f.cleanup();assert.ok(status.parentNode===f.root);assert.ok([...f.listeners.values()].every(v=>v.size===0));
  await f.browserOrderPointerClick(external);assert.ok(f.document.activeElement===external);assert.equal(actions,1);assert.deepEqual([...background.attributes].map(a=>[a.name,a.value]),attrs);
 }finally{s.owner.destroy();await f.cleanup()}
});

test('status-row actual canonical save feedback keeps nearby warp and field controls usable after menu close',async()=>{
 const f=await areaFixture(),s=exactShell(f);try{
  await s.click(f.el('menu'));await s.click(f.root.querySelector('[data-menu-page="save"]'));await s.click(f.root.querySelector('[data-ordinary-save]'));
  const status=f.el('status');f.key('Escape');f.key('Escape');assert.ok(status.parentNode===s.header);assert.ok(status.previousElementSibling===f.el('choices'));assert.match(status.textContent,/SLOT_1 저장 완료/);assert.equal(status.hidden,false);assert.ok(f.document.activeElement===f.el('field'));
  const warp=f.world.nearby().find(p=>p.kind==='warp'),button=[...f.el('choices').querySelectorAll('button')].find(n=>n.textContent===warp.label);assert.ok(button);
  const event=await f.browserOrderPointerClick(button);assert.equal(event.click.defaultPrevented,false);assert.equal(event.pointer.defaultPrevented,false);assert.equal(f.world.map.id,warp.targetMapId);assert.equal(status.hidden,false);assert.ok(status.parentNode===s.header);
  f.pointer('up');await flush();assert.equal(f.state.controls.direction,'up','normal field input resumes while sticky feedback remains');f.pointer('up','pointerup');assert.equal(f.state.controls.direction,null);
 }finally{s.owner.destroy();await f.cleanup()}
});
