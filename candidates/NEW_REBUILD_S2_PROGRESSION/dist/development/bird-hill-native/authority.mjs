import {BIRD as r} from './registration.mjs';
import {dataRecord,footPair,inBirdContact} from './support.mjs';
import {matchesSourceRow} from './source-row-variants.mjs';
const owners=new WeakMap,grants=new WeakMap;
const find=id=>r.points.find(p=>p.pointId===id);
export function isBirdRequest(id,request){const p=find(id),v=dataRecord(request,['type']);return !!p&&v?.type===p.kind}
export function createBirdAuthority({getWorld,readNative,getSignal}={}){if([getWorld,readNative,getSignal].some(f=>typeof f!=='function'))throw Error('BIRD_LIVE_OWNER_REQUIRED');const token=Object.freeze({});owners.set(token,{getWorld,readNative,getSignal});return token}
export const isBirdAuthority=a=>owners.has(a);
function canonical(w,p){const s=w.snapshot();return s.position.scene===r.mapId&&s.world.mapId===r.mapId&&matchesSourceRow(w.adapter,p.pointId,w.definition.points[p.pointId])}
function read(o,p){const n=dataRecord(o.readNative(),['version','sceneId','mapId','revision','imageSHA','maskSHA','foot','facing','state','phase','sessionEpoch','gameplayRevision']);if(!n||n.version!==1||n.sceneId!==r.sceneId||n.mapId!==r.mapId||n.revision!==r.revision||n.imageSHA!==r.image.sha256||n.maskSHA!==r.support.sha256||n.state!==0||n.phase!=='field'||n.gameplayRevision!==r.gameplayRevision||!Number.isSafeInteger(n.sessionEpoch)||n.sessionEpoch<1||!footPair(n.foot)||!inBirdContact(p,n.foot,n.facing))return null;return{epoch:n.sessionEpoch,foot:[...n.foot],facing:n.facing}}
export function mintBirdGrant(a,w,id){const o=owners.get(a),p=find(id);if(!o||o.getWorld()!==w||!p||!canonical(w,p))throw Error('BIRD_UNAVAILABLE');const n=read(o,p),signal=o.getSignal();if(!n)throw Error('BIRD_APPROACH_REQUIRED');if(!(signal instanceof AbortSignal)||signal.aborted)throw Error('BIRD_LIFECYCLE_REQUIRED');const grant=Object.freeze({});grants.set(grant,{a,w,p,n,signal});return grant}
export function validateBirdGrant(grant,w,id){try{const q=grants.get(grant),o=q&&owners.get(q.a);if(!q||q.w!==w||!o||o.getWorld()!==w||q.signal.aborted||o.getSignal()!==q.signal||id!==undefined&&id!==q.p.pointId||!canonical(w,q.p))return false;const n=read(o,q.p);return !!n&&JSON.stringify(n)===JSON.stringify(q.n)}catch{return false}}
export function assertBirdGrant(g,w){if(!validateBirdGrant(g,w))throw Error('BIRD_OWNER_DRIFT')}
export const revokeBirdGrant=g=>grants.delete(g);
export function signalBirdGrant(g,w){assertBirdGrant(g,w);return grants.get(g).signal}
