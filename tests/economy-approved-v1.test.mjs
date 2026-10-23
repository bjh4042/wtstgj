import {beforeConsumablesApproval} from './helpers/before-consumables-approval.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {APPROVED_ECONOMY,ECONOMY_APPROVAL_V1,APPROVED_ECONOMY_HASH,activateApprovedNewGame} from '../dist/economy/approved-v1.mjs';
import {ECONOMY_CANDIDATE,CANDIDATE_HASH,candidatePrize} from '../dist/economy/candidate.mjs';
import {APPROVED_ID,maxHp} from '../dist/economy/contract.mjs';
import {economyAction} from '../dist/economy/actions.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';import {createWorldStore} from '../dist/world/save-store.mjs';
import {cellPosition} from '../dist/world/definition.mjs';import {syncWorldLocation} from '../dist/world/state.mjs';
import {createCanonicalCreature,createGameSession} from '../dist/canonical-session.mjs';
import {SpeciesCatalogService} from '../dist/species-catalog-service.mjs';
import {storyBattleInput} from '../dist/story/save.mjs';
import {startSessionBattle} from '../dist/battle-v3/engine.mjs';import {captureProbability,createBattleRules} from '../dist/battle-v3/rules.mjs';
import {createSaveSlotStore} from '../dist/compatibility/save-slots.mjs';import {freshState} from '../dist/model.mjs';
import {postLeagueFixture,isolatedStorage} from './helpers/enhanced-league-fixture.mjs';
import {fight,seeded} from './helpers/economy-fixture.mjs';import {sha256,stableJSON} from '../dist/compatibility/codec.mjs';
// Economy-approval snapshot before the later 14-item approval; original expectations retained.
const adapter=beforeConsumablesApproval(await loadCanonicalRuntimeAdapter({readText:async f=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')}));
const historical={...adapter,economyPolicy:undefined};
const world=(runtime=null,options={})=>new CanonicalWorld({adapter,runtime,mode:'test',...options});
function at(w,id,options={}){const s=w.snapshot(),p=w.definition.points[id];for(const [dx,dy]of [[0,1],[1,0],[0,-1],[-1,0]]){const pos=cellPosition(p.mapId,p.x+dx,p.y+dy);if(w.host.validLanding(pos,s)){s.position=pos;break}}syncWorldLocation(s,w.host);w.dispose();const n=world(s,options);assert.ok(n.nearby().some(p=>p.id===id),'fixture accessible point '+id);return n}
const resources=s=>({money:s.economy.money,inventory:s.inventory,items:s.progress.items,granted:s.geojeBallsGranted,claims:s.progress.rewardClaims,geojeHistory:s.progress.geojeBallGrantHistory});
async function partner(w){for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await w.story.runEvent(id);return w}
function powered(s,catalog,level=30,id=s.starterId){const m=createCanonicalCreature(catalog,id,level);s.party=[m];for(const k of ['seen','caught'])if(!s.dex[k].includes(id))s.dex[k].push(id);return s}

test('approval reuses exact candidate values; new game allowance once; immutable pending experiment retained',()=>{
 assert.equal(CANDIDATE_HASH,ECONOMY_APPROVAL_V1.candidateSha256);assert.equal(APPROVED_ECONOMY_HASH,sha256(stableJSON(APPROVED_ECONOMY)));
 const {id,approvalStatus,defaultEnabled,approval,...values}=APPROVED_ECONOMY;
 const {id:oldId,approvalStatus:oldStatus,defaultEnabled:oldDefault,...oldValues}=ECONOMY_CANDIDATE;assert.deepEqual(values,oldValues);assert.equal(oldDefault,false);assert.equal(oldStatus,'PENDING_USER_APPROVAL');
 const w=world(),s=w.snapshot();assert.equal(s.economy.money,3000);assert.equal(s.economy.policyId,APPROVED_ID);assert.equal(s.candidatePolicyId,undefined);
 assert.deepEqual(activateApprovedNewGame(s,w.catalog),s);const resumed=world(s);assert.deepEqual(resumed.snapshot(),s);resumed.dispose();w.dispose();
});

test('existing ordinary saves preserve money/items/progress, no allowance; isolated slots/backup and candidate import stay separate',()=>{
 const old=world(null,{adapter:historical}),original=old.snapshot();original.economy.money=1234;original.inventory.ecology_ball=2;
 const storage=isolatedStorage(),legacy=new SpeciesCatalogService({namespace:'work-v2'}),slots=createSaveSlotStore(storage,{canonicalCatalog:old.catalog,legacyCatalog:legacy});
 slots.save('SLOT_1',freshState(70,'boy'));slots.save('SLOT_2',original);slots.save('SLOT_3',old.snapshot());const before=[1,2,3].map(i=>slots.peek('SLOT_'+i));
 const n=world(),store=createWorldStore(storage,n.catalog,n.host),raw=store.load('SLOT_2');const loaded=world(raw);assert.deepEqual(raw,original);assert.deepEqual(resources(loaded.snapshot()),resources(original));assert.equal(loaded.snapshot().economy.policyId,APPROVED_ID);assert.equal(Object.keys(loaded.snapshot().economy.transactions).length,0);assert.throws(()=>activateApprovedNewGame(loaded.snapshot(),loaded.catalog),/new-game/);
 const zero=world(store.load('SLOT_3'));assert.equal(zero.snapshot().economy.money,0);assert.equal(Object.keys(zero.snapshot().economy.transactions).length,0);
 assert.deepEqual([1,2,3].map(i=>slots.peek('SLOT_'+i)),before);store.save('SLOT_2',loaded.snapshot());assert.deepEqual(store.load('SLOT_2',{backup:true}),original);assert.equal(slots.peek('SLOT_1'),before[0]);assert.equal(slots.peek('SLOT_3'),before[2]);
 const experiment=world(null,{candidate:true});assert.throws(()=>store.save('SLOT_2',experiment.snapshot()),/Candidate/);assert.throws(()=>world(experiment.snapshot()),/Candidate/);
 for(const w of [old,n,loaded,zero,experiment])w.dispose();
});

test('ordinary placed shop/heal/aid/research interactions use approved atomic actions and retain pending item restrictions',async()=>{
 let w=await partner(world());w=at(w,'shop:PROLOGUE');
 const buy={transactionId:'buy',itemId:'ecology_ball',quantity:2};await w.interact('shop:PROLOGUE',buy);await w.interact('shop:PROLOGUE',buy);assert.equal(w.snapshot().economy.money,2600);assert.equal(w.snapshot().inventory.ecology_ball,2);
 for(const args of [{itemId:'affinity_ball',quantity:1},{itemId:'geoje_ball',quantity:1},{itemId:'potion',quantity:1},{itemId:'ecology_ball',quantity:-1}])await assert.rejects(()=>w.interact('shop:PROLOGUE',{transactionId:'invalid',...args}));
 const damaged=w.snapshot();damaged.party[0].hp=0;damaged.party[0].status='poison';damaged.party[0].moves[0].pp=0;damaged.economy.money=0;damaged.inventory.ecology_ball=0;w.dispose();w=at(world(damaged),'heal:PROLOGUE');
 await w.interact('heal:PROLOGUE',{type:'heal',transactionId:'heal'});assert.equal(w.snapshot().party[0].hp,maxHp(w.catalog,w.snapshot().party[0]));assert.equal(w.snapshot().party[0].status,null);assert.equal(w.snapshot().economy.lastHub,'CENTER:PROLOGUE');
 await w.interact('heal:PROLOGUE',{type:'ball-aid',transactionId:'aid'});await w.interact('heal:PROLOGUE',{type:'ball-aid',transactionId:'aid'});assert.equal(w.snapshot().inventory.ecology_ball,3);await assert.rejects(()=>w.interact('heal:PROLOGUE',{type:'ball-aid',transactionId:'aid-new'}));
 // Fault-only draft proves Geoje possessions neither supply nor block ordinary-ball aid.
 const fault=w.snapshot();fault.inventory.ecology_ball=0;fault.inventory.geoje_ball=1;const history=structuredClone(fault.progress.geojeBallGrantHistory);economyAction(fault,w.catalog,{type:'ball-aid',transactionId:'fault-aid',hubId:'CENTER:PROLOGUE'},w.host);assert.equal(fault.inventory.ecology_ball,3);assert.equal(fault.inventory.geoje_ball,1);assert.deepEqual(fault.progress.geojeBallGrantHistory,history);
 await w.interact('heal:PROLOGUE',{type:'research-accept',transactionId:'accept'});
 for(const point of Object.keys(w.host.points)){w=at(w,point);await w.interact(point,{transactionId:point})}
 w=at(w,'heal:PROLOGUE');await w.interact('heal:PROLOGUE',{type:'research-report',round:1,transactionId:'report'});await w.interact('heal:PROLOGUE',{type:'research-report',round:1,transactionId:'report'});assert.equal(w.snapshot().economy.money,400);
 await w.interact('heal:PROLOGUE',{type:'research-accept',transactionId:'accept2'});await assert.rejects(()=>w.interact('heal:PROLOGUE',{type:'research-report',round:2,transactionId:'report2'}),/3곳/);w.dispose();
});

let kitSave;
async function kit(){if(kitSave)return structuredClone(kitSave);let w=await partner(world());const s=powered(w.snapshot(),w.catalog);w.dispose();w=world(s);await w.story.runEvent('RIVAL_00',{rng:()=>.4,battleDriver:fight});await w.story.runEvent('P03_TUTORIAL');kitSave=w.snapshot();w.dispose();return structuredClone(kitSave)}
test('normal main trainer prize routes once through result commit; confirmed kit remains once-only',async()=>{
 let w=await partner(world());const s=powered(w.snapshot(),w.catalog);w.dispose();let fail=true,calls=0;
 w=world(s,{persist:()=>{if(fail)throw Error('prize-save-fault')}});const level=Math.max(...w.story.resolveTrainerParty('RIVAL_00').members.map(m=>m.level));
 await assert.rejects(()=>w.story.runEvent('RIVAL_00',{rng:()=>.4,battleDriver:b=>{calls++;return fight(b)}}),/prize-save-fault/);assert.equal(w.snapshot().economy.money,3000);fail=false;await w.story.retryCommit();assert.equal(calls,1);assert.equal(w.snapshot().economy.money,3000+level*80);
 await w.story.runEvent('RIVAL_00');assert.equal(calls,1);assert.equal(w.snapshot().economy.money,3000+level*80);await w.story.runEvent('P03_TUTORIAL');const k=w.snapshot();assert.equal(k.inventory.ecology_ball,5);assert.equal(k.progress.items.potion,3);assert.equal(k.progress.items.eco_dex,1);await w.story.runEvent('P03_TUTORIAL');assert.deepEqual(w.snapshot(),k);
 // Representative ID classifications use the unchanged shared calculation, no extra battles.
 for(const [id,rate] of [['ROUTE_S1_01',40],['BLACKNET_BOMI_FINAL',80],['NPC_GYM_01_KANGMIN',120],['NPC_CHAMPION_DOCTOR_YOON',120]]){const d=w.snapshot(),p={members:[{level:7},{level:9}]};candidatePrize(d,{id},p,'fixture','won',APPROVED_ECONOMY);const money=d.economy.money;assert.equal(money,k.economy.money+9*rate);candidatePrize(d,{id},p,'fixture','won',APPROVED_ECONOMY);assert.equal(d.economy.money,money)}w.dispose();
});

test('approved ordinary Geoje probability and failure; historical running battle unchanged; illegal capture rejected',async()=>{
 const s=await kit(),w=world(s),rules=createBattleRules(adapter);const mon=createCanonicalCreature(w.catalog,'SPECIES_148',70);mon.hp=maxHp(w.catalog,mon)*.25;mon.status='sleep';assert.ok(Math.abs(captureProbability(rules,w.catalog,mon,'geoje_ball')-.57375)<1e-10);
 const {simulateStory}=await import('./helpers/story-fixture.mjs');const historicalGrant=(await simulateStory({allTrainers:false})).checkpoints.POST;
 mon.speciesId='SPECIES_151';mon.hp=maxHp(w.catalog,mon)*.25;assert.ok(Math.abs(captureProbability(rules,w.catalog,mon,'geoje_ball')-.4303125)<1e-10);
 function battle(cat,a,kind='wild',speciesId='SPECIES_010'){
  const input=storyBattleInput(historicalGrant,w.catalog);delete input.encounter;delete input.encounterVersion;
  input.economy=structuredClone(s.economy);
  if(!cat.economyPolicy){input.economy.policyId=null;input.economy.approvalStatus='CONFIRMED_FUNCTIONS_ONLY';delete input.economy.policyVersion}
  input.inventory.geoje_ball=1;assert.equal(input.geojeBallsGranted,6);assert.equal(historicalGrant.progress.geojeBallGrantHistory.length,3);
  return startSessionBattle(createGameSession(input,cat),{kind,opponents:[{namespace:'canonical',speciesId,level:3}],rng:()=>.999},{adapter:a});
 }
 const oldCatalog=new SpeciesCatalogService({namespace:'canonical',adapter:historical}),oldBattle=battle(oldCatalog,historical),approved=battle(w.catalog,adapter);approved.act({type:'capture',ballId:'geoje_ball'});const r=approved.snapshot().events.find(e=>e.type==='capture');assert.ok(r.probability<1&&r.probability<=.95);assert.equal(r.success,false);
 // An already-started historical battle retains its captured policy while a new session uses v1.
 oldBattle.act({type:'capture',ballId:'geoje_ball'});assert.equal(oldBattle.snapshot().events.find(e=>e.type==='capture').probability,1);
 const trainer=battle(w.catalog,adapter,'trainer'),before=trainer.snapshot();assert.throws(()=>trainer.act({type:'capture',ballId:'geoje_ball'}),/trainer/);assert.deepEqual(trainer.snapshot(),before);
 const forbidden=Object.values(w.catalog.encounterContract.chains).find(ch=>!ch.ballAllowed).baseId;assert.throws(()=>battle(w.catalog,adapter,'wild',forbidden),/prohibited/);assert.throws(()=>battle(w.catalog,adapter,'trainer','EDNA_01'));
 const cap=createCanonicalCreature(w.catalog,'SPECIES_010',5);cap.hp=1;cap.status='sleep';assert.equal(captureProbability(rules,w.catalog,cap,'geoje_ball',5),.95);w.dispose();
});

test('designated tutorial refill and third ecology-ball guarantee survive approval without double aid',async()=>{
 const s=await kit();s.inventory.ecology_ball=0;const w=world(s);const before=w.snapshot().economy.money;
 await assert.rejects(()=>w.story.economyCommand({type:'ball-aid',transactionId:'tutorial-aid',hubId:w.host.initialHub}));
 await w.story.enterArea('P_ECO_CENTER_EDGE','land_grass');let events;await w.story.runTutorialCapture({rng:()=>.999,battleDriver:b=>{for(let n=0;n<3&&b.snapshot().phase!=='ended';n++)b.act({type:'capture',ballId:'ecology_ball'});events=b.snapshot().events;assert.equal(b.snapshot().outcome,'captured')}});
 const attempts=events.filter(e=>e.type==='capture');assert.equal(attempts.length,3);assert.equal(attempts[0].probability>=.7,true);assert.equal(attempts[2].probability,1);assert.equal(events.filter(e=>e.type==='tutorial-refill').length,1);assert.equal(w.snapshot().economy.money,before);w.dispose();
});

test('POST Harin and enhanced league keep EXP-only settlement with approved economy (one-opponent fixtures)',async()=>{
 for(const kind of ['harin','league']){
  const a=structuredClone(adapter),id='NPC_ELITE_01_YUNWOO';let s=postLeagueFixture(a);const probe=world(s);s=powered(s,probe.catalog,90,'SPECIES_006');probe.dispose();
  if(kind==='harin'){s.starterId='SPECIES_007';for(const k of ['seen','caught'])if(!s.dex[k].includes(s.starterId))s.dex[k].push(s.starterId);a.harinPostRematch.variants[s.starterId].party.members=a.harinPostRematch.variants[s.starterId].party.members.slice(0,1)}
  else a.battleRuntime.enhancedEliteParties.teams[id].party.members=a.battleRuntime.enhancedEliteParties.teams[id].party.members.slice(0,1);
  let w=world(s,{adapter:a});w=at(w,kind==='harin'?'post:harin':'league:enhanced:entry',{adapter:a,battleDriver:fight,rng:()=>.4});
  if(kind==='league')await w.interact('league:enhanced:entry',{type:'begin',transactionId:'begin'});
  const before=w.snapshot(),point=kind==='harin'?'post:harin':'league:enhanced:entry',req=kind==='harin'?{type:'challenge',sequence:1}:{type:'next',attempt:1,index:0};
  await w.interact(point,req);const after=w.snapshot();assert.ok(after.party[0].totalExp>before.party[0].totalExp);assert.deepEqual(resources(after),resources(before));await w.interact(point,req);assert.deepEqual(w.snapshot(),after);w.dispose();
 }
});

test('normal loss uses visited hub, no refund or money loss, approved heal path retained',async()=>{
 let w=await partner(world());const s=w.snapshot();s.party[0]=createCanonicalCreature(w.catalog,s.starterId,1);s.party[0].hp=1;s.progress.items.potion=1;s.economy.lastHub=w.host.initialHub;w.dispose();w=world(s);
 await w.story.runTrainer('RIVAL_00',{rng:seeded(77),battleDriver:b=>{let snap=b.act({type:'item',itemId:'potion',instanceId:s.party[0].instanceId,transactionId:'loss-item'});for(let n=0;n<80&&snap.phase!=='ended';n++){snap=b.act({type:'move',moveId:snap.party[0].moves.find(m=>m.pp>0)?.id??'SYSTEM_STRUGGLE'})}assert.equal(snap.outcome,'lost')}});
 const after=w.snapshot();assert.equal(after.economy.money,s.economy.money);assert.equal(after.progress.items.potion,0);assert.equal(after.party[0].hp,maxHp(w.catalog,after.party[0]));assert.equal(w.host.validLanding(after.position,after),true);w.dispose();
});

test('approved normal-slot purchase preserves atomic retry, backup and stale-tab protection before/after write faults',async()=>{
 for(const afterWrite of [false,true]){
  let w=at(world(),'shop:PROLOGUE');const storage=isolatedStorage(),base=createWorldStore(storage,w.catalog,w.host);base.save('SLOT_1',w.snapshot());
  const stale=createWorldStore(storage,w.catalog,w.host);stale.load('SLOT_1');let fail=true;
  const faulty={...storage,setItem:(k,v)=>{if(fail&&k.endsWith('.primary')&&!afterWrite)throw Error('write fault');storage.setItem(k,v);if(fail&&k.endsWith('.primary')&&afterWrite)throw Error('write fault')}};
  const store=createWorldStore(faulty,w.catalog,w.host);const initial=store.load('SLOT_1');w.dispose();w=world(initial,{persist:s=>store.save('SLOT_1',s)});
  const req={transactionId:'persist-buy',itemId:'ecology_ball',quantity:2};await assert.rejects(()=>w.interact('shop:PROLOGUE',req),/write fault/);assert.equal(w.snapshot().economy.money,3000);const durable=base.load('SLOT_1');assert.equal(durable.economy.money,afterWrite?2600:3000);assert.equal(durable.inventory.ecology_ball,afterWrite?2:0);
  fail=false;await w.story.retryCommit();await w.interact('shop:PROLOGUE',req);assert.equal(w.snapshot().economy.money,2600);assert.equal(w.snapshot().inventory.ecology_ball,2);assert.throws(()=>stale.save('SLOT_1',initial),/another tab/);w.dispose();
 }
});
