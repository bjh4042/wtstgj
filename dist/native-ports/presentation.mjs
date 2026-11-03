import {prepareForestPlayer,isAuthoritativeForestPlayer} from './resources/recovery_runtime_20261102/s5_resume/dist/development/hakdong-forest-native/player.mjs';
import {viewportCamera,describeVisiblePlayer,createLegacyViewportSurface} from './resources/map_simulation_20261102/user_feedback_r1/viewport.mjs';
import {createS7PalmOcclusion} from './resources/map_simulation_20261102/user_feedback_r1/occlusion/s7-palm.mjs';
import {validateNativeAdapter} from './resources/map_simulation_20261102/bridge_r1/native-providers.mjs';
import {describeSelectedPlayer} from './player-visibility.mjs';
const make=(w,h)=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
const liveFrames=new WeakSet();
export function isNativePortFrame(f){return liveFrames.has(f)&&!f.disposed;}
export async function stageNativePort({bundle,targetMap,nativeFoot,facing,signal,appearance='boy'}){
 if(!['boy','girl'].includes(appearance))throw Error('NATIVE_PORT_APPEARANCE');
 const check=()=>{if(signal?.aborted)throw Error('NATIVE_PORT_ABORTED');};check();
 const adapter=bundle?.target;if(!validateNativeAdapter(adapter,targetMap)||!adapter.safe(...nativeFoot))throw Error('NATIVE_PORT_TARGET');
 const retainedPlayer=bundle.player;let player=null,lease=null,canvas=null;const surface=createLegacyViewportSurface(),occlusion=createS7PalmOcclusion();
 try{
  lease=adapter.acquirePresentation();player=retainedPlayer??await prepareForestPlayer({appearance,signal});check();if(!isAuthoritativeForestPlayer(player)||player.appearance!==appearance)throw Error('NATIVE_PORT_PLAYER_BRAND');
  canvas=make(1280,720);const ctx=canvas.getContext('2d');if(!ctx)throw Error('NATIVE_PORT_CONTEXT');
  const camera=viewportCamera(adapter.identity,nativeFoot),map=targetMap==='world:hub:S7'?'S7':'S8',alpha=describeSelectedPlayer({appearance,foot:nativeFoot,camera,facing,now:0});
  surface.draw(ctx,camera,adapter.identity,(g,c)=>lease.drawBase(g,c));occlusion.captureBackground(ctx,{map,camera});
  player.draw(ctx,{foot:[nativeFoot[0]-camera[0]+alpha.visualOffset[0],nativeFoot[1]-camera[1]+alpha.visualOffset[1]],facing,elapsedMs:0,moving:false});occlusion.drawForeground(ctx,{map,camera,foot:nativeFoot});
  check();if(!alpha.visibleInside||ctx.isContextLost?.())throw Error('NATIVE_PORT_INVALID_FRAME');
  let dead=false;const owned=canvas;canvas=null;const frame=Object.freeze({canvas:owned,appearance,mapId:targetMap,foot:Object.freeze([...nativeFoot]),facing,camera,playerAlpha:alpha,get disposed(){return dead;},dispose(){if(dead)return;dead=true;liveFrames.delete(frame);owned.width=owned.height=0;}});liveFrames.add(frame);return frame;
 }finally{canvas&&(canvas.width=canvas.height=0);try{if(!retainedPlayer)player?.dispose();}finally{try{lease?.release();}finally{surface.dispose();occlusion.dispose();}}}
}
export function createNativePortDisplay(){
 let canvas=null,identity=null,dead=false;
 const clear=()=>{identity=null;if(canvas){canvas.width=canvas.height=0;canvas=null;}};
 function publish(frame,{canonicalSnapshot,nativeFoot,mapId}){
  if(dead||!isNativePortFrame(frame)||canonicalSnapshot.player?.appearance!==frame.appearance||mapId!==frame.mapId||JSON.stringify(nativeFoot)!==JSON.stringify(frame.foot)||canonicalSnapshot.position.scene!==mapId||canonicalSnapshot.world.mapId!==mapId)throw Error('NATIVE_PORT_PUBLISH_IDENTITY');
  const next=make(1280,720);try{const ctx=next.getContext('2d');ctx.drawImage(frame.canvas,0,0);if(ctx.isContextLost?.())throw Error('NATIVE_PORT_PUBLISH_CONTEXT');}catch(e){next.width=next.height=0;throw e;}
  clear();canvas=next;identity=Object.freeze({sessionId:canonicalSnapshot.sessionId,revision:canonicalSnapshot.revision,position:JSON.stringify(canonicalSnapshot.position),mapId});
 }
 function draw(ctx,pose){
  if(dead||!canvas||!pose||pose.sessionId!==identity.sessionId||pose.canonicalRevision!==identity.revision||JSON.stringify(pose.canonicalPosition)!==identity.position||pose.mapId!==identity.mapId){clear();return false;}
  if(ctx.canvas.width!==1280||ctx.canvas.height!==720||ctx.isContextLost?.()){clear();return false;}
  ctx.drawImage(canvas,0,0);return true;
 }
 return Object.freeze({publish,draw,clear,dispose(){if(dead)return;dead=true;clear();},get hasFrame(){return !!canvas;}});
}
