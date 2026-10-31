import{loadPostNativeHost}from'./post-native-host.mjs';
import{NojasanNativeScene}from'../nojasan/scene.mjs';
import{createNojasanRenderer}from'../nojasan/ambient.mjs';
import{POST_ENTRY_REGISTRATION as ENTRY}from'../../world/post-entry-authority.mjs';
const keys={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
/** Inputs are pinned before reaching this factory. Shared summit images belong to outer entry. */
export function createPairedSceneFactory({registry,getOwner,postOptions,summitInputs}){
 let nextEpoch=0;
 return async function prepare(location){const reason=registry.validate(location);if(reason)throw Error(reason);const initial=structuredClone(location),sessionEpoch=++nextEpoch;
  if(location.mapId==='world:hub:POST'){
   const images=[],close=()=>{for(const image of images.splice(0))image.close?.()};let h;
   try{h=await loadPostNativeHost({...postOptions,initialLocation:initial,sessionEpoch,decode:async(...args)=>{const image=await postOptions.decode(...args);images.push(image);return image}})}catch(error){close();throw error}
   let direction=null,disposed=false;const stop=()=>{direction=null;h.stop()};
   return {...h,mapId:initial.mapId,sessionEpoch,bindWorld:w=>h.bindWorld(w,{prepared:true}),stop,
    frame(dt,dir){if(disposed)return;if(dir!==direction){if(direction)h.key(keys[direction],false);direction=dir}if(dir)h.key(keys[dir],true);h.tick(dt/1000)},draw:(ctx,options)=>h.render(ctx,options),
    inspect(){const n=h.readNative(),[x,y]=n.foot;if(n.phase!=='field'||!ENTRY.rows.some(([yy,a,b])=>yy===y&&x>=a&&x<b))return Promise.resolve({status:'NO_LOCAL_READ_POINT'});return getOwner().transition(ENTRY.pointId)},
    dispose(){if(disposed)return;disposed=true;h.dispose();close()}
   };
  }
  let scene=null,disposed=false,direction=null,focused=true;const renderer=createNojasanRenderer({ImageDataClass:postOptions.ImageDataClass??globalThis.ImageData});
  const adapter={mapId:initial.mapId,sessionEpoch,
   bindWorld(world){if(scene||disposed)throw Error('SCENE_BINDING_REJECTED');scene=new NojasanNativeScene({world,contract:structuredClone(summitInputs.contract),safeBytes:summitInputs.safeBytes.slice(),challenge:()=>world.interactNativeSummit('post:yeji-final',{type:'battle'})});scene.walker.x=initial.foot[0];scene.walker.y=initial.foot[1];scene.walker.facing=initial.facing;},
   getLocation(){if(!scene)return structuredClone(initial);return{...initial,foot:[scene.walker.x,scene.walker.y],facing:scene.walker.facing}},
   readNative(){return scene&&!disposed?{...scene.readNative(),maskSHA:initial.maskSHA,sessionEpoch}:null},
   stop(){direction=null;scene?.walker.stop()},setFocused(value){const next=!!value;if(next!==focused){focused=next;direction=null;scene?.walker.setFocus(next)}},
   frame(dt,dir){if(disposed||!scene)return;if(dir!==direction){if(direction)scene.walker.key(keys[direction],false);direction=dir}if(dir)scene.walker.key(keys[dir],true);scene.tick(dt/1000)},
   draw(ctx,{minutes}){if(disposed||!scene)return;const w=scene.walker,camera=[Math.max(0,Math.min(576,Math.round(w.x-480))),Math.max(0,Math.min(484,Math.round(w.y-270)))];return renderer(ctx,{scene,images:summitInputs.images,camera,minutes})},
   async inspect(){if(disposed||!scene||!focused||scene.world.busy||scene.world.inputLocked)throw Error('SCENE_INPUT_LOCKED');if(scene.canReturn())return getOwner().transition('post-entry:nojasan-summit:return');return scene.inspect()},
   dispose(){if(disposed)return;disposed=true;scene?.dispose()}
  };return adapter;
 };
}
