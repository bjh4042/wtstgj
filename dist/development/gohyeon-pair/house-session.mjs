import {inDoorApproach} from '../gohyeon-native/native_candidate/door_approach_proposal/approach.mjs';
const states=new WeakMap(),same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
export function installHouseSession(owner,location){
 if(!owner.registry.housePose)return;const s=owner.scene.session;
 const state={exterior:{foot:[...location.foot],facing:location.facing},latch:structuredClone(location.houseLatch),serial:0};states.set(owner,state);
 s.doorState=location.houseDoorState;if(location.indoorPose){s.scene=location.indoorPose.floor;s.foot=[...location.indoorPose.foot];s.facing=location.indoorPose.facing}
 s.actionHeld=!state.latch.released;s.armed=state.latch.released&&state.latch.left;
 // stop/focus/menu must not manufacture a physical key release or re-arm an arrival.
 const stop=s.stop.bind(s);s.stop=()=>{const held=s.actionHeld,armed=s.armed;stop();s.actionHeld=held;s.armed=armed};
 const move=s.move.bind(s);s.move=direction=>{const before=[...s.foot],floor=s.scene,result=move(direction);if(result.ok&&floor===s.scene&&!same(before,s.foot)){state.serial++;if(!s.triggerAt())state.latch.left=true;s.armed=state.latch.released&&state.latch.left}return result};
}
export function houseLocation(owner,n){const state=states.get(owner);if(!state)return null;if(n.scene==='exterior')state.exterior={foot:[...n.foot],facing:n.facing};return{...owner.registry.describe(owner.mapId,n.mapState),...structuredClone(state.exterior),indoorPose:n.scene==='exterior'?null:owner.registry.housePose(n.scene,n.foot,n.facing),houseDoorState:n.doorState,houseLatch:structuredClone(state.latch)}}
export function releaseHouseAction(owner){const state=states.get(owner);if(!state)return false;state.latch.released=true;const s=owner.scene.session;s.actionHeld=false;s.armed=state.latch.left;return true}
export function requireHouseArrival(owner){const state=states.get(owner);if(!state)return;state.latch={released:false,left:false};owner.scene.session.actionHeld=true;owner.scene.session.armed=false}
export function houseBlocked(owner){const s=states.get(owner);return !!s&&!(s.latch.released&&s.latch.left)}
export function canHouseDoor(owner){return states.has(owner)&&inDoorApproach(owner.scene.session)}
export async function prepareHouseAction(source,kind,prepareScene){
 if(!states.has(source)||!['inspect','door'].includes(kind))throw Error('HOUSE_NATIVE_SOURCE_REQUIRED');if(houseBlocked(source))throw Error('HOUSE_RELEASE_AND_SUCCESSFUL_LEAVE_REQUIRED');
 const location=source.getLocation(),scene=await prepareScene(structuredClone(location));
 try{if(scene===source||!states.has(scene))throw Error('HOUSE_TEMPORARY_OWNER_REQUIRED');const s=scene.scene.session;let result;if(kind==='door'){if(!canHouseDoor(scene))throw Error('HOUSE_DOOR_APPROACH_REQUIRED');result=s.setDoorState(s.doorState==='OPEN'?'CLOSED':'OPEN');if(!result.ok)throw Error(result.reason);result={...result,kind:'door',doorState:s.doorState}}else{result=await scene.scene.action();if(!result.ok){scene.dispose();return{result,scene:null}}}
 requireHouseArrival(scene);const target=scene.getLocation(),error=scene.registry.validate(target);if(error)throw Error(error);scene.dispose();return{target,result};}catch(e){if(scene!==source)scene?.dispose?.();throw e}
}
