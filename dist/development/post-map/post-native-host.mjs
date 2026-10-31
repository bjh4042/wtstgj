// Resolve raw pinned asset roots at runtime; do not let Vite rewrite directory URLs.
const assetModuleURL=import.meta.url;
import {PostNativeWalker} from './vendor/post_two_scene_native_r2/native-state.mjs';
import {loadSelectedInputs,createSelectedRenderer} from './vendor/selected-environment.mjs';
const identity=Object.freeze({sceneId:'world:hub:POST',mapId:'world:hub:POST',revision:'POST_NATIVE_2SCENE_DEV_R1:hub',version:1,imageSHA:'29e0513d5d7ed29ba72badb58a4082a0e594853a07ae8e197a6e33e01d6e53f8'});
const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
/** No world creation, checkpoint, save access, relocation or owned animation loop. */
export async function loadPostNativeHost({read,decode,canvasFactory,ImageDataClass=globalThis.ImageData}={}) {
 if(typeof read!=='function'||typeof decode!=='function'||typeof canvasFactory!=='function')throw Error('POST_HOST_LOADERS_REQUIRED');
 const manifestBytes=await read(new URL('./PINS.json',assetModuleURL));if(await sha(manifestBytes)!=='5a91ae03f0a1d95ccf6019d2f7b4ef427d70fac4114b49790c7f1abb58ee1183')throw Error('POST_PINSET_MISMATCH');const pins=JSON.parse(new TextDecoder().decode(manifestBytes));
 const root=new URL('./vendor/',assetModuleURL),cache=new Map();
 async function pinned(url){url=new URL(url);if(!url.href.startsWith(root.href))throw Error('POST_INPUT_OUTSIDE_BUNDLE');const key=url.href.slice(root.href.length),pin=pins[key];if(!pin)throw Error('POST_UNPINNED_INPUT');if(!cache.has(key))cache.set(key,Promise.resolve(read(url)).then(async bytes=>{const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);if(b.byteLength!==pin.bytes||await sha(b)!==pin.sha256)throw Error('POST_INPUT_HASH_MISMATCH:'+key);return b;}));return cache.get(key);}
 const json=async p=>JSON.parse(new TextDecoder().decode(await pinned(new URL(p,root))));
 const [config,inputs,selected]=await Promise.all([json('post_two_scene_native_r2/CONFIG.json'),json('post_two_scene_native_r2/NATIVE49_INPUTS.json'),loadSelectedInputs({read:pinned,decode,canvasFactory})]);
 const scene=config.maps.find(x=>x.mapId===identity.mapId),input=inputs.find(x=>x.mapId===identity.mapId);if(scene?.revision!==identity.revision||input?.revision!==identity.revision||scene.width!==3072||input.width!==3072||scene.height!==1024||input.height!==1024)throw Error('POST_NATIVE_IDENTITY_MISMATCH');
 const images={player:await decode(await pinned(new URL('elite_four_actual_npc_source_audit/drive_read_pass/player_facing_followup/PLAYER_MALE_FIELD12_COMMON256.png',root))),npc:await decode(await pinned(new URL('nojasan_binding_audit/source/source/YEJI-approved-atlas.png',root)))};
 const walker=new PostNativeWalker(input),render=createSelectedRenderer(selected,{ImageDataClass});
 let world=null,disposed=false,focused=true,visualLocked=false,route=null,routeRemainder=0;
 const current=()=>!disposed&&world?.snapshot().position.scene===identity.mapId;
 const locked=()=>!current()||!focused||visualLocked||world.inputLocked;
 function sync(){walker.setLocked(locked());}
 function planRoute(target){sync();if(locked())return {ok:false,reason:'POST_HOST_LOCKED'};walker.stop();routeRemainder=0;
   const width=input.width,total=width*input.height,start=walker.y*width+walker.x,parent=new Int32Array(total);parent.fill(-1);const queue=new Int32Array(total);let head=0,tail=1,found=-1;queue[0]=start;parent[start]=start;
   while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);if(target(x,y)){found=at;break;}for(const [dx,dy]of [[0,-1],[-1,0],[1,0],[0,1]]){const xx=x+dx,yy=y+dy;if(!walker.safe(xx,yy))continue;const n=yy*width+xx;if(parent[n]!==-1)continue;parent[n]=at;queue[tail++]=n;}}
   if(found<0){route=null;return {ok:false,reason:'NO_VERIFIED_NATIVE_ROUTE'};}route=[];for(let p=found;p!==start;p=parent[p])route.push([p%width,Math.floor(p/width)]);route.reverse();return {ok:true,steps:route.length};
  }
 const api={
  readNative:()=>({...identity,foot:[walker.x,walker.y],phase:current()&&focused&&!visualLocked?'field':'inactive'}),
  bindWorld(w){if(world||disposed||!w?.interactNative||w.snapshot().position.scene!==identity.mapId)throw Error('POST_WORLD_BINDING_REJECTED');world=w;sync();return api;},
  key(key,down){route=null;routeRemainder=0;sync();return walker.key(key,down);},
  move(dx,dy){route=null;routeRemainder=0;sync();return walker.move(dx,dy);},
  tick(seconds){sync();if(!route){walker.tick(seconds);return;}if(locked())return;if(!Number.isFinite(seconds)||seconds<0||seconds>2){api.stop();return;}routeRemainder+=Math.min(seconds,.05)*120;while(route?.length&&routeRemainder>=1){routeRemainder--;const next=route.shift();const dx=next[0]-walker.x,dy=next[1]-walker.y;if(Math.abs(dx)+Math.abs(dy)!==1||walker.move(dx,dy).moved!==1){api.stop();throw Error('POST_ROUTE_INVALIDATED');}}if(!route?.length){route=null;routeRemainder=0;walker.stop();}},
  routeToHeal(){return planRoute((x,y)=>y>=413&&y<=425&&Math.abs(x-465)<=425-y);},
  routeToShop(){return planRoute((x,y)=>y>=403&&y<=425&&Math.abs(x-1095)<=425-y);},
  setFocused(value){const next=!!value;if(focused!==next){focused=next;walker.setFocus(focused);}sync();},
  setVisualLocked(value){visualLocked=!!value;sync();},
  stop(){route=null;routeRemainder=0;walker.stop();},
  canHeal(){const n=api.readNative();return current()&&!locked()&&n.phase==='field'&&n.foot[1]>=413&&n.foot[1]<=425&&Math.abs(n.foot[0]-465)<=425-n.foot[1];},
  canShop(){const n=api.readNative();return current()&&!locked()&&n.phase==='field'&&n.foot[1]>=403&&n.foot[1]<=425&&Math.abs(n.foot[0]-1095)<=425-n.foot[1];},
  heal(transactionId){if(!api.canHeal())return Promise.reject(Error('POST_HEAL_NOT_AVAILABLE'));walker.stop();return world.interactNative('heal:POST',{type:'heal',transactionId});},
  render(ctx,{ms=0,minutes=720,camera}={}){if(!current())throw Error('POST_HOST_INACTIVE');const cam=camera??[Math.max(0,Math.min(2112,Math.round(walker.x-480))),Math.max(0,Math.min(484,Math.round(walker.y-270))),960,540];return render(ctx,{scene:{...scene,npc:null},images,walker,save:world.snapshot(),camera:cam,ms,minutes});},
  dispose(){disposed=true;walker.setFocus(false);walker.setLocked(true);world=null;},
  get routing(){return !!route?.length;},
  get position(){return {x:walker.x,y:walker.y,facing:walker.facing};},
 };
 return api;
}
