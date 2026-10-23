// Reproducible artifact of the explicit STEP 7B approval. Never changes handoff files.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {sha256} from '../dist/compatibility/codec.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const candidateText=read('docs/canonical-aquatic-encounter-reconciliation-v1/candidate-A.UNAPPROVED.json'),candidate=JSON.parse(candidateText);
const file='geoje_encounter_master_v2_3.json',text=read('dist/data/canonical-handoff-v1/'+file),source=JSON.parse(text);
const targets=['S1_HACHEONG_BRACKISH:surf_brackish','S2_JANGMOK_COAST:surf_nearshore','S6_HAKDONG_MONGDOL:surf_nearshore','S7_HAEGEUMGANG_ROCKY_COAST:surf_nearshore','S8_JISEPO_HARBOR:surf_nearshore','S8_GUJORA_OFFSHORE:surf_offshore','S9_JANGSEUNGPO_RETURN_ROUTE:return_surf','POST_ISLAND_EXPEDITION:post_surf'];
assert.equal(candidate.approvalStatus,'UNAPPROVED');assert.equal(candidate.requiredSourceSha256,sha256(text));assert.deepEqual(candidate.tables.map(t=>t.tableId),targets);
const effective=structuredClone(source),patch=[],excluded={};
for(const target of targets){
 const [areaId,method]=target.split(':'),ai=source.areas.findIndex(a=>a.area_id===areaId),ti=source.areas[ai].encounter_tables.findIndex(t=>t.method===method),before=source.areas[ai].encounter_tables[ti],path=`/areas/${ai}/encounter_tables/${ti}`;
 const expected=[{op:'test',path,value:before},{op:'remove',path}];assert.deepEqual(candidate.tables.find(t=>t.tableId===target).patch,expected);
 assert.deepEqual(candidate.tables.find(t=>t.tableId===target).before,before);patch.push(...expected);effective.areas[ai].encounter_tables.splice(ti,1);
 excluded[target]={id:target,areaId,method,reason:'APPROVED_POLICY_A_NO_RANDOM_SURF',sourcePointer:path,sourceSlotCount:before.slots.length};
}
assert.equal(Object.values(excluded).reduce((n,t)=>n+t.sourceSlotCount,0),44);
const indexPatch=[];
for(let i=source.species_acquisition_index.length-1;i>=0;i--){const sites=source.species_acquisition_index[i].direct_encounter_sites;for(let j=sites.length-1;j>=0;j--)if(targets.includes(`${sites[j].area_id}:${sites[j].method}`)){const path=`/species_acquisition_index/${i}/direct_encounter_sites/${j}`;indexPatch.push({op:'test',path,value:sites[j]},{op:'remove',path});effective.species_acquisition_index[i].direct_encounter_sites.splice(j,1)}}
assert.deepEqual(candidate.derivedIndexPatch,indexPatch);assert.equal(indexPatch.length/2,44);patch.push(...indexPatch);
const version='canonical-encounter-v2.3-policy-a-v1';
for(const [path,before,after] of [['/validation/species_index_direct_site_count',source.validation.species_index_direct_site_count,198],['/validation/status',source.validation.status,'APPROVED_POLICY_A_APPLIED'],['/meta/version',source.meta.version,version]]){patch.push({op:'test',path,value:before},{op:'replace',path,value:after});const [,section,key]=path.split('/');effective[section][key]=after}
// Candidate's provisional CANDIDATE_REVIEW_REQUIRED marker is replaced with approval provenance,
// not a validation PASS assertion. Runtime adapter validation still runs independently.
const artifact={policyId:'AQUATIC_POLICY_A_V1',approvalStatus:'APPROVED',approvalEvidence:'User STEP 7B: all eight STEP 7A A proposals approved; no economy changes authorized',contentNamespace:'canonical-v1',sourceFile:file,sourceVersion:source.meta.version,sourceSha256:sha256(text),candidateSha256:sha256(candidateText),effectiveVersion:version,effectiveSha256:sha256(JSON.stringify(effective,null,2)+'\n'),historicalDiagnosis:{tables:8,slots:44,conflictingSlots:42,distinctSpecies:7},excluded,patch};
mkdirSync(new URL('docs/canonical-aquatic-policy-a-v1/',root),{recursive:true});
writeFileSync(new URL('dist/compatibility/aquatic-policy-a-v1.mjs',root),'// Generated approved policy; immutable handoff and STEP 7A candidate remain separate.\nimport {deepFreeze} from "./codec.mjs";\nexport const AQUATIC_POLICY_A=deepFreeze('+JSON.stringify(artifact,null,2)+');\n');
writeFileSync(new URL('docs/canonical-aquatic-policy-a-v1/approved-policy.json',root),JSON.stringify(artifact,null,2)+'\n');
console.log(JSON.stringify({targets:targets.length,sourceSha256:artifact.sourceSha256,effectiveSha256:artifact.effectiveSha256,effectiveTables:effective.areas.flatMap(a=>a.encounter_tables).length}));
