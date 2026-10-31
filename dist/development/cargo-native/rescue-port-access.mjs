import {CanonicalWorld} from '../../world/service.mjs';
import {cargoOriginalBossCommitted} from '../../world/cargo-rescue-authority.mjs';
import {verifyEightSceneRegistry,verifyEightSceneMaterial} from '../../world/cargo-eight-scene-geometry.mjs';
import {stableJSON} from '../../compatibility/codec.mjs';
const owners=new WeakMap(),tickets=new WeakMap();
const IDS=new Set(['NEW_BR_EAST_OPEN','NEW_R_WEST_OPEN']);
export const isRescuePort=d=>IDS.has(d?.id);
export function createRescuePortAccess({getWorld,getConsumerWorld,registry}){
 if(typeof getWorld!=='function'||typeof getConsumerWorld!=='function'||!verifyEightSceneRegistry(registry))throw Error('RESCUE_PORT_REGISTRATION');
 const a=Object.freeze({});owners.set(a,{getWorld,getConsumerWorld,registry:structuredClone(registry)});return a;
}
export const isRescuePortAccess=a=>owners.has(a);
function current(a){const o=owners.get(a),w=o?.getWorld();if(!(w instanceof CanonicalWorld)||o.getConsumerWorld()!==w||w.busy||w.inputLocked||w.map.id!=='world:ship:S9'||!cargoOriginalBossCommitted(w))return null;const s=w.snapshot();return s.developmentOnly===true?{w,sessionId:s.sessionId,revision:s.revision}:null}
function direction(a,d){const o=owners.get(a);return!!o&&isRescuePort(d)&&stableJSON(o.registry.directions.find(x=>x.id===d.id))===stableJSON(d)}
export function containsRescuePort(a,d,p){if(!direction(a,d)||!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger))return false;const[x,y]=p;return d.id==='NEW_BR_EAST_OPEN'?x>=1360&&x<=1391&&y>=470&&y<=530:x>=132&&x<=165&&y>=362&&y<=419}
export function allowsRescuePort(a,d,p,m){const o=owners.get(a);return containsRescuePort(a,d,p)&&verifyEightSceneMaterial(o.registry.scenes[d.sourceSceneId],m)&&m.isSafeFoot(p)}
export function captureRescuePort(a,d){const s=current(a);if(!s||!direction(a,d))throw Error('RESCUE_POSTBOSS_COMMIT_REQUIRED');const t=Object.freeze({});tickets.set(t,{a,d:structuredClone(d),...s});return t}
export function assertRescuePort(t){const o=tickets.get(t),s=o&&current(o.a);if(!s||s.w!==o.w||s.sessionId!==o.sessionId||s.revision!==o.revision||!direction(o.a,o.d))throw Error('RESCUE_PORT_STALE_WORLD');return true}
export function releaseRescuePort(t){tickets.delete(t)}
