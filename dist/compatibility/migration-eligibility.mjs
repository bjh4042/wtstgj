import {collectSpeciesReferences,detectSaveFormat} from './save-migration.mjs';
import {migrateV1Save,validateSave} from '../model.mjs';
import {SPECIES_MAPPING} from './species-identity.mjs';
/** Candidate evaluation only; this module deliberately has no conversion API. */
export function evaluateCanonicalMigration(input){
 const format=detectSaveFormat(input);let source=input;
 try{if(format==='WORK_V1')source=migrateV1Save(input);if(input.contentNamespace&&!['legacy-work-v2','work-v2'].includes(input.contentNamespace))throw Error('Unknown namespace');if(input.contentVersion&&input.contentVersion!=='v2_2026-09-11')throw Error('Unknown content version');validateSave(source)}catch{return {eligible:false,automaticConversionAllowed:false,partialMigrationAllowed:false,blockers:[{code:'INVALID_OR_FOREIGN_LEGACY_SAVE'}]}}
 if(!['WORK_V1','WORK_V2'].includes(format))return {eligible:false,automaticConversionAllowed:false,partialMigrationAllowed:false,blockers:[{code:'NOT_LEGACY_WORK_SAVE'}]};
 const rows=collectSpeciesReferences(source,'work-v2'),byId=new Map(SPECIES_MAPPING.map(r=>[r.currentId,r])),blockers=[];
 for(const ref of rows){const row=byId.get(ref.reference);if(!row?.safeIdentity||!['EXACT','REORDERED','RENAMED_ONLY'].includes(row.status))blockers.push({path:ref.path,reference:ref.reference,code:row?.status==='STRUCTURE_CHANGED'?'STRUCTURE_CHANGED':'UNRESOLVED'})}
 return {eligible:rows.length>0&&blockers.length===0,automaticConversionAllowed:false,partialMigrationAllowed:false,scope:'identity-only-future-candidate; moves/growth/progression still require validation',references:rows,blockers};
}
