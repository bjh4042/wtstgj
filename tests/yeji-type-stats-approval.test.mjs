import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {adaptYejiPreview} from '../dist/compatibility/preview-opponent-adapter.mjs';
import {YEJI_TYPE_STATS_V1,applyYejiTypeStatsApproval} from '../dist/compatibility/yeji-preview-type-stats-v1.mjs';

const texts={},adapter=await loadCanonicalRuntimeAdapter({readText:async f=>texts[f]=readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
const battle=JSON.parse(texts['geoje_battle_collection_master_v3.json']),manifest=JSON.parse(texts['geoje_final_source_manifest_v1.json']);
const raw=adaptYejiPreview(manifest,battle),effective=adapter.battleRuntime.previewOpponent;

test('six EDNA IDs/types/stats/BST match user v1 approval; effective overlay changes status only',()=>{
 assert.equal(Object.keys(YEJI_TYPE_STATS_V1.values).length,6);
 assert.deepEqual(Object.keys(effective.byId),Object.keys(YEJI_TYPE_STATS_V1.values));
 for(const [id,approved] of Object.entries(YEJI_TYPE_STATS_V1.values)){
  const row=effective.byId[id],source=battle.npc_preview_species.find(s=>s.preview_species_id===id);
  assert.equal(row.id,id);assert.deepEqual(row.types,approved.types);assert.deepEqual(row.stats,approved.stats);
  assert.equal(row.stats.reduce((a,b)=>a+b,0),approved.bst);assert.equal(source.bst,approved.bst);
  assert.equal(row.typeStatsApproval.approvalStatus,'APPROVED');assert.equal(row.typeStatsApproval.effectiveVersion,'yeji-preview-type-stats-v1');
  const {typeStatsApproval,...unchanged}=row;assert.deepEqual(unchanged,raw.byId[id]);
 }
 assert.deepEqual(effective.party,raw.party);assert.equal(effective.active,false);
 assert.equal(effective.approvalStatus,'PENDING_USER_APPROVAL');assert.equal(effective.approvalScope,'POST_BATTLE_ACTIVATION');
 assert.equal(raw.typeStatsApproval,undefined);assert.ok(raw.deferred.includes('type/stat approval'));
 assert.deepEqual(effective.deferred,raw.deferred.filter(r=>r!=='type/stat approval'));
});

test('approval cannot attach to changed source or changed EDNA values',()=>{
 assert.throws(()=>applyYejiTypeStatsApproval(raw,{...texts,'geoje_battle_collection_master_v3.json':texts['geoje_battle_collection_master_v3.json']+' '}),/source mismatch/);
 const changed=structuredClone(raw);changed.byId.EDNA_01.stats[0]++;
 assert.throws(()=>applyYejiTypeStatsApproval(changed,texts),/approved type\/stat mismatch/);
});
