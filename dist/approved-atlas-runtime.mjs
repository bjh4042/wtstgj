import {APPROVED_ATLAS_DATA} from './approved-atlas-data.mjs';
export function approvedAtlasFrame(family,key){const frame=APPROVED_ATLAS_DATA.frames[family]?.[key];if(!frame||frame.status==='user-deferred')return null;return {frame,atlas:APPROVED_ATLAS_DATA.atlases[frame.atlas]};}
const cache=new Map();
/** At most one image request per identity sheet; no roster-wide precache. */
export function loadApprovedAtlas(family,key,loader){const entry=approvedAtlasFrame(family,key);if(!entry)return Promise.resolve(null);const {atlas}=entry;if(!cache.has(atlas.src))cache.set(atlas.src,Promise.resolve().then(()=>loader(atlas.src)).then(image=>{if((image.naturalWidth??image.width)!==atlas.width||(image.naturalHeight??image.height)!==atlas.height)throw Error('Approved atlas dimensions mismatch');return image}).catch(()=>null));return cache.get(atlas.src);}
export function approvedAtlasCacheSize(){return cache.size;}
