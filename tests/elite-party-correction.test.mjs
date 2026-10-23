import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {applyElitePartyCorrection,ELITE_PARTY_CORRECTION_V1} from '../dist/compatibility/elite-party-correction-v1.mjs';
import {buildEnhancedEliteParties,getEnhancedEliteTestParty} from '../dist/compatibility/enhanced-elite-party-v1.mjs';
import {sha256,stableJSON} from '../dist/compatibility/codec.mjs';
import {loadPreEliteApprovalAdapter} from './helpers/pre-elite-approval-adapter.mjs';
import {SpeciesCatalogService} from '../dist/species-catalog-service.mjs';
import {createCanonicalTestGame,createGameSession} from '../dist/canonical-session.mjs';
import {activateCanonicalBattleSave} from '../dist/battle-v3/save.mjs';
import {startSessionBattle} from '../dist/battle-v3/engine.mjs';
import {battleStats} from '../dist/battle-v3/rules.mjs';
const texts={},readText=async f=>texts[f]??=readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8');
const historical=await loadPreEliteApprovalAdapter({readText}),historicalBefore=stableJSON(historical),a=await loadCanonicalRuntimeAdapter({readText});
const p=ELITE_PARTY_CORRECTION_V1,battleText=texts[p.sourceFile],registry=a.battleRuntime.enhancedEliteParties;
// Independent literals from the final approval, not generated from production policy values.
const expected=[
 ['NPC_ELITE_01_YUNWOO',5,'SPECIES_065',56,['MV022','MV214','MV003','MV005'],'SPECIES_138',57],
 ['NPC_ELITE_02_SIYOON',5,'SPECIES_124',57,['MV041','MV122','MV003','MV005'],'SPECIES_112',58],
 ['NPC_ELITE_03_EUNMI',2,'SPECIES_072',57,['MV091','MV031','MV004','MV005'],'SPECIES_145',59],
 ['NPC_ELITE_04_JUNHO',2,'SPECIES_130',58,['MV042','MV103','MV102','MV005'],'SPECIES_147',60]
];

test('exactly four approved non-ace replacements; original four aces; six per team and +10',()=>{
 const restored=structuredClone(a.storyRuntime);
 for(const [id,slot,speciesId,level,moveIds,aceId,aceLevel] of expected){
  const team=registry.teams[id],main=a.storyRuntime.parties[team.basePartyId],old=historical.storyRuntime.parties[team.basePartyId];
  assert.equal(main.members.length,6);assert.equal(team.party.members.length,6);
  assert.deepEqual(main.members[slot-1],{namespace:'canonical',speciesId,level,moveIds,ace:false});
  assert.deepEqual(team.party.members[slot-1],{namespace:'canonical',speciesId,level:level+10,moveIds,ace:false});
  assert.deepEqual(main.members[5],old.members[5]);assert.equal(main.members[5].speciesId,aceId);
  assert.deepEqual(team.party.members[5],{...old.members[5],level:aceLevel+10,ace:true});
  assert.equal(team.basePartySha256,sha256(stableJSON(main)));assert.equal(team.recordedBasePartySha256,team.basePartySha256);
  // Unchanged 16 non-ace slots retain previous evidence; compare bytes only, no battle replay.
  for(let i=0;i<5;i++)if(i!==slot-1){assert.deepEqual(main.members[i],old.members[i]);assert.deepEqual(team.party.members[i],historical.battleRuntime.enhancedEliteParties.teams[id].slots[i].enhanced)}
  restored.parties[team.basePartyId].members[slot-1]=old.members[slot-1];
 }
 assert.deepEqual(restored,historical.storyRuntime);assert.deepEqual(registry.coverage,{totalSlots:24,readySlots:24,heldSlots:0});assert.equal(registry.ready,true);
 assert.equal(stableJSON(historical),historicalBefore);assert.deepEqual(a.species,historical.species);assert.deepEqual(a.moves,historical.moves);
 // The later BaseEXP approval adds only these two preview fields. Keep the
 // earlier party correction comparison pinned to its original approval scope.
 const previewAtCorrection=structuredClone(a.battleRuntime.previewOpponent);
 delete previewAtCorrection.baseExpApproval;delete previewAtCorrection.baseExpById;
 assert.deepEqual(previewAtCorrection,historical.battleRuntime.previewOpponent);
 assert.deepEqual(a.battleRuntime.previewOpponent.baseExpById,{EDNA_01:155,EDNA_02:155,EDNA_03:155,EDNA_04:155,EDNA_05:155,EDNA_06:160});
});

test('repeat approval, generation and reload are non-cumulative; POST activation still blocked',async()=>{
 const reapplied=applyElitePartyCorrection(a,battleText);assert.deepEqual(reapplied,a);
 assert.deepEqual(buildEnhancedEliteParties(a,battleText),registry);
 assert.deepEqual(buildEnhancedEliteParties({...a,battleRuntime:{...a.battleRuntime,enhancedEliteParties:registry}},battleText),registry);
 assert.deepEqual((await loadCanonicalRuntimeAdapter({readText})).battleRuntime.enhancedEliteParties,registry);
 const altered=structuredClone(a);altered.storyRuntime.parties[p.bases[0].partyId].members[4].level+=10;
 assert.throws(()=>applyElitePartyCorrection(altered,battleText),/baseline mismatch/);
 const held=buildEnhancedEliteParties(altered,battleText).teams[p.bases[0].trainerId].slots[4];assert.equal(held.enhanced,null);assert.ok(held.reasons.includes('SOURCE_RUNTIME_SLOT_MISMATCH'));
 assert.throws(()=>applyElitePartyCorrection(a,battleText+' '),/source mismatch/);
 assert.equal(registry.active,false);assert.equal(p.postBattleActivated,false);assert.equal(a.economyPolicy.approvalStatus,'USER_APPROVED');
 for(const [id] of expected){const party=getEnhancedEliteTestParty(a,id,{mode:'test'});assert.equal(party.members.length,6);assert.equal(a.storyRuntime.parties[party.id],undefined);assert.equal(a.storyRuntime.trainers[party.id],undefined);assert.throws(()=>getEnhancedEliteTestParty(a,id,{mode:'production'}),/DEV\/TEST/)}
});

test('Battle v3 consumes corrected main parties without evolving Huangburi or rewriting live/player state',()=>{
 const catalog=new SpeciesCatalogService({namespace:'canonical',adapter:a});
 const session=createGameSession(activateCanonicalBattleSave(createCanonicalTestGame(catalog,{mode:'test',starterId:'SPECIES_001'}),catalog),catalog),before=structuredClone(session.runtime);
 for(const [id,slot,speciesId,level,moveIds] of expected){
  const partyId='PARTY:'+id,old=historical.storyRuntime.parties[partyId],main=a.storyRuntime.parties[partyId];
  const live=startSessionBattle(session,{kind:'trainer',partyId,opponents:old.members},{adapter:historical}),liveBefore=live.snapshot();
  const battle=startSessionBattle(session,{kind:'trainer',partyId,opponents:main.members},{adapter:a}),mon=battle.snapshot().opponents[slot-1];
  assert.equal(mon.speciesId,speciesId);assert.equal(mon.level,level);assert.deepEqual(mon.moves.map(m=>m.id),moveIds);assert.equal(mon.hp,battleStats(catalog,mon).hp);
  assert.deepEqual(live.snapshot(),liveBefore);
 }
 assert.deepEqual(session.runtime,before);
});
