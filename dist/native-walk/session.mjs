import {createNativeWalkState} from './controller.mjs';
import {loadS7FeedbackAdapter} from '../native-ports/resources/map_simulation_20261102/ground_contact_r3/s7-leaf.mjs';
import {loadSelectedS8R2Adapter} from '../native-ports/resources/map_simulation_20261102/ground_s8_r1/s8-resource.mjs';
import {validateNativeAdapter} from '../native-ports/resources/map_simulation_20261102/bridge_r1/native-providers.mjs';
import {prepareForestPlayer,isAuthoritativeForestPlayer} from '../native-ports/resources/recovery_runtime_20261102/s5_resume/dist/development/hakdong-forest-native/player.mjs';
import {BOY} from '../native-ports/resources/recovery_runtime_20261102/s5_resume/dist/development/hakdong-forest-native/player-data.mjs';
import {selectPlayerFrame} from '../native-ports/resources/recovery_runtime_20261102/s5_resume/dist/development/gohyeon-pair/player-frame.mjs';
import {viewportCamera,createLegacyViewportSurface} from '../native-ports/resources/map_simulation_20261102/user_feedback_r1/viewport.mjs';
import {createS7PalmOcclusion} from '../native-ports/resources/map_simulation_20261102/user_feedback_r1/occlusion/s7-palm.mjs';
export const PREVIEW_MAPS=Object.freeze({S7:Object.freeze({id:'world:hub:S7',foot:Object.freeze([4000,770]),facing:'left'}),S8:Object.freeze({id:'world:hub:S8',foot:Object.freeze([2310,1470]),facing:'right'})});
function playerView(s,camera){const frame=selectPlayerFrame({facing:s.facing,walking:s.moving,elapsedMs:s.elapsedMs}),bbox=BOY.frames[frame].visibleAlphaBBox,x=s.foot[0]-camera[0]-53,y=s.foot[1]-camera[1]-90,b=[x+bbox[0],y+bbox[1],x+bbox[2],y+bbox[3]],dx=b[0]<0?-b[0]:b[2]>1280?1280-b[2]:0,dy=b[1]<0?-b[1]:b[3]>720?720-b[3]:0;return Object.freeze({frame,offset:Object.freeze([dx,dy]),bounds:Object.freeze([b[0]+dx,b[1]+dy,b[2]+dx,b[3]+dy])});}
export async function prepareNativeWalk({map='S7',signal}={}){
 if(!Object.hasOwn(PREVIEW_MAPS,map)||signal!==undefined&&!(signal instanceof AbortSignal))throw Error('NATIVE_WALK_OPTIONS');
 const row=PREVIEW_MAPS[map],surface=createLegacyViewportSurface(),occlusion=createS7PalmOcclusion(),errors=[];let adapter=null,lease=null,player=null,walk=null,dead=false;
 const check=()=>{if(dead||signal?.aborted)throw Error('NATIVE_WALK_ABORTED');};
 function dispose(){dead=true;signal?.removeEventListener('abort',dispose);for(const fn of[()=>walk?.dispose(),()=>player?.dispose(),()=>lease?.release(),()=>adapter?.dispose(),()=>surface.dispose(),()=>occlusion.dispose()])try{fn();}catch(e){errors.push(String(e?.message??e));}}
 signal?.addEventListener('abort',dispose,{once:true});
 try{
  check();adapter=await(map==='S7'?loadS7FeedbackAdapter(signal):loadSelectedS8R2Adapter(signal));check();if(!validateNativeAdapter(adapter,row.id))throw Error('NATIVE_WALK_ADAPTER');lease=adapter.acquirePresentation();
  player=await prepareForestPlayer({appearance:'boy',signal});check();if(!isAuthoritativeForestPlayer(player))throw Error('NATIVE_WALK_PLAYER');walk=createNativeWalkState({safe:adapter.safe,foot:row.foot,facing:row.facing});
  return Object.freeze({map,mapId:row.id,tick(dirs,dt){check();return walk.tick(dirs,dt);},reset(){check();return walk.reset();},suspend(){walk?.suspend();},resume(){check();walk.resume();},
   draw(ctx){check();if(ctx.canvas.width!==1280||ctx.canvas.height!==720||ctx.isContextLost?.())throw Error('NATIVE_WALK_CONTEXT');const s=walk.state,camera=viewportCamera(adapter.identity,s.foot),view=playerView(s,camera);ctx.clearRect(0,0,1280,720);surface.draw(ctx,camera,adapter.identity,(g,c)=>lease.drawBase(g,c));occlusion.captureBackground(ctx,{map,camera});player.draw(ctx,{foot:[s.foot[0]-camera[0]+view.offset[0],s.foot[1]-camera[1]+view.offset[1]],facing:s.facing,elapsedMs:s.elapsedMs,moving:s.moving});const foreground=occlusion.drawForeground(ctx,{map,camera,foot:s.foot});check();if(ctx.isContextLost?.())throw Error('NATIVE_WALK_CONTEXT');return Object.freeze({state:s,camera,view,foreground});},
   dispose,get state(){return walk.state;},get diagnostics(){return Object.freeze({disposed:dead,presentationLeases:adapter?.activePresentationLeases??0,providerFinalized:adapter?.providerFinalized??false,cleanupErrors:Object.freeze([...errors]),storageWrites:0,canonicalCommands:0});}
  });
 }catch(e){dispose();throw e;}
}
