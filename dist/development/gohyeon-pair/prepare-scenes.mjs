import {S4HubScene} from './hub-scene.mjs';
import {AnimatedS4TargetScene as S4TargetScene} from './animated-target-scene.mjs';
import {createS4TargetRenderer} from './render-target-animated.mjs';
export function createS4FixedScenePreparer({hubInputs,targetInputs,registry,scratchFactory,playerActors,foregroundLayers}){
 if(!playerActors)throw Error('PINNED_TWELVE_FRAME_ACTOR_REQUIRED');
 const inputs={...hubInputs,masks:{...hubInputs.masks,...targetInputs.hubMasks}},renderer=createS4TargetRenderer({inputs:targetInputs,actors:playerActors,scratchFactory,foregroundLayers});let epoch=0;
 // Inputs are entry-owned; each temporary scene owns only its movement state, never decoded shared images.
 return async location=>{if(registry.validate(location))throw Error('UNREGISTERED_TARGET_LOCATION');const sessionEpoch=++epoch;if(location.mapId==='world:hub:S4')return new S4HubScene({location,registry,inputs,scratchFactory,sessionEpoch});if(location.mapId==='world:area:S4_POW_CAMP_PARK_EDGE'||location.mapId==='world:area:S4_GOHYEON_GREENBELT'){const safeMask=location.mapId.endsWith('PARK_EDGE')?targetInputs.park.mask:targetInputs.green.mask;return new S4TargetScene({location,registry,safeMask,renderer,sessionEpoch})}throw Error('UNKNOWN_FIXED_S4_SCENE')};
}
