import {extendLocationRegistryWithShop} from '../shop-interior/location-registry.mjs';
import {createS4CenterLocationRegistry} from '../center-interior/location-registry.mjs';
import {createHouseGym4LocationRegistry} from '../gohyeon-pair/house-location.mjs';
import{createGym4LocationRegistry}from'../gohyeon-gym4/registered-locations.mjs';
import{createS4RecoveryLocationRegistry}from'../gohyeon-gameplay/recovery/registered-recovery-locations.mjs';
import {createS4FixedLocationRegistry} from '../gohyeon-pair/registered-locations.mjs';
// Candidate only: same ordinary envelope transaction, never a separate storage key.
import {sha256,stableJSON} from '../../compatibility/codec.mjs';
import {registerNativeLocations} from './native-location.mjs';
import {createPostSummitLocationRegistry} from '../paired/registered-locations.mjs';
const codecs=new WeakSet();
const fail=code=>{const e=Error(code);e.code=code;throw e};
export async function createNativeEnvelopeCodec({contract,masks,mapRevision}){return wrapRegistry(await registerNativeLocations({contract,masks,mapRevision}))}
export async function createPostSummitEnvelopeCodec({postMask,summitMask}){return wrapRegistry(await createPostSummitLocationRegistry({postMask,summitMask}))}
function wrapRegistry(registry,normalizeWrite=null,validateRuntime=null){
 const codec=Object.freeze({
  prepare(location,runtime,slot){if(normalizeWrite)location=normalizeWrite(location);const reason=registry.validate(location)||validateRuntime?.(location,runtime);if(reason)fail('NATIVE_LOCATION_RECOVERY_REQUIRED');if(runtime?.position?.scene!==location.mapId)fail('NATIVE_MAP_MISMATCH');return {version:1,slot,runtimeSHA:sha256(stableJSON(runtime)),canonicalReturn:structuredClone(runtime.position),location:structuredClone(location)}},
  validate(extension,runtime,slot){if(extension?.version!==1||extension.slot!==slot||extension.runtimeSHA!==sha256(stableJSON(runtime))||stableJSON(extension.canonicalReturn)!==stableJSON(runtime?.position))fail('NATIVE_LOCATION_RECOVERY_REQUIRED');const reason=registry.validate(extension.location)||validateRuntime?.(extension.location,runtime);if(reason||runtime.position.scene!==extension.location.mapId)fail('NATIVE_LOCATION_RECOVERY_REQUIRED');return structuredClone(extension.location)}
 });codecs.add(codec);return codec;
}
export function isNativeEnvelopeCodec(codec){return codecs.has(codec)}
export function validateNativeEnvelope(data,slot,codec){
 if(data.compatibilityVersion===1){if(Object.hasOwn(data,'nativeExtension'))fail('NATIVE_EXTENSION_VERSION_MISMATCH');return;}
 if(data.compatibilityVersion!==2||!Object.hasOwn(data,'nativeExtension'))fail('NATIVE_EXTENSION_VERSION_MISMATCH');
 if(!codecs.has(codec))fail('NATIVE_LOCATION_NOT_AVAILABLE');
 if(data.contentNamespace!=='canonical-v1'||!data.runtime?.world)fail('NATIVE_CANONICAL_WORLD_REQUIRED');
 codec.validate(data.nativeExtension,data.runtime,slot);
}

// Private fixed S4 map registry, not a caller-supplied arbitrary registry.
export async function createS4FixedEnvelopeCodec(masks){return wrapRegistry(await createS4FixedLocationRegistry(masks))}

// Separate fixed recovery-capable factory. Existing POST and S4-only factories unchanged.
export async function createS4RecoveryEnvelopeCodec(masks){const registry=await createS4RecoveryLocationRegistry(masks);return wrapRegistry(registry,registry.normalizePrevious)}

// Private fixed Gym4 extension; old factories retain their original validation policy.
export async function createS4Gym4EnvelopeCodec(masks,contract){const registry=await createGym4LocationRegistry(masks,contract);return wrapRegistry(registry,registry.normalizePrevious,registry.validateRuntime)}

export async function createS4HouseGym4EnvelopeCodec(masks,contract){const registry=await createHouseGym4LocationRegistry(masks,contract);return wrapRegistry(registry,registry.normalizePrevious,registry.validateRuntime)}

// Fixed center R4 only; legacy house factory remains unchanged.
export async function createS4CenterEnvelopeCodec(masks,contract){const registry=await createS4CenterLocationRegistry(masks,contract);return wrapRegistry(registry,registry.normalizePrevious,registry.validateRuntime)}

export async function createS4ServiceEnvelopeCodec(masks,contract){const registry=await extendLocationRegistryWithShop(await createS4CenterLocationRegistry(masks,contract),masks.shopSafe);return wrapRegistry(registry,registry.normalizePrevious,registry.validateRuntime)}
