import {IDENTITY_SOURCE_SHA256} from './species-registry.mjs';
import {canonicalIdentity,resolveSpecies,CANONICAL_NAMESPACE,CANONICAL_IDENTITIES} from './species-identity.mjs';
import {compareStatusSources} from './status-enum.mjs';
import {npcAssets,validateNpcAssets} from './npc-assets.mjs';
import {deepFreeze,sha256} from './codec.mjs';
import {adaptStoryRuntime} from './story-adapter.mjs';
import {adaptEncounterRuntime} from './encounter-adapter.mjs';
import {readCanonicalSource} from './canonical-source-loader.mjs';
import {adaptYejiPreview} from './preview-opponent-adapter.mjs';
import {parseCSV,SOURCE_FILES} from './canonical-source-format.mjs';
export {parseCSV,SOURCE_FILES} from './canonical-source-format.mjs';
export const ACQUISITION_AUTHORITY=Object.freeze(['acquisition','encounter','fishing','stage/story','species-legacy-reference']);
export function validateFingerprints(texts,manifest,index,historical){
 const errors=[],excluded=[];
 for(const [source,entries] of [['manifest',manifest?.canonical_file_fingerprints],['index',index?.canonical_files]]){
  if(!entries){errors.push({code:'MISSING_FINGERPRINT_INDEX',source});continue}
  for(const [file,expected] of Object.entries(entries)){
   const text=texts[file];if(text===undefined||sha256(text)!==expected.sha256||new TextEncoder().encode(text).length!==expected.size_bytes)errors.push({code:'SOURCE_INTEGRITY',source,file});
   const peer=(source==='manifest'?index?.canonical_files:manifest?.canonical_file_fingerprints)?.[file];if(!peer||peer.sha256!==expected.sha256)errors.push({code:'AUTHORITATIVE_INDEX_CONFLICT',file});
  }
 }
 for(const [file,expected] of Object.entries(historical?.canonical_file_fingerprints??{}))if(texts[file]!==undefined&&sha256(texts[file])!==expected.sha256)excluded.push({file,status:'HISTORICAL',expected:expected.sha256,actual:sha256(texts[file]),includedInPassGate:false});
 return {errors,historical:{status:'HISTORICAL',includedInPassGate:false,staleFingerprints:excluded}};
}
export async function loadCanonicalAdapter({readText=readCanonicalSource,development=false}={}){
 const texts={},sources={},loadErrors=[];
 await Promise.all(Object.entries(SOURCE_FILES).map(async([key,file])=>{try{const text=await readText(file);texts[file]=text;sources[key]=file.endsWith('.csv')?parseCSV(text):JSON.parse(text)}catch(error){loadErrors.push({code:'SOURCE_UNAVAILABLE',file,message:error.message})}}));
 const integrity=validateFingerprints(texts,sources.manifest,sources.index,sources.historical);
 if(texts[SOURCE_FILES.species]&&sha256(texts[SOURCE_FILES.species])!==IDENTITY_SOURCE_SHA256)loadErrors.push({code:'IDENTITY_SOURCE_REBIND_REQUIRES_REVIEW',file:SOURCE_FILES.species});
 const adapter=createCanonicalAdapter(sources,{sourceErrors:[...loadErrors,...integrity.errors],integrity});
 if(development&&!adapter.validation.ready)console.error('[Canonical compatibility] sources quarantined; current game retained',adapter.validation.errors);
 return adapter;
}
const arr=x=>Array.isArray(x)?x:[];
const indexBy=(rows,key='id')=>Object.fromEntries(rows.map(x=>[x[key],x]));
export function createCanonicalAdapter(sources,{sourceErrors=[],integrity=null}={}){
 const errors=[...sourceErrors],warnings=[],s=sources,issue=(code,path,detail)=>errors.push({code,path,detail});
 for(const key of ['species','battle','stage','trainer','flags','encounter','character','save'])if(!s[key]?.meta?.version)issue('MISSING_CANONICAL_VERSION',key);
 const species=arr(s.species?.species),battleSpecies=arr(s.battle?.species),moves=arr(s.battle?.move_catalog),tms=arr(s.battle?.tm_catalog),stages=arr(s.stage?.stages),trainers=[...arr(s.trainer?.route_trainers),...arr(s.trainer?.gym_subtrainers)],characters=arr(s.character?.characters),areas=arr(s.encounter?.areas),acquisition=arr(s.acquisition),fishing=arr(s.fishing);
 for(const [label,rows,count,key] of [['species',species,151,'no'],['battleSpecies',battleSpecies,151,'no'],['moves',moves,117,'id'],['tms',tms,50,'id'],['stages',stages,12,'id'],['trainers',trainers,55,'trainer_id'],['characters',characters,18,'npc_id'],['acquisition',acquisition,75,'chain_id']]){
  if(rows.length!==count)issue('COVERAGE',label,{expected:count,actual:rows.length});if(new Set(rows.map(x=>x[key])).size!==rows.length)issue('DUPLICATE_ID',label);
 }
 const speciesMap=new Map(species.map(x=>[x.no,x])),battleMap=new Map(battleSpecies.map(x=>[x.no,x]));
 if(new Set(species.map(x=>x.chain_id)).size!==75)issue('CHAIN_COVERAGE','species');
 if(arr(s.battle?.gyms).length!==8)issue('GYM_COVERAGE','battle');
 const moveSet=new Set(moves.map(m=>m.id)),stageSet=new Set(stages.map(x=>x.id)),areaSet=new Set(areas.map(x=>x.area_id));
 function id(no,path){const result=resolveSpecies(no,CANONICAL_NAMESPACE);if(!result.resolved||!speciesMap.has(no))issue('UNKNOWN_SPECIES_REFERENCE',path,no);return result.canonicalId}
 // Validate references even in metadata that will only be activated in later steps.
 function refs(x,path){if(!x||typeof x!=='object')return;for(const [k,v] of Object.entries(x)){if((k==='species_no'||k.endsWith('_species_no'))&&v!==null)id(v,path+'.'+k);if(k==='move_id'&&v!==null&&!moveSet.has(v))issue('UNKNOWN_MOVE_REFERENCE',path+'.'+k,v);if(v&&typeof v==='object')refs(v,path+'.'+k)}}
 for(const key of ['battle','trainer','stage','flags','encounter'])refs(s[key],key);
 const acqByChain=new Map(acquisition.map(x=>[Number(x.chain_id),x])),encByNo=new Map(arr(s.encounter?.species_acquisition_index).map(x=>[x.species_no,x]));
 const authorityConflicts=[];
 const acqModel=species.map(row=>{
  const a=acqByChain.get(row.chain_id),e=encByNo.get(row.no),f=fishing.filter(x=>Number(x.species_no)===row.no);
  if(!a)issue('MISSING_ACQUISITION','species.'+row.no);
  const firstStage=a?.first_stage??e?.first_obtainable_stage??f[0]?.fishing_available_from??null;
  const method=row.chain_position>1?(e?.primary_acquisition??'level_evolution'):(a?.primary_acquisition??e?.primary_acquisition??(f.length?'fishing':null));
  const conflict=(field,selected,other,source,historical=false)=>{if(other!=null&&selected!==other)authorityConflicts.push({speciesId:id(row.no,'acquisition'),field,selected,other,source,selectedSource:'acquisition',severity:historical?'HISTORICAL':'CONFLICT'})};
  if(a&&e){conflict('firstStage',a.first_stage,e.first_obtainable_stage,'encounter');if(row.chain_position===1)conflict('method',a.primary_acquisition,e.primary_acquisition,'encounter')}
  conflict('firstStage',firstStage,row.first_obtainable_stage,'species-legacy-reference',true);
  if(row.chain_position===1)conflict('method',method,row.primary_acquisition,'species-legacy-reference',true);
  if(firstStage&&!stageSet.has(firstStage))issue('UNKNOWN_ACQUISITION_STAGE','species.'+row.no,firstStage);
  return {id:id(row.no,'acquisition'),firstStage,method,source:a?'acquisition':e?'encounter':f.length?'fishing':null,randomSpawnAllowed:a?a.random_spawn_allowed==='True':null,areaIds:a?.area_ids?.split(/[;,]/).map(x=>x.trim()).filter(Boolean)??[],directSites:structuredClone(e?.direct_encounter_sites??[]),events:structuredClone(e?.special_event_sites??[]),legacyReference:{firstStage:row.first_obtainable_stage??null,method:row.primary_acquisition??null}};
 });
 const models=CANONICAL_IDENTITIES.map(identity=>{
  const row=speciesMap.get(identity.number),b=battleMap.get(identity.number);
  if(!row)issue('MISSING_SPECIES','species.'+identity.id);
  if(row&&!row.name)warnings.push({code:'DISPLAY_NAME_FALLBACK',id:identity.id});
  if(row&&b&&((row.name&&row.name!==b.name)||(row.motif&&row.motif!==b.motif)))issue('BATTLE_IDENTITY_CONFLICT',identity.id);
  if(b&&(!Array.isArray(b.types)||!b.types.length||!Array.isArray(b.level_up_moves)||!b.level_up_moves.length))issue('MISSING_BATTLE_FIELDS',identity.id);
  const stats=b?.base_stats?['hp','atk','def','spa','spd','spe'].map(k=>b.base_stats[k]):null;
  if(!stats||stats.some(v=>!Number.isInteger(v)||v<1))issue('MISSING_BATTLE_STATS',identity.id);
  return {id:identity.id,number:identity.number,name:row?.name??identity.name,real:row?.motif??identity.motif,chainId:row?.chain_id??null,chainLength:row?.chain_length??null,stage:row?.chain_position??null,types:b?.types??[],stats,evo:b?.evolution?.evolves_to_species_no?id(b.evolution.evolves_to_species_no,identity.id):null,evoLevel:b?.evolution?.level??null,moves:arr(b?.level_up_moves).map(m=>({level:m.level,id:m.move_id})),tmIds:b?.tm_compatibility??[],baseExp:b?.base_exp??null,captureBaseProbability:b?.capture_base_probability??null,available:!!row&&!!stats,acquisition:acqModel.find(a=>a.id===identity.id)??null};
 });
 const trainerModels=trainers.map(t=>{
  if(!stageSet.has(t.stage))issue('UNKNOWN_TRAINER_STAGE',t.trainer_id,t.stage);
  if(t.role==='route_general'&&!areaSet.has(t.area_id))issue('UNKNOWN_TRAINER_AREA',t.trainer_id,t.area_id);
  return {id:t.trainer_id,stageId:t.stage,areaId:t.area_id,name:t.trainer_class,required:!!t.required_for_progress,ai:t.ai_tier,party:arr(t.party).map(p=>({id:id(p.species_no,t.trainer_id),level:p.level,moves:arr(p.moves).map(m=>m.move_id)}))};
 });
 const encounterModels=areas.map(a=>({id:a.area_id,stageId:a.stage_id,name:a.display_name,methods:Object.fromEntries(arr(a.encounter_tables).map(t=>{const slots=arr(t.slots);if(slots.reduce((n,x)=>n+x.weight,0)!==100)issue('ENCOUNTER_WEIGHT',a.area_id,t.method);if(slots.some(x=>x.species_no<=9))issue('WILD_STARTER',a.area_id);return [t.method,slots.map(x=>({id:id(x.species_no,a.area_id),weight:x.weight,level:Array.isArray(x.level)?[...x.level]:(issue('MISSING_ENCOUNTER_LEVEL',a.area_id,x.species_no),null)}))]})),eventIds:a.special_event_ids??[]}));
 const fishingModels=fishing.map(f=>({id:id(Number(f.species_no),'fishing'),areaId:f.area_id,rod:f.rod,weight:Number(f.weight),level:[Number(f.level_min),Number(f.level_max)],availableFrom:f.fishing_available_from,gate:f.rod_unlock_gate}));
 for(const f of fishingModels){const method={basic_rod:'fishing_basic',good_rod:'fishing_good',super_rod:'fishing_super'}[f.rod],rows=encounterModels.find(a=>a.id===f.areaId)?.methods[method];if(!rows?.some(x=>x.id===f.id&&x.weight===f.weight&&String(x.level)===String(f.level)))authorityConflicts.push({speciesId:f.id,source:'fishing',selectedSource:'encounter',field:'fishingSlot',areaId:f.areaId,rod:f.rod,severity:'CONFLICT'})}
 const starterEvent=arr(s.encounter?.special_events).find(e=>e.event_id==='STARTER_CHOICE_PROLOGUE');
 const starterIds=arr(starterEvent?.candidate_species).map(r=>id(r.species_no,'starter'));
 if(starterIds.length!==3||new Set(starterIds).size!==3)issue('STARTER_IDENTITY_COVERAGE','starter');
 const starterChains=new Set(arr(starterEvent?.candidate_species).map(r=>speciesMap.get(r.species_no)?.chain_id));
 const starterFamilyIds=models.filter(r=>starterChains.has(r.chainId)).map(r=>r.id);
 if(starterFamilyIds.length!==9||starterIds.some(id=>models.find(s=>s.id===id)?.stage!==1))issue('STARTER_CHAIN_COVERAGE','starter');
 const npc=validateNpcAssets(characters);errors.push(...npc.errors);
 const statusReport=compareStatusSources(s.manifest,s.battle,s.save);
 for(const [source,report] of Object.entries(statusReport.sources))if(source!=='current'&&(report.missing.length||report.unknown.length||report.duplicates.length))issue('STATUS_ENUM_COVERAGE',source,report);
 const events=[...arr(s.flags?.main_event_catalog),...arr(s.flags?.external_event_catalog)].map(e=>({...e,id:e.event_id,stageId:e.stage}));
 const storyRuntime=adaptStoryRuntime(s,{speciesId:id,issue});
 const encounterRuntime=adaptEncounterRuntime(s,models,storyRuntime);
 warnings.push(...storyRuntime.diagnostics);
 const validation={ready:errors.length===0&&!authorityConflicts.some(x=>x.severity==='CONFLICT'),errors,warnings,authorityConflicts,integrity,statusReport,npc,count:{species:models.length,chains:new Set(species.map(x=>x.chain_id)).size,moves:moves.length,tms:tms.length,gyms:arr(s.battle?.gyms).length,trainers:trainers.length}};
 // Immutable opt-in runtime contract. Source integration gates and story catalogs stay inactive.
 const battleRuntime=structuredClone({version:s.battle?.meta?.version,typeChart:s.battle?.type_system?.effectiveness_sparse??{},types:arr(s.battle?.type_system?.types).map(t=>t.id),capture:s.battle?.capture_contract??{},items:indexBy(arr(s.battle?.items?.catalog)),previewOpponent:adaptYejiPreview(s.manifest,s.battle)});
 return deepFreeze({storyRuntime,encounterRuntime,battleRuntime,namespace:CANONICAL_NAMESPACE,active:false,starters:{sourceEvent:'STARTER_CHOICE_PROLOGUE',ids:starterIds,familyIds:starterFamilyIds},species:models,byId:indexBy(models),moves:indexBy(moves.map(m=>({...m,kind:m.category}))),tms:indexBy(tms.map(t=>({...t,moveId:t.move_id}))),stages:indexBy(stages.map(t=>({id:t.id,order:t.order,name:t.title,regions:t.region,events:arr(t.main_beats).map(e=>e.event_id),gym:t.gym??null}))),trainers:indexBy(trainerModels),story:{events:indexBy(events),flags:indexBy(arr(s.flags?.flag_catalog)),gates:indexBy(arr(s.flags?.derived_gates)),rewards:indexBy([...arr(s.flags?.reward_transactions),...arr(s.flags?.legend_reward_transactions)]),eventAliases:s.flags?.event_aliases??[]},encounters:indexBy(encounterModels),fishing:fishingModels,acquisition:indexBy(acqModel),characters:indexBy(characters.map(c=>({id:c.npc_id,name:c.canonical_name,role:c.role,stageIds:c.stages,assets:npcAssets(c.npc_id)}))),battleContract:structuredClone(s.battle?.battle_balance??{}),saveContract:structuredClone(s.save??{}),migrationContract:structuredClone(s.migration??{}),validation});
}
