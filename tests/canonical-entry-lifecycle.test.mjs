import {createRegionEntryPopup} from '../dist/ui/region-entry-popup.mjs';
import {installOrdinaryMenu} from '../dist/ui/ordinary-menu.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

// Execute the complete actual entry, not a second implementation of its RAF loop.
// Only its module bindings are injected so DOM, paint and time are deterministic.
// Controls, world, saves, battle rules and the terminal presentation tail are real.
const patchRoot=new URL('../',import.meta.url);
const base=patchRoot;
const mod=path=>import(new URL(path,base));
const require=createRequire(import.meta.url);
const {parseHTML}=require('linkedom');
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
const sourcePath=new URL('dist/world/entry.mjs',patchRoot);
const source=readFileSync(sourcePath,'utf8');
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};

async function fixture({entry=source,runtime=null,paintFailure=false,ordinary=false,firstRaf=1}={}){
 const {document,window}=parseHTML('<html><body></body></html>');
 let visibility='visible',focus=document.body,clock=1000,nextRaf=firstRaf-1;
 Object.defineProperty(document,'visibilityState',{get:()=>visibility});
 Object.defineProperty(document,'activeElement',{get:()=>focus?.isConnected?focus:document.body});
 window.HTMLElement.prototype.focus=function(){focus=this};
 window.HTMLElement.prototype.setPointerCapture=function(){};
 window.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,setTransform(){}}};
 const queue=new Map(),allFrames=new Map(),listeners=new Map(),memoryStore=memory();
 const counts={ticks:0,draws:0,worldDisposes:0,controlDisposes:0,environmentStops:0,evolutionStops:0,battleStops:0,battleCreates:0,saves:0,finishes:0};
 const state={worlds:[],dt:[],visuals:[],controls:null,hooks:null,tail:null,persistGate:null,terminalGate:null,paintFailure};
 function track(target,label){
  const add=target.addEventListener.bind(target),remove=target.removeEventListener.bind(target);
  target.addEventListener=(type,fn,options)=>{const key=label+':'+type;if(!listeners.has(key))listeners.set(key,new Set());listeners.get(key).add(fn);return add(type,fn,options)};
  target.removeEventListener=(type,fn,options)=>{listeners.get(label+':'+type)?.delete(fn);return remove(type,fn,options)};
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
 const bindings={createRegionEntryPopup,installOrdinaryMenu,document,window,location:{search:'?qa=1',reload(){throw Error('Unexpected reload')}},localStorage:memoryStore,
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
 const f={document,window,root,el,counts,state,queue,allFrames,listeners,memoryStore,environment,
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

function listenerSnapshot(f){return Object.fromEntries([...f.listeners].map(([k,v])=>[k,v.size]))}
function assertNoGlobalListeners(f){assert.ok([...f.listeners.values()].every(v=>v.size===0),JSON.stringify(listenerSnapshot(f)))}

// The unpatched revision is an executable negative control, never modified.
test('negative control: frozen V2 actual entry reproduces retained DOM but dead movement/paint after Back',async t=>{
 const oldPath=new URL('./fixtures/frozen-retry-v2/dist/world/entry.mjs',import.meta.url);
 assert.ok(existsSync(oldPath),'vendored historical negative-control fixture must exist');
 const f=await fixture({entry:readFileSync(oldPath,'utf8')});await f.frame();const before=f.world.snapshot(),draws=f.counts.draws;
 f.hide(true);f.show();await f.press('ArrowLeft');await f.frame();
 assert.deepEqual(f.world.snapshot().position,before.position);assert.equal(f.counts.draws,draws);assert.equal(f.pending,0);assert.equal(f.counts.worldDisposes,1);
});

test('actual canonical entry + real controls/world resumes Left/Up movement, ticking and painting across repeated Back cycles',async()=>{
 const f=await fixture();try{
  await f.frame();const initialWorld=f.world,listeners=listenerSnapshot(f),initial=f.world.snapshot();
  await f.el('save').onclick();const saved=[...f.memoryStore.map];assert.ok(saved.length);
  for(let cycle=0;cycle<5;cycle++){
   const before=f.world.snapshot(),draws=f.counts.draws,ticks=f.counts.ticks;
   f.key('ArrowLeft');await flush();f.hide(true);const atHide=f.world.snapshot();
   assert.equal(f.state.controls.direction,null);assert.equal(f.pending,0);assert.equal(f.counts.worldDisposes,0);assert.equal(f.counts.environmentStops,0);
   await f.press('ArrowUp');await f.frame(5000);assert.deepEqual(f.world.snapshot().position,atHide.position);assert.equal(f.counts.draws,draws);assert.equal(f.counts.ticks,ticks);
   f.show();f.show();assert.equal(f.pending,1);await f.frame();assert.equal(f.counts.draws,draws+1);assert.equal(f.counts.ticks,ticks+1);assert.ok(f.state.dt.at(-1)<=.05);
   assert.deepEqual(f.world.snapshot().position,atHide.position,'held key must not replay on restore');
   await f.press(cycle%2?'ArrowRight':'ArrowUp');assert.ok(f.world.snapshot().world.walkedTiles>before.world.walkedTiles,'real movement continues after Back');
   await f.frame();assert.deepEqual(JSON.parse(f.el('field').dataset.paintPosition),f.world.snapshot().position);
   assert.equal(f.world,initialWorld);assert.equal(f.state.worlds.length,1);assert.deepEqual(listenerSnapshot(f),listeners);
  }
  assert.ok(f.world.snapshot().world.walkedTiles>initial.world.walkedTiles);assert.equal(f.root.dataset.renderError,undefined);
  const beforeMenu=f.world.snapshot().position;f.key('m');await f.press('ArrowLeft');assert.deepEqual(f.world.snapshot().position,beforeMenu);f.key('m');await f.press('ArrowLeft');assert.notDeepEqual(f.world.snapshot().position,beforeMenu);
  await f.el('save').onclick();assert.ok(f.counts.saves>1);assert.equal(f.state.worlds.length,1);
 }finally{await f.cleanup()}assert.equal(f.counts.worldDisposes,1);assert.equal(f.counts.controlDisposes,1);assert.equal(f.counts.environmentStops,1);assertNoGlobalListeners(f);
});


test('ordinary-mode actual entry preserves the same active slot and input/save controls through Back',async()=>{
 const f=await fixture({ordinary:true});try{
  assert.ok(f.root.classList.contains('ordinary-world'));assert.equal(f.root.dataset.slot,'SLOT_1');
  f.memoryStore.setItem('existing-user-save-sentinel','unchanged');const initialWorld=f.world,before=f.world.snapshot();
  const save=f.root.querySelector('[data-ordinary-save]');await save.onclick();const bytes=[...f.memoryStore.map],saves=f.counts.saves;
  for(let i=0;i<3;i++){f.hide(true);f.show();await f.frame();assert.equal(f.pending,1);assert.equal(f.world,initialWorld)}
  assert.deepEqual([...f.memoryStore.map],bytes,'navigation alone must not rewrite save bytes');assert.equal(f.counts.saves,saves);
  await f.press('ArrowLeft');await f.press('ArrowUp');await f.frame();assert.equal(f.world.snapshot().world.walkedTiles,before.world.walkedTiles+2);
  assert.equal(f.counts.saves,saves+2);assert.equal(f.root.dataset.slot,'SLOT_1');assert.equal(f.memoryStore.getItem('existing-user-save-sentinel'),'unchanged');
  f.key('m');assert.equal(f.root.querySelector('aside').hidden,false);f.key('m');assert.equal(f.root.querySelector('aside').hidden,true);
  assert.deepEqual(JSON.parse(f.el('field').dataset.paintPosition),f.world.snapshot().position);
 }finally{await f.cleanup()}assertNoGlobalListeners(f);
});

test('visibility/pagehide ordering, duplicate events and stale canceled RAF callbacks never create a second owner',async()=>{
 const f=await fixture({firstRaf:0});try{
  await f.frame();const [oldId,oldCallback]=[...f.queue.entries()][0];const before=f.counts.draws;
  f.pointer('up');await flush();f.visibility('hidden');assert.equal(f.pending,0);assert.equal(f.state.controls.direction,null);
  f.hide(true);f.visibility('visible');assert.equal(f.pending,0,'visible alone cannot bypass pending pageshow');
  f.show();f.show();f.visibility('visible');assert.equal(f.pending,1);
  oldCallback(f.clock+10);assert.equal(f.counts.draws,before);assert.equal(f.pending,1,'stale callback cannot replace owned RAF');
  await f.frame();assert.equal(f.counts.draws,before+1);assert.equal(f.pending,1);
  f.visibility('hidden');f.show();assert.equal(f.pending,0,'pageshow while hidden must wait for visible');
  f.visibility('visible');assert.equal(f.pending,1);await f.frame();assert.equal(f.pending,1);
  for(const type of ['pointerup','pointercancel','lostpointercapture']){f.advance();f.pointer('up');await flush();f.pointer('up',type);assert.equal(f.state.controls.direction,null)}
  f.advance();f.key('ArrowRight');await flush();f.send(f.window,'blur');assert.equal(f.state.controls.direction,null);await f.frame();
  assert.ok(f.allFrames.has(oldId));
 }finally{await f.cleanup()}assertNoGlobalListeners(f);
});

test('final pagehide disposes once and rejects stale frames, UI events and late battle callbacks',async()=>{
 const f=await fixture();await f.frame();const stale=[...f.queue.values()][0],hooks=f.state.hooks;
 f.hide(false);const counts={...f.counts},before=f.world.snapshot(),status=f.el('status').textContent;
 f.hide(false);f.show();f.visibility('visible');stale(f.clock+10);await f.press('ArrowUp');await f.el('new').onclick();hooks.battleFinished('won');hooks.battleReady({});await flush();
 assert.deepEqual(f.counts,counts);assert.deepEqual(f.world.snapshot(),before);assert.equal(f.el('status').textContent,status);assert.equal(f.pending,0);assert.equal(f.state.worlds.length,1);assertNoGlobalListeners(f);
});

test('pending real movement/save commits through persisted hide once and repaint uses the committed position',async()=>{
 const f=await fixture();try{
  await f.el('save').onclick();const before=f.world.snapshot(),saves=f.counts.saves;f.state.persistGate=deferred();
  f.key('ArrowLeft');await flush();assert.equal(f.world.busy,true);f.hide(true);f.state.persistGate.resolve();f.state.persistGate=null;await flush();
  assert.equal(f.world.busy,false);assert.equal(f.world.snapshot().world.walkedTiles,before.world.walkedTiles+1);assert.equal(f.counts.saves,saves+1);
  const committed=f.world.snapshot();f.show();await f.frame();assert.deepEqual(JSON.parse(f.el('field').dataset.paintPosition),committed.position);assert.deepEqual(f.world.snapshot(),committed);
 }finally{await f.cleanup()}
});

async function battleRuntime(){
 const world=new CanonicalWorld({adapter,hooks:{dialogue:async()=>{}},rng:()=>.99});
 for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await world.story.runEvent(id);
 const runtime=world.snapshot();runtime.party=[createCanonicalCreature(world.catalog,'SPECIES_003',100)];
 for(const key of ['seen','caught'])if(!runtime.dex[key].includes('SPECIES_003'))runtime.dex[key].push('SPECIES_003');world.dispose();return runtime;
}
const rules=createBattleRules(adapter);
function bestMove(world,s){const player=s.party[s.active],enemy=s.opponents[s.enemyActive];return player.moves.filter(m=>m.pp>0).sort((a,b)=>damage(b.id)-damage(a.id))[0]?.id??'SYSTEM_STRUGGLE';function damage(id){const move=rules.moves[id];return move.power?calculateDamage({rules,catalog:world.catalog,move,attacker:player,defender:enemy}).damage:0}}

test('actual battle terminal delivery while paused preserves reward/save exactly once and drains retained tail on restore',async()=>{
 const f=await fixture({runtime:await battleRuntime()});try{
  await f.el('save').onclick();const before=f.world.snapshot(),saves=f.counts.saves;
  const operation=f.world.story.runTrainer('RIVAL_00',f.world.options());
  for(let i=0;i<100&&!f.state.visuals.length;i++){await flush();if(!f.el('dialogue').hidden)f.el('continue').onclick()}
  assert.equal(f.state.visuals.length,1);const visual=f.state.visuals[0];
  f.state.terminalGate=deferred();let battle=visual.snapshot;
  for(let turn=0;turn<100&&battle.phase!=='ended';turn++){
   visual.busy=false;
   const moveId=bestMove(f.world,battle),label=f.world.catalog.getMoveById(moveId).name;
   const action=[...f.el('battle-actions').querySelectorAll('button')].find(b=>b.textContent.startsWith(label+' ('));
   assert.ok(action,'real battle move button');await action.onclick();await flush();battle=visual.snapshot;
  }
  assert.equal(battle.phase,'ended');assert.equal(battle.outcome,'won');
  visual.busy=true;f.hide(true);f.state.terminalGate.resolve();await flush();
  for(let i=0;i<50&&f.world.busy;i++){await flush()}
  await operation;assert.equal(f.state.tail.pending,true,'terminal callback must not be dropped just because field RAF is paused');
  const committed=f.world.snapshot();assert.ok(committed.progress.defeatedTrainers.includes('RIVAL_00'));assert.ok(committed.economy.money>before.economy.money);assert.equal(f.counts.saves,saves+1);assert.equal(f.counts.finishes,0);
  f.state.hooks.battleFinished('won');assert.equal(f.state.tail.pending,true);f.show();visual.busy=false;await f.frame();
  assert.equal(f.state.tail.pending,false);assert.equal(f.counts.finishes,1);assert.equal(f.el('battle-panel').hidden,true);assert.deepEqual(f.world.snapshot(),committed);
  for(let i=0;i<3;i++){f.hide(true);f.show();await f.frame()}
  f.state.hooks.battleFinished('won');assert.equal(f.counts.finishes,1);assert.equal(f.counts.saves,saves+1);assert.deepEqual(f.world.snapshot(),committed);
 }finally{await f.cleanup()}
});

test('resumed render failure keeps one RAF and terminal tail times out without replaying mechanics',async()=>{
 const f=await fixture();try{
  await f.frame();const before=f.world.snapshot();
  const token=f.state.tail.begin();f.state.tail.settle(token,'won',f.clock);f.hide(true);f.advance(9000);f.show();f.state.paintFailure=true;
  await f.frame();assert.equal(f.pending,1);assert.equal(f.counts.finishes,1);assert.match(f.root.dataset.renderError,/QA paint failure/);assert.deepEqual(f.world.snapshot(),before);
  f.state.paintFailure=false;await f.frame();assert.equal(f.pending,1);assert.equal(f.counts.finishes,1);
 }finally{await f.cleanup()}
});

test('V2 actual entry checkbox Tab, X/M and touch close keep modal ownership and restore field focus',async()=>{
 const f=await fixture({ordinary:true});try{
  const position=f.world.snapshot().position;
  f.el('menu').click();f.root.querySelector('[data-menu-page="settings"]').click();let box=f.root.querySelector('[data-large-text]');box.focus();
  assert.equal(f.send(box,'keydown',{key:'Tab'}).defaultPrevented,true);assert.equal(f.document.activeElement.dataset.menuFocus,'back');
  assert.equal(f.send(f.document.activeElement,'keydown',{key:'Tab',shiftKey:true}).defaultPrevented,true);assert.equal(f.document.activeElement,box);
  f.send(box,'keydown',{key:'x'});assert.equal(f.document.activeElement.dataset.menuPage,'settings');
  f.root.querySelector('[data-menu-page="settings"]').click();box=f.root.querySelector('[data-large-text]');box.focus();f.send(box,'keydown',{key:'m'});assert.equal(f.root.querySelector('aside').hidden,true);assert.equal(f.document.activeElement,f.el('field'));
  f.el('menu').click();f.el('menu').click();assert.equal(f.root.querySelector('aside').hidden,true);assert.equal(f.document.activeElement,f.el('field'));
  f.el('menu').click();f.el('cancel').click();assert.equal(f.root.querySelector('aside').hidden,true);assert.equal(f.document.activeElement,f.el('field'));
  assert.deepEqual(f.world.snapshot().position,position);
 }finally{await f.cleanup()}assertNoGlobalListeners(f);
});
test('V2 actual entry all-unseen Dex select traps Tab, native selection keys never move field',async()=>{
 const f=await fixture({ordinary:true});try{
  const before=JSON.stringify(f.world.snapshot());f.el('menu').click();f.root.querySelector('[data-menu-page="dex"]').click();const select=f.root.querySelector('[data-dex-filter]');select.focus();
  assert.equal(f.root.querySelectorAll('[data-dex-id]:not(:disabled)').length,0);
  assert.equal(f.send(select,'keydown',{key:'ArrowDown'}).defaultPrevented,false);assert.equal(f.document.activeElement,select);assert.equal(f.send(select,'keydown',{key:'Enter'}).defaultPrevented,false);
  assert.equal(f.send(select,'keydown',{key:'Tab'}).defaultPrevented,true);assert.equal(f.document.activeElement.dataset.menuFocus,'back');
  f.send(f.document.activeElement,'keydown',{key:'Tab',shiftKey:true});assert.equal(f.document.activeElement,select);f.send(select,'keydown',{key:'Escape'});assert.equal(f.document.activeElement.dataset.menuPage,'dex');
  assert.equal(JSON.stringify(f.world.snapshot()),before);assert.equal(f.counts.saves,0);
 }finally{await f.cleanup()}assertNoGlobalListeners(f);
});
test('V2 actual entry rerender preserves search draft/caret and select focus, with X/M as text',async()=>{
 const f=await fixture({ordinary:true});try{
  f.window.HTMLElement.prototype.setSelectionRange=function(start,end,direction){Object.assign(this,{selectionStart:start,selectionEnd:end,selectionDirection:direction})};
  f.el('menu').click();f.root.querySelector('[data-menu-page="dex"]').click();const search=f.root.querySelector('[data-dex-search]');search.focus();search.value='xm동백';search.oninput();search.setSelectionRange(1,3,'backward');
  for(const key of ['x','m','z','ArrowLeft','ArrowRight'])assert.equal(f.send(search,'keydown',{key}).defaultPrevented,false);
  await f.el('action').onclick();await flush();const current=f.document.activeElement;assert.notEqual(current,search);assert.equal(current.isConnected,true);assert.equal(current.dataset.menuFocus,'dex-search');assert.equal(current.value,'xm동백');assert.equal(current.selectionStart,1);assert.equal(current.selectionEnd,3);assert.equal(current.selectionDirection,'backward');
  assert.equal(f.send(current,'keydown',{key:'Enter'}).defaultPrevented,true);assert.equal(f.document.activeElement.dataset.menuFocus,'dex-search');
  const select=f.root.querySelector('[data-dex-filter]');select.focus();select.querySelector('[value="unseen"]').selected=true;select.onchange();await f.el('action').onclick();await flush();assert.equal(f.document.activeElement.dataset.menuFocus,'dex-filter');assert.equal(f.document.activeElement.value,'unseen');assert.equal(f.document.activeElement.isConnected,true);
  assert.equal(f.counts.saves,0);assert.equal(f.root.querySelector('aside').hidden,false);
 }finally{await f.cleanup()}assertNoGlobalListeners(f);
});
test('V2 actual entry real item-use restores party action or safe heading; BODY fallback arrows stay in menu',async()=>{
 for(const quantity of [2,1]){
  const seed=new CanonicalWorld({adapter,hooks:{dialogue:async()=>{}},rng:()=>.99});for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await seed.story.runEvent(id);const runtime=seed.snapshot();seed.dispose();runtime.progress.items={potion:quantity};runtime.party[0].hp=1;
  const f=await fixture({ordinary:true,runtime});try{
   f.el('menu').click();f.root.querySelector('[data-menu-page="party"]').click();const select=f.el('party').querySelector('select');select.querySelector('option').selected=true;const use=f.el('party').querySelector('[data-menu-focus^="item-use:"]');use.focus();const key=use.dataset.menuFocus;
   await use.onclick();await flush();assert.equal(f.world.snapshot().party[0].hp,19);assert.equal(f.world.snapshot().progress.items.potion,quantity-1);assert.equal(f.counts.saves,1);assert.equal(f.document.activeElement.isConnected,true);assert.notEqual(f.document.activeElement,use);assert.equal(f.root.querySelector('aside').hidden,false);
   if(quantity===2)assert.equal(f.document.activeElement.dataset.menuFocus,key);else assert.equal(f.document.activeElement.id,'eco-menu-heading');
   const before=f.world.snapshot().position;f.document.body.focus();assert.equal(f.send(f.document.body,'keydown',{key:'ArrowDown',code:'ArrowDown'}).defaultPrevented,true);assert.equal(f.document.activeElement.dataset.menuFocus,'back');assert.deepEqual(f.world.snapshot().position,before);assert.equal(f.state.controls.direction,null);
   f.document.body.focus();f.send(f.document.body,'keydown',{key:'x'});assert.equal(f.document.activeElement.dataset.menuPage,'party');f.send(f.document.activeElement,'keydown',{key:'m'});assert.equal(f.document.activeElement,f.el('field'));
  }finally{await f.cleanup()}assertNoGlobalListeners(f);
 }
});

test('V3 actual entry retains native-button repeat guard after restored party focus without repeating item use',async()=>{
 const seed=new CanonicalWorld({adapter,hooks:{dialogue:async()=>{}},rng:()=>.99});for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await seed.story.runEvent(id);const runtime=seed.snapshot();seed.dispose();runtime.progress.items={potion:2};runtime.party[0].hp=1;
 const f=await fixture({ordinary:true,runtime});try{
  f.el('menu').click();f.root.querySelector('[data-menu-page="party"]').click();const select=f.el('party').querySelector('select');select.querySelector('option').selected=true;let use=f.el('party').querySelector('[data-menu-focus^="item-use:"]');use.focus();
  const native=f.send(use,'keydown',{key:'Enter',repeat:false});assert.equal(native.defaultPrevented,false);assert.equal(f.counts.saves,0,'no synthesized duplicate click before native activation');await use.onclick();await flush();assert.equal(f.counts.saves,1);assert.equal(f.world.snapshot().progress.items.potion,1);use=f.document.activeElement;
  for(const key of ['Enter',' ']){const repeat=f.send(use,'keydown',{key,repeat:true});assert.equal(repeat.defaultPrevented,true,'held native activation must be cancelled at document/menu ownership');if(!repeat.defaultPrevented)await use.onclick();await flush();assert.equal(f.counts.saves,1);assert.equal(f.world.snapshot().progress.items.potion,1)}
  f.send(use,'keydown',{key:'x'});f.root.querySelector('[data-menu-page="save"]').click();const save=f.root.querySelector('[data-ordinary-save]');save.focus();for(const key of ['Enter',' ']){assert.equal(f.send(save,'keydown',{key,repeat:true}).defaultPrevented,true);assert.equal(f.send(save,'keydown',{key,repeat:false}).defaultPrevented,false)}assert.equal(f.counts.saves,1);
 }finally{await f.cleanup()}assertNoGlobalListeners(f);
});
