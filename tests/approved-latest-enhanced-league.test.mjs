import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loadApprovedLatestRuntimeAdapter} from '../dist/compatibility/approved-latest-runtime-adapter.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';
import {createWorldStore} from '../dist/world/save-store.mjs';
import {validateCanonicalStorySave,storyBattleInput} from '../dist/story/save.mjs';
import {createCanonicalCreature,createGameSession} from '../dist/canonical-session.mjs';
import {startEnhancedLeagueBattle} from '../dist/battle-v3/enhanced-league.mjs';
import {startYejiPreviewBattle} from '../dist/battle-v3/preview-opponents.mjs';
import {battleStats} from '../dist/battle-v3/rules.mjs';
import {ENHANCED_LEAGUE_V1 as policy,beginEnhancedLeague,finishEnhancedLeagueOpponent,validateEnhancedLeagueState} from '../dist/story/enhanced-league.mjs';
import {postLeagueFixture,isolatedStorage} from './helpers/enhanced-league-fixture.mjs';
const adapter=await loadApprovedLatestRuntimeAdapter({historicalOptions:{readText:async f=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')},stagedOptions:{readStaging:async f=>readFileSync(new URL('../dist/data/staging-20260927/'+f,import.meta.url),'utf8')}});
const checkpoint=postLeagueFixture(adapter),world=(runtime=checkpoint,options={})=>new CanonicalWorld({adapter,runtime:structuredClone(runtime),mode:'test',...options});
function started(){const w=world(),s=w.snapshot();beginEnhancedLeague(s,w.catalog,w.host,'fixture-start');return {w,s}}
const win=(s,w,index)=>finishEnhancedLeagueOpponent(s,{attempt:s.enhancedLeague.attempt,index,outcome:'won'},w.catalog,w.host);
const wealth=s=>({money:s.economy.money,items:s.progress.items,inventory:s.inventory,geojeBallsGranted:s.geojeBallsGranted,claims:s.progress.rewardClaims,geojeHistory:s.progress.geojeBallGrantHistory});

test('entry needs main champion + POST only; start heals exactly once; active run blocks storage/heal',async()=>{
 const before=new CanonicalWorld({adapter,mode:'test'});await assert.rejects(()=>before.story.enhancedLeagueCommand({type:'begin',transactionId:'early'}),/챔피언/);before.dispose();
 const damaged=structuredClone(checkpoint);damaged.party[0].hp=0;damaged.party[0].status='poison';damaged.party[0].moves[0].pp=0;
 const w=world(damaged);await w.interact(policy.entryPointId,{type:'begin',transactionId:'entry'});
 const s=w.snapshot();assert.equal(s.enhancedLeague.attempt,1);assert.equal(s.enhancedLeague.nextIndex,0);assert.equal(s.party[0].hp,battleStats(w.catalog,s.party[0]).hp);assert.equal(s.party[0].status,null);assert.equal(s.party[0].moves[0].pp,w.catalog.getMoveById(s.party[0].moves[0].id).pp);
 const l=structuredClone(s);l.party[0].hp=1;l.party[0].moves[0].pp=1;const resumed=world(l);
 await resumed.interact(policy.entryPointId,{type:'begin',transactionId:'entry-again'});assert.equal(resumed.snapshot().party[0].hp,1);assert.equal(resumed.snapshot().party[0].moves[0].pp,1);assert.equal(resumed.snapshot().enhancedLeague.attempt,1);
 await assert.rejects(()=>resumed.story.recoverParty(),/회복/);await assert.rejects(()=>resumed.story.worldCommand({type:'storage-exchange',pointId:'heal:FINAL'}),/강화 리그/);
 await assert.rejects(()=>resumed.story.economyCommand({type:'heal',transactionId:'no-free-heal',hubId:'CENTER:FINAL'}),/소지 회복/);
 assert.equal(resumed.snapshot().candidatePolicyId,undefined);resumed.dispose();w.dispose();
});

test('five-opponent order, duplicate results no-op, no victory healing or extra rewards, final one-time completion',()=>{
 const {w,s}=started(),prior=structuredClone(s.progress),resources=structuredClone(wealth(s));s.party[0].hp=1;s.party[0].moves[0].pp=1;
 for(let index=0;index<5;index++){assert.equal(s.enhancedLeague.nextIndex,index);assert.equal(win(s,w,index),true);const done=structuredClone(s);assert.equal(win(s,w,index),false);assert.deepEqual(s,done);assert.equal(s.party[0].hp,1);assert.equal(s.party[0].moves[0].pp,1)}
 assert.deepEqual(s.enhancedLeague.receipts.map(r=>r.opponentId),policy.order);assert.ok(!policy.order.includes('NPC_CHAMPION_DOCTOR_YOON'));assert.equal(s.enhancedLeague.phase,'completed');assert.equal(s.progress.flags.YEJI_FINAL_DONE,false);assert.equal(s.progress.flags.YEJI_FINAL_ENDING_DONE,false);assert.ok(!s.progress.completedEvents.includes('YEJI_FINAL_ENDING'));assert.deepEqual(s.progress,prior);assert.deepEqual(wealth(s),resources);
 assert.throws(()=>beginEnhancedLeague(s,w.catalog,w.host,'again'),/최종 완료/);assert.deepEqual(validateCanonicalStorySave(s,w.catalog).enhancedLeague,s.enhancedLeague);w.dispose();
});

test('three isolated slots restore next opponent, HP/PP/items; reload is not a new entry',async()=>{
 const {w,s}=started();win(s,w,0);s.party[0].hp=2;s.party[0].moves[0].pp=1;s.progress.items.potion=1;s.inventory.ecology_ball=0;
 const storage=isolatedStorage(),store=createWorldStore(storage,w.catalog,w.host,{qa:true});
 store.save('SLOT_1',checkpoint);store.save('SLOT_2',s);const last=structuredClone(s);for(let i=1;i<5;i++)win(last,w,i);store.save('SLOT_3',last);
 const loaded=store.load('SLOT_2'),resumed=world(loaded);assert.deepEqual(resumed.snapshot(),s);assert.equal(resumed.snapshot().enhancedLeague.nextIndex,1);
 assert.equal(store.load('SLOT_1').enhancedLeague,undefined);assert.equal(store.load('SLOT_3').enhancedLeague.phase,'completed');
 const bad=structuredClone(s);bad.enhancedLeague.nextIndex=4;assert.throws(()=>validateCanonicalStorySave(bad,w.catalog),/checkpoint mismatch/);
 await resumed.useItem('potion',s.party[0].instanceId,'one-potion');const used=resumed.snapshot();await resumed.useItem('potion',s.party[0].instanceId,'one-potion');assert.equal(resumed.snapshot().progress.items.potion,0);assert.deepEqual(resumed.snapshot().party,used.party);
 w.dispose();resumed.dispose();
});

test('loss/abandon resets only this challenge; valid return, no consumable refund or money loss',async()=>{
 const {w,s}=started();win(s,w,0);const progress=structuredClone(s.progress);s.party[0].hp=0;s.party[0].moves[0].pp=0;s.inventory.ecology_ball=0;s.progress.items.potion=1;
 finishEnhancedLeagueOpponent(s,{attempt:1,index:1,outcome:'lost'},w.catalog,w.host);assert.equal(s.enhancedLeague.phase,'idle');assert.equal(s.enhancedLeague.nextIndex,0);assert.equal(w.host.validLanding(s.position,s),true);assert.equal(s.party[0].hp,battleStats(w.catalog,s.party[0]).hp);assert.equal(s.inventory.ecology_ball,0);assert.equal(s.progress.items.potion,1);assert.equal(s.economy.money,1234);assert.deepEqual({...s.progress,items:progress.items},progress);
 const retry=world(s);await retry.interact(policy.entryPointId,{type:'begin',transactionId:'retry'});assert.equal(retry.snapshot().enhancedLeague.attempt,2);assert.equal(retry.snapshot().enhancedLeague.nextIndex,0);
 await retry.interact(policy.entryPointId,{type:'abandon',attempt:2,index:0});const ended=retry.snapshot();await retry.interact(policy.entryPointId,{type:'abandon',attempt:2,index:0});assert.deepEqual(retry.snapshot().enhancedLeague,ended.enhancedLeague);assert.equal(retry.snapshot().economy.money,1234);retry.dispose();w.dispose();
});

test('save failure uses existing pending commit/retry without double start, refunds or duplicated progress',async()=>{
 let fail=true,saved;const w=world(checkpoint,{persist:s=>{if(fail)throw Error('fixture disk failure');saved=structuredClone(s)}});
 await assert.rejects(()=>w.interact(policy.entryPointId,{type:'begin',transactionId:'atomic-start'}),/disk failure/);assert.equal(w.story.pendingCommit,true);assert.equal(w.snapshot().enhancedLeague,undefined);
 await assert.rejects(()=>w.interact(policy.entryPointId,{type:'begin',transactionId:'another'}),/BUSY/);fail=false;await w.story.retryCommit();w.syncField();assert.equal(saved.enhancedLeague.attempt,1);assert.deepEqual(w.snapshot(),saved);
 await assert.rejects(()=>w.story.retryCommit(),/No retryable/);assert.equal(w.snapshot().enhancedLeague.attempt,1);w.dispose();
});

test('approved Yeji loss uses real Battle v3 and persists only player aftermath; DEV rehearsal remains sealed',async()=>{
 const {w,s}=started();for(let i=0;i<4;i++)win(s,w,i);s.party=[createCanonicalCreature(w.catalog,s.starterId,1)];s.party[0].hp=1;
 const rehearsal=startYejiPreviewBattle(createGameSession(storyBattleInput(s,w.catalog),w.catalog),{adapter,mode:'test',rng:()=>.5});assert.equal(rehearsal.act({type:'move',moveId:s.party[0].moves[0].id}).outcome,'lost');assert.throws(()=>rehearsal.aftermath(),/rehearsal/);
 const dex=structuredClone(s.dex),resources=structuredClone(wealth(s));let saw=false,failResultSave=true,battleCount=0;
 const run=world(s,{rng:()=>.5,persist:()=>{if(failResultSave)throw Error('fixture result save failure')},battleDriver:b=>{battleCount++;const snap=b.snapshot();saw=snap.preview.approvalStatus==='APPROVED'&&snap.preview.persistable;assert.throws(()=>b.act({type:'capture',ballId:'ecology_ball'}),/trainer/);const result=b.act({type:'item',itemId:'potion',instanceId:snap.party[0].instanceId,transactionId:'league-item'});assert.equal(result.phase,'ended');assert.equal(result.outcome,'lost')}});
 await assert.rejects(()=>run.interact(policy.entryPointId,{type:'next',attempt:1,index:4}),/result save failure/);assert.equal(run.story.pendingCommit,true);assert.equal(run.snapshot().enhancedLeague.nextIndex,4);failResultSave=false;await run.story.retryCommit();run.syncField();assert.equal(battleCount,1);const after=run.snapshot();assert.equal(saw,true);assert.equal(after.enhancedLeague.phase,'idle');assert.equal(after.progress.items.potion,resources.items.potion-1);assert.equal(after.economy.money,resources.money);assert.deepEqual(after.dex,dex);assert.equal(after.party[0].namespace,'canonical');assert.equal(run.catalog.getSpeciesById('EDNA_01'),null);assert.equal(run.host.validLanding(after.position,after),true);assert.equal(after.party[0].hp,battleStats(run.catalog,after.party[0]).hp);assert.equal(run.busy,false);run.dispose();w.dispose();
});

test('same approved parties feed story and encounter-world catalogs; enhanced binding is local and reorder retains instances',async()=>{
 const {w,s}=started();for(const base of adapter.elitePartyApproval.bases)assert.deepEqual(adapter.storyRuntime.parties[base.partyId],adapter.encounterRuntime.story.parties[base.partyId]);
 const b=startEnhancedLeagueBattle(s,w.catalog,adapter,{attempt:1,index:0,rng:()=>.5,map:w.map});assert.equal(b.snapshot().opponents.length,6);assert.equal(b.snapshot().opponents[4].speciesId,'SPECIES_065');assert.equal(b.snapshot().opponents[4].level,66);assert.equal(adapter.storyRuntime.parties[adapter.battleRuntime.enhancedEliteParties.teams[policy.order[0]].id],undefined);
 const second=createCanonicalCreature(w.catalog,'SPECIES_010',8);s.party.push(second);for(const k of ['seen','caught'])s.dex[k].push(second.speciesId);const run=world(s),ids=s.party.map(m=>m.instanceId).reverse();await run.reorderLeagueParty(ids);assert.deepEqual(run.snapshot().party,s.party.toReversed());assert.equal(run.snapshot().party[1].hp,s.party[0].hp);
 const corrupt=structuredClone(s);corrupt.party[0].speciesId='EDNA_01';assert.throws(()=>validateCanonicalStorySave(corrupt,w.catalog),/identity/);validateEnhancedLeagueState(run.snapshot());run.dispose();w.dispose();
});
