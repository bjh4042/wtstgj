import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Preserve every original expectation against the historical pre-approval snapshot.
import {loadPreEliteApprovalAdapter as loadCanonicalRuntimeAdapter} from './helpers/pre-elite-approval-adapter.mjs';
import {buildEnhancedEliteParties,getEnhancedEliteTestParty,ENHANCED_ELITE_PARTY_V1} from '../dist/compatibility/enhanced-elite-party-v1.mjs';
import {sha256,stableJSON} from '../dist/compatibility/codec.mjs';
const texts={},a=await loadCanonicalRuntimeAdapter({readText:async f=>texts[f]=readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
const battleText=texts[ENHANCED_ELITE_PARTY_V1.sourceFile],registry=a.battleRuntime.enhancedEliteParties;

test('24-slot reconciliation: 20 same-identity/moves/ace +10 slots; only four unresolved sixth slots HOLD',()=>{
 assert.deepEqual(registry.coverage,{totalSlots:24,readySlots:20,heldSlots:4});assert.deepEqual(registry.order,a.storyRuntime.elite);
 for(const [index,id] of registry.order.entries()){
  const team=registry.teams[id],main=a.storyRuntime.parties[team.basePartyId];
  assert.equal(team.order,index+1);assert.notEqual(team.id,main.id);assert.equal(team.basePartySha256,sha256(stableJSON(main)));assert.equal(team.basePartySha256,team.recordedBasePartySha256);
  assert.deepEqual(team.baseTrainer,a.storyRuntime.trainers[id]);
  for(const slot of team.slots){const current=main.members[slot.slot-1];assert.deepEqual(slot.baseline,{...current,ace:slot.sourceMember.ace});
   if(slot.slot===6){assert.equal(slot.status,'HOLD');assert.equal(slot.enhanced,null);assert.deepEqual(slot.reasons,['LATEST_APPROVAL_SLOT_UNRESOLVED'])}
   else{assert.equal(slot.status,'READY');assert.deepEqual(slot.enhanced,{...current,ace:slot.sourceMember.ace,level:current.level+10})}
  }
 }
});

test('main parties, species, Yeji and settings unchanged; repeated derivation/loading cannot accumulate +20',async()=>{
 const before=stableJSON({story:a.storyRuntime,species:a.species,yeji:a.battleRuntime.previewOpponent});
 const twice=buildEnhancedEliteParties(a,battleText);assert.deepEqual(twice,registry);
 assert.deepEqual(buildEnhancedEliteParties({...a,battleRuntime:{...a.battleRuntime,enhancedEliteParties:twice}},battleText),registry);
 const reload=await loadCanonicalRuntimeAdapter({readText:async f=>texts[f]});assert.deepEqual(reload.battleRuntime.enhancedEliteParties,registry);
 assert.equal(stableJSON({story:a.storyRuntime,species:a.species,yeji:a.battleRuntime.previewOpponent}),before);
 const altered=structuredClone(a),id=registry.order[0],base=registry.teams[id].basePartyId;
 altered.storyRuntime.parties[base].members[0].level+=10;
 const guarded=buildEnhancedEliteParties(altered,battleText);
 assert.equal(guarded.teams[id].slots[0].enhanced,null);assert.ok(guarded.teams[id].slots[0].reasons.includes('SOURCE_RUNTIME_SLOT_MISMATCH'));
 assert.equal(guarded.coverage.readySlots,19);
});

test('partial teams never become executable parties; no POST trainer/gate/reward registration',()=>{
 assert.equal(registry.active,false);assert.equal(registry.ready,false);
 for(const id of registry.order){const team=registry.teams[id];assert.equal(team.party,null);assert.equal(a.storyRuntime.parties[team.id],undefined);
  assert.throws(()=>getEnhancedEliteTestParty(a,id,{mode:'test'}),/HOLD/);
  assert.throws(()=>getEnhancedEliteTestParty(a,id,{mode:'production'}),/DEV\/TEST/);
 }
 assert.equal(a.battleRuntime.previewOpponent.active,false);assert.equal(a.battleRuntime.previewOpponent.typeStatsApproval.approvalStatus,'APPROVED');
 assert.equal(a.economyPolicy,undefined);
});
