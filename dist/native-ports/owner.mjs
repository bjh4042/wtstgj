import {LATEST_GAMEPLAY_RELEASE} from '../compatibility/gameplay-release.mjs';
import {CanonicalWorld} from '../world/service.mjs';
import {createS7S8Bridge} from './resources/map_simulation_20261102/bridge_r1/bridge.mjs';
import {validateNativeBundle} from './resources/map_simulation_20261102/bridge_r1/native-providers.mjs';
import {stageNativePort,createNativePortDisplay} from './presentation.mjs';
import {createNativePortResourceCache} from './resource-cache.mjs';
export function createNativePortOwner({world}){
 if(!(world instanceof CanonicalWorld))throw Error('NATIVE_PORT_EXACT_HOST_WORLD');
 const snapshot=world.snapshot();if(snapshot.contentNamespace!=='canonical-v1'||snapshot.gameplayRelease!==LATEST_GAMEPLAY_RELEASE||snapshot.candidatePolicyId||!['boy','girl'].includes(snapshot.player?.appearance))return null;
 const appearance=snapshot.player.appearance,appearanceMatches=()=>world.snapshot().player?.appearance===appearance;
 const display=createNativePortDisplay(),resources=createNativePortResourceCache({appearance});let dead=false,suspended=false,generation=0;const frameGenerations=new WeakMap();
 const bridge=createS7S8Bridge({world,prepareNative:resources.acquire,validateNative:validateNativeBundle,stage:async input=>{if(!appearanceMatches())throw Error('NATIVE_PORT_APPEARANCE_CHANGED');const token=generation;const frame=await stageNativePort({...input,appearance});if(dead||suspended||!appearanceMatches()||token!==generation){frame.dispose();throw Error('NATIVE_PORT_STAGE_SUSPENDED');}frameGenerations.set(frame,token);return frame;},publish:(frame,input)=>{if(dead||suspended||!appearanceMatches()||frameGenerations.get(frame)!==generation)throw Error('NATIVE_PORT_PUBLISH_SUSPENDED');return display.publish(frame,input);},fallback:display.clear});
 return Object.freeze({
  canTransfer:id=>!dead&&!suspended&&appearanceMatches()&&bridge.canTransfer(id),
  transfer:id=>{if(suspended)throw Error('NATIVE_PORT_SUSPENDED');if(!appearanceMatches())throw Error('NATIVE_PORT_APPEARANCE_CHANGED');return bridge.transfer(id);},
  draw:ctx=>{if(!appearanceMatches()){display.clear();return false;}return display.draw(ctx,bridge.memoryPose);},
  clear:display.clear,
  cancelPrepare(){if(bridge.status.phase!=='prepare')return false;generation++;const cancelled=bridge.cancel();display.clear();return cancelled;},
  suspend(){suspended=true;generation++;bridge.cancel();display.clear();},
  resume(){if(!dead)suspended=false;},
  reconcile(){display.clear();return bridge.reconcile();},
  dispose(){if(dead)return;dead=true;bridge.dispose();resources.dispose();display.dispose();},
  get busy(){return bridge.status.phase!=='idle';},
  get status(){return bridge.status;},
  get memoryPose(){return bridge.memoryPose;},
  get diagnostics(){return bridge.diagnostics;},
  get resourceDiagnostics(){return resources.diagnostics;}
 });
}
