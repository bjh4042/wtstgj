import{HARIN as HUB}from'./harin-registration.mjs';
import{createS5ExitReadiness}from'./exit-readiness.mjs';
const townState=(s,c,d)=>createS5ExitReadiness(d)(s,c)?'OPEN':'CLOSED';
const inHubRegion=(f,s)=>HUB.states[s]?.rows.some(([y,a,b])=>f[1]===y&&f[0]>=a&&f[0]<b)===true;
const authorities=new WeakMap(),grants=new WeakMap();
const fields=['sceneId','mapId','revision','state','imageSHA','maskSHA','pinsVerified','phase','foot','facing','sessionEpoch','artSHA'];
function record(x,keys){if(!x||Object.getPrototypeOf(x)!==Object.prototype||Reflect.ownKeys(x).length!==keys.length)return null;const out={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(x,k);if(!d||!d.enumerable||!Object.hasOwn(d,'value'))return null;out[k]=d.value}return out}
function exact(a,b){if(b===null||typeof b!=='object')return a===b;if(!a||typeof a!=='object'||Array.isArray(a)!==Array.isArray(b)||Reflect.ownKeys(a).length!==Reflect.ownKeys(b).length)return false;return Reflect.ownKeys(b).every(k=>{const d=Object.getOwnPropertyDescriptor(a,k);return d&&Object.hasOwn(d,'value')&&exact(d.value,b[k])})}
export function createHarinAuthority({readNative,getWorld,signal}={}){if(typeof readNative!=='function'||typeof getWorld!=='function'||!(signal instanceof AbortSignal))throw Error('HARIN_NATIVE_READER_REQUIRED');const a=Object.freeze({});authorities.set(a,{readNative,getWorld,signal});return a}
export const isHarinAuthority=a=>authorities.has(a);
export const isHarinRequest=(id,a)=>id===HUB.pointId&&record(a,['type'])?.type==='challenge';
function read(a,w,id){const binding=authorities.get(a),fn=binding?.readNative;if(!fn||binding.signal.aborted||binding.getWorld()!==w||id!==HUB.pointId||!exact(w.definition.points[id],HUB.sourceRow))return null;const s=w.snapshot();if(s.position.scene!==HUB.mapId||s.world.mapId!==HUB.mapId)return null;const n=record(fn(),fields),state=townState(s,w.story.contract,w.definition),pin=HUB.states[state];if(!n||n.sceneId!==HUB.sceneId||n.mapId!==HUB.mapId||n.revision!==HUB.revision||n.state!==state||n.imageSHA!==pin.imageSHA||n.maskSHA!==pin.maskSHA||n.pinsVerified!==true||n.phase!=='field'||n.facing!=='right'||n.artSHA!==HUB.artSHA||!Number.isSafeInteger(n.sessionEpoch)||n.sessionEpoch<0)return null;if(!Array.isArray(n.foot)||Reflect.ownKeys(n.foot).length!==3||n.foot.length!==2||![0,1].every(i=>{const d=Object.getOwnPropertyDescriptor(n.foot,String(i));return d&&d.enumerable&&Object.hasOwn(d,'value')&&Number.isInteger(d.value)}))return null;if(!inHubRegion(n.foot,state))return null;return n.sessionEpoch}
export function mintHarinGrant(a,w,id){const epoch=read(a,w,id);if(epoch===null)throw Error('HARIN_NATIVE_AUTHORITY_REJECTED');const g=Object.freeze({});grants.set(g,{a,w,id,epoch});return g}
export function validateHarinGrant(g,w,s,id){const p=grants.get(g);return!!p&&p.w===w&&p.id===id&&s.position.scene===HUB.mapId&&s.world.mapId===HUB.mapId&&read(p.a,w,id)===p.epoch}
export const revokeHarinGrant=g=>grants.delete(g);

export function assertHarinGrant(g,w){const p=grants.get(g);if(!p||!validateHarinGrant(g,w,w.snapshot(),HUB.pointId))throw Error('HARIN_NATIVE_AUTHORITY_DRIFT')}

export function harinGrantSignal(g,w){assertHarinGrant(g,w);return authorities.get(grants.get(g).a).signal}
