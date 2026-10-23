import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {YEJI_BASE_EXP_V1,applyYejiBaseExpApproval} from '../dist/compatibility/yeji-base-exp-v1.mjs';
import {YEJI_TYPE_STATS_V1} from '../dist/compatibility/yeji-preview-type-stats-v1.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';
import {createCanonicalCreature} from '../dist/canonical-session.mjs';
import {ENHANCED_LEAGUE_V1 as policy,beginEnhancedLeague,finishEnhancedLeagueOpponent} from '../dist/story/enhanced-league.mjs';
import {postLeagueFixture} from './helpers/enhanced-league-fixture.mjs';

const read=f=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8');
const adapter=await loadCanonicalRuntimeAdapter({readText:async f=>read(f)}),contract=adapter.battleRuntime.previewOpponent;

test('exact six EDNA BaseEXP values follow source formula and approved BST without changing source rows',()=>{
 assert.deepEqual(contract.baseExpById,{EDNA_01:155,EDNA_02:155,EDNA_03:155,EDNA_04:155,EDNA_05:155,EDNA_06:160});
 assert.equal(contract.baseExpApproval.approvalStatus,'APPROVED');
 const text=read(YEJI_BASE_EXP_V1.sourceFile),raw=JSON.parse(text);
 assert.equal(raw.battle_balance.exp_contract.base_exp_formula,YEJI_BASE_EXP_V1.formula);
 for(const [id,value] of Object.entries(contract.baseExpById)){
  const bst=contract.byId[id].stats.reduce((a,b)=>a+b,0);
  assert.equal(bst,YEJI_TYPE_STATS_V1.values[id].bst);
  assert.equal(value,Math.max(50,Math.min(180,Math.round((.4*bst-60)/5)*5)));
  assert.equal(raw.npc_preview_species.find(s=>s.preview_species_id===id).baseExp,undefined);
 }
 assert.equal(contract.baseExpById.EDNA_07,undefined);
 assert.equal(applyYejiBaseExpApproval(contract,text).baseExpById.EDNA_01,155);
 assert.throws(()=>applyYejiBaseExpApproval(contract,text+' '),/source mismatch/);
});

test('one EDNA defeat uses existing 100/75/0 EXP; result save retry and duplicate callback do not pay twice',async()=>{
 // Isolated one-opponent fixture: production six-member party and normal growth are not altered.
 const fixtureAdapter={...adapter,battleRuntime:{...adapter.battleRuntime,previewOpponent:{...contract,party:{...contract.party,members:contract.party.members.slice(0,1)}}}};
 const setup=new CanonicalWorld({adapter:fixtureAdapter,mode:'test'}),s=postLeagueFixture(fixtureAdapter);
 beginEnhancedLeague(s,setup.catalog,setup.host,'exp-fixture');
 for(let index=0;index<4;index++)finishEnhancedLeagueOpponent(s,{attempt:1,index,outcome:'won'},setup.catalog,setup.host);
 const fireSpecies=setup.catalog.records.find(r=>r.types.includes('fire')&&r.stage===3);
 assert.ok(fireSpecies);
 s.party=[fireSpecies.id,'SPECIES_001','SPECIES_004'].map((id,i)=>createCanonicalCreature(setup.catalog,id,i===0?90:20));
 s.party[2].hp=0;
 for(const key of ['seen','caught'])s.dex[key]=[...new Set([...s.dex[key],...s.party.map(m=>m.speciesId)])];
 const before=structuredClone(s),rules=adapter.moves;
 const fire=fireSpecies.moves.map(m=>rules[m.id]).filter(m=>m.type==='fire'&&m.power>0).sort((a,b)=>b.power-a.power)[0];
 assert.ok(fire);s.party[0].moves=[{id:fire.id,pp:fire.pp}];
 let failSave=true,calls=0,expEvents;
 const w=new CanonicalWorld({adapter:fixtureAdapter,mode:'test',runtime:s,rng:()=>.5,persist:()=>{if(failSave)throw Error('fixture save failure')},battleDriver:b=>{
  calls++;assert.equal(b.snapshot().preview.experienceEnabled,true);
  assert.throws(()=>b.act({type:'capture',ballId:'ecology_ball'}),/trainer/);
  for(let i=0;i<8&&b.snapshot().phase!=='ended';i++)b.act({type:'move',moveId:fire.id});
  assert.equal(b.snapshot().outcome,'won');
  expEvents=b.snapshot().events.filter(e=>e.type==='exp');assert.equal(expEvents.length,3);
  assert.deepEqual(expEvents.map(e=>[e.share,e.amount]),[['participated',2325],['alive_nonparticipant',1743],['fainted',0]]);
  assert.deepEqual(b.aftermath(),b.aftermath());
  assert.throws(()=>b.act({type:'move',moveId:fire.id}));assert.equal(b.snapshot().events.filter(e=>e.type==='exp').length,3);
 }});
 try{
  await assert.rejects(()=>w.interact(policy.entryPointId,{type:'next',attempt:1,index:4}),/fixture save failure/);
  assert.deepEqual(w.snapshot().party.map(m=>m.totalExp),before.party.map(m=>m.totalExp));
  failSave=false;await w.story.retryCommit();w.syncField();
  const after=w.snapshot();assert.equal(calls,1);assert.equal(after.enhancedLeague.phase,'completed');
  assert.deepEqual(after.party.map((m,i)=>m.totalExp-before.party[i].totalExp),[2325,1743,0]);
  assert.deepEqual(after.dex,before.dex);assert.deepEqual(after.box,before.box);
  assert.deepEqual(after.inventory,before.inventory);assert.deepEqual(after.progress.items,before.progress.items);assert.equal(after.economy.money,before.economy.money);
  assert.equal(w.catalog.size,151);assert.equal(w.catalog.getSpeciesById('EDNA_01'),null);
  assert.throws(()=>createCanonicalCreature(w.catalog,'EDNA_01',70),/Invalid canonical creature/);
  await w.interact(policy.entryPointId,{type:'next',attempt:1,index:4});assert.deepEqual(w.snapshot().party,after.party);assert.equal(calls,1);
 }finally{w.dispose();setup.dispose()}
});
