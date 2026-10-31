import {createGohyeonHealBinding} from '../../world/gohyeon-heal-binding.mjs';
import {readOwnedCenterPose} from './center-interior-scene.mjs';
import {CENTER_CONTRACT as C} from './fixed-contract.mjs';
export function prepareCenterTransition(source,kind,registry){
 const n=source.getLocation();if(n.mapId!=='world:hub:S4'||!registry.centerPose)throw Error('FIXED_CENTER_SOURCE_REQUIRED');
 if(kind==='enter'){
  if(n.servicePose||n.indoorPose||!source.scene||source.disposed||!source.world)throw Error('EXTERIOR_CENTER_ENTRY_REQUIRED');
  const binding=createGohyeonHealBinding({getWorld:()=>source.world,getScene:()=>source.scene});let available;try{available=binding.canHeal()}finally{binding.dispose()}
  if(!available)throw Error('ORIGINAL_CENTER_APPROACH_REQUIRED');
  return{target:{...n,servicePose:registry.centerPose(C.entry.foot,C.entry.facing)},result:{kind:'center-enter',executed:true}};
 }
 if(kind==='exit'){
  const p=readOwnedCenterPose(source);if(!p||!n.servicePose||!n.servicePose.released||!n.servicePose.left||p.facing!=='down'||!source.isReturnTrigger?.())throw Error('CENTER_RELEASE_LEAVE_RETURN_REQUIRED');
  return{target:{...n,servicePose:null},result:{kind:'center-exit',executed:true}};
 }
 throw Error('FIXED_CENTER_ACTION_REQUIRED');
}
