import {SPECIES_ASSETS,CANONICAL_SPECIES_ASSETS} from './asset-manifest.mjs';
/** Callers select the namespace; number/name similarity is never consulted. */
export function resolveSpeciesAssets(reference){
 if(reference?.namespace==='canonical'&&typeof reference.speciesId==='string')return CANONICAL_SPECIES_ASSETS[reference.speciesId]??null;
 if(reference?.namespace==='work-v2'&&Number.isInteger(reference.speciesId))return SPECIES_ASSETS[reference.speciesId]??null;
 return null;
}
export function speciesSlot(reference,slot){
 const a=resolveSpeciesAssets(reference);if(!a)return null;
 return {'battle.front':a.battle.front,'battle.back':a.battle.back,'ui.icon':a.ui.icon,'fieldFollower.atlas':a.fieldFollower.atlas}[slot]??null;
}
/** Boundary for the retained numeric follower API: untagged old party records are Work v2 only. */
export function followerSpeciesReference(mon){
 if(!mon)return null;
 const reference=mon.speciesRef??(mon.namespace?{namespace:mon.namespace,speciesId:mon.speciesId}:{namespace:'work-v2',speciesId:mon.id??mon.no});
 return resolveSpeciesAssets(reference)?{namespace:reference.namespace,speciesId:reference.speciesId}:null;
}
