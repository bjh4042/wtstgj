import {LEGACY_CONTENT,CANONICAL_CONTENT} from './content-namespaces.mjs';
import {validateSave,migrateV1Save} from '../model.mjs';
import {resolveSpecies,CURRENT_NAMESPACE,CANONICAL_NAMESPACE} from './species-identity.mjs';
import {normalizeStatus} from './status-enum.mjs';
import {stableJSON} from './codec.mjs';
export const COMPATIBILITY_FORMAT='GEOJE_COMPATIBILITY_SAVE';
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
export function detectSaveFormat(value){
 if(!object(value))return 'UNKNOWN';
 if(value.format===COMPATIBILITY_FORMAT&&value.compatibilityVersion===1&&object(value.migration)&&object(value.profile))return 'COMPATIBILITY_V1';
 if(Array.isArray(value.party)&&Array.isArray(value.box)&&typeof value.saveCode==='string'){
  if(value.version===1&&!('schemaVersion' in value))return 'WORK_V1';if(value.version===2&&!('schemaVersion' in value))return 'WORK_V2';
 }
 if(object(value.profile)&&object(value.player)&&object(value.creatures?.instances)&&object(value.dex)&&object(value.contentVersions)){
  if(value.schemaVersion===2&&object(value.storage?.boxes))return 'HANDOFF_V2';
  if(value.schemaVersion===1)return 'HANDOFF_V1';
 }
 return 'UNKNOWN';
}
// References are kept alongside the original document. Unknown refs are NEVER dropped.
export function collectSpeciesReferences(value,namespace){
 const records=[];
 const add=(reference,path)=>records.push({path,...resolveSpecies(reference,namespace)});
 function visit(x,path=''){
  if(!x||typeof x!=='object')return;
  for(const [key,v] of Object.entries(x)){
   const p=path?path+'.'+key:key;
   if((key==='id'&&typeof x.uid==='string'&&'level' in x)||/^(speciesNo|species_no|speciesId|player_starter_base_no)$/.test(key)||key.endsWith('_species_no')||key.endsWith('SpeciesNo')){if(v!==null)add(v,p)}
   else if(Array.isArray(v)&&(['seen','caught','legendCaught'].includes(key)||/Species(Nos|Ids)$/.test(key)))v.forEach((id,i)=>add(id,p+'.'+i));
   else if(v&&typeof v==='object')visit(v,p);
  }
 }
 visit(value);return records;
}
export function normalizeSavedStatuses(value){
 const normalized=structuredClone(value),records=[];
 function visit(x,path=''){
  if(!x||typeof x!=='object')return;
  for(const [key,v] of Object.entries(x)){
   const p=path?path+'.'+key:key;
   if(key==='status'&&('level' in x||'speciesNo' in x||'speciesId' in x||'uid' in x)){
    const result=normalizeStatus(v);records.push({path:p,original:v,...result});if(result.resolved)x[key]=result.value;
   }else if(v&&typeof v==='object')visit(v,p);
  }
 }
 visit(normalized);return {normalized,records};
}
function normalizeCanonicalReferences(document,references){
 const normalized=structuredClone(document);
 // Retain source numeric fields for fidelity; add explicit ID fields for future consumers.
 for(const mon of Object.values(normalized.creatures?.instances??{}))mon.canonicalSpeciesId=resolveSpecies(mon.speciesId??mon.speciesNo,CANONICAL_NAMESPACE).canonicalId;
 normalized.canonicalReferences=references;return normalized;
}
export function migrateSave(input,{playerName='여행자',slotId='SLOT_1'}={}){
 let raw,source;
 try{raw=typeof input==='string'?input:JSON.stringify(input);source=JSON.parse(raw)}catch{return {format:COMPATIBILITY_FORMAT,compatibilityVersion:1,profile:{slotId,playerName},runtime:null,normalized:null,speciesReferences:[],statusReferences:[],migration:{sourceFormat:'INVALID_JSON',sourceNamespace:null,warnings:[{code:'INVALID_JSON_ORIGINAL_PRESERVED'}],canActivate:false},sourceSnapshot:null,originalRaw:typeof input==='string'?input:String(input)}}
 const format=detectSaveFormat(source),warnings=[];
 // Envelopes need checksum validation by the slot store, not recursive implicit conversion.
 if(format==='COMPATIBILITY_V1')throw Error('Compatibility envelope must be read through the checksummed slot API.');
 let runtime=null,namespace=null,prepared=structuredClone(source);
 if(format==='WORK_V1'||format==='WORK_V2'){
  namespace=CURRENT_NAMESPACE;
  try{
   if(source.contentNamespace&&![CURRENT_NAMESPACE,LEGACY_CONTENT.contentNamespace].includes(source.contentNamespace)){namespace=null;throw Error('Unknown content namespace; original retained')}
   if(source.contentVersion&&source.contentVersion!==LEGACY_CONTENT.contentVersion){namespace=null;throw Error('Unknown current content version; original retained')}
   if(source.contentVersions?.species&&source.contentVersions.species!=='v2_2026-09-11'){namespace=null;throw Error('Unknown current species content version; original retained')}
   if(format==='WORK_V1')prepared=migrateV1Save(source);
   runtime=validateSave(prepared);
   if(stableJSON(prepared)!==stableJSON(runtime))warnings.push({code:'ORIGINAL_FIELDS_PRESERVED',detail:'Runtime validator projection differs; complete source retained separately.'});
  }catch(error){warnings.push({code:'WORK_SAVE_VALIDATION',detail:error.message})}
 }else if(format==='HANDOFF_V2'||format==='HANDOFF_V1'){
  // A structurally similar save with a different species catalog is not proof of identity.
  if(source.contentVersions.species==='geoje_species_151_v3_final')namespace=CANONICAL_NAMESPACE;
  else warnings.push({code:'UNRESOLVED_CONTENT_VERSION',value:source.contentVersions.species});
  warnings.push({code:format==='HANDOFF_V1'?'HANDOFF_V1_RECONCILIATION_REQUIRED':'CANONICAL_CONTENT_NOT_ACTIVE'});
 }else warnings.push({code:'UNKNOWN_SAVE_FORMAT'});
 const speciesReferences=collectSpeciesReferences(prepared,namespace),statusResult=normalizeSavedStatuses(prepared);
 for(const mon of Object.values(prepared.creatures?.instances??{}))if(mon.speciesId&&mon.speciesNo&&resolveSpecies(mon.speciesId,namespace).canonicalId!==resolveSpecies(mon.speciesNo,namespace).canonicalId)warnings.push({code:'SPECIES_REFERENCE_CONFLICT',speciesId:mon.speciesId,speciesNo:mon.speciesNo});
 for(const ref of speciesReferences)if(!ref.resolved)warnings.push({code:'UNRESOLVED_SPECIES',path:ref.path,reference:ref.reference});
 for(const status of statusResult.records)if(status.warning)warnings.push({code:status.warning,path:status.path});
 let normalized=statusResult.normalized;
 if(namespace===CANONICAL_NAMESPACE)normalized=normalizeCanonicalReferences(normalized,speciesReferences);
 // Existing battle semantics remain current even where the identity correspondence is known.
 return {format:COMPATIBILITY_FORMAT,compatibilityVersion:1,...(runtime?{contentNamespace:LEGACY_CONTENT.contentNamespace,contentVersion:LEGACY_CONTENT.contentVersion}:{}),profile:{slotId,playerName:source.profile?.playerName??playerName},runtime,normalized,speciesReferences,statusReferences:statusResult.records,migration:{sourceFormat:format,sourceNamespace:namespace,warnings,canActivate:!!runtime,canonicalIdentityComplete:speciesReferences.every(x=>x.resolved)&&!warnings.some(x=>x.code==='SPECIES_REFERENCE_CONFLICT'),canonicalGameplayReady:false},sourceSnapshot:source,originalRaw:raw};
}
export function requireCurrentRuntime(prepared){
 if((prepared.contentNamespace&&prepared.contentNamespace!==LEGACY_CONTENT.contentNamespace)||!prepared.runtime||!prepared.migration.canActivate)throw Error('이 저장은 원본을 보존했습니다. 현재 콘텐츠와 호환되지 않아 자동 적용하지 않습니다.');
 return validateSave(prepared.runtime);
}
