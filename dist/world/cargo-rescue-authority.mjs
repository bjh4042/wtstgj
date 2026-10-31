import{isCargoRescueHostReaders,RESCUE_IDS}from'../development/cargo-native/rescue-host-readers.mjs';
import{stableJSON}from'../compatibility/codec.mjs';
const authorities=new WeakMap(),grants=new WeakMap();
export function createCargoRescueAuthority({readers,getWorld}){if(!isCargoRescueHostReaders(readers)||typeof getWorld!=='function')throw Error('TRUSTED_RESCUE_READERS_REQUIRED');const a=Object.freeze({});authorities.set(a,{readers,getWorld});return a}
export const isCargoRescueAuthority=a=>authorities.has(a);
export function cargoOriginalBossCommitted(world){const p=world?.snapshot()?.progress;return p?.flags?.S9_BLACKNET_BOSS_DEFEATED===true&&p.completedEvents.includes('BLACKNET_HWIGYEONG_FINAL')&&p.defeatedTrainers.includes('BLACKNET_HWIGYEONG_FINAL')&&world.story.pendingCommit===false}
export function isNativeCargoRescueRequest(id,a){if(!RESCUE_IDS.includes(id)||!a||typeof a!=='object'||Array.isArray(a))return false;try{const keys=Reflect.ownKeys(a),d=Object.getOwnPropertyDescriptor(a,'type');return keys.length===1&&keys[0]==='type'&&d&&Object.hasOwn(d,'value')&&d.value==='interact'}catch{return false}}
function inspect(authority,world,id){const a=authorities.get(authority);if(!a||a.getWorld()!==world||!RESCUE_IDS.includes(id)||!cargoOriginalBossCommitted(world))return null;const s=world.snapshot(),p=world.definition.points[id],n=a.readers.readNative(id);if(!n||s.developmentOnly!==true||s.world?.mapId!=='world:ship:S9'||s.position.scene!=='world:ship:S9'||p?.mapId!=='world:ship:S9'||p.kind!=='event'||p.eventId!==id.slice(6)||(!world.story.eventAvailable(p.eventId)&&!world.story.eventCompleted(p.eventId)))return null;return stableJSON({sessionId:s.sessionId,revision:s.revision,native:n})}
export function mintCargoRescueGrant(a,w,id){const stamp=inspect(a,w,id);if(!stamp)throw Error('CARGO_RESCUE_AUTHORITY_REJECTED');const g=Object.freeze({});grants.set(g,{a,w,id,stamp});return g}
export function assertCargoRescueGrant(g,w){const o=grants.get(g);if(!o||o.w!==w||inspect(o.a,w,o.id)!==o.stamp)throw Error('CARGO_RESCUE_STALE_OR_CHANGED_CONTEXT')}
export function revokeCargoRescueGrant(g){grants.delete(g)}
