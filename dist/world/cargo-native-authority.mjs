import{isRescueBridgeRegistrationDTO}from'./cargo-eight-scene-geometry.mjs';
import {isBridgeRegistrationDTO} from './cargo-bridge-geometry.mjs';
// PROPOSAL ONLY. Source writer must install into the one current module graph.
// Trusted construction closures, never accept the UI's own location/room DTO.
import {CargoRoomInteractions} from '../development/cargo-native/canonical/room-interactions.mjs';
import {sha256,stableJSON} from '../compatibility/codec.mjs';
const authorities=new WeakMap(),grants=new WeakMap();
export const CARGO_BOSS_REGISTRATION=Object.freeze({version:1,sceneId:'ship_bridge',mapId:'world:ship:S9',pointId:'trainer:BLACKNET_HWIGYEONG_FINAL',imageSHA:'fe92b1ecf86ea52cc503910bd659fd938427c8f695a85b8d63ef20691dd6355f',maskSHA:'7c99d8c50ce9751f53b670bc7c8282c69812d8b49042bac954b468c4824fd359',revision:'VERIFIED_NATIVE_PORT_ADAPTER_1411_R1'});
const REQUIRED=['S9_SHIP_ZONE1_CLEAR','S9_SHIP_ZONE2_RESCUE_CLEAR','S9_BLACKNET_BOMI_DEFEATED','S9_BLACKNET_JUNSEOK_DEFEATED'];
export const cargoSafeApproach=foot=>Array.isArray(foot)&&foot.length===2&&foot.every(Number.isInteger)&&foot[0]>=632&&foot[0]<=648&&foot[1]>=646&&foot[1]<=650;
export function createCargoNativeAuthority({readNative,readRoomContext,roomContract}={}){
 if(typeof readNative!=='function'||typeof readRoomContext!=='function'||sha256(stableJSON(roomContract))!=='316425446b5ab2c41094251266c0deab0ef36068a97a9b8fa26e41430caae3e8')throw Error('PINNED_CARGO_HOST_REQUIRED');
 const authority=Object.freeze({});authorities.set(authority,{readNative,readRoomContext,roomContract:structuredClone(roomContract)});return authority;
}
export const isCargoNativeAuthority=a=>authorities.has(a);
function verify(authority,world,pointId){
 const owner=authorities.get(authority),r=CARGO_BOSS_REGISTRATION;if(!owner||pointId!==r.pointId)return null;
 const s=world.snapshot(),p=world.definition.points[pointId],n=owner.readNative(),room=owner.readRoomContext();
 if(s.developmentOnly!==true||s.position.scene!==r.mapId||s.world?.mapId!==r.mapId||p?.mapId!==r.mapId||p?.kind!=='trainer'||p?.trainerId!=='BLACKNET_HWIGYEONG_FINAL')return null;
 if(!n||!['version','sceneId','mapId','imageSHA'].every(k=>n[k]===r[k])||!((n.maskSHA===r.maskSHA&&n.revision===r.revision)||isBridgeRegistrationDTO(n)||isRescueBridgeRegistrationDTO(n))||n.phase!=='field'||n.dynamicCollisionClear!==true||!cargoSafeApproach(n.foot)||room?.locked!==false)return null;
 let probe;try{probe=new CargoRoomInteractions(owner.roomContract,room.state);}catch{return null;}
 if(!probe.readyForCode()||!probe.passwordAccepted||REQUIRED.some(k=>s.progress.flags[k]!==true)||!world.story.gate('CAN_FIGHT_HWIGYEONG')||!world.story.trainerAvailable('BLACKNET_HWIGYEONG_FINAL')||world.story.pendingCommit)return null;
 return {sessionId:s.sessionId,revision:s.revision,native:stableJSON(n),room:sha256(stableJSON(room.state))};
}
export function mintCargoBossGrant(authority,world,pointId){const stamp=verify(authority,world,pointId);if(!stamp)throw Error('CARGO_NATIVE_AUTHORITY_REJECTED');const token=Object.freeze({});grants.set(token,{authority,world,pointId,stamp});return token;}
export function validateCargoBossGrant(token,world,pointId){const g=grants.get(token);if(!g||g.world!==world||g.pointId!==pointId)return false;const stamp=verify(g.authority,world,pointId);return !!stamp&&stableJSON(stamp)===stableJSON(g.stamp);}
export function revokeCargoBossGrant(token){grants.delete(token);}

export function inspectCargoBossAuthority(authority,world,pointId){return !!verify(authority,world,pointId);}

export function isNativeCargoRequest(id,a){if(id!=='trainer:BLACKNET_HWIGYEONG_FINAL'||!a||typeof a!=='object'||Array.isArray(a))return false;try{const keys=Reflect.ownKeys(a);if(keys.length!==1||keys[0]!=='type')return false;const d=Object.getOwnPropertyDescriptor(a,'type');return !!d&&Object.hasOwn(d,'value')&&d.value==='challenge'}catch{return false}}
