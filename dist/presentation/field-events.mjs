import {GOLDEN_MAP_DATA} from '../golden-map-data.mjs';
export const FIELD_EVENT_CATEGORIES=Object.freeze(['actors','trainers','warps','doors','triggers','storyEvents','itemObjects','encounterRegions']);
/** Pure sidecar; stores no graphics/tile frames. Consumers opt into new events explicitly. */
export function createFieldEventBundle(mapId,source={}){
 const bundle={mapId};const seen=new Set();
 for(const key of FIELD_EVENT_CATEGORIES){const rows=source[key]??[];if(!Array.isArray(rows))throw Error('Event category must be an array');bundle[key]=Object.freeze(rows.map(row=>{if(!row||typeof row.id!=='string'||seen.has(row.id))throw Error('Duplicate or missing event ID');seen.add(row.id);return Object.freeze(structuredClone(row))}))}return Object.freeze(bundle);
}
export function existingFieldEvents(mapId,core=null){
 const actors=(core?.npcs??GOLDEN_MAP_DATA.entities).filter(n=>n.map===mapId),doors=Object.entries(GOLDEN_MAP_DATA.doors).filter(([key])=>mapId==='outdoor'?key==='outside':mapId==='interior'?key==='inside':false).map(([id,data])=>({id,data}));
 return createFieldEventBundle(mapId,{actors:actors.filter(a=>!a.trainer),trainers:actors.filter(a=>a.trainer),doors});
}
