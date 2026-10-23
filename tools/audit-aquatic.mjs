/** Offline review generator, never imported by runtime. Does not apply candidate patches. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SOURCE_FILES,parseCSV,loadCanonicalAdapter} from '../dist/compatibility/canonical-adapter.mjs';
import {explainTableAccess} from '../dist/encounter/access.mjs';
import {activateCanonicalEncounterSave} from '../dist/story/save.mjs';
export const REVIEW_DIR=new URL('../docs/canonical-aquatic-encounter-reconciliation-v1/',import.meta.url);
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function readReviewInputs(){
 const texts=Object.fromEntries(Object.values(SOURCE_FILES).map(f=>[f,readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')]));
 const sources=Object.fromEntries(Object.entries(SOURCE_FILES).map(([key,f])=>[key,f.endsWith('.csv')?parseCSV(texts[f]):JSON.parse(texts[f])]));
 return {texts,sources,attached:JSON.parse(readFileSync(new URL('source-audit.json',REVIEW_DIR),'utf8')),previousReport:JSON.parse(readFileSync(new URL('../docs/canonical-encounter-fishing-acquisition-v1/verification.json',import.meta.url),'utf8'))};
}
const requirementGate=id=>({field_ability_surf:'CAN_SURF',basic_rod:'CAN_FISH_BASIC',good_rod:'CAN_FISH_GOOD',super_rod:'CAN_FISH_SUPER'})[id]??null;
export function buildAquaticAudit({texts,sources:s,attached,adapter,states={},previousReport=null}){
 const c=adapter.encounterRuntime,files=['acquisition','encounter','fishing','stage','flags'],mismatches=[];
 const fingerprints=files.map(key=>{const file=SOURCE_FILES[key],actual=hash(texts[file]),expected=attached.source_fingerprints[file]??null,indexHash=s.index.canonical_files[file]?.sha256??null,manifestHash=s.manifest.canonical_file_fingerprints[file]?.sha256??null;if(expected&&actual!==expected)mismatches.push({code:'ATTACHMENT_SOURCE_HASH_MISMATCH',file,expected,actual});return {file,sha256:actual,attachmentSha256:expected,attachmentMatch:expected===null?'NOT_PROVIDED':actual===expected?'MATCH':'MISMATCH',currentIndexMatch:actual===indexHash,currentManifestMatch:actual===manifestHash}});
 const gate=id=>{if(!id)return null;const i=s.flags.derived_gates.findIndex(g=>g.id===id);return i<0?{id,missing:true}:{...s.flags.derived_gates[i],source:{file:SOURCE_FILES.flags,jsonPointer:`/derived_gates/${i}`}}};
 const tables=[];
 s.encounter.areas.forEach((area,ai)=>area.encounter_tables.forEach((table,ti)=>{
  if(!table.method.includes('surf'))return;
  const tableId=`${area.area_id}:${table.method}`,runtime=c.tables[tableId],pointer=`/areas/${ai}/encounter_tables/${ti}`;
  const evaluations=Object.fromEntries(Object.entries(states).map(([checkpoint,save])=>{const located=structuredClone(save);located.encounter.areaId=area.area_id;located.encounter.method=table.method;return [checkpoint,explainTableAccess(located,c,tableId)]}));
  const slots=table.slots.map((slot,si)=>{
   const species=adapter.species.find(m=>m.number===slot.species_no),ci=s.acquisition.findIndex(a=>Number(a.chain_id)===species.chainId),a=s.acquisition[ci],chain=c.chains[String(species.chainId)];
   const sourcePointer=`${pointer}/slots/${si}`,old=attached.tables.flatMap(t=>t.slots).find(x=>x.encounter_json_pointer===sourcePointer);
   const compare={species_no:slot.species_no,name:slot.name,weight:slot.weight,level:slot.level,primary_acquisition:a.primary_acquisition,first_stage:a.first_stage,random_spawn_allowed:a.random_spawn_allowed==='True',standard_ball_capture_allowed:a.standard_ball_capture_allowed==='True',field_requirements:a.field_requirements,interaction_mode:a.interaction_mode,acquisition_chain_id:Number(a.chain_id),acquisition_csv_record_line:ci+2};
   for(const [key,value] of Object.entries(compare))if(!old||JSON.stringify(old[key])!==JSON.stringify(value))mismatches.push({code:'ATTACHMENT_SLOT_MISMATCH',sourcePointer,key,current:value,attachment:old?.[key]??null});
   const fishingRefs=s.fishing.flatMap((f,i)=>Number(f.species_no)===slot.species_no?[{file:SOURCE_FILES.fishing,csvRecordLine:i+2,areaId:f.area_id,rod:f.rod,weight:Number(f.weight),level:[Number(f.level_min),Number(f.level_max)],availableFrom:f.fishing_available_from,rodGate:f.rod_unlock_gate,areaRequirements:f.area_requirements}]:[]);
   return {areaId:area.area_id,method:table.method,speciesId:species.id,number:species.number,name:species.name,weight:slot.weight,level:slot.level,acquisition:{chainId:species.chainId,primary_acquisition:a.primary_acquisition,random_spawn_allowed:a.random_spawn_allowed==='True',interaction_mode:a.interaction_mode,standard_ball_capture_allowed:a.standard_ball_capture_allowed==='True',field_requirements:a.field_requirements,first_stage:a.first_stage},actualUnlockConditions:{areaStage:area.stage_id,tableUnlock:table.unlock??null,tableUnlockGate:gate(requirementGate(table.unlock)),acquisitionFirstStage:a.first_stage,acquisitionRequirementGates:chain.requirements.map(requirementGate).map(gate),permission:'All progression conditions AND method permission; gates never override random_spawn_allowed=False'},checkpointEvaluation:Object.fromEntries(Object.entries(evaluations).map(([key,e])=>{const row=e.slots.find(r=>r.speciesId===species.id);return [key,{runtimeEligible:e.eligible,runtimeBlocker:e.error,areaUnlocked:e.areaUnlocked,tableUnlockSatisfied:e.tableRequirements.every(r=>r.satisfied),firstStageUnlocked:row.firstStageUnlocked,acquisitionRequirements:row.acquisitionRequirements}]})),conflict:a.random_spawn_allowed==='False',cause:a.random_spawn_allowed==='False'?'EXPLICIT_RANDOM_PROHIBITION_VS_SURF_SLOT':'NO_RANDOM_FLAG_CONFLICT_TABLE_STILL_QUARANTINED',source:{encounter:{file:SOURCE_FILES.encounter,jsonPointer:sourcePointer},acquisition:{file:SOURCE_FILES.acquisition,csvRecordLine:ci+2,chainId:Number(a.chain_id)},stage:{file:SOURCE_FILES.stage,jsonPointer:`/stages/${s.stage.stages.findIndex(st=>st.id===area.stage_id)}`},fishing:fishingRefs}};
  });
  const attachment=attached.tables.find(t=>t.area_id===area.area_id&&t.method===table.method);
  for(const [key,current] of Object.entries({area_stage_id:area.stage_id,unlock:table.unlock,original_slot_count:slots.length,original_weight_sum:slots.reduce((n,r)=>n+r.weight,0),conflict_slot_count:slots.filter(r=>r.conflict).length}))if(JSON.stringify(attachment?.[key])!==JSON.stringify(current))mismatches.push({code:'ATTACHMENT_TABLE_MISMATCH',tableId,key,current});
  tables.push({tableId,areaId:area.area_id,method:table.method,sourcePointer:pointer,areaStage:area.stage_id,unlock:table.unlock,sourceNote:table.note??null,quarantined:!runtime.active,slotCount:slots.length,conflictingSlots:slots.filter(r=>r.conflict).length,remainingRandomAllowedWeight:slots.filter(r=>!r.conflict).reduce((n,r)=>n+r.weight,0),weightSum:slots.reduce((n,r)=>n+r.weight,0),slots});
 }));
 const all=tables.flatMap(t=>t.slots),conflicts=all.filter(s=>s.conflict),counts={surfTables:tables.length,surfSlots:all.length,conflictingSlots:conflicts.length,distinctConflictingSpecies:new Set(conflicts.map(s=>s.speciesId)).size,remainingRandomFlagSlots:all.length-conflicts.length};
 const species=[...new Set(conflicts.map(s=>s.speciesId))].map(id=>{const rows=conflicts.filter(s=>s.speciesId===id);return {speciesId:id,number:rows[0].number,name:rows[0].name,affectedSlots:rows.length,acquisition:rows[0].acquisition}});
 for(const [key,actual] of Object.entries({source_encounter_table_count:Object.keys(c.tables).length,surf_table_count:counts.surfTables,surf_slot_count:counts.surfSlots,conflicting_slot_count:counts.conflictingSlots,distinct_conflicting_species_count:counts.distinctConflictingSpecies,slots_passing_random_flag_check_only:counts.remainingRandomFlagSlots}))if(attached.counts[key]!==actual)mismatches.push({code:'ATTACHMENT_COUNT_MISMATCH',key,actual});
 const expectedErrors=conflicts.map(s=>`${s.areaId}:${s.method}/${s.speciesId}`).sort(),runtimeErrors=c.validation.errors.filter(e=>e.code==='ACQUISITION_RANDOM_CONFLICT').map(e=>`${e.tableId}/${e.speciesId}`).sort();
 const authorityMatch=JSON.stringify(expectedErrors)===JSON.stringify(runtimeErrors);
 const previousDiagnosisMatches=!!previousReport&&JSON.stringify(previousReport.sourceAuthorityErrors.map(e=>`${e.tableId}/${e.speciesId}`).sort())===JSON.stringify(expectedErrors);
 return {reportId:'GEOJE_STEP7A_RUNTIME_SOURCE_RECONCILIATION_V1',scope:'Current source + production access predicates + Story/Battle v3 checkpoint fixtures. No browser execution or approved rule change.',baselineCommit:'e5e52e3cfd099f640ab8c00642d7ee19d5fad71f',fingerprints,attachmentMatches:mismatches.length===0,attachmentMismatches:mismatches,counts,runtimeDiagnosisMatches:authorityMatch,previousDiagnosisMatches,sourceConflictResolved:false,activeTables:Object.values(c.tables).filter(t=>t.active).length,quarantinedTables:c.validation.quarantinedTableIds,approvalPendingTables:tables.map(t=>t.tableId),species,tables,gateProvenance:{gates:s.flags.derived_gates.filter(g=>/SURF|FISH/.test(g.id)).map(g=>gate(g.id)),flags:s.flags.flag_catalog.flatMap((f,i)=>/SURF|BADGE_0[1578]/.test(f.id)?[{...f,source:{file:SOURCE_FILES.flags,jsonPointer:`/flag_catalog/${i}`}}]:[]),rewards:s.flags.reward_transactions.flatMap((r,i)=>Object.keys(r.grant??{}).some(k=>/rod|surf/.test(k))?[{...r,source:{file:SOURCE_FILES.flags,jsonPointer:`/reward_transactions/${i}`}}]:[])}};
}
export function buildCandidate(audit,sources){
 if(!audit.attachmentMatches||!audit.fingerprints.every(f=>f.currentIndexMatch&&f.currentManifestMatch)||!audit.runtimeDiagnosisMatches)throw Error('Review mismatch: no candidate may be generated automatically');
 const file=SOURCE_FILES.encounter;
 const tables=audit.tables.map(t=>{
  const before=sources.encounter.areas.find(a=>a.area_id===t.areaId).encounter_tables.find(x=>x.method===t.method);
  return {tableId:t.tableId,before:structuredClone(before),fixWithoutRuleChange:false,gateOnlyFixResolves:false,recommendation:'A_NO_RANDOM_SURF_KEEP_TRAVEL_FISHING_OBSERVATION',proposedAfter:{randomSurfTable:null,sourceTravelUnlockUnchanged:true,fishingTablesUnchanged:true,specialEventsUnchanged:true},alternative:{id:'B_REDESIGN_SPECIES_AND_WEIGHTS',status:'NEEDS_SEPARATE_EXACT_SLOT_APPROVAL',approvedReplacementSlots:null},reason:t.remainingRandomAllowedWeight?`Only ${t.remainingRandomAllowedWeight}/100 weight remains; cannot rescale to 100 without design approval.`:'Every slot contradicts the explicit random permission. No replacement species is inferred.',userDecision:'Approve A for this table, or request a separately specified B. No approval is assumed.',impact:{firstAcquisition:'No change to Acquisition or authorized Fishing first-stage / rod requirements.',revisits:'The proposed region has no random Surf battle; traversal and its source unlock remain separate.',rodValue:'All 70 Fishing rows and rod gates retained; no Surf bypass of super_rod.',remainingSlots:t.slots.filter(s=>!s.conflict).map(s=>({speciesId:s.speciesId,originalWeight:s.weight,notRenormalized:true,otherActiveRoutes:Object.values(sources.encounter.areas).flatMap(a=>a.encounter_tables.filter(x=>!x.method.includes('surf')&&x.slots.some(x=>x.species_no===s.number)).map(x=>`${a.area_id}:${x.method}`))}))},patch:[{op:'test',path:t.sourcePointer,value:structuredClone(before)},{op:'remove',path:t.sourcePointer}]};
 });
 const selected=new Set(tables.map(t=>t.tableId)),derivedIndexPatch=[];
 // Descending indices keep RFC6902 removes stable when several sites share a species entry.
 for(let i=sources.encounter.species_acquisition_index.length-1;i>=0;i--){
  const sites=sources.encounter.species_acquisition_index[i].direct_encounter_sites;
  for(let j=sites.length-1;j>=0;j--)if(selected.has(`${sites[j].area_id}:${sites[j].method}`)){
   const path=`/species_acquisition_index/${i}/direct_encounter_sites/${j}`;derivedIndexPatch.push({op:'test',path,value:structuredClone(sites[j])},{op:'remove',path});
  }
 }
 const beforeCount=sources.encounter.validation.species_index_direct_site_count,afterCount=beforeCount-derivedIndexPatch.length/2;
 const derivedValidationPatch=[{op:'test',path:'/validation/species_index_direct_site_count',value:beforeCount},{op:'replace',path:'/validation/species_index_direct_site_count',value:afterCount},{op:'test',path:'/validation/status',value:sources.encounter.validation.status},{op:'replace',path:'/validation/status',value:'CANDIDATE_REVIEW_REQUIRED'}];
 return {candidateId:'GEOJE_AQUATIC_SOURCE_CANDIDATE_A_V1',approvalStatus:'UNAPPROVED',runtimeConnected:false,applicationScope:'All eight A proposals; regenerate exact patches for any subset approval',derivedIndexPatch,derivedValidationPatch,applyAutomatically:false,targetFile:file,requiredSourceSha256:audit.fingerprints.find(f=>f.file===file).sha256,proposal:'Remove only the eight Surf random tables AFTER approval; keep Acquisition, Fishing, special events and global surf travel rule unchanged.',afterApprovalRequirements:['Record explicit per-table approval.','Publish a new canonical source revision and update its authoritative manifest/index fingerprints.','Validate map travel independence and NONE/no-table handling; never fall back to another area.','Re-run complete regression before activating.'],tables};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const input=readReviewInputs(),adapter=await loadCanonicalAdapter({readText:async f=>input.texts[f]});
 const {simulateStory,catalog}=await import('../tests/helpers/story-fixture.mjs');const full=await simulateStory();
 const states=Object.fromEntries(['S1','S6','S7','S8','POST'].map(id=>[id,activateCanonicalEncounterSave(full.checkpoints[id],catalog)]));
 const audit=buildAquaticAudit({...input,adapter,states}),candidate=buildCandidate(audit,input.sources);
 if(process.argv.includes('--write')){
  writeFileSync(new URL('audit.json',REVIEW_DIR),JSON.stringify(audit,null,2)+'\n');
  writeFileSync(new URL('candidate-A.UNAPPROVED.json',REVIEW_DIR),JSON.stringify(candidate,null,2)+'\n');
  console.log(JSON.stringify({counts:audit.counts,attachmentMatches:audit.attachmentMatches,runtimeDiagnosisMatches:audit.runtimeDiagnosisMatches,previousDiagnosisMatches:audit.previousDiagnosisMatches,active:audit.activeTables,quarantined:audit.quarantinedTables.length,candidateApproval:candidate.approvalStatus}));
 }else console.log(JSON.stringify({audit,candidate},null,2));
 if(!audit.attachmentMatches||!audit.runtimeDiagnosisMatches)process.exitCode=1;
}
