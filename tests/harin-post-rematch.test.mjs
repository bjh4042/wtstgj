import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {HARIN_POST_V1 as policy,buildHarinPostRematch,resolveHarinPostParty} from '../dist/compatibility/harin-post-rematch-v1.mjs';
import {sha256,stableJSON} from '../dist/compatibility/codec.mjs';
import {createCanonicalCreature,createGameSession} from '../dist/canonical-session.mjs';
import {startSessionBattle} from '../dist/battle-v3/engine.mjs';
import {battleStats,createBattleRules,earnedExperience} from '../dist/battle-v3/rules.mjs';
import {storyBattleInput,validateCanonicalStorySave} from '../dist/story/save.mjs';
import {recordHarinResult} from '../dist/story/harin-rematch.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';
import {cellPosition} from '../dist/world/definition.mjs';
import {syncWorldLocation} from '../dist/world/state.mjs';
import {pathToPoint} from '../dist/world/reachability.mjs';
import {createWorldStore} from '../dist/world/save-store.mjs';
import {postLeagueFixture,isolatedStorage} from './helpers/enhanced-league-fixture.mjs';

const read=f=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8');
// Pre-economy-approval snapshot retained; live approval paths tested separately.
const adapter={...await loadCanonicalRuntimeAdapter({readText:async f=>read(f)}),economyPolicy:undefined};
const world=(runtime,options={})=>new CanonicalWorld({adapter,mode:'test',runtime:structuredClone(runtime),rng:()=>.5,...options});
function checkpoint(starterId='SPECIES_001'){
 const s=postLeagueFixture(adapter),w=world(s);s.starterId=starterId;
 for(const key of ['seen','caught'])if(!s.dex[key].includes(starterId))s.dex[key].push(starterId);
 s.position=cellPosition(policy.mapId,policy.cell[0],policy.cell[1]+1);syncWorldLocation(s,w.host);w.dispose();return s;
}
const resources=s=>({money:s.economy.money,policy:s.economy.policyId,inventory:s.inventory,items:s.progress.items,claims:s.progress.rewardClaims,geoje:s.geojeBallsGranted,geojeHistory:s.progress.geojeBallGrantHistory});

test('three original starter branches retain all 18 species/moves/order/settings; only +15, never cumulative',()=>{
 const baseline=stableJSON(adapter.storyRuntime.parties),built=buildHarinPostRematch(adapter,read(policy.sourceFile));
 assert.deepEqual(built,buildHarinPostRematch({...adapter,harinPostRematch:built},read(policy.sourceFile)));
 for(const [starterId,lead] of [['SPECIES_001','SPECIES_006'],['SPECIES_004','SPECIES_009'],['SPECIES_007','SPECIES_003']]){
  const v=built.variants[starterId],base=adapter.storyRuntime.parties[v.basePartyId],p=resolveHarinPostParty(adapter,starterId);
  assert.equal(sha256(stableJSON(base)),policy.basePartySha256[starterId]);assert.equal(p.members.length,6);
  assert.equal(p.members[0].speciesId,lead);assert.deepEqual(p.members.map(m=>m.level),[66,62,63,64,65,65]);
  assert.deepEqual(p.members.map((m,i)=>({...m,level:m.level-15})),base.members);
  assert.deepEqual(p.moveLevelExceptions,base.moveLevelExceptions);assert.deepEqual(built.baseTrainer,adapter.storyRuntime.trainers.RIVAL_05);
  const s=checkpoint(starterId),w=world(s),bound={...adapter,storyRuntime:{...adapter.storyRuntime,parties:{...adapter.storyRuntime.parties,[p.id]:p}}};
  const b=startSessionBattle(createGameSession(storyBattleInput(s,w.catalog),w.catalog),{kind:'trainer',partyId:p.id,opponents:p.members,rng:()=>.5},{adapter:bound});
  assert.deepEqual(b.snapshot().opponents.map(m=>[m.speciesId,m.level,m.moves.map(x=>x.id)]),p.members.map(m=>[m.speciesId,m.level,m.moveIds]));
  for(const m of b.snapshot().opponents)assert.equal(m.hp,battleStats(w.catalog,m).hp);w.dispose();
 }
 assert.equal(stableJSON(adapter.storyRuntime.parties),baseline);
});

test('POST gate only, explicit dialogue request at reachable Jangseungpo point, no sight auto-battle/healing',async()=>{
 const early=world(null);await assert.rejects(()=>early.story.runHarinRematch({sequence:1}),/챔피언/);early.dispose();
 const s=checkpoint(),w=world(s),p=w.definition.points[policy.pointId];
 try{
  assert.equal(s.enhancedLeague,undefined);assert.equal(p.mapId,'world:hub:PROLOGUE');assert.equal(p.npcId,'NPC_RIVAL_HARIN');
  assert.ok(pathToPoint(w,'heal:PROLOGUE'));assert.equal(w.host.validLanding(s.position,s),true);
  assert.equal(w.field.core.npcs.find(n=>n.pointId===policy.pointId).trainer,false);
  const before=w.snapshot();assert.match((await w.interact(policy.pointId)).message,/대결/);assert.deepEqual(w.snapshot(),before);
  assert.equal(w.story.trainerAvailable('RIVAL_05'),false);
  await assert.rejects(()=>w.story.runHarinRematch({sequence:2}),/sequence/);
  await assert.rejects(()=>w.story.runHarinRematch({sequence:1,battleDriver:b=>{assert.equal(b.snapshot().party[0].hp,before.party[0].hp);assert.equal(b.snapshot().opponents[0].speciesId,'SPECIES_006');throw Error('fixture stop after constructor')}}),/fixture stop/);
  assert.deepEqual(w.snapshot(),before);assert.equal(w.busy,false);
 }finally{w.dispose()}
});

test('distinct rematches each earn trainer EXP; save retry/reload and duplicate old requests never pay twice',async()=>{
 // Single-opponent, overlevel fixture, not a full Harin battle or normal-growth playthrough.
 const fixture=structuredClone(adapter),id='SPECIES_007';fixture.harinPostRematch.variants[id].party.members=fixture.harinPostRematch.variants[id].party.members.slice(0,1);
 const s=checkpoint(id),base=world(s);s.party=[createCanonicalCreature(base.catalog,'SPECIES_006',90),createCanonicalCreature(base.catalog,'SPECIES_001',20),createCanonicalCreature(base.catalog,'SPECIES_004',20)];
 s.party[2].hp=0;s.party[0].hp-=12;s.party[0].moves=[{id:'MV012',pp:adapter.moves.MV012.pp-2}];
 for(const k of ['seen','caught'])for(const m of s.party)if(!s.dex[k].includes(m.speciesId))s.dex[k].push(m.speciesId);
 const store=createWorldStore(isolatedStorage(),base.catalog,base.host,{qa:true});store.save('SLOT_1',s);
 const before=structuredClone(s);let rejectAfterWrite=true,calls=0,finished;
 const driver=b=>{calls++;const initial=b.snapshot();assert.equal(initial.opponents[0].speciesId,'SPECIES_003');
  if(calls===1){assert.equal(initial.party[0].hp,before.party[0].hp);assert.equal(initial.party[0].moves[0].pp,before.party[0].moves[0].pp)}
  for(let i=0;i<12&&b.snapshot().phase!=='ended';i++)b.act({type:'move',moveId:'MV012'});
  assert.equal(b.snapshot().outcome,'won');finished=b.snapshot().party;
 };
 let w=world(s,{adapter:fixture,battleDriver:driver,persist:n=>{store.save('SLOT_1',n);if(rejectAfterWrite)throw Error('fixture after-write failure')}});
 try{
  await assert.rejects(()=>w.interact(policy.pointId,{type:'challenge',sequence:1}),/after-write failure/);
  assert.equal(w.story.pendingCommit,true);assert.equal(w.snapshot().harinPost,undefined);
  const durable=store.load('SLOT_1');assert.equal(durable.harinPost.wins,1);
  rejectAfterWrite=false;await w.story.retryCommit();assert.equal(calls,1);assert.deepEqual(w.snapshot(),durable);
  assert.deepEqual(w.snapshot().party,finished);const rules=createBattleRules(adapter),opponent=fixture.harinPostRematch.variants[id].party.members[0];
  const amounts=['participated','alive_nonparticipant','fainted'].map(share=>earnedExperience(rules,w.catalog,opponent,'trainer',share));
  assert.deepEqual(w.snapshot().party.map((m,i)=>m.totalExp-before.party[i].totalExp),amounts);
  assert.deepEqual(resources(w.snapshot()),resources(before));assert.equal(w.snapshot().candidatePolicyId,undefined);
  w.dispose();w=world(store.load('SLOT_1'),{adapter:fixture,battleDriver:driver,persist:n=>store.save('SLOT_1',n)});
  const first=w.snapshot();await w.interact(policy.pointId,{type:'challenge',sequence:1});assert.deepEqual(w.snapshot(),first);assert.equal(calls,1);
  await w.interact(policy.pointId,{type:'challenge',sequence:2});const second=w.snapshot();assert.equal(calls,2);assert.equal(second.harinPost.wins,2);
  assert.equal(second.harinPost.firstVictoryBattleId,first.harinPost.firstVictoryBattleId);assert.deepEqual(second.party,finished);
  assert.deepEqual(second.party.map((m,i)=>m.totalExp-first.party[i].totalExp),amounts);assert.deepEqual(resources(second),resources(before));
  await w.interact(policy.pointId,{type:'challenge',sequence:1});await w.interact(policy.pointId,{type:'challenge',sequence:2});assert.deepEqual(w.snapshot(),second);assert.equal(calls,2);
 }finally{w.dispose();base.dispose()}
});

test('actual loss uses verified visited recovery hub, heals party and retains money, consumed items and progression',async()=>{
 const s=checkpoint(),base=world(s);s.party=[createCanonicalCreature(base.catalog,s.starterId,1)];s.party[0].hp=1;
 s.economy.lastHub='CENTER:S1';s.world.visitedHubs.push('CENTER:S1');s.world.visitedMaps.push('world:hub:S1');
 const before=structuredClone(s),w=world(s,{battleDriver:b=>{const start=b.snapshot();assert.equal(start.party[0].hp,1);assert.equal(start.opponents.length,6);const done=b.act({type:'item',itemId:'potion',instanceId:start.party[0].instanceId,transactionId:'harin-loss-potion'});assert.equal(done.outcome,'lost')}});
 try{
  await w.interact(policy.pointId,{type:'challenge',sequence:1});const after=w.snapshot();
  assert.equal(after.harinPost.completedBattles,1);assert.equal(after.harinPost.wins,0);assert.equal(after.harinPost.firstVictoryBattleId,null);
  assert.equal(after.economy.recovery.hubId,'CENTER:S1');assert.equal(after.position.scene,'world:hub:S1');assert.equal(w.host.validLanding(after.position,after),true);
  assert.equal(after.party[0].hp,battleStats(w.catalog,after.party[0]).hp);assert.equal(after.party[0].status,null);for(const m of after.party[0].moves)assert.equal(m.pp,w.catalog.getMoveById(m.id).pp);
  assert.equal(after.progress.items.potion,before.progress.items.potion-1);assert.equal(after.economy.money,before.economy.money);assert.deepEqual(after.inventory,before.inventory);
  for(const key of ['flags','completedEvents','defeatedTrainers','badges','leagueWins','rewardClaims','geojeBallGrantHistory'])assert.deepEqual(after.progress[key],before.progress[key]);
  assert.equal(after.economy.policyId,null);assert.equal(after.candidatePolicyId,undefined);
 }finally{w.dispose();base.dispose()}
});

test('optional rematch save receipt survives independent slots; invalid/cross-session counters rejected',()=>{
 const old=checkpoint(),w=world(old),s=structuredClone(old),party=resolveHarinPostParty(adapter,s.starterId);
 recordHarinResult(s,1,'won',party.id);recordHarinResult(s,2,'lost',party.id);
 const store=createWorldStore(isolatedStorage(),w.catalog,w.host,{qa:true});store.save('SLOT_1',old);store.save('SLOT_2',s);store.save('SLOT_3',old);
 assert.equal(store.load('SLOT_1').harinPost,undefined);assert.deepEqual(store.load('SLOT_2').harinPost,s.harinPost);assert.equal(store.load('SLOT_3').harinPost,undefined);
 for(const change of [x=>x.harinPost.completedBattles++,x=>x.harinPost.wins=3,x=>x.harinPost.firstVictoryBattleId='other-session:HARIN_POST:1']){const bad=structuredClone(s);change(bad);assert.throws(()=>validateCanonicalStorySave(bad,w.catalog),/Harin/)}
 const repeated=structuredClone(s);assert.equal(recordHarinResult(repeated,1,'won',party.id),false);assert.deepEqual(repeated,s);w.dispose();
});
