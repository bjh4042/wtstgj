import {CANONICAL_IDENTITIES,SPECIES_MAPPING,CURRENT_NAMESPACE,CANONICAL_NAMESPACE} from './species-registry.mjs';
export {CANONICAL_IDENTITIES,SPECIES_MAPPING,CURRENT_NAMESPACE,CANONICAL_NAMESPACE};
const byId=new Map(CANONICAL_IDENTITIES.map(s=>[s.id,s]));
const byNumber=new Map(CANONICAL_IDENTITIES.map(s=>[s.number,s]));
const current=new Map(SPECIES_MAPPING.map(s=>[s.currentId,s]));
export const MAPPING_STATUSES=Object.freeze(['EXACT','RENAMED_ONLY','REORDERED','STRUCTURE_CHANGED','UNRESOLVED']);
export function canonicalIdentity(id){return byId.get(id)??null}
// A bare number is only meaningful together with its source content namespace.
export function resolveSpecies(reference,namespace){
 if(namespace===CANONICAL_NAMESPACE){
  const s=typeof reference==='string'?byId.get(reference):byNumber.get(reference);
  return s?{reference,namespace,canonicalId:s.id,canonicalNumber:s.number,status:'EXACT',resolved:true}:{reference,namespace,canonicalId:null,status:'UNRESOLVED',resolved:false};
 }
 const row=namespace===CURRENT_NAMESPACE?current.get(reference):null;
 return {reference,namespace,currentReference:namespace===CURRENT_NAMESPACE?`${namespace}:${reference}`:null,canonicalId:row?.canonicalId??null,canonicalNumber:row?.canonicalNumber??null,status:row?.status??'UNRESOLVED',resolved:!!row?.safeIdentity};
}
export function mappingSummary(){return Object.fromEntries(MAPPING_STATUSES.map(k=>[k,SPECIES_MAPPING.filter(r=>r.status===k).length]))}
// Identity correspondence is not permission to activate v3 stats, moves, art or evolution.
export function currentReferenceForCanonical(id){return SPECIES_MAPPING.find(r=>r.canonicalId===id)?.currentId??null}
