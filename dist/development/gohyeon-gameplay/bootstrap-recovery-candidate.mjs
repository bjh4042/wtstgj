import{createS4GameplayAssetReader}from'./load-assets.mjs';
import{verifyS4RecoverySelection}from'./recovery/selection-pin.mjs';
import{loadS4EncounterGeometry}from'./encounter/geometry.mjs';
import{createS4EncounterAuthority}from'./encounter/movement-proof.mjs';
const assetModuleURL=import.meta.url;
import {loadSelectedTargetDepth} from '../gohyeon-pair/selected_depth/load-depth.mjs';
import {loadSelectedPlayerFrames} from '../gohyeon-pair/player_frames/load-player-frames.mjs';
// Standalone preparation seam; caller explicitly selects this DEV memory mode. No DOM/RAF/user storage.
import {CanonicalWorld} from '../../world/service.mjs';
import {SpeciesCatalogService} from '../../species-catalog-service.mjs';
import {createGohyeonHealBinding} from '../../world/gohyeon-heal-binding.mjs';
import {createGohyeonPurchaseBinding} from '../../world/gohyeon-purchase-binding.mjs';
import {loadGohyeonInputs} from '../gohyeon-native/native_candidate/load.mjs';
import {loadS4TargetInputs} from '../gohyeon-pair/load-targets.mjs';
import {createS4RecoveryLocationRegistry as createS4FixedLocationRegistry} from './recovery/registered-recovery-locations.mjs';
import {createS4RecoveryEnvelopeCodec as createS4FixedEnvelopeCodec} from '../native-save/native-envelope.mjs';
import {createNativeSelectedWarpAuthority} from '../gohyeon-pair/native-selected-warp-authority.mjs';
import {createS4FixedTransitionOwner,createTransitionMemoryStorage,inspectTransitionMemorySave} from '../gohyeon-pair/transition-owner-candidate.mjs';
import {createSelectedGameplayScenePreparer as createS4FixedScenePreparer} from './prepare-recovery-scenes.mjs';
import{loadSelectedS4NPCs}from'./npc-layer.mjs';
import{loadSelectedGameplayGeometry}from'./selected-geometry.mjs';
import{createS4GameplayAuthority}from'./native-gameplay-authority.mjs';
export async function preloadS4FixedPair({adapter,initialRuntime=null,initialHubState,storage=null,restore=false,slot='SLOT_1',fetcher=fetch,decode,scratchFactory,onStateChanged=()=>{},hooks={},encounterEnvironment=null,encounterDiagnostic=null,signal=null,gameplayReadBytes}){
 const capturedInitialRuntime=initialRuntime===null?null:structuredClone(initialRuntime);const checkAbort=()=>{if(signal?.aborted){const e=Error('S4_PREPARATION_ABORTED');e.name='AbortError';throw e}};const baseFetcher=fetcher;fetcher=async(...args)=>{checkAbort();const response=await baseFetcher(args[0],{...(args[1]??{}),signal});checkAbort();return response};checkAbort();
 if(!adapter||typeof scratchFactory!=='function')throw Error('FIXED_PAIR_PREPARE_REQUIRED');let playerFrames,hubInputs,targetInputs,owner,initialScene,healBinding,shopBinding,npcs;
 try{gameplayReadBytes??=createS4GameplayAssetReader({fetcher,signal});checkAbort();const selectedRecovery=await fetcher(new URL('./recovery/ROOT_SELECTION.json',assetModuleURL));if(!selectedRecovery.ok)throw Error('RECOVERY_SELECTION_MISSING');await verifyS4RecoverySelection(new Uint8Array(await selectedRecovery.arrayBuffer()));hubInputs=await loadGohyeonInputs({fetcher,...(decode?{decode}:{})});checkAbort();targetInputs=await loadS4TargetInputs({fetcher,...(decode?{decode}:{})});checkAbort();playerFrames=await loadSelectedPlayerFrames({fetcher,...(decode?{decode}:{})});checkAbort();const depthInputs=await loadSelectedTargetDepth({fetcher});checkAbort();const prologueResponse=await fetcher(new URL('../prologue-native/assets/main-junction-r3.safe.u8',assetModuleURL));if(!prologueResponse.ok)throw Error('PROLOGUE_MASK_MISSING');const prologueMask=new Uint8Array(await prologueResponse.arrayBuffer()).slice();const previousResponse=await fetcher(new URL('../prologue-native/assets/main.safe.u8',assetModuleURL));if(!previousResponse.ok)throw Error('PREVIOUS_PROLOGUE_MASK_MISSING');const prologuePreviousMask=new Uint8Array(await previousResponse.arrayBuffer()).slice();const masks={prologueMask,prologuePreviousMask,hubOpenMask:targetInputs.hubMasks.OPEN,hubClosedMask:targetInputs.hubMasks.CLOSED,parkMask:targetInputs.park.mask,greenbeltMask:targetInputs.green.mask},registry=await createS4FixedLocationRegistry(masks),codec=await createS4FixedEnvelopeCodec(masks),catalog=new SpeciesCatalogService({namespace:'canonical',adapter}),memory=storage??createTransitionMemoryStorage();
 let location,restoreRaw=null,runtime=capturedInitialRuntime;if(restore){const saved=inspectTransitionMemorySave({storage:memory,codec,catalog,slot});location=registry.normalizePrevious(saved.location);runtime=saved.runtime;restoreRaw=saved.raw}else{if(!['OPEN','CLOSED'].includes(initialHubState)||runtime?.position?.scene!=='world:hub:S4')throw Error('EXPLICIT_S4_CURRENT_RUNTIME_AND_VISUAL_STATE_REQUIRED');location={...registry.describe('world:hub:S4',initialHubState),foot:[...hubInputs.contract.exteriorDoor.arrival],facing:'up'}}
 const encounterGeometry=await loadS4EncounterGeometry({readBytes:gameplayReadBytes});const geometry=await loadSelectedGameplayGeometry({readBytes:gameplayReadBytes,signal});npcs=await loadSelectedS4NPCs({readBytes:gameplayReadBytes,decode:decode??(b=>createImageBitmap(new Blob([b]))),signal});checkAbort();
 const prepareScene=createS4FixedScenePreparer({hubInputs,targetInputs,registry,scratchFactory,playerActors:playerFrames.actors,foregroundLayers:depthInputs.layers,npcs,geometry,encounterGeometry,fetcher,decode,signal,getWorld:()=>owner?.getWorld()});initialScene=await prepareScene(location);checkAbort();
 const getWorld=()=>owner?.getWorld(),getScene=()=>owner?.getScene()?.mapId==='world:hub:S4'?owner.getScene().scene:null;
 healBinding=createGohyeonHealBinding({getWorld,getScene,onStateChanged});shopBinding=createGohyeonPurchaseBinding({getWorld,getScene,onStateChanged});const nativeSelectedWarpAuthority=createNativeSelectedWarpAuthority({getWorld,readNative:()=>owner?.getScene()?.readNative()});
 const nativeS4EncounterAuthority=createS4EncounterAuthority({getWorld,getScene:()=>owner?.getScene()});const nativeS4GameplayAuthority=createS4GameplayAuthority({getWorld,readNative:()=>owner?.getScene()?.readGameplayNative?.(),getSignal:()=>owner?.getScene()?.getGameplaySignal?.()});
 let disposed=false,bound=false;
 const dispose=()=>{if(disposed)return;disposed=true;signal?.removeEventListener('abort',dispose);healBinding.dispose();shopBinding.dispose();if(owner)owner.dispose();else initialScene.dispose();hubInputs.dispose();targetInputs.dispose();playerFrames.dispose();npcs.dispose()};
 function bindWorld(options){checkAbort();if(disposed||bound)throw Error('S4_WORLD_BIND_ONCE_REQUIRED');if(options?.adapter!==adapter||JSON.stringify(options.runtime)!==JSON.stringify(runtime)||options.battleDriver!=null)throw Error('EXACT_MAIN_WORLD_OPTIONS_REQUIRED');bound=true;
  try{owner=createS4FixedTransitionOwner({worldFactory:({persist,runtime:restored})=>new CanonicalWorld({...options,runtime:restored??options.runtime,persist,nativeS4EncounterAuthority,nativeS4GameplayAuthority,nativeSelectedWarpAuthority,nativeSelectedHealAuthority:healBinding.authority,nativeSelectedPurchaseAuthority:shopBinding.authority}),initialScene,prepareScene,invokeWarp:(w,id)=>w.interactNativeSelectedWarp(id,{type:'warp'}),registry,storage:memory,codec,catalog,slot,featureGate:'NATIVE_MEMORY_TRANSITION_ONLY',restoreRaw});checkAbort();return owner.getWorld()}catch(e){dispose();throw e}
 }
 signal?.addEventListener('abort',dispose,{once:true});checkAbort();return{get owner(){return owner??null},storage:memory,registry,codec,catalog,selectedServices:{healBinding,shopBinding},getWorld,getServiceScene:getScene,runtimeForMain:()=>{if(disposed)throw Error('S4_PREPARATION_DISPOSED');return structuredClone(runtime)},bindWorld,dispose};
 }catch(e){healBinding?.dispose();shopBinding?.dispose();if(owner)owner.dispose();else initialScene?.dispose();hubInputs?.dispose();targetInputs?.dispose();playerFrames?.dispose();npcs?.dispose();throw e}
}

// Convenience wrapper for isolated tests; main entry must preload then bind inside its synchronous world factory.
export async function prepareS4FixedPair(options){const prepared=await preloadS4FixedPair(options);try{prepared.bindWorld({adapter:options.adapter,runtime:prepared.runtimeForMain(),hooks:options.hooks??{},encounterEnvironment:options.encounterEnvironment??null,encounterDiagnostic:options.encounterDiagnostic??null});return prepared}catch(e){prepared.dispose();throw e}}
