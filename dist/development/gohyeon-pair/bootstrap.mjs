import {loadSelectedTargetDepth} from './selected_depth/load-depth.mjs';
import {loadSelectedPlayerFrames} from './player_frames/load-player-frames.mjs';
// Standalone preparation seam; caller explicitly selects this DEV memory mode. No DOM/RAF/user storage.
import {CanonicalWorld} from '../../world/service.mjs';
import {SpeciesCatalogService} from '../../species-catalog-service.mjs';
import {createGohyeonHealBinding} from '../../world/gohyeon-heal-binding.mjs';
import {createGohyeonPurchaseBinding} from '../../world/gohyeon-purchase-binding.mjs';
import {loadGohyeonInputs} from '../gohyeon-native/native_candidate/load.mjs';
import {loadS4TargetInputs} from './load-targets.mjs';
import {createS4FixedLocationRegistry} from './registered-locations.mjs';
import {createS4FixedEnvelopeCodec} from '../native-save/native-envelope.mjs';
import {createNativeSelectedWarpAuthority} from './native-selected-warp-authority.mjs';
import {createS4FixedTransitionOwner,createTransitionMemoryStorage,inspectTransitionMemorySave} from './transition-owner-candidate.mjs';
import {createS4FixedScenePreparer} from './prepare-scenes.mjs';
export async function preloadS4FixedPair({adapter,initialRuntime=null,initialHubState,storage=null,restore=false,slot='SLOT_1',fetcher=fetch,decode,scratchFactory,onStateChanged=()=>{},hooks={},encounterEnvironment=null,encounterDiagnostic=null,signal=null}){
 const capturedInitialRuntime=initialRuntime===null?null:structuredClone(initialRuntime);const checkAbort=()=>{if(signal?.aborted){const e=Error('S4_PREPARATION_ABORTED');e.name='AbortError';throw e}};const baseFetcher=fetcher;fetcher=async(...args)=>{checkAbort();const response=await baseFetcher(args[0],{...(args[1]??{}),signal});checkAbort();return response};checkAbort();
 if(!adapter||typeof scratchFactory!=='function')throw Error('FIXED_PAIR_PREPARE_REQUIRED');let playerFrames,hubInputs,targetInputs,owner,initialScene,healBinding,shopBinding;
 try{checkAbort();hubInputs=await loadGohyeonInputs({fetcher,...(decode?{decode}:{})});checkAbort();targetInputs=await loadS4TargetInputs({fetcher,...(decode?{decode}:{})});checkAbort();playerFrames=await loadSelectedPlayerFrames({fetcher,...(decode?{decode}:{})});checkAbort();const depthInputs=await loadSelectedTargetDepth({fetcher});checkAbort();const masks={hubOpenMask:targetInputs.hubMasks.OPEN,hubClosedMask:targetInputs.hubMasks.CLOSED,parkMask:targetInputs.park.mask,greenbeltMask:targetInputs.green.mask},registry=await createS4FixedLocationRegistry(masks),codec=await createS4FixedEnvelopeCodec(masks),catalog=new SpeciesCatalogService({namespace:'canonical',adapter}),memory=storage??createTransitionMemoryStorage();
 let location,restoreRaw=null,runtime=capturedInitialRuntime;if(restore){const saved=inspectTransitionMemorySave({storage:memory,codec,catalog,slot});location=saved.location;runtime=saved.runtime;restoreRaw=saved.raw}else{if(!['OPEN','CLOSED'].includes(initialHubState)||runtime?.position?.scene!=='world:hub:S4')throw Error('EXPLICIT_S4_CURRENT_RUNTIME_AND_VISUAL_STATE_REQUIRED');location={...registry.describe('world:hub:S4',initialHubState),foot:[...hubInputs.contract.exteriorDoor.arrival],facing:'up'}}
 const prepareScene=createS4FixedScenePreparer({hubInputs,targetInputs,registry,scratchFactory,playerActors:playerFrames.actors,foregroundLayers:depthInputs.layers});initialScene=await prepareScene(location);checkAbort();
 const getWorld=()=>owner?.getWorld(),getScene=()=>owner?.getScene()?.mapId==='world:hub:S4'?owner.getScene().scene:null;
 healBinding=createGohyeonHealBinding({getWorld,getScene,onStateChanged});shopBinding=createGohyeonPurchaseBinding({getWorld,getScene,onStateChanged});const nativeSelectedWarpAuthority=createNativeSelectedWarpAuthority({getWorld,readNative:()=>owner?.getScene()?.readNative()});
 let disposed=false,bound=false;
 const dispose=()=>{if(disposed)return;disposed=true;signal?.removeEventListener('abort',dispose);healBinding.dispose();shopBinding.dispose();if(owner)owner.dispose();else initialScene.dispose();hubInputs.dispose();targetInputs.dispose();playerFrames.dispose()};
 function bindWorld(options){checkAbort();if(disposed||bound)throw Error('S4_WORLD_BIND_ONCE_REQUIRED');if(options?.adapter!==adapter||JSON.stringify(options.runtime)!==JSON.stringify(runtime)||options.battleDriver!=null)throw Error('EXACT_MAIN_WORLD_OPTIONS_REQUIRED');bound=true;
  try{owner=createS4FixedTransitionOwner({worldFactory:({persist,runtime:restored})=>new CanonicalWorld({...options,runtime:restored??options.runtime,persist,nativeSelectedWarpAuthority,nativeSelectedHealAuthority:healBinding.authority,nativeSelectedPurchaseAuthority:shopBinding.authority}),initialScene,prepareScene,invokeWarp:(w,id)=>w.interactNativeSelectedWarp(id,{type:'warp'}),registry,storage:memory,codec,catalog,slot,featureGate:'NATIVE_MEMORY_TRANSITION_ONLY',restoreRaw});checkAbort();return owner.getWorld()}catch(e){dispose();throw e}
 }
 signal?.addEventListener('abort',dispose,{once:true});checkAbort();return{get owner(){return owner??null},storage:memory,registry,codec,catalog,selectedServices:{healBinding,shopBinding},getWorld,getServiceScene:getScene,runtimeForMain:()=>{if(disposed)throw Error('S4_PREPARATION_DISPOSED');return structuredClone(runtime)},bindWorld,dispose};
 }catch(e){healBinding?.dispose();shopBinding?.dispose();if(owner)owner.dispose();else initialScene?.dispose();hubInputs?.dispose();targetInputs?.dispose();playerFrames?.dispose();throw e}
}

// Convenience wrapper for isolated tests; main entry must preload then bind inside its synchronous world factory.
export async function prepareS4FixedPair(options){const prepared=await preloadS4FixedPair(options);try{prepared.bindWorld({adapter:options.adapter,runtime:prepared.runtimeForMain(),hooks:options.hooks??{},encounterEnvironment:options.encounterEnvironment??null,encounterDiagnostic:options.encounterDiagnostic??null});return prepared}catch(e){prepared.dispose();throw e}}
