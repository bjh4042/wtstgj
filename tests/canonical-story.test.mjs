import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adapter,catalog,legacyCatalog,game,service,testParty,playBattle,simulateStory,memory} from './helpers/story-fixture.mjs';
import {createGameSession,createCanonicalCreature,canonicalHp} from '../dist/canonical-session.mjs';
import {validateCanonicalStorySave,storyBattleInput,CANONICAL_STORY_SAVE} from '../dist/story/save.mjs';
import {evaluateStoryExpression,setStoryFlag} from '../dist/story/gates.mjs';
import {StoryEventRunner,STORY_OPERATIONS} from '../dist/story/event-runner.mjs';
import {createStoryFieldHooks,storyFieldEvents} from '../dist/story/field-bridge.mjs';
import {startSessionBattle} from '../dist/battle-v3/engine.mjs';
import {createBattlePresentation} from '../dist/battle-v3/presentation.mjs';
import {createSaveSlotStore} from '../dist/compatibility/save-slots.mjs';
import {resolveAsset} from '../dist/asset-runtime.mjs';
import {npcAssets} from '../dist/compatibility/npc-assets.mjs';
import {freshState,validateSave} from '../dist/model.mjs';
import {createGoldenField} from '../dist/golden-field.mjs';
import {fieldInputLocked} from '../dist/field-engine-core.mjs';
const c=adapter.storyRuntime;
const slots=m=>createSaveSlotStore(m,{canonicalCatalog:catalog,legacyCatalog});
async function partner(){const s=service();for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await s.runEvent(id);return s}
const won={rng:()=>.4,battleDriver:playBattle,map:{id:'qa_a',biomeId:'COAST'}};
// All victories in this run are actual Battle v3 outcomes. Test-only Lv100 party is not a balance test.
const full=await simulateStory(),end=full.service.snapshot();
test('Step 6: adapter has 12 stages / 55 ordinary trainers / 22 story opponents',()=>{
 assert.equal(adapter.validation.ready,true);assert.equal(c.sequence.length,12);assert.equal(Object.keys(adapter.trainers).length,55);assert.equal(Object.keys(c.trainers).length,77);assert.equal(Object.keys(c.parties).length,89);
 assert.deepEqual(c.sequence,['PROLOGUE','S1','S2','S3','S4','S5','S6','S7','S8','S9','FINAL','POST']);assert.equal(adapter.active,false);
});
for(const stageId of c.sequence)test(`${stageId}: stage context, ordered prerequisites and unlock`,()=>{
 const st=c.stages[stageId],s=service(full.checkpoints[stageId]);assert.equal(s.stageUnlocked(stageId),true);assert.equal(st.context.stageId,stageId);assert.equal(st.context.encounterActivation,false);assert.equal(st.context.fishingActivation,false);
 if(stageId!=='POST')assert.ok(s.snapshot().progress.completedStages.includes(stageId));else assert.equal(st.completionEnabled,false);
 if(stageId!=='PROLOGUE')assert.equal(service().stageUnlocked(stageId),false);
});
for(const trainer of Object.values(adapter.trainers))test(`${trainer.id}: canonical party, Battle v3 victory and non-repeatable state`,()=>{
 const t=c.trainers[trainer.id],s=service(full.checkpoints[t.stageId]),p=s.resolveTrainerParty(t.id);
 assert.ok(s.snapshot().progress.defeatedTrainers.includes(t.id));assert.equal(s.trainerAvailable(t.id),false);assert.equal(t.repeatable,false);
 assert.deepEqual(p.members.map(m=>[m.speciesId,m.level,m.moveIds]),trainer.party.map(m=>[m.id,m.level,[...new Set(m.moves)]]));
 assert.equal(t.areaId,trainer.areaId);assert.ok(!['S4_POW_CAMP_CORE','S9_HUNGNAM_MEMORIAL_PARK'].includes(t.areaId));
});
for(const [i,g] of c.gyms.entries())test(`Gym ${i+1}: canonical NPC / type / badge / TM / once-only`,async()=>{
 const s=service(full.checkpoints[g.stageId]),before=s.snapshot();assert.equal(c.trainers[g.id].label,['강민','영진','정의','진성','명주','주혁','우상','닥터 채'][i]);assert.deepEqual(g.types,[['water','electric','grass','normal','bug','rock','flying','poison'][i]]);
 assert.ok(s.gymCleared(g.id));assert.ok(s.badgeObtained(g.badgeId));assert.ok(before.ownedTms.includes(g.tmId));assert.ok(s.flag(g.badgeId));
 assert.equal((await s.runEvent(g.eventId)).alreadyCompleted,true);assert.deepEqual(s.snapshot(),before);await assert.rejects(()=>s.runTrainer(g.id,won));
 assert.ok(npcAssets(g.npcId));
});
test('49 flag IDs / 31 gates / 114 events validated; 52 mainline events active, 62 deferred',()=>{
 assert.equal(Object.keys(c.flags).length,49);assert.equal(Object.keys(c.gates).length,31);assert.equal(Object.keys(c.events).length,114);assert.equal(Object.values(c.events).filter(e=>e.active).length,52);assert.equal(end.progress.completedEvents.length,52);
 for(const g of Object.keys(c.gates))assert.equal(typeof full.service.gate(g),'boolean');for(const f of Object.keys(c.flags))assert.equal(typeof full.service.flag(f),'boolean');
 assert.equal(Object.values(end.progress.flags).filter(Boolean).length,33);
});
test('new canonical story starts before starter acquisition, legacy/catalog unchanged',async()=>{
 const s=service(),before=JSON.stringify(catalog.records);assert.equal(s.snapshot().format,CANONICAL_STORY_SAVE);assert.equal(s.snapshot().party.length,0);assert.deepEqual(s.snapshot().dex.caught,[]);
 for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await s.runEvent(id);
 assert.equal(s.snapshot().party[0].speciesId,'SPECIES_001');assert.deepEqual(s.snapshot().dex.caught,['SPECIES_001']);assert.equal(s.snapshot().inventory.ecology_ball,0);
 assert.equal(JSON.stringify(catalog.records),before);assert.equal(legacyCatalog.namespace,'work-v2');
});
test('flags set/query/clear use canonical IDs, persistent provenance cannot be forged',async()=>{
 const s=service(),p=s.snapshot().progress;setStoryFlag(p,c,'PROLOGUE_COMPLETE',true);assert.equal(p.flags.PROLOGUE_COMPLETE,true);setStoryFlag(p,c,'PROLOGUE_COMPLETE',false);assert.equal(p.flags.PROLOGUE_COMPLETE,false);
 await s.clearFlag('PROLOGUE_COMPLETE');assert.equal(s.flag('PROLOGUE_COMPLETE'),false);await assert.rejects(()=>s.setFlag('BADGE_08'));assert.throws(()=>s.flag('강민'));assert.throws(()=>setStoryFlag(p,c,'UNKNOWN',true));
});
test('gate parser handles item / canonical dex / conjunction / negation and rejects code',()=>{
 const s=structuredClone(end);assert.equal(evaluateStoryExpression("BADGE_07 && inventory.has('field_ability_surf')",s,c),true);assert.equal(evaluateStoryExpression('!MAIN_STORY_CLEAR',s,c),false);
 s.dex.caught=['SPECIES_148','SPECIES_149','SPECIES_150'];assert.equal(evaluateStoryExpression('dex.caught(150)',s,c),true);assert.equal(evaluateStoryExpression('dex.activated_count() == 3',s,c),true);
 s.dex.seen=catalog.records.map(s=>s.id);assert.equal(evaluateStoryExpression('DEX_COMPLETE_151',s,c),false);
 for(const expr of ['process.exit()','UNKNOWN',"inventory.has('basic_rod');x",'true || ('])assert.throws(()=>evaluateStoryExpression(expr,s,c));
 const cyclic=structuredClone(c);cyclic.gates.LOOP={id:'LOOP',expr:'LOOP'};assert.throws(()=>evaluateStoryExpression('LOOP',s,cyclic));
});
test('event order and stage prerequisites prohibit skipping content',async()=>{
 const s=service();await assert.rejects(()=>s.runEvent('P03_TUTORIAL'));await assert.rejects(()=>s.runEvent('FINAL_CHAMPION',won));await assert.rejects(()=>s.enterStage('S1'));await assert.rejects(()=>s.completeStage());
 const p=service(full.checkpoints.PROLOGUE);assert.equal(p.gate('CAN_ENTER_S1'),true);await p.enterStage('S1');assert.equal(p.eventAvailable('S1_GYM_STORY'),false);assert.equal(p.eventAvailable('RIVAL_01'),false);
});
test('prologue kit is sourced from Stage and issued once with tutorial flag',async()=>{
 const s=service(full.checkpoints.PROLOGUE),before=s.snapshot();assert.equal(before.progress.items.eco_dex,1);assert.equal(before.progress.items.potion,3);assert.equal(before.inventory.ecology_ball,5);
 assert.ok(s.rewardClaimed('TX_PROLOGUE_STARTER_KIT'));await s.runEvent('P03_TUTORIAL');assert.deepEqual(s.snapshot(),before);
});
test('all 13 mainline reward transactions and 3 Geoje grants are atomic / once only',()=>{
 assert.equal(end.progress.rewardClaims.length,13);assert.equal(end.progress.geojeBallGrantHistory.length,3);assert.equal(end.geojeBallsGranted,6);assert.equal(end.inventory.geoje_ball,6);assert.equal(end.progress.items.memory_fragment,0);assert.equal(end.progress.items.peace_lantern,1);
 for(const id of end.progress.rewardClaims)assert.ok(full.service.rewardClaimed(id));assert.equal(end.ownedTms.length,8);
});
test('required route/gym-sub trainer gates completion and leader challenge',async()=>{
 const s=service(full.checkpoints.PROLOGUE);await s.enterStage('S1');await s.runEvent('S1_WATER_DECLINE');await s.runEvent('S1_TRAP_INVESTIGATION');await s.runEvent('RIVAL_01',won);
 assert.equal(s.trainerAvailable(c.gyms[0].id),false);await assert.rejects(()=>s.completeStage());await s.runTrainer('GYM_01_SUB_02',won);assert.equal(s.trainerAvailable(c.gyms[0].id),true);
 await s.runEvent('S1_GYM_STORY',won);await assert.rejects(()=>s.completeStage());await s.runTrainer('ROUTE_S1_04',won);await s.completeStage();
});
test('Harin six battles follow source order / starter-dependent fixed parties',()=>{
 const rivalIds=end.progress.defeatedTrainers.filter(id=>id.startsWith('RIVAL_'));assert.deepEqual(rivalIds,['RIVAL_00','RIVAL_01','RIVAL_02','RIVAL_03','RIVAL_04','RIVAL_05']);
 for(const id of rivalIds)for(const starter of catalog.starterIds){const p=c.parties[c.trainers[id].variantPartyIds[starter]];assert.ok(p);assert.ok(p.members.every(m=>m.namespace==='canonical'))}
 assert.ok(end.progress.completedEvents.includes('RIVAL_S9_ALLY'));assert.ok(c.events.S9_SHIP_ZONE2_RESCUE_EVENT.operations.some(op=>op.actorId==='NPC_RIVAL_HARIN'));
});
test('S2 No150 first direct sighting records seen only; never starts a battle',async()=>{
 const input=structuredClone(full.checkpoints.S1);input.party=input.party.filter(m=>!['SPECIES_149','SPECIES_150','SPECIES_151'].includes(m.speciesId));for(const key of ['seen','caught'])input.dex[key]=input.dex[key].filter(id=>id!=='SPECIES_150');
 const s=service(input);await s.enterStage('S2');await s.runEvent('S2_BIRD_DISTURBANCE');await s.runEvent('S2_LURE_DISCOVERY');const before=s.snapshot();let fights=0;
 await s.runEvent('FORESHADOW_150_SKY_S2',{battleDriver:()=>{fights++}});const after=s.snapshot();assert.equal(fights,0);assert.ok(after.dex.seen.includes('SPECIES_150'));assert.equal(after.dex.caught.includes('SPECIES_150'),before.dex.caught.includes('SPECIES_150'));assert.equal(s.flag('SEEN_150_S2_JANGMOK'),true);assert.deepEqual(after.battleHistory,before.battleHistory);
 assert.equal(after.dex.caught.includes('SPECIES_150'),false);assert.equal(after.party.some(m=>m.speciesId==='SPECIES_150'),false);assert.equal(after.progress.flags.BLACKNET_NAME_REVEALED,false);assert.equal((await s.runEvent('S2_WIND_EVENT_150')).alreadyCompleted,true);
});
test('S3 Blacknet reveal precedes RIVAL02, no obsolete leader/name bindings',()=>{
 const e=end.progress.completedEvents;assert.ok(e.indexOf('S3_BLACKNET_NAME_REVEAL')<e.indexOf('RIVAL_02'));assert.equal(end.progress.flags.BLACKNET_NAME_REVEALED,true);
 assert.deepEqual(Object.values(c.trainers).filter(t=>t.kind==='blacknet').map(t=>t.label),['보미','준석','휘경']);assert.equal(c.deferred.enhancedLeagueNpcId,'NPC_POST_YEJI');
});
test('S9 history/item gate, ship zones/officers/boss/rescue unlock League',()=>{
 const p=full.checkpoints.S9.progress;for(const id of ['HIST_POW_CAMP_COMPLETE','HIST_HUNGNAM_COMPLETE','PEACE_LANTERN_OBTAINED','S9_SHIP_ZONE1_CLEAR','S9_SHIP_ZONE2_RESCUE_CLEAR','S9_BLACKNET_BOMI_DEFEATED','S9_BLACKNET_JUNSEOK_DEFEATED','S9_BLACKNET_BOSS_DEFEATED','S9_FINAL_RESCUE_COMPLETE','LEAGUE_UNLOCKED'])assert.equal(p.flags[id],true);
 assert.ok(service(full.checkpoints.S9).gate('CAN_ENTER_LEAGUE'));assert.equal(p.flags.MAIN_STORY_CLEAR,false);
});
test('Elite Four order / Champion unlock / MAIN_STORY_CLEAR / POST unlock',()=>{
 assert.deepEqual(c.elite.map(id=>c.trainers[id].label),['윤우','시윤','은미','준호']);assert.deepEqual(end.progress.leagueWins,c.elite);assert.equal(c.trainers[c.championId].label,'윤 박사');
 assert.equal(end.progress.flags.MAIN_STORY_CLEAR,true);assert.equal(end.progress.flags.POST_UNLOCKED,true);assert.equal(end.progress.flags.POST_ENHANCED_LEAGUE_UNLOCKED,true);assert.equal(end.progress.flags.POST_ENHANCED_LEAGUE_YEJI_DONE,false);assert.equal(end.progress.leagueRunState,'idle');assert.equal(full.service.gate('CAN_ENTER_POST'),true);
});
test('POST detailed events and rematches remain deferred (no invented parties)',async()=>{
 const s=service(end);for(const id of ['POST_CAPTURE_148','POST_COMPASS','POST_ENHANCED_LEAGUE_YEJI']){assert.equal(s.eventAvailable(id),false);await assert.rejects(()=>s.runEvent(id))}
 await assert.rejects(()=>s.runTrainer(c.championId));await assert.rejects(()=>s.completeStage('POST'));assert.equal(c.deferred.championRematch,'POST_unlimited');
});
test('three slots preserve legacy + two independent canonical story progressions',async()=>{
 const storage=memory(),store=slots(storage),old=freshState(70,'boy');store.save('SLOT_1',old);const raw=store.peek('SLOT_1');store.save('SLOT_2',full.checkpoints.S4);store.save('SLOT_3',end);
 const reload=slots(storage);assert.deepEqual(reload.loadSession('SLOT_1').runtime,validateSave(old));assert.equal(reload.loadSession('SLOT_2').runtime.progress.currentStage,'S4');assert.equal(reload.loadSession('SLOT_3').runtime.progress.currentStage,'POST');
 const s=service(reload.loadSession('SLOT_2').runtime,{persist:data=>reload.save('SLOT_2',data)});await s.enterStage('S5');assert.equal(reload.loadSession('SLOT_3').runtime.progress.currentStage,'POST');assert.equal(store.peek('SLOT_1'),raw);assert.throws(()=>reload.save('SLOT_1',end));
});
test('reload mid-stage, after gym and after champion restores every progression field',async()=>{
 const storage=memory(),store=slots(storage),s=service(full.checkpoints.S2);await s.enterStage('S3');await s.runEvent('S3_ROUTE_TRAINERS');
 for(const data of [s.snapshot(),full.checkpoints.S8,full.checkpoints.FINAL,end]){store.save('SLOT_2',data);assert.deepEqual(slots(storage).loadSession('SLOT_2').runtime,data);assert.deepEqual(service(slots(storage).loadSession('SLOT_2').runtime).snapshot(),data)}
});
test('save import archives bytes and last-known-good; malformed story state cannot overwrite',()=>{
 const m=memory(),store=slots(m),raw=JSON.stringify(end),imported=store.importSave('SLOT_2',raw);assert.equal(imported.committed,true);assert.equal(m.getItem(imported.archiveKey),raw);const before=store.peek('SLOT_2');
 for(const mutate of [s=>s.progress.flags.BADGE_01=false,s=>s.progress.completedEvents.pop(),s=>s.progress.gymClears=[],s=>s.progress.rewardClaims=[],s=>s.progress.leagueWins.reverse(),s=>s.progress.currentStage='S99',s=>s.storyVersion='unknown',s=>s.progress.defeatedTrainers.push('UNKNOWN'),s=>s.progress.items.injected=1,s=>s.party[0].namespace='work-v2']){const s=structuredClone(end);mutate(s);assert.throws(()=>store.save('SLOT_2',s));assert.equal(store.peek('SLOT_2'),before)}
 store.save('SLOT_2',end);assert.equal(m.getItem(store.keys('SLOT_2').lastKnownGood),before);
});
test('durable write failure retains original state and retry commits event/reward once',async()=>{
 const initial=service(full.checkpoints.S1);await initial.enterStage('S2');let fail=true,writes=0;const s=service(initial.snapshot(),{persist:()=>{writes++;if(fail)throw Error('disk full')}}),before=s.snapshot();
 await assert.rejects(()=>s.runEvent('S2_BIRD_DISTURBANCE'));assert.deepEqual(s.snapshot(),before);assert.equal(s.pendingCommit,true);await assert.rejects(()=>s.runEvent('S2_BIRD_DISTURBANCE'));fail=false;await s.retryCommit();assert.equal(s.eventCompleted('S2_BIRD_DISTURBANCE'),true);const n=writes;await s.runEvent('S2_BIRD_DISTURBANCE');assert.equal(writes,n);
});
test('loss does not defeat trainer, award badge or advance event; explicit recovery supports retry',async()=>{
 const start=(await partner()).snapshot();start.party=[createCanonicalCreature(catalog,'SPECIES_001',1)];start.party[0].hp=1;const s=service(start);await s.runEvent('RIVAL_00',{rng:()=>.4,battleDriver:playBattle});
 assert.equal(s.eventCompleted('RIVAL_00'),false);assert.equal(s.snapshot().progress.defeatedTrainers.length,0);assert.equal(s.snapshot().party[0].hp,0);assert.equal(s.trainerAvailable('RIVAL_00'),false);await s.recoverParty();assert.equal(s.snapshot().party[0].hp,canonicalHp(catalog,'SPECIES_001',1));assert.equal(s.trainerAvailable('RIVAL_00'),true);
});
test('interactive trainer flow locks concurrent operations and accepts only real outcome',async()=>{
 const s=service(testParty((await partner()).snapshot()));let ready;const started=new Promise(resolve=>ready=resolve),field=createGoldenField(),hooks=createStoryFieldHooks(field);
 const interactive=service(s.snapshot(),{hooks:{...hooks,battleReady:()=>ready()}}),run=interactive.runEvent('RIVAL_00',{rng:()=>.4});await started;
 assert.equal(interactive.busy,true);assert.equal(fieldInputLocked(field),true);await assert.rejects(()=>interactive.enterStage('S1'));const b=interactive.battleSnapshot();assert.equal(b.engine,'canonical-battle-v3');
 while(interactive.battleSnapshot()?.phase!=='ended'){const state=interactive.battleSnapshot(),mon=state.party[state.active];interactive.actBattle({type:'move',moveId:mon.moves.find(m=>m.pp>0)?.id??'SYSTEM_STRUGGLE'})}
 await run;assert.equal(interactive.eventCompleted('RIVAL_00'),true);assert.equal(fieldInputLocked(field),false);assert.equal(field.core.pendingBattle,null);
});
test('unfinished or fabricated battle driver cannot commit a story victory',async()=>{
 const s=service(testParty((await partner()).snapshot())),before=s.snapshot();await assert.rejects(()=>s.runEvent('RIVAL_00',{battleDriver:async()=>({outcome:'won'})}));assert.deepEqual(s.snapshot(),before);assert.equal(s.busy,false);
});
test('RIVAL00 move exception applies only to the exact source party, never arbitrary fixtures',async()=>{
 const s=await partner(),party=s.resolveTrainerParty('RIVAL_00'),session=createGameSession(storyBattleInput(s.snapshot(),catalog),catalog),options={kind:'trainer',opponents:party.members,partyId:party.id};
 assert.ok(startSessionBattle(session,options,{adapter}));assert.throws(()=>startSessionBattle(session,{...options,partyId:null},{adapter}));
 const altered=structuredClone(options);altered.opponents[0].moveIds=['MV001','MV003'];assert.throws(()=>startSessionBattle(session,altered,{adapter}));
});
test('two duplicate source move IDs are collapsed, not replaced, with diagnostics',()=>{
 assert.equal(c.diagnostics.length,2);assert.deepEqual(c.diagnostics.map(d=>d.partyId),['PARTY:GYM_04_SUB_02','PARTY:GYM_06_SUB_03']);
 for(const d of c.diagnostics){assert.deepEqual(d.normalizedMoveIds,[...new Set(d.sourceMoveIds)]);assert.equal(d.normalizedMoveIds.length,3)}
});
test('all 89 source party variants instantiate Battle v3 (including three rival starters)',async()=>{
 const base=(await partner()).snapshot(),session=createGameSession(storyBattleInput(base,catalog),catalog);
 for(const p of Object.values(c.parties)){const b=startSessionBattle(session,{kind:'trainer',partyId:p.id,opponents:p.members},{adapter});assert.equal(b.snapshot().engine,'canonical-battle-v3');assert.deepEqual(b.snapshot().opponents.map(m=>m.speciesId),p.members.map(m=>m.speciesId))}
});
test('placeholder NPC/species assets do not gate full mainline progression',async()=>{
 const missing=async()=>{throw Error('No final PNG')};for(const npcId of [...c.gyms.map(g=>g.npcId),...c.elite,c.championId,'NPC_RIVAL_HARIN','NPC_BLACKNET_LEADER_HWIGYEONG'])assert.equal((await resolveAsset(npcAssets(npcId).fieldAtlas,{loader:missing})).status,'placeholder');
 assert.equal((await resolveAsset(catalog.resolveBattleFront('SPECIES_150'),{loader:missing})).status,'placeholder');assert.equal(full.battles.length,77);assert.ok(full.battles.every(b=>b.engine==='canonical-battle-v3'));assert.equal(end.progress.currentStage,'POST');
});
test('story battles reuse biome background, scale/anchor metadata and VFX/audio presentation',async()=>{
 const s=await partner(),party=s.resolveTrainerParty('RIVAL_00'),b=startSessionBattle(createGameSession(storyBattleInput(s.snapshot(),catalog),catalog),{kind:'trainer',partyId:party.id,opponents:party.members,map:{id:'coast',biomeId:'COAST'},rng:()=>.4},{adapter});
 const frame=b.act({type:'move',moveId:s.snapshot().party[0].moves[0].id}),p=createBattlePresentation();p.consume(frame);assert.equal(frame.background.assetId,'battle.biome.COAST');assert.ok(frame.display.front.metadata.battleVisualScaleFront>0);assert.ok(frame.events.some(e=>e.type==='move'&&e.vfx.effects.length));assert.ok(full.battles.some(b=>b.background==='battle.biome.GYM'));assert.ok(full.battles.some(b=>b.background==='battle.biome.LEAGUE'));p.stop();
});
test('event runner supports all operations, releases lock on logic failure, optional visuals fail open',async()=>{
 const calls=[],runner=new StoryEventRunner({inputLock:()=>calls.push('lock'),inputUnlock:()=>calls.push('unlock'),cutIn:()=>{throw Error('missing PNG')}});
 await runner.run([{op:'cutIn'},{op:'flagSet',flagId:'X'},{op:'itemReward',rewardId:'TX'},{op:'badgeReward',rewardId:'TX'},{op:'stageComplete',stageId:'S1'}],{apply:op=>calls.push(op.op),battle:()=>true});
 assert.deepEqual(calls,['lock','flagSet','itemReward','badgeReward','stageComplete','unlock']);assert.equal(runner.warnings.length,1);assert.ok(STORY_OPERATIONS.includes('actorMove'));assert.ok(STORY_OPERATIONS.includes('warp'));
 await assert.rejects(()=>runner.run([{op:'flagSet'}],{apply:()=>{throw Error('invalid flag')},battle:()=>true}));assert.equal(calls.at(-1),'unlock');assert.equal(runner.running,false);await assert.rejects(()=>runner.run([{op:'javascript'}],{}));
});
test('field sidecar is tile-independent; existing movement, lock and encounter functions reused',async()=>{
 const s=service(full.checkpoints.S2),bundle=storyFieldEvents(s,'outdoor'),field=createGoldenField(null,{qa:true}),before=JSON.stringify(field.core.npcs),hooks=createStoryFieldHooks(field);
 assert.equal(bundle.mapId,'outdoor');assert.ok(bundle.trainers.every(t=>t.trainerId&&t.partyId));assert.equal(Object.hasOwn(bundle,'tiles'),false);assert.equal(JSON.stringify(field.core.npcs),before);
 hooks.inputLock();assert.equal(fieldInputLocked(field),true);hooks.actorFace({actorId:'PLAYER',facing:'left'});assert.equal(field.facing,'left');await hooks.cameraCue({cue:'battle-entry',trainerId:'ROUTE_S2_01'});assert.equal(field.core.battleReady,true);hooks.battleFinished('won');hooks.inputUnlock();assert.equal(fieldInputLocked(field),false);
});
test('legacy story/battle routing and original field/save models remain untouched',()=>{
 const old=freshState(70,'boy'),before=JSON.stringify(old),session=createGameSession(old,legacyCatalog);let calls=0;assert.equal(startSessionBattle(session,{kind:'trainer'},{adapter,legacyStart:()=>{calls++;return 'legacy'}}),'legacy');assert.equal(calls,1);assert.equal(JSON.stringify(old),before);assert.throws(()=>service(old));
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');assert.ok(app.includes("get('story')==='1'"));assert.ok(readFileSync(new URL('../dist/story/dev.mjs',import.meta.url),'utf8').includes('import.meta.env?.DEV!==true'));
});
for(const starterId of ['SPECIES_004','SPECIES_007'])test(`${starterId}: complete alternate starter story using same production paths`,async()=>{const run=await simulateStory({starterId,allTrainers:false});assert.equal(run.service.flag('POST_UNLOCKED'),true);assert.equal(run.service.snapshot().starterId,starterId);assert.equal(run.battles.length,45)});
test('league loss/reload resumes current opponent; champion clear and ending unlock are separate',async()=>{
 let s=service(full.checkpoints.S9);await s.enterStage('FINAL');assert.equal(s.trainerAvailable(c.elite[1]),false);assert.equal(s.eventAvailable('FINAL_CHAMPION'),false);
 await s.recoverParty();await s.runTrainer(c.elite[0],won);const weak=s.snapshot();weak.party=[createCanonicalCreature(catalog,'SPECIES_001',1)];weak.party[0].hp=1;s=service(weak);
 const loss=await s.runTrainer(c.elite[1],won);assert.equal(loss.completed,false);assert.equal(s.snapshot().progress.leagueRunState,'elite_2');assert.deepEqual(s.snapshot().progress.leagueWins,[c.elite[0]]);
 const store=slots(memory());store.save('SLOT_2',s.snapshot());s=service(store.loadSession('SLOT_2').runtime);await s.recoverParty();assert.equal(s.trainerAvailable(c.elite[1]),true);assert.equal(s.trainerAvailable(c.elite[0]),false);
 s=service(testParty(s.snapshot()));for(const id of c.elite.slice(1)){await s.recoverParty();await s.runTrainer(id,won)}
 assert.equal(s.snapshot().progress.leagueRunState,'champion');assert.equal(s.eventAvailable('FINAL_CHAMPION'),false);await s.runEvent('FINAL_LEAGUE');assert.equal(s.eventAvailable('FINAL_CHAMPION'),true);
 await s.recoverParty();await s.runEvent('FINAL_CHAMPION',won);assert.equal(s.flag('MAIN_STORY_CLEAR'),true);assert.equal(s.flag('POST_UNLOCKED'),false);assert.equal(s.snapshot().geojeBallsGranted,6);
 store.save('SLOT_2',s.snapshot());s=service(store.loadSession('SLOT_2').runtime);assert.equal((await s.runEvent('FINAL_CHAMPION')).alreadyCompleted,true);await s.runEvent('FINAL_ENDING_RECORD');assert.equal(s.flag('POST_UNLOCKED'),true);assert.equal(s.snapshot().geojeBallsGranted,6);
});
test('gym battle reward and badge are committed atomically even when storage fails',async()=>{
 let s=service(full.checkpoints.S1);await s.enterStage('S2');for(const id of ['S2_BIRD_DISTURBANCE','S2_LURE_DISCOVERY','S2_WIND_EVENT_150'])await s.runEvent(id);await s.runTrainer('GYM_02_SUB_02',won);
 let fail=true,persisted=null;s=service(s.snapshot(),{persist:data=>{if(fail)throw Error('quota');persisted=data}});const before=s.snapshot();await assert.rejects(()=>s.runEvent('S2_GYM_STORY',won));assert.deepEqual(s.snapshot(),before);assert.equal(s.flag('BADGE_02'),false);assert.equal(s.pendingCommit,true);
 fail=false;await s.retryCommit();assert.equal(persisted.progress.flags.BADGE_02,true);assert.equal(persisted.progress.items.bicycle,1);assert.ok(persisted.ownedTms.includes('TM09'));const saved=s.snapshot();await s.runEvent('S2_GYM_STORY');assert.deepEqual(s.snapshot(),saved);
});
test('canonical story TM learning reuses Battle v3 compatibility without losing progression',async()=>{
 const s=service(full.checkpoints.S3),before=s.snapshot(),mon=before.party.find(m=>catalog.getSpeciesById(m.speciesId).tmIds.includes('TM01'));await s.teachTm(mon.instanceId,'TM01',0);const after=s.snapshot();assert.equal(after.party.find(m=>m.instanceId===mon.instanceId).moves[0].id,catalog.getTmById('TM01').moveId);assert.deepEqual(after.progress,before.progress);assert.deepEqual(after.ownedTms,before.ownedTms);
});
test('field lock ownership and failed warp never complete gameplay steps',async()=>{
 const field=createGoldenField();field.core.lock='dialogue';const hooks=createStoryFieldHooks(field),runner=new StoryEventRunner(hooks);let applied=false;
 await assert.rejects(()=>runner.run([{op:'flagSet'}],{apply:()=>{applied=true}}));assert.equal(applied,false);assert.equal(field.core.lock,'dialogue');field.core.lock=null;
 await assert.rejects(()=>runner.run([{op:'warp',mapId:'unbound'},{op:'flagSet'}],{apply:()=>{applied=true}}));assert.equal(applied,false);assert.equal(fieldInputLocked(field),false);
});
