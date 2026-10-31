import {verifyEightSceneMaterial} from '../../world/cargo-eight-scene-geometry.mjs';
import {isCargoChestPhysics,chestPhysicsAllowsFoot} from './cargo-chest-physics.mjs';
const readersBrand=new WeakSet();
export const isCargoChestHostReaders=readers=>readersBrand.has(readers);
// Construct only inside the same pinned main host. No DOM/user getter is accepted by the host API.
// Read real consumer/material every time; do not cache foot, door state or canonical snapshot.
export function createCargoChestHostReaders({getConsumer,getMaterial,getWorld,getConsumerWorld,getSessionEpoch,contract,registry,physics}){
 if(![getConsumer,getMaterial,getWorld,getConsumerWorld,getSessionEpoch].every(f=>typeof f==='function')||!isCargoChestPhysics(physics))throw Error('TRUSTED_CHEST_OWNER_REQUIRED');
 function readNative(){const world=getWorld(),c=getConsumer();if(!world||!c||world!==getConsumerWorld()||world.map?.id!=='world:ship:S9')return null;const s=c.snapshot(),n=s.native,m=getMaterial(n.sceneId),spec=registry.scenes[n.sceneId],epoch=getSessionEpoch();
 if(!Number.isSafeInteger(epoch)||epoch<0||!m||!spec||!verifyEightSceneMaterial(spec,m)||n.mapId!=='world:ship:S9'||m.isSafeFoot(n.foot)!==true||!chestPhysicsAllowsFoot(physics,spec,m,n.foot))return null;
 const dynamicBlocked=contract.rooms.some(r=>{const[x,y,w,h]=r.door.safetyFootCenterForbidden;return r.mapId===n.sceneId&&s.doors[r.roomId]?.progress!==1&&n.foot[0]>=x&&n.foot[0]<=x+w&&n.foot[1]>=y&&n.foot[1]<=y+h});
 if(dynamicBlocked||s.active!==true||s.hidden===true||s.fixturePending===true||s.uiMode!==null||n.active!==true||n.pending||n.clock.paused!==false||s.boss?.pending===true)return null;
 return {version:1,sceneId:n.sceneId,mapId:n.mapId,revision:physics.revision,imageSHA:m.artSHA256,maskSHA:m.footMaskSHA256,foot:[...n.foot],facing:n.facing,phase:'field',sessionEpoch:epoch};
 }
 const readers=Object.freeze({readNative});readersBrand.add(readers);return readers;
}
