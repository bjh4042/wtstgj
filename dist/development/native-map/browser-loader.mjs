// Resolve raw pinned asset roots at runtime; do not let Vite rewrite directory URLs.
const assetModuleURL=import.meta.url;
import {loadSelectedAssets} from './verified/native_home_entries_remaining_1524/assets.mjs';
import {NativeReviewAdapter} from './native-adapter.mjs';
import {renderSelectedJangmok} from './verified/native_home_entries_remaining_1524/jangmok-render.mjs';
import {createFrameLighting} from './verified/jangmok_runtime_recovery/runtime_tree/jangmok_layout_revision_plan_20261027/lighting_all_candidate_r3/consumer/frame-lighting.mjs';
import {createScreenLayer} from './verified/jangmok_runtime_recovery/runtime_tree/jangmok_layout_revision_plan_20261027/lighting_all_candidate_r3/consumer/screen-lighting.mjs';
const CONTRACT_SHA='ccb1e7ee45321a766b1ce6a432f9ce6ab44df95a4b9c4eb8b223e33a002aad97';
export async function loadNativeReview({world,canonicalEnvironment,clearInput,selectedServices=false}){
 const root=new URL('./verified/native_home_entries_remaining_1524/',assetModuleURL);
 const sha=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const bytes=async(url,pin)=>{const r=await fetch(url);if(!r.ok)throw Error('NATIVE_ASSET_MISSING '+url);const b=await r.arrayBuffer();if(pin&&await sha(b)!==pin)throw Error('NATIVE_PIN_MISMATCH '+url);return b;};
 const contract=JSON.parse(new TextDecoder().decode(await bytes(new URL('contract.json',root),CONTRACT_SHA)));
 const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},image=async(url,pin)=>createImageBitmap(new Blob([await bytes(url,pin)])),rgba=im=>{const c=makeCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);return g.getImageData(0,0,im.width,im.height).data;};
 const travel=JSON.parse(new TextDecoder().decode(await bytes(new URL('travel-routes.json',root),'613102b0d36897c576e53f0b94dea08f6effcf9568bb0afe02ec4de4bf8f1368')));
 const A=await loadSelectedAssets({contract,rootURL:root,bytes,image,rgba,makeCanvas,sha}),assets={exterior:A.source},masks={};
 for(const[k,s]of Object.entries(contract.sources))if(k!=='exterior')assets[k]=await image(new URL(s.path,root),s.sha256);
 A.actors.forEach((im,i)=>assets['actor:'+i]=im);for(const[k,s]of Object.entries(contract.masks))masks[k]=new Uint8Array(await bytes(new URL(s.path,root),s.sha256));
 A.screen=createScreenLayer({manifest:A.LM,indices:A.lightIds,transmission:A.lightTransmission,expectedSourceSHA:A.M.sourceSHA});A.ambient=createFrameLighting({nightTint:A.LM.ambientTint});
 // Animation elapsed delta is supplied by the host's sole RAF; lighting reads the
 // canonical provider. No native clock owner, timer, Date sampling, or demo rate.
 let elapsedMs=0;const options={water:true,lights:true,b1:true,b2:true,b3:true,b4:true,sort:true,depth:true,paused:false};
 const read=()=>{const frame=canonicalEnvironment.getFrame({biomeId:'COAST',lightingProfileId:'COAST'});const forced=frame.display?.time;return {elapsedMs,absoluteMinutes:forced==='DAY'?720:forced==='NIGHT'?1320:frame.lighting.minutes,clockOwnerCount:1,lightingOwner:'canonicalEnvironment',options:{...options}};};
 const environment={read,advance(ms){elapsedMs+=ms;},render(ctx,state){return renderSelectedJangmok(ctx,A,state,{read},options);}};
 return new NativeReviewAdapter({world,contract,masks,assets,environment,clearInput,travel,selectedServices,presentationSurface:makeCanvas(960,540)});
}
