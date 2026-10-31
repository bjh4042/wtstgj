import{preparePrologue}from'../../prologue-native/presentation.mjs';
import{PROLOGUE_SCENE as R}from'../../prologue-native/scene.mjs';
const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
// Factory dependency is the fixed S4 registry, never a caller-supplied target/warp route.
export async function prepareS4PrologueProvider({location,registry,sessionEpoch,signal,fetcher,decode,canvasFactory}){
 if(location?.mapId!==R.mapId||registry.validate(location)||!Number.isSafeInteger(sessionEpoch)||sessionEpoch<1)throw Error('S4_PROLOGUE_REGISTERED_LOCATION_REQUIRED');
 const initial=structuredClone(location),p=await preparePrologue({signal,fetcher,decode,canvasFactory});
 if(signal?.aborted||!p.safe(initial.foot)){p.dispose();throw Error('S4_PROLOGUE_PREPARE_CANCELLED')}
 let foot=[...initial.foot],facing=initial.facing,world=null,disposed=false,focused=true,carry=0,moving=false;
 const stop=()=>{carry=0;moving=false},getLocation=()=>({...initial,foot:[...foot],facing});
 return Object.freeze({mapId:R.mapId,sessionEpoch,bindWorld(w){if(world&&world!==w)throw Error('WORLD_REPLACEMENT_REQUIRES_NEW_OWNER');world=w},getLocation,readNative(){if(disposed)return null;return{version:1,sceneId:R.sceneId,mapId:R.mapId,revision:R.revision,imageSHA:R.imageSHA,maskSHA:R.maskSHA,foot:[...foot],facing,phase:focused?'field':'paused',sessionEpoch}},stop,setFocused(v){focused=v===true;stop()},
 frame(dt,dir){if(disposed)return;if(!Number.isFinite(dt)||dt<0)throw Error('INVALID_FRAME_DT');if(!focused||world?.busy||world?.inputLocked||signal?.aborted||!Object.hasOwn(dirs,dir)){stop();return}const[dx,dy]=dirs[dir];facing=dir;carry+=Math.min(100,dt)*.16;const count=Math.floor(carry);carry-=count;moving=false;for(let i=0;i<count;i++){const next=[foot[0]+dx,foot[1]+dy];if(!p.safe(next)){stop();break}foot=next;moving=true}},
 draw(ctx,clock){if(!disposed)p.draw(ctx,{foot,facing,moving,elapsedMs:clock.elapsedMs,minutes:clock.minutes,lights:clock.lights,rest:clock.rest})},async inspect(){if(disposed)throw Error('SCENE_DISPOSED');return{gameplayHandled:true,notice:'원래 회복 지점으로 돌아왔습니다. 이 검토 장면의 지역 출구는 아직 연결되지 않았습니다.'}},releaseAction(){stop()},dispose(){if(disposed)return;disposed=true;stop();world=null;p.dispose()}});
}
