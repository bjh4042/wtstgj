// CANDIDATE ONLY. No storage adapter, legacy format conversion, or production write API.
import {sha256,stableJSON} from '../../compatibility/codec.mjs';
export const NATIVE_LOCATION_VERSION=1;
export const SELECTED_MAP_REVISION='213fd73b237ac2bc16c1660a135ff109abd9fb3b5981d963172f4ae9f6369578';
const directions=['up','down','left','right'],clone=structuredClone;
const validSlot=s=>['SLOT_1','SLOT_2','SLOT_3'].includes(s);
const digestBytes=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
/** These masks already reserve the selected 49x37 actor footprint. Never erode again. */
export async function registerNativeLocations({contract,masks,mapRevision}){
 if(mapRevision!==SELECTED_MAP_REVISION)throw Error('PINNED_MAP_REVISION_REQUIRED');
 if(await digestBytes(new TextEncoder().encode(stableJSON(contract)))!==mapRevision)throw Error('CONTRACT_REVISION_MISMATCH');
 const scenes=new Map();
 for(const [scene,source] of Object.entries(contract.sources)){
  const meta=contract.masks[scene],mask=masks[scene];
  if(!meta||!(mask instanceof Uint8Array)||mask.length!==meta.size[0]*meta.size[1]||await digestBytes(mask)!==meta.sha256)throw Error('MASK_PIN_MISMATCH');
  scenes.set('native:jangmok:'+scene,{scene,mapId:'world:hub:S2',imageSHA:source.sha256,maskSHA:meta.sha256,size:[...meta.size],mask:mask.slice(),footprint:[49,37],semantics:'PRE_ERODED_RESERVED_ACTOR_CENTER_SUPPORT'});
 }
 return Object.freeze({mapRevision,validate(location){
  if(location?.version!==1)return 'UNKNOWN_NATIVE_VERSION';const r=scenes.get(location.sceneId);if(!r)return 'UNKNOWN_NATIVE_SCENE';
  if(location.mapId!==r.mapId)return 'NATIVE_MAP_MISMATCH';if(location.mapRevision!==mapRevision)return 'UNKNOWN_MAP_REVISION';if(location.imageSHA!==r.imageSHA)return 'IMAGE_PIN_MISMATCH';if(location.maskSHA!==r.maskSHA)return 'MASK_PIN_MISMATCH';
  if(!directions.includes(location.facing))return 'INVALID_NATIVE_FACING';const p=location.foot;if(!Array.isArray(p)||p.length!==2||!p.every(Number.isSafeInteger))return 'INVALID_NATIVE_FOOT';
  const[x,y]=p,[w,h]=r.size;if(x<0||y<0||x>=w||y>=h||r.mask[y*w+x]!==1)return 'UNSUPPORTED_RESERVED_FOOTPRINT';return null;
 },describe(sceneId){const r=scenes.get(sceneId);if(!r)throw Error('UNKNOWN_NATIVE_SCENE');return {version:1,sceneId,mapId:r.mapId,mapRevision,imageSHA:r.imageSHA,maskSHA:r.maskSHA,footprint:[...r.footprint],semantics:r.semantics};}});
}
function binding({baseRaw,slot,saveVersion}){if(typeof baseRaw!=='string'||!validSlot(slot)||saveVersion!=='ordinary-v1')throw Error('EXPLICIT_ORDINARY_SNAPSHOT_BINDING_REQUIRED');return {slot,saveVersion,baseSnapshotSHA:sha256(baseRaw)};}
/** Caller must decode/validate the existing ordinary envelope with its unchanged source API. */
function checkedBase(context){const bind=binding(context);if(typeof context.validateBase!=='function')throw Error('BASE_VALIDATOR_REQUIRED');const result=context.validateBase(context.baseRaw,context.slot);if(!result||!result.position||!context.validCanonicalReturn?.(result.position))throw Error('VERIFIED_CANONICAL_RETURN_REQUIRED');return {...bind,position:clone(result.position)};}
export function prepareNativeLocationCandidate(context,{registry,location}){
 const base=checkedBase(context),reason=registry.validate(location);if(reason)throw Error(reason);if(base.position.scene!==location.mapId)throw Error('CANONICAL_NATIVE_MAP_MISMATCH');
 const data={format:'NATIVE_LOCATION_SIDECAR_CANDIDATE',version:1,slot:base.slot,saveVersion:base.saveVersion,baseSnapshotSHA:base.baseSnapshotSHA,canonicalReturn:base.position,location:clone(location)};
 return {baseRaw:context.baseRaw,sidecarRaw:JSON.stringify({data,checksum:sha256(stableJSON(data))}),productionInstallable:false};
}
export function inspectNativeLocationCandidate(context,{registry,sidecarRaw=null}){
 const base=checkedBase(context);if(sidecarRaw===null)return {status:'legacy-unchanged',baseRaw:context.baseRaw,native:null};
 const recovery=reason=>({status:'recovery-required',reason,baseRaw:context.baseRaw,originalSidecarRaw:sidecarRaw,canonicalFallback:clone(base.position),requiresExplicitConfirmation:true,productionInstallable:false});
 let envelope;try{envelope=JSON.parse(sidecarRaw);}catch{return recovery('MALFORMED_SIDECAR');}const d=envelope?.data;
 if(!d||envelope.checksum!==sha256(stableJSON(d)))return recovery('SIDECAR_CHECKSUM_MISMATCH');
 if(d.format!=='NATIVE_LOCATION_SIDECAR_CANDIDATE'||d.version!==1)return recovery('UNKNOWN_SIDECAR_VERSION');
 if(d.slot!==base.slot||d.saveVersion!==base.saveVersion||d.baseSnapshotSHA!==base.baseSnapshotSHA)return recovery('STALE_OR_DIFFERENT_SLOT_SNAPSHOT');
 if(stableJSON(d.canonicalReturn)!==stableJSON(base.position))return recovery('CANONICAL_RETURN_MISMATCH');
 const reason=registry.validate(d.location);if(reason)return recovery(reason);if(d.location.mapId!==base.position.scene)return recovery('CANONICAL_NATIVE_MAP_MISMATCH');
 return {status:'native-candidate-valid',baseRaw:context.baseRaw,native:clone(d.location),canonicalReturn:clone(base.position),productionInstallable:false};
}
/** In-memory staging epoch only; cancellation/reset makes delayed results unusable. */
export function createNativeLocationDrafts(){let epoch=0,selected=null,draft=null;return {begin(context){selected=binding(context);draft=null;return ++epoch;},stage(token,context,candidate){if(token!==epoch||stableJSON(binding(context))!==stableJSON(selected))return {ok:false,reason:'STALE_DRAFT'};if(candidate.baseRaw!==context.baseRaw)return {ok:false,reason:'STALE_SNAPSHOT'};draft=clone(candidate);return {ok:true};},read(){return draft?clone(draft):null;},cancel(){epoch++;draft=null;selected=null;},reset(){epoch++;draft=null;selected=null;}};}
