import{sha256,stableJSON}from'../../compatibility/codec.mjs';
import{isNativeEnvelopeCodec as isCargoCodec,record,dense,fail}from'../cargo-memory/native-envelope.mjs';
import{HUB_REGISTRATION as H,isS9HubSupport,hubSupports}from'./hub-support.mjs';
import{cargoS9ViewportSupports}from'./viewport-support.mjs';
export const PAIRED_REVISION='NEW_S9_HUB_CARGO_ATOMIC_PAIR_R1';const registered=new WeakSet();const same=(a,b)=>stableJSON(a)===stableJSON(b);
export function createS9PairedCodec({cargoCodec,hubSupport}){if(!isCargoCodec(cargoCodec)||typeof cargoCodec.validateRetainedPair!=='function'||!isS9HubSupport(hubSupport))fail('S9_PRIVATE_CODEC_REQUIRED');
 function validate(p,runtime){if(!record(p,['version','ownerRevision','active','location','cargoCheckpoint'])||p.version!==1||p.ownerRevision!==PAIRED_REVISION||!['hub','cargo'].includes(p.active)||runtime?.developmentOnly!==true)fail('S9_PAIR_REVISION');if(!isS9HubSupport(hubSupport))fail('S9_SUPPORT_DISPOSED');const map=p.active==='hub'?H.mapId:'world:ship:S9';if(runtime?.position?.scene!==map||runtime?.world?.mapId!==map)fail('S9_ACTIVE_MAP_MISMATCH');
 if(p.active==='hub'){if(!record(p.location,['sceneId','mapId','revision','imageSHA','maskSHA','foot','facing'])||!['sceneId','mapId','revision','imageSHA','maskSHA'].every(k=>p.location[k]===H[k])||!dense(p.location.foot,Number.isSafeInteger,2)||!['up','down','left','right'].includes(p.location.facing)||!hubSupports(hubSupport,p.location.foot))fail('S9_HUB_POSE_HOLD');cargoCodec.validateRetainedPair(p.cargoCheckpoint,runtime);}else{cargoCodec.validatePair(p.cargoCheckpoint,runtime);if(!same(p.location,p.cargoCheckpoint.location))fail('S9_ACTIVE_CARGO_POSE');}
 // Same rule on retained state: old clipped gangway saves do not silently relocate.
 if(!cargoS9ViewportSupports(p.cargoCheckpoint.location.sceneId,p.cargoCheckpoint.location.foot))fail('S9_VIEWPORT_OLD_POSE_HOLD');return structuredClone(p);
 }
 const codec=Object.freeze({validatePair:validate,prepare(p,runtime,slot){return{version:2,slot,runtimeSHA:sha256(stableJSON(runtime)),canonicalReturn:structuredClone(runtime.position),checkpoint:validate(p,runtime)}},validate(e,runtime,slot){if(!record(e,['version','slot','runtimeSHA','canonicalReturn','checkpoint'])||e.version!==2||e.slot!==slot||e.runtimeSHA!==sha256(stableJSON(runtime))||!same(e.canonicalReturn,runtime.position))fail('S9_ATOMIC_PAIR_MISMATCH');return validate(e.checkpoint,runtime)}});registered.add(codec);return codec;
}
export const isNativeEnvelopeCodec=c=>registered.has(c);
export function validateNativeEnvelope(data,slot,codec){if(data.compatibilityVersion===1){if(Object.hasOwn(data,'nativeExtension'))fail('NATIVE_EXTENSION_VERSION_MISMATCH');return}if(data.compatibilityVersion!==2||!registered.has(codec)||data.contentNamespace!=='canonical-v1'||!data.runtime?.world)fail('NATIVE_LOCATION_NOT_AVAILABLE');codec.validate(data.nativeExtension,data.runtime,slot)}
