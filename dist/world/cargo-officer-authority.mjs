import{isCargoOfficerHostReaders}from'../development/cargo-native/officer-host-readers.mjs';
import{cargoOfficerRow}from'../development/cargo-native/officer-registration.mjs';
import{CargoRoomInteractions}from'../development/cargo-native/canonical/room-interactions.mjs';
import{stableJSON,sha256}from'../compatibility/codec.mjs';
const authorities=new WeakMap(),grants=new WeakMap();
export function createCargoOfficerAuthority({readers,getWorld,contract}){if(!isCargoOfficerHostReaders(readers)||typeof getWorld!=='function'||sha256(stableJSON(contract))!=='316425446b5ab2c41094251266c0deab0ef36068a97a9b8fa26e41430caae3e8')throw Error('TRUSTED_OFFICER_READERS_REQUIRED');const a=Object.freeze({});authorities.set(a,{readers,getWorld,contract:structuredClone(contract)});return a}
export const isCargoOfficerAuthority=a=>authorities.has(a);
export function isCargoOfficerRequest(id,a){if(!cargoOfficerRow(id)||!a||typeof a!=='object'||Object.getPrototypeOf(a)!==Object.prototype)return false;try{const k=Reflect.ownKeys(a),d=Object.getOwnPropertyDescriptor(a,'type');return k.length===1&&k[0]==='type'&&d&&d.enumerable&&Object.hasOwn(d,'value')&&d.value==='challenge'}catch{return false}}
function inspect(a,w,id){const o=authorities.get(a),r=cargoOfficerRow(id);if(!o||o.getWorld()!==w||!r||stableJSON(w.definition.points[id])!==stableJSON(r.sourcePoint))return null;const s=w.snapshot(),n=o.readers.readNative(id),signal=o.readers.signal();if(!n||!(signal instanceof AbortSignal)||signal.aborted||s.developmentOnly!==true||s.position.scene!=='world:ship:S9'||s.world.mapId!=='world:ship:S9'||w.story.pendingCommit||!w.story.trainerAvailable(r.trainerId))return null;if(r.trainerId==='BLACKNET_HWIGYEONG_FINAL'){let p;try{p=new CargoRoomInteractions(o.contract,o.readers.readRoomContext())}catch{return null}if(!p.readyForCode()||!p.passwordAccepted||!w.story.gate('CAN_FIGHT_HWIGYEONG'))return null}return{stamp:stableJSON({session:s.sessionId,revision:s.revision,native:n}),signal}}
export function mintCargoOfficerGrant(a,w,id){const v=inspect(a,w,id);if(!v)throw Error('CARGO_OFFICER_AUTHORITY_REJECTED');const g=Object.freeze({});grants.set(g,{a,w,id,...v});return g}
export function assertCargoOfficerGrant(g,w){const v=grants.get(g),now=v&&inspect(v.a,w,v.id);if(!v||v.w!==w||!now||now.stamp!==v.stamp||now.signal!==v.signal)throw Error('CARGO_OFFICER_CONTEXT_CHANGED')}
export function cargoOfficerGrantSignal(g,w){assertCargoOfficerGrant(g,w);return grants.get(g).signal}
export const revokeCargoOfficerGrant=g=>grants.delete(g);
