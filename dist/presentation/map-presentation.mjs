import {LIGHTING_PROFILES} from './lighting.mjs';
export const BIOMES=Object.freeze(['COAST','FOREST','GRASSLAND','URBAN','RURAL','ROCKY_SHORE','CLIFF','CAVE','INDOOR','GYM','LEAGUE']);
export const BIOME_BACKGROUNDS=Object.freeze(Object.fromEntries(BIOMES.map(id=>[id,'battle.biome.'+id])));
export const BIOME_PLACEHOLDER_COLORS=Object.freeze({COAST:'#447e9b',FOREST:'#315c4c',GRASSLAND:'#749663',URBAN:'#697680',RURAL:'#8b9265',ROCKY_SHORE:'#627f8c',CLIFF:'#727780',CAVE:'#343f4c',INDOOR:'#968775',GYM:'#7a648d',LEAGUE:'#526b98'});
// Presentation sidecar: stable existing map IDs. No geometry, species, or story changes.
export const MAP_PRESENTATION=Object.freeze(Object.fromEntries(Object.entries({outdoor:'COAST',interior:'INDOOR',qa_a:'GRASSLAND',qa_b:'CLIFF',gohyeon:'URBAN',garden:'RURAL',west:'RURAL',bamboo:'FOREST',north:'COAST',okpo:'COAST',port:'COAST',ilun:'FOREST',south:'CLIFF',island:'FOREST','slice-outdoor':'GRASSLAND','slice-interior':'INDOOR'}).map(([id,biomeId])=>[id,Object.freeze({id,biomeId})])));
export function mapPresentation(value={}){
 const input=typeof value==='string'?{id:value}:value,base=MAP_PRESENTATION[input.id]??{biomeId:'GRASSLAND'},biomeId=BIOMES.includes(input.biomeId)?input.biomeId:base.biomeId??'GRASSLAND';
 const defaultLight={GRASSLAND:'RURAL',ROCKY_SHORE:'COAST',LEAGUE:'GYM'}[biomeId]??biomeId,lightingProfileId=LIGHTING_PROFILES[input.lightingProfileId]?input.lightingProfileId:defaultLight;
 return {...base,...input,biomeId,lightingProfileId,bgmId:input.bgmId??null,ambientId:input.ambientId??null};
}
/** Capture once at entry. A field trainer keeps the map biome; battle kind never implies an indoor map. */
export function battleMapContext({map={},opening=false,gym=false,league=false,battleBackgroundId=null}={}){
 const base=mapPresentation(map);return mapPresentation({...base,...(opening?{biomeId:'INDOOR',lightingProfileId:'INDOOR'}:gym?{biomeId:'GYM',lightingProfileId:'GYM'}:league?{biomeId:'LEAGUE',lightingProfileId:'GYM'}:{}),...(battleBackgroundId?{battleBackgroundId}:{})});
}
