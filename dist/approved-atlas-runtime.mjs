import {APPROVED_ATLAS_DATA} from './approved-atlas-data.mjs';
import {createAtlasRetryManager,loadAtlasImage} from './atlas-retry-manager.mjs';
export function approvedAtlasFrame(family,key){const frame=APPROVED_ATLAS_DATA.frames[family]?.[key];if(!frame||frame.status==='user-deferred')return null;return {frame,atlas:APPROVED_ATLAS_DATA.atlases[frame.atlas]};}
export const cancellableAtlasImage=loadAtlasImage;
const manager=createAtlasRetryManager({loader:cancellableAtlasImage,isActive:()=>typeof document==='undefined'||document.visibilityState!=='hidden'});
/** @param {string} family @param {string} key @param {(src:string,...args:any[])=>any} [loader] */
export function loadApprovedAtlas(family,key,loader=cancellableAtlasImage){const entry=approvedAtlasFrame(family,key);if(!entry)return Promise.resolve(null);const{atlas}=entry;return manager.request(atlas.src,{width:atlas.width,height:atlas.height,loader:loader===cancellableAtlasImage?cancellableAtlasImage:(src)=>loader(src)})}
export const approvedAtlasRevision=()=>manager.getRevision();
export const approvedAtlasStatuses=()=>manager.getStatuses().map(({image,...status})=>status);
export const subscribeApprovedAtlases=listener=>manager.subscribe(listener);
export const retryFailedApprovedAtlases=()=>Promise.all(manager.retryFailed());
export const approvedAtlasCacheSize=()=>manager.getStatuses().length;
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 document.addEventListener('visibilitychange',()=>manager.syncActivity());
 window.addEventListener('pagehide',()=>manager.pause());
 window.addEventListener('pageshow',()=>manager.resume());
}
