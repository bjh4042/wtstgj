// Candidate scene only: no CanonicalWorld, authority, warp, story, save or RAF ownership.
export const PROLOGUE_SCENE=Object.freeze({sceneId:'native:prologue:exterior',mapId:'world:hub:PROLOGUE',revision:'PROLOGUE_SELECTED_HUB_LAMP_JUNCTION_R3',width:2804,height:1122,landing:Object.freeze([945,560]),facing:'down',maskSHA:'052a5e927ef28040cf58021c24736f5f7dde5c178c1a727a3b3ee70e91f3b14e',imageSHA:'d31ee97f9210999b0b7bb3bc29f8ac61fe7b6bcfea1eb946dfe8c58585939f9a'});
export const PROLOGUE_PREVIOUS_SCENE=Object.freeze({sceneId:'native:prologue:exterior',mapId:'world:hub:PROLOGUE',revision:'PROLOGUE_NEW_SELECTED_PAVING_R2',width:2804,height:1122,landing:Object.freeze([945,560]),facing:'down',maskSHA:'c3984be57fe6b0de740fd9befbe45d8dbe010e768d49690fc57c745f65bf9de0',imageSHA:'d31ee97f9210999b0b7bb3bc29f8ac61fe7b6bcfea1eb946dfe8c58585939f9a'});
const directions=Object.freeze({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]});
export function createPrologueScene({image,mainMask,drawApprovedActor,drawApprovedOverlay=()=>{},drawApprovedForeground=()=>{},sessionEpoch=0,onDispose=()=>{}}){
 const R=PROLOGUE_SCENE;if(!image||image.width!==R.width||image.height!==R.height)throw Error('PROLOGUE_IMAGE_SIZE');if(!(mainMask instanceof Uint8Array)||mainMask.length!==R.width*R.height)throw Error('PROLOGUE_MASK_SIZE');if(typeof drawApprovedActor!=='function'||!Number.isSafeInteger(sessionEpoch)||sessionEpoch<0)throw Error('PROLOGUE_HOST_CONTRACT');
 // Private copy; caller cannot change support after registration/loading.
 const mask=new Uint8Array(mainMask);const safe=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<R.width&&y<R.height&&mask[y*R.width+x]===1;
 let x=945,y=560,facing='down',focused=true,disposed=false,moving=false,carry=0,walkMs=0;if(!safe(x,y))throw Error('PROLOGUE_LANDING_UNSAFE');
 const stop=()=>{carry=0;moving=false;};
 return Object.freeze({mapId:R.mapId,sessionEpoch,
  frame(dtMs,dir){if(disposed)return; if(!Number.isFinite(dtMs)||dtMs<0)throw Error('PROLOGUE_DT');if(!focused||!directions[dir]){stop();return;}const [dx,dy]=directions[dir];facing=dir;carry+=Math.min(dtMs,100)*.16;const count=Math.floor(carry);carry-=count;moving=false;for(let i=0;i<count;i++){if(!safe(x+dx,y+dy)){stop();break;}x+=dx;y+=dy;moving=true;}if(moving)walkMs+=Math.min(dtMs,100);},
  draw(ctx,{ms=0,minutes=720}={}){if(disposed)return;const vw=ctx.canvas.width,vh=ctx.canvas.height,cx=Math.max(0,Math.min(R.width-vw,x-vw/2)),cy=Math.max(0,Math.min(R.height-vh,y-vh/2));ctx.save();try{ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,vw,vh);ctx.drawImage(image,cx,cy,vw,vh,0,0,vw,vh);drawApprovedOverlay(ctx,{offsetX:cx,offsetY:cy,elapsedMs:ms});drawApprovedActor(ctx,{x:x-cx,y:y-cy,facing,moving,walkMs,ms,minutes});drawApprovedForeground(ctx,{offsetX:cx,offsetY:cy,actorFoot:[x,y]});}finally{ctx.restore();}},
  stop,setFocused(value){focused=value===true;stop();},releaseAction(){stop();},
  readNative(){return disposed?null:{sceneId:R.sceneId,mapId:R.mapId,revision:R.revision,version:1,imageSHA:R.imageSHA,maskSHA:R.maskSHA,foot:[x,y],facing,phase:focused?'field':'paused',sessionEpoch};},
  getLocation(){return disposed?null:{sceneId:R.sceneId,mapId:R.mapId,revision:R.revision,foot:[x,y],facing};},
  dispose(){if(disposed)return;disposed=true;stop();onDispose();}
 });
}
export async function loadPrologueScene({readBytes,decodeImage,sha256,pins,drawApprovedActor,drawApprovedOverlay=()=>{},drawApprovedForeground=()=>{},sessionEpoch=0}){
 // Pins must be the immutable sole-writer/root selection, never fetched from an untrusted colocated manifest.
 const R=PROLOGUE_SCENE;if(pins?.imageSHA!==R.imageSHA||pins.mainMaskSHA!==R.maskSHA)throw Error('PROLOGUE_TRUST_ANCHOR');
 const own=key=>Promise.resolve(readBytes(key)).then(bytes=>{if(bytes instanceof Uint8Array)return new Uint8Array(bytes);if(bytes instanceof ArrayBuffer)return new Uint8Array(bytes.slice(0));throw Error('PROLOGUE_BYTE_INPUT');});const [art,mask]=await Promise.all([own('image'),own('mainMask')]);if(await sha256(art)!==R.imageSHA||await sha256(mask)!==R.maskSHA)throw Error('PROLOGUE_PIN_MISMATCH');
 let image;try{image=await decodeImage(art);return createPrologueScene({image,mainMask:mask,drawApprovedActor,drawApprovedOverlay,drawApprovedForeground,sessionEpoch,onDispose:()=>image.close?.()});}catch(error){image?.close?.();throw error;}
}
