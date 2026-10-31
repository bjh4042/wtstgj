import{prepareS4TargetSupport,MAPS}from'./support.mjs';
import{scope,footData}from'./common.mjs';
import{GEOMETRY_PINS}from'../gohyeon-gameplay/geometry-pins.mjs';
const assetModuleURL=import.meta.url;
const base=new URL('../gohyeon-gameplay/',assetModuleURL);if(!base.pathname.endsWith('/'))base.pathname+='/';
// Original selected habitat bytes and table IDs; no new area/table or probability.
export async function prepareS4AreaSupport(options={}){
 if(![MAPS.park,MAPS.greenbelt].includes(options.mapId))throw Error('S4_AREA_SUPPORT_SCOPE');
 const s=scope(options);let support;const habitats=[];
 try{support=await prepareS4TargetSupport(options);s.onCleanup(()=>support?.dispose());s.onCleanup(()=>{habitats.length=0});const row=GEOMETRY_PINS.maps.find(r=>r.mapId===options.mapId);if(!row)throw Error('S4_AREA_GEOMETRY_REQUIRED');
 for(const h of row.habitats){const p=h.mask,b=await s.pinned(new URL(p.path,base),p.sha256,p.bytes);if(b.length!==1536*1024||b.some(v=>v!==0&&v!==1))throw Error('S4_AREA_HABITAT_SHAPE');habitats.push({tableId:h.tableId,mask:b})}s.check();
 return Object.freeze({safe:support.safe,describe:support.describe,validate:support.validate,leaseToken:support.leaseToken,get pinsVerified(){return!s.dead&&support.pinsVerified},wildZone(foot){if(s.dead||!support.safe(foot,'FIXED'))return null;try{const[x,y]=footData(foot),h=habitats.find(h=>h.mask[y*1536+x]===1);return h?Object.freeze({tableId:h.tableId}):null}catch{return null}},get retainedMaskBytes(){return support.retainedMaskBytes+habitats.reduce((n,h)=>n+h.mask.byteLength,0)},get activeSupportLeases(){return support.activeSupportLeases},dispose:()=>s.dispose()});
 }catch(e){s.dispose();throw e}
}
