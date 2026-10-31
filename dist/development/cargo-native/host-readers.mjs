import {verifyEightSceneMaterial} from '../../world/cargo-eight-scene-geometry.mjs';
// Trusted host construction only. The caller owns the existing single consumer
// and byte-verified loadProvenScene materials; never pass DOM/user DTO getters.
import {CARGO_BOSS_REGISTRATION as R} from '../../world/cargo-native-authority.mjs';
export function createCargoHostReaders({getConsumer,getMaterial,contract,registry}){
 function readRoomContext(){const c=getConsumer();if(!c)return null;const s=c.snapshot(),n=s.native;return {state:c.roomSnapshot(),locked:s.active!==true||s.hidden===true||s.fixturePending===true||s.uiMode!==null||n.active!==true||!!n.pending||n.clock.paused!==false};}
 function readNative(){const c=getConsumer();if(!c)return null;const s=c.snapshot(),n=s.native,m=getMaterial(n.sceneId),spec=registry.scenes[n.sceneId];
 if(!m||!spec||m.sceneId!==spec.sceneId||m.artSHA256!==spec.art.sha256||(spec.geometry?!verifyEightSceneMaterial(spec,m):m.footMaskSHA256!==spec.footCenters.sha256)||m.width!==spec.width||m.height!==spec.height)return null;
 const blocked=contract.rooms.some(r=>{const[x,y,w,h]=r.door.safetyFootCenterForbidden;return r.mapId===n.sceneId&&s.doors[r.roomId]?.progress!==1&&n.foot[0]>=x&&n.foot[0]<=x+w&&n.foot[1]>=y&&n.foot[1]<=y+h;});
 return {version:R.version,...(spec.geometry?{geometryState:m.geometryState,geometryManifestSHA:m.geometryManifestSHA}:{}),revision:spec.geometry?m.geometryRevision:registry.revision,sceneId:n.sceneId,mapId:n.mapId,imageSHA:m.artSHA256,maskSHA:m.footMaskSHA256,foot:[...n.foot],phase:readRoomContext()?.locked===false?'field':'locked',dynamicCollisionClear:!blocked&&m.isSafeFoot(n.foot)===true};
 }
 return Object.freeze({readNative,readRoomContext});
}
