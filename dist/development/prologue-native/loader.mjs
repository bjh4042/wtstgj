import{loadPrologueVisualLayer}from'./visual-layer.mjs';
import{loadPrologueScene,PROLOGUE_SCENE as R}from'./scene.mjs';
import{loadSelectedPlayerFrames}from'../gohyeon-pair/player_frames/load-player-frames.mjs';
import{selectPlayerFrame}from'../gohyeon-pair/player-frame.mjs';
const moduleURL=import.meta.url;
const sha256=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
/** Pinned original art/main146303 support/approved12-frame actor. No RAF, world or save. */
export async function loadPrologueReviewScene({fetcher=fetch,decode=async b=>createImageBitmap(new Blob([b])),signal,sessionEpoch=1,canvasFactory}={}){
 const check=()=>{if(signal?.aborted)throw Error('PROLOGUE_LOAD_CANCELLED')};check();let actors=null,scene=null,visual=null;
 const read=async url=>{check();const response=await fetcher(url,{signal});if(!response.ok)throw Error('PROLOGUE_INPUT_MISSING');const bytes=new Uint8Array(await response.arrayBuffer());check();return bytes;};
 const ownedDecode=async bytes=>{check();const image=await decode(bytes);if(signal?.aborted){image.close?.();throw Error('PROLOGUE_LOAD_CANCELLED')}return image;};
 try{actors=await loadSelectedPlayerFrames({fetcher:async url=>{const b=await read(url);return{ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}},decode:ownedDecode});check();
 scene=await loadPrologueScene({readBytes:key=>read(new URL(key==='image'?'./assets/prologue.png':'./assets/main-junction-r3.safe.u8',moduleURL)),decodeImage:ownedDecode,sha256,pins:{imageSHA:R.imageSHA,mainMaskSHA:R.maskSHA},sessionEpoch,drawApprovedOverlay:(ctx,options)=>visual?.draw(ctx,options),drawApprovedForeground:(ctx,options)=>visual?.drawForeground(ctx,options),drawApprovedActor:(ctx,{x,y,facing,moving,walkMs})=>{const frame=selectPlayerFrame({facing,walking:moving,elapsedMs:walkMs});ctx.drawImage(actors.actors['actor:'+frame],x-53,y-90);}});check();visual=await loadPrologueVisualLayer({fetcher,decode:ownedDecode,signal,canvasFactory});check();let disposed=false;const result=scene;return Object.freeze({...result,dispose(){if(disposed)return;disposed=true;result.dispose();actors.dispose();visual.dispose();}});
 }catch(error){scene?.dispose();actors?.dispose();visual?.dispose();throw error;}
}
