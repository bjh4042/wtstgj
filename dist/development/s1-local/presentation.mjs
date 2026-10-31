import{claimS1SharedImage}from'./shared-image.mjs';
import{loadS1Night}from'../s1-night/load.mjs';
import{S1_LOCAL_SCENE as R}from'./scene.mjs';
import{createS1ContinuousLocalCamera}from'./continuous-camera.mjs';
import{loadSelectedPlayerFrames}from'../gohyeon-pair/player_frames/load-player-frames.mjs';
import{selectPlayerFrame}from'../gohyeon-pair/player-frame.mjs';
const moduleURL=import.meta.url,KEYS=['sceneId','mapId','revision','imageSHA','maskSHA','foot','facing'],ORIGINS_SHA='700e9bfb90718aa06b912636f9242e562a4e88787bc6da633c8041a815d2bd30';
const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
const footValue=f=>{if(!Array.isArray(f)||Object.getPrototypeOf(f)!==Array.prototype||Reflect.ownKeys(f).length!==3)return null;const d=[0,1].map(i=>Object.getOwnPropertyDescriptor(f,String(i)));return d.every(x=>x?.enumerable&&Object.hasOwn(x,'value')&&Number.isSafeInteger(x.value))?d.map(x=>x.value):null};
/** Pure local presentation. Owns only pinned images and camera; no world, gameplay pose, clock, save, warp or RAF. */
export async function prepareS1Local({signal,fetcher=fetch,decode=async b=>createImageBitmap(new Blob([b])),canvasFactory,sharedImageToken,sharedNightBankToken}={}){
 let disposed=false,actors=null,image=null,camera=null,night=null,imageLease=null;
 const check=()=>{if(disposed||signal?.aborted)throw Error('S1_LOCAL_PREPARE_CANCELLED')};
 const dispose=()=>{if(disposed)return;disposed=true;const owned=[camera,night,actors,imageLease??image];const leased=!!imageLease;imageLease=null;camera=null;night=null;actors=null;image=null;let first;for(let i=0;i<owned.length;i++)try{i===3&&!leased?owned[i]?.close?.():owned[i]?.dispose()}catch(e){first??=e}if(first)throw first};
 const read=async path=>{check();const r=await fetcher(new URL(path,moduleURL),{signal});if(!r.ok)throw Error('S1_LOCAL_INPUT_MISSING');const raw=await r.arrayBuffer(),bytes=new Uint8Array(raw instanceof ArrayBuffer?raw.slice(0):raw);check();return bytes};
 const decodeOwned=async bytes=>{check();const value=await decode(bytes);if(disposed||signal?.aborted){try{value.close?.()}finally{throw Error('S1_LOCAL_PREPARE_CANCELLED')}}return value};
 try{
  const[art,mask,oc]=await Promise.all([sharedImageToken?null:read('./assets/yeoncho-open.png'),read('./assets/local-main.u8'),read('./assets/opaque-origins.json')]);
  if((!sharedImageToken&&await hash(art)!==R.imageSHA)||await hash(mask)!==R.maskSHA||mask.length!==R.width*R.height||await hash(oc)!==ORIGINS_SHA)throw Error('S1_LOCAL_PIN_MISMATCH');check();
  const origins=JSON.parse(new TextDecoder().decode(oc));
  const safe=foot=>{const f=footValue(foot);return!disposed&&!!f&&f[0]>=0&&f[1]>=0&&f[0]<R.width&&f[1]<R.height&&mask[f[1]*R.width+f[0]]===1};
  const opaque=([x,y])=>origins.originRows[y]?.some(([lo,hi])=>x>=lo&&x<hi)??false;
  actors=await loadSelectedPlayerFrames({fetcher:async url=>{check();const r=await fetcher(url,{signal});if(!r.ok)return r;const raw=await r.arrayBuffer(),b=new Uint8Array(raw instanceof ArrayBuffer?raw.slice(0):raw);check();return{ok:true,arrayBuffer:async()=>b}},decode:decodeOwned});
  if(sharedImageToken){imageLease=claimS1SharedImage(sharedImageToken);image=imageLease.image}else{image=await decodeOwned(art);if(image.width!==R.imageWidth||image.height!==R.imageHeight)throw Error('S1_LOCAL_IMAGE_DIMENSIONS')}check();night=await loadS1Night({fetcher,signal,sharedNightBankToken,image,actors:actors.actors,canvasFactory});check();
  const resetCameraForSceneOrRestore=foot=>{if(!safe(foot))throw Error('UNSUPPORTED_S1_LOCAL_POSE');camera?.dispose();camera=createS1ContinuousLocalCamera({initialFoot:foot,isSupportedFoot:safe,isSupportedOrigin:opaque});return camera.getOrigin()};
  const validate=n=>{if(disposed)return'S1_LOCAL_PRESENTATION_DISPOSED';if(!n||Object.getPrototypeOf(n)!==Object.prototype||Reflect.ownKeys(n).length!==KEYS.length||KEYS.some(k=>{const d=Object.getOwnPropertyDescriptor(n,k);return!d?.enumerable||!Object.hasOwn(d,'value')}))return'INVALID_S1_LOCAL_LOCATION';if(['sceneId','mapId','revision','imageSHA','maskSHA'].some(k=>n[k]!==R[k]))return'S1_LOCAL_LOCATION_PIN_MISMATCH';if(!['up','down','left','right'].includes(n.facing)||!safe(n.foot))return'UNSUPPORTED_S1_LOCAL_POSE';return true};
  return Object.freeze({pinsVerified:true,safe,validate,resetCameraForSceneOrRestore,draw(ctx,{foot,facing,elapsedMs=0,moving=false,minutes=720,lights=true,rest=false}){if(!safe(foot)||!['up','down','left','right'].includes(facing))throw Error('UNSUPPORTED_S1_LOCAL_POSE');if(ctx.canvas.width!==960||ctx.canvas.height!==540)throw Error('S1_PINNED_VIEWPORT_REQUIRED');const origin=camera?camera.trackFoot(foot):resetCameraForSceneOrRestore(foot);ctx.save();try{ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,960,540);ctx.drawImage(image,origin[0],origin[1],960,540,0,0,960,540);const frame=selectPlayerFrame({facing,walking:moving,elapsedMs});ctx.drawImage(actors.actors['actor:'+frame],foot[0]-origin[0]-53,foot[1]-origin[1]-90);night.drawDepth(ctx,origin,foot);night.apply(ctx,origin,{foot,frame,minutes,lights,rest})}finally{ctx.restore()}},dispose});
 }catch(e){try{dispose()}catch{}throw e}
}
