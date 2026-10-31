import {CenterServiceAdapter,createCanonicalCenterHost,createSelectedCenterHost} from './center-service.mjs';
import {renderScene} from './approved-animation/scene.mjs';
/** Cutscene overlay only. No native/canonical travel, save loading or owned rAF. */
export function createCenterController({getWorld,pointId='heal:POST',nativeController=null,selectedBinding=null,visuals,onStatus=()=>{},onHealed=()=>{},transactionIdFactory}={}){
 if(typeof getWorld!=='function'||!visuals?.assets||!visuals?.layout)throw Error('CENTER_CONTROLLER_HOST_REQUIRED');
 let releaseVisual=null,selection=null,service=null,world=null,opened=false,disposed=false,generation=0;
 const notify=(mine,value)=>{if(opened&&!disposed&&mine===generation&&getWorld()===world&&(!selectedBinding||selectedBinding.isCurrent(selection,world)))onStatus(value);};
 function close(reason='closed'){
  generation++;opened=false;
  // Disposing suppresses detached success UI; pending canonical commit still owns
  // its own completion and lock. Its releaseControls runs only at settlement.
  if(service){service.cancel(reason);service.dispose();}
  return {closed:true,commitContinues:service?.snapshot().state==='committing'};
 }
 return {
  start(){
   if(disposed||service?.busy)return {accepted:false,reason:disposed?'DISPOSED':'BUSY'};
   if(nativeController&&!nativeController.canHeal())return {accepted:false,reason:'POST_HEAL_NOT_AVAILABLE'};
   world=getWorld();if(selectedBinding){if(nativeController!==selectedBinding)throw Error('SELECTED_CENTER_CONTROLLER_IDENTITY');selection=selectedBinding.capture(world);}const mine=++generation;opened=true;
   const host=selectedBinding?createSelectedCenterHost(world,selectedBinding):createCanonicalCenterHost(world,pointId,{nativePost:!!nativeController}),check=host.check,commit=host.commit;
   host.check=(snapshot,options)=>{if(getWorld()!==world||(selectedBinding&&!selectedBinding.isCurrent(selection,world)))throw Error('CENTER_WORLD_REPLACED');return check(snapshot,options);};
   host.commit=request=>{
    if(getWorld()!==world||(selectedBinding&&!selectedBinding.isCurrent(selection,world)))throw Error('CENTER_WORLD_REPLACED');
    // Keep controller.busy until settlement. Release only the visual spatial
    // gate immediately before canonical operation synchronously owns pending.
if(selectedBinding)releaseVisual?.();else nativeController?.setVisualLocked(false);
    return commit(request);
   };
   service=new CenterServiceAdapter({host,transactionIdFactory,
    acquireControls:()=>{if(selectedBinding){releaseVisual=selectedBinding.acquireVisualLock();return releaseVisual;}nativeController?.stop();nativeController?.setVisualLocked(true);return ()=>nativeController?.setVisualLocked(false);},
    onChange:s=>notify(mine,s),onHealed:r=>{if(opened&&!disposed&&mine===generation&&getWorld()===world&&(!selectedBinding||selectedBinding.isCurrent(selection,world)))onHealed(r);}});
   const result=service.start();if(!result.accepted)opened=false;return result;
  },
  tick(timestamp){if(opened&&(getWorld()!==world||(selectedBinding&&!selectedBinding.isCurrent(selection,world)))){close('world-replaced');return;}if(opened)service?.tick(timestamp);},
  draw(ctx){if(!opened||!service)return false;renderScene(ctx,visuals.assets,visuals.layout,service.snapshot().animation);return true;},
  cancel(reason='cancelled'){return service?.cancel(reason)??{accepted:false,reason:'NOT_RUNNING'};},
  close,
  dispose(){close('disposed');disposed=true;},
  get active(){return opened;},get busy(){return !!service?.busy;},
  snapshot(){return service?.snapshot()??{state:'idle',busy:false};}
 };
}
export function bindCenterControllerLifecycle(controller,{documentTarget,windowTarget}={}){
 if(!documentTarget||!windowTarget)throw Error('CENTER_LIFECYCLE_TARGETS_REQUIRED');
 const blur=()=>controller.close('blur'),hide=()=>{if(documentTarget.hidden)controller.close('hidden');},page=()=>controller.close('pagehide'),key=e=>{if(e.key==='Escape'&&!e.repeat){e.preventDefault();controller.cancel('escape');}};
 windowTarget.addEventListener('blur',blur);windowTarget.addEventListener('pagehide',page);windowTarget.addEventListener('keydown',key);documentTarget.addEventListener('visibilitychange',hide);
 return ()=>{windowTarget.removeEventListener('blur',blur);windowTarget.removeEventListener('pagehide',page);windowTarget.removeEventListener('keydown',key);documentTarget.removeEventListener('visibilitychange',hide);controller.dispose();};
}
