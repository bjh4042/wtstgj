// Resolve raw pinned asset roots at runtime; do not let Vite rewrite directory URLs.
const assetModuleURL=import.meta.url;
import {loadSelectedAssets} from '../native-map/verified/native_home_entries_remaining_1524/assets.mjs';
import {renderNativeHome} from '../native-map/verified/native_home_entries_remaining_1524/render.mjs';
import {renderSelectedJangmok} from '../native-map/verified/native_home_entries_remaining_1524/jangmok-render.mjs';
import {createFrameLighting} from '../native-map/verified/jangmok_runtime_recovery/runtime_tree/jangmok_layout_revision_plan_20261027/lighting_all_candidate_r3/consumer/frame-lighting.mjs';
import {createScreenLayer} from '../native-map/verified/jangmok_runtime_recovery/runtime_tree/jangmok_layout_revision_plan_20261027/lighting_all_candidate_r3/consumer/screen-lighting.mjs';
const CONTRACT_SHA='ccb1e7ee45321a766b1ce6a432f9ce6ab44df95a4b9c4eb8b223e33a002aad97';
export async function loadJangmokMemoryView({getEnvironment}){
 const bitmaps=new Set();try{
 const root=new URL('../native-map/verified/native_home_entries_remaining_1524/',assetModuleURL);
 const sha=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const bytes=async(url,pin)=>{const r=await fetch(url);if(!r.ok)throw Error('NATIVE_ASSET_MISSING '+url);const b=await r.arrayBuffer();if(pin&&await sha(b)!==pin)throw Error('NATIVE_PIN_MISMATCH '+url);return b;};
 const contract=JSON.parse(new TextDecoder().decode(await bytes(new URL('contract.json',root),CONTRACT_SHA)));
 const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},image=async(url,pin)=>{const bitmap=await createImageBitmap(new Blob([await bytes(url,pin)]));bitmaps.add(bitmap);return bitmap;},rgba=im=>{const c=makeCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);return g.getImageData(0,0,im.width,im.height).data;};

 const A=await loadSelectedAssets({contract,rootURL:root,bytes,image,rgba,makeCanvas,sha}),assets={exterior:A.source},masks={};
 for(const[k,s]of Object.entries(contract.sources))if(k!=='exterior')assets[k]=await image(new URL(s.path,root),s.sha256);
 A.actors.forEach((im,i)=>assets['actor:'+i]=im);for(const[k,s]of Object.entries(contract.masks))masks[k]=new Uint8Array(await bytes(new URL(s.path,root),s.sha256));
 A.screen=createScreenLayer({manifest:A.LM,indices:A.lightIds,transmission:A.lightTransmission,expectedSourceSHA:A.M.sourceSHA});A.ambient=createFrameLighting({nightTint:A.LM.ambientTint});
 // Animation elapsed delta is supplied by the host's sole RAF; lighting reads the
 // canonical provider. No native clock owner, timer, Date sampling, or demo rate.
 let elapsedMs=0;const options={water:true,lights:true,b1:true,b2:true,b3:true,b4:true,sort:true,depth:true,paused:false};
 const read=()=>{const frame=getEnvironment().getFrame({biomeId:'COAST',lightingProfileId:'COAST'});const forced=frame.display?.time;return {elapsedMs,absoluteMinutes:forced==='DAY'?720:forced==='NIGHT'?1320:frame.lighting.minutes,clockOwnerCount:1,lightingOwner:'canonicalEnvironment',options:{...options}};};
 const environment={read,advance(ms){elapsedMs+=ms;},render(ctx,state){return renderSelectedJangmok(ctx,A,state,{read},options);}};
 return {contract,masks,draw(ctx,status,dt=0){environment.advance(dt);return renderNativeHome(ctx,{contract,assets,environment,status,supported:true})},dispose(){for(const bitmap of bitmaps)bitmap?.close?.();bitmaps.clear();}};
 }catch(error){for(const bitmap of bitmaps)bitmap?.close?.();throw error;}
}
