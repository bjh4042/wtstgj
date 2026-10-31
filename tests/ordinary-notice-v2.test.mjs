import {allowCanonicalCommand,nativeFrameDelta} from '../dist/world/native-runtime-policy.mjs';
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
 Object.defineProperty(document,'activeElement',{get:()=>focus});
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
 const bindings={allowCanonicalCommand,nativeFrameDelta,createRegionEntryPopup,installOrdinaryMenu,document,window,location:{search:'?qa=1',reload(){throw Error('Unexpected reload')}},localStorage:memoryStore,
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

const KOREAN_GATE='하린과의 첫 대결에서 승리한 뒤 다시 이야기해 주세요.';
const status=f=>f.el('status');
async function tutorialFixture({partner=false,entry=source}={}){
 const seed=new CanonicalWorld({adapter,hooks:{dialogue:async()=>{}},rng:()=>.99});
 if(partner)for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await seed.story.runEvent(id);
 const runtime=seed.snapshot();seed.dispose();
 runtime.position={scene:'world:hub:PROLOGUE',x:20*48+24,y:12*48+24,facing:'up'};
 return fixture({runtime,ordinary:true,entry});
}
async function rejectTutorial(f){
 const point=f.world.definition.points['event:P03_TUTORIAL'];
 const button=[...f.el('choices').querySelectorAll('button')].find(b=>b.textContent===point.label);
 assert.ok(button,'real adjacent P03 interaction button must be present');
 await button.onclick();return status(f);
}

test('ordinary P03 gate reports Korean, remains a rejection, repeats safely and is dismissible with B',async()=>{
 const f=await tutorialFixture({partner:true});try{
  const before=f.world.snapshot(),bytes=[...f.memoryStore.map],saves=f.counts.saves;
  for(let i=0;i<3;i++){
   await rejectTutorial(f);assert.equal(status(f).textContent,KOREAN_GATE);assert.equal(status(f).hidden,false);
   await f.frame();assert.equal(status(f).textContent,KOREAN_GATE,'idle paint must not erase the message');
   assert.deepEqual(f.world.snapshot(),before);assert.deepEqual([...f.memoryStore.map],bytes);assert.equal(f.counts.saves,saves);
   await f.el('cancel').onclick();assert.equal(status(f).hidden,true);assert.equal(status(f).textContent,'');
  }
 }finally{await f.cleanup()}
});

test('ordinary gate hint is cleared by menu transition and does not resurrect after Back',async()=>{
 const f=await tutorialFixture({partner:true});try{
  await rejectTutorial(f);f.hide(true);f.show();await f.frame();assert.equal(status(f).textContent,KOREAN_GATE);
  f.el('menu').onclick();assert.equal(f.root.querySelector('aside').hidden,false);assert.equal(status(f).hidden,true);
  f.el('menu').onclick();f.hide(true);f.show();await f.frame();assert.equal(status(f).hidden,true);
 }finally{await f.cleanup()}
});

test('ordinary unavailable-event hint disappears when an actual new story dialogue starts',async()=>{
 const f=await tutorialFixture();try{
  await rejectTutorial(f);assert.equal(status(f).textContent,KOREAN_GATE);
  const op=f.world.story.runEvent('P00_HOME_START');await flush();
  assert.equal(f.el('dialogue').hidden,false);assert.equal(status(f).hidden,true);assert.ok(f.el('dialogue-text').textContent);
  f.el('continue').onclick();await op;await f.frame();assert.equal(status(f).hidden,true);
  assert.equal(f.world.story.eventCompleted('P00_HOME_START'),true);assert.equal(f.world.story.eventCompleted('P03_TUTORIAL'),false);
 }finally{await f.cleanup()}
});

test('ordinary stale gate is cleared during real Harin dialogue and battle, with no reward or save before outcome',async()=>{
 const f=await tutorialFixture({partner:true});try{
  await rejectTutorial(f);const before=f.world.snapshot(),saves=f.counts.saves;
  const op=f.world.story.runTrainer('RIVAL_00',f.world.options());
  for(let i=0;i<100&&!f.state.visuals.length;i++){
   await flush();assert.equal(status(f).hidden,true,'gate feedback cannot cover trainer dialogue or battle');
   if(!f.el('dialogue').hidden)f.el('continue').onclick();
  }
  assert.equal(f.state.visuals.length,1);assert.equal(f.el('battle-panel').hidden,false);assert.equal(status(f).hidden,true);
  const during=f.world.snapshot();assert.deepEqual(during.progress,before.progress);assert.equal(during.economy.money,before.economy.money);assert.equal(f.counts.saves,saves);
  await f.cleanup();void op;
 }finally{await f.cleanup()}
});

test('ordinary save success survives menu close and rerender, rather than being mistaken for gate feedback',async()=>{
 const f=await tutorialFixture({partner:true});try{
  await rejectTutorial(f);await f.root.querySelector('[data-ordinary-save]').onclick();
  const message=status(f).textContent;assert.match(message,/SLOT_1 저장 완료/);
  f.el('cancel').onclick();await f.frame();assert.equal(status(f).textContent,message);assert.equal(status(f).hidden,false);
 }finally{await f.cleanup()}
});

test('ordinary non-gate save error remains visible through menu and B dismissal',async()=>{
 const f=await tutorialFixture({partner:true});try{
  f.memoryStore.setItem=()=>{throw Error('QA disk full')};
  await f.root.querySelector('[data-ordinary-save]').onclick();assert.match(status(f).textContent,/QA disk full/);
  const message=status(f).textContent;f.el('menu').onclick();f.el('cancel').onclick();await f.frame();
  assert.equal(status(f).textContent,message);assert.equal(status(f).hidden,false);
 }finally{await f.cleanup()}
});

test('negative control: frozen V1 entry retains a stale gate error after B and new dialogue',async()=>{
 const old=readFileSync(new URL('./fixtures/frozen-notice-v1/dist/world/entry.mjs',import.meta.url),'utf8');
 const f=await tutorialFixture({entry:old});try{
  await rejectTutorial(f);f.el('cancel').onclick();assert.equal(status(f).hidden,false);
  const message=status(f).textContent,op=f.world.story.runEvent('P00_HOME_START');await flush();
  assert.equal(f.el('dialogue').hidden,false);assert.equal(status(f).textContent,message);assert.equal(status(f).hidden,false);
  f.el('continue').onclick();await op;
 }finally{await f.cleanup()}
});
