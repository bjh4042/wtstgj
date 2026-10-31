import{isCargoZoneHostReaders}from'../development/cargo-native/zone-host-readers.mjs';
import{cargoZoneRow}from'../development/cargo-native/zone-registration.mjs';
import{stableJSON}from'../compatibility/codec.mjs';
const authorities=new WeakMap(),grants=new WeakMap();
export function createCargoZoneAuthority({readers,getWorld}){if(!isCargoZoneHostReaders(readers)||typeof getWorld!=='function')throw Error('TRUSTED_ZONE_READERS_REQUIRED');const a=Object.freeze({});authorities.set(a,{readers,getWorld});return a}
export const isCargoZoneAuthority=a=>authorities.has(a);
export function isCargoZoneRequest(id,a){if(!cargoZoneRow(id)||!a||typeof a!=='object'||Object.getPrototypeOf(a)!==Object.prototype)return false;try{const k=Reflect.ownKeys(a),d=Object.getOwnPropertyDescriptor(a,'type');return k.length===1&&k[0]==='type'&&d&&d.enumerable&&Object.hasOwn(d,'value')&&d.value==='interact'}catch{return false}}
function inspect(a,w,id){const o=authorities.get(a),r=cargoZoneRow(id);if(!o||o.getWorld()!==w||!r||stableJSON(w.definition.points[id])!==stableJSON(r.sourcePoint))return null;const s=w.snapshot(),n=o.readers.readNative(id);if(!n||s.developmentOnly!==true||s.position.scene!=='world:ship:S9'||s.world.mapId!=='world:ship:S9'||w.story.pendingCommit||(!w.story.eventAvailable(r.eventId)&&!w.story.eventCompleted(r.eventId)))return null;return stableJSON({session:s.sessionId,revision:s.revision,native:n})}
export function mintCargoZoneGrant(a,w,id){const stamp=inspect(a,w,id);if(!stamp)throw Error('CARGO_ZONE_AUTHORITY_REJECTED');const g=Object.freeze({});grants.set(g,{a,w,id,stamp});return g}
export function assertCargoZoneGrant(g,w){const v=grants.get(g);if(!v||v.w!==w||inspect(v.a,w,v.id)!==v.stamp)throw Error('CARGO_ZONE_CONTEXT_CHANGED')}
export const revokeCargoZoneGrant=g=>grants.delete(g);
