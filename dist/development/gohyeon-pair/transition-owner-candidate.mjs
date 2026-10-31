import {prepareShopTransition} from '../shop-interior/transition.mjs';
import {SELECTED_PURCHASE_ROWS} from '../../world/selected-purchase-authority.mjs';
import {SELECTED_HEAL_ROWS} from '../../world/selected-heal-authority.mjs';
import {prepareCenterTransition} from '../center-interior/transition.mjs';
import {prepareHouseAction} from './house-session.mjs';
import{GYM4_WARPS}from'../gohyeon-gym4/fixed-warp-registration.mjs';
import{selectS4RecoveryProposal}from'../gohyeon-gameplay/recovery/recovery-mapper.mjs';
import{hasPendingS4Encounter}from'../../world/native-s4-encounter-authority.mjs';
import{FIXED_REGISTRATION}from'./fixed-registration.mjs';
import {selectedPostRecovery} from '../paired/post-recovery.mjs';
// Memory-only candidate. No user storage, RAF, input listeners, or canonical coordinate writes.
import{createSaveSlotStore,decodeSlot}from'../native-save/save-slots.mjs';
import{stableJSON}from'../../compatibility/codec.mjs';
const memories=new WeakSet();
export function createTransitionMemoryStorage(){const values=new Map();let fault=null;const storage={getItem:k=>values.get(k)??null,setItem(k,v){const mode=fault?.(k,v);if(mode==='before')throw Error('MEMORY_WRITE_FAILED');values.set(k,String(v));if(mode==='after')throw Error('MEMORY_AFTER_WRITE_FAILED')},removeItem:k=>values.delete(k),injectFault:f=>{fault=f},exportRaw:()=>new Map(values)};memories.add(storage);return storage}
export function inspectTransitionMemorySave({storage,codec,catalog,slot}){if(!memories.has(storage))throw Error('DEV_MEMORY_GATE_REQUIRED');const store=createSaveSlotStore(storage,{canonicalCatalog:catalog,nativeEnvelopeCodec:codec}),raw=store.peek(slot),saved=store.load(slot);if(saved?.compatibilityVersion!==2)throw Error('NATIVE_RESUME_REQUIRED');return {raw,runtime:structuredClone(saved.runtime),location:structuredClone(saved.nativeExtension.location)}}
const same=(a,b)=>stableJSON(a)===stableJSON(b),copy=structuredClone;
const POST_ROUTES=Object.freeze({
 'post-entry:nojasan-summit':Object.freeze({from:'world:hub:POST',to:'world:post:nojasan-summit',cell:[3,12],foot:[68,450],facing:'right'}),
 'post-entry:nojasan-summit:return':Object.freeze({from:'world:post:nojasan-summit',to:'world:hub:POST',cell:[33,7],foot:[2642,765],facing:'down'})
});
/** Trusted integration dependencies supplied once; public transitions accept only the point ID. */
function createOwner({worldFactory,initialScene,prepareScene,invokeWarp,registry,storage,codec,catalog,slot,featureGate,restoreRaw=null},routes,recoverySelector,insideArrivalRegion,extraBusy=()=>false,runtimeProjector=null,allowCenter=false,allowShop=false){
 if(featureGate!=='NATIVE_MEMORY_TRANSITION_ONLY'||!memories.has(storage))throw Error('DEV_MEMORY_GATE_REQUIRED');
 const store=createSaveSlotStore(storage,{canonicalCatalog:catalog,nativeEnvelopeCodec:codec});
 const existing=store.peek(slot);let restored=null;if(restoreRaw===null){if(existing!==null)throw Error('EXISTING_SLOT_REQUIRES_RESTORE')}else{if(existing!==restoreRaw)throw Error('STALE_RESTORE');restored=store.load(slot);if(restored?.compatibilityVersion!==2)throw Error('NATIVE_RESUME_REQUIRED');if(!same(registry.normalizePrevious?registry.normalizePrevious(restored.nativeExtension.location):restored.nativeExtension.location,initialScene.getLocation()))throw Error('RESTORE_LOCATION_MISMATCH')}
 store.acknowledgeRevision(slot,existing);let expectedRaw=existing,conflict=false;
 let current=initialScene,staged=null,pair=null,preparedVisual=null,committedVisual=null,disposed=false,phase='idle',epoch=0,world,lastRecovery=null,latch=restored?{released:false,left:false}:null;
 const cleanupErrors=[],releasedScenes=new WeakSet();const release=scene=>{if(!scene||releasedScenes.has(scene))return;releasedScenes.add(scene);try{scene.dispose()}catch(error){cleanupErrors.push(String(error?.message??error))}};
 const location=()=>copy(current.getLocation());
 const checked=n=>{const error=registry.validate(n);if(error)throw Error(error);return n};checked(location());
 function reconcileVisual(){if(!committedVisual||disposed||world.story.busy||world.story.pendingCommit||world.pending)return;if(!same(world.snapshot(),committedVisual.runtime))throw Error('GYM4_VISUAL_RUNTIME_ACK_REQUIRED');if(current!==committedVisual.scene)throw Error('GYM4_VISUAL_OWNER_CHANGED');committedVisual.apply();if(!same(current.getLocation(),committedVisual.location))throw Error('GYM4_VISUAL_LOCATION_ACK_REQUIRED');committedVisual=null;}
 function acceptVisual(){if(preparedVisual){committedVisual=preparedVisual;preparedVisual=null}}
 function persist(next){
  reconcileVisual();if(committedVisual)throw Error('GYM4_VISUAL_ACK_PENDING');
  if(disposed)throw Error('OWNER_DISPOSED');
  if(!staged){const recovery=recoverySelector({world,before:world.snapshot(),next,registry,retainedHubState:location().retainedHubState});if(recovery)return prepareRecovery(next,registry.transferMovement?{...recovery,location:registry.transferMovement(location(),recovery.location)}:recovery);}
  let native=location();
  if((staged?.kind==='house'||staged?.kind==='center'||staged?.kind==='shop')){if(!same(next,staged.before))throw Error('HOUSE_CANONICAL_RUNTIME_CHANGED');native=staged.location;}
  else if(staged?.kind==='recovery'){if(!same(next,staged.next))throw Error('RECOVERY_CAPTURED_DRAFT_CHANGED');native=staged.location;}
  else if(staged){const r=staged.route,p=next.position,last=next.world?.routeLog?.at(-1);if(p.scene!==r.to||p.x!==r.cell[0]*48+24||p.y!==r.cell[1]*48+24||next.world.warps!==staged.before.world.warps+1||last?.warpId!==staged.id||last?.from!==r.from||last?.to!==r.to)throw Error('STAGED_WARP_PAIR_MISMATCH');native=staged.location;}
  if(!staged&&!same(next.position,world.snapshot().position))throw Error('UNREGISTERED_CANONICAL_RELOCATION');
  if(runtimeProjector){native=runtimeProjector(native,next);if(staged&&!same(native,staged.location))throw Error('GYM4_STAGED_PROJECTION_DRIFT');}
  checked(native);if(next.position.scene!==native.mapId)throw Error('UNREGISTERED_MAP_TRANSITION');
  const candidate={runtime:copy(next),location:copy(native)};if(pair&&!same(pair,candidate))throw Error('PENDING_PAIR_CHANGED');if(!pair&&runtimeProjector&&!staged&&!same(native,location())){const apply=current.prepareCommittedLocation?.(copy(native));if(typeof apply!=='function')throw Error('GYM4_VISUAL_PREPARE_REQUIRED');preparedVisual={scene:current,runtime:copy(next),location:copy(native),apply}}pair??=candidate;
  return commitCaptured();
 }
 async function prepareRecovery(next,recovery){
  if(disposed||conflict||phase!=='idle'||pair)throw Error('RECOVERY_OWNER_BUSY');
  const mine=++epoch;phase='preparing-recovery';current.stop();let scene;
  try{scene=await prepareScene(copy(recovery.location));if(disposed||mine!==epoch){release(scene);throw Error('RECOVERY_OWNER_DISPOSED')}
   if(scene===current)throw Error('TARGET_OWNER_MUST_BE_NEW');scene.bindWorld?.(world);if(!same(scene.getLocation(),recovery.location))throw Error('RECOVERY_TARGET_LANDING_DRIFT');
   staged={kind:'recovery',route:{to:recovery.location.mapId},location:copy(recovery.location),scene,next:copy(next),persisted:false};phase='committing';return persist(next);
  }catch(error){if(disposed||mine!==epoch){if(scene!==current&&scene!==staged?.scene)release(scene);throw error}if(staged){phase='pending'}else{release(scene);phase='idle'}throw error}
 }
 function reconcileRecovery(){if(staged?.kind==='recovery'&&staged.persisted&&!pair&&!world.story.pendingCommit&&!world.pending&&!world.story.busy){if(!same(world.snapshot(),staged.next))throw Error('RECOVERY_COMMIT_NOT_CONFIRMED');finish();}}
 function commitCaptured(){
  if(!pair)throw Error('NO_PENDING_PAIR');if(conflict||store.peek(slot)!==expectedRaw){conflict=true;throw Error('NATIVE_SLOT_CONFLICT_RELOAD_REQUIRED')}
  try{const result=store.saveNative(slot,pair.runtime,pair.location);expectedRaw=store.peek(slot);pair=null;acceptVisual();if(staged)staged.persisted=true;return result}
  catch(error){const raw=store.peek(slot);try{const saved=raw===null?null:decodeSlot(raw,slot,{canonicalCatalog:catalog,nativeEnvelopeCodec:codec});if(saved?.compatibilityVersion===2&&same(saved.runtime,pair.runtime)&&same(saved.nativeExtension.location,pair.location)){store.acknowledgeRevision(slot,raw);expectedRaw=raw;pair=null;acceptVisual();if(staged)staged.persisted=true;return saved}}catch{}if(raw!==expectedRaw)conflict=true;throw error}
 }

 world=worldFactory({persist,runtime:restored?copy(restored.runtime):null});current.bindWorld?.(world);if(world.snapshot().position.scene!==location().mapId||(restored&&!same(world.snapshot(),restored.runtime))){world.dispose();release(current);throw Error('INITIAL_MAP_MISMATCH')}
 if(restored)current.requireHouseArrival?.();
 function observe(){if(!latch)return;const n=checked(location());if(!insideArrivalRegion(n))latch.left=true;if(latch.left&&latch.released)latch=null}
 function finish(){if(!staged?.persisted||pair||world.story.pendingCommit)throw Error('WARP_COMMIT_NOT_CONFIRMED');const state=world.snapshot();if(state.position.scene!==staged.route.to)throw Error('CANONICAL_TARGET_NOT_CONFIRMED');const old=current;if(staged.kind==='recovery')lastRecovery={battleId:staged.next.economy.recovery.battleId,hubId:staged.next.economy.recovery.hubId,mapId:staged.location.mapId};current=staged.scene;staged=null;phase='idle';latch={released:false,left:false};release(old);current.stop();}
 async function houseTransition(kind){
  reconcileVisual();if(disposed||conflict||committedVisual||pair||phase!=='idle'||world.busy||world.inputLocked||extraBusy(current))throw Error('HOUSE_TRANSITION_BUSY');
  const before=copy(world.snapshot()),beforeNative=location(),origin=current,mine=++epoch;phase='preparing';current.stop();let targetScene;
  try{const prepared=await prepareHouseAction(origin,kind,prepareScene);if(disposed||mine!==epoch)return{cancelled:true};if(!prepared.target){phase='idle';return prepared.result}
   // Reconstruct the captured target as a fresh complete scene: private movement proof/epoch must start at the target, not inherit the preparation session's old floor.
   targetScene=await prepareScene(copy(prepared.target));if(targetScene===origin)throw Error('HOUSE_TEMPORARY_OWNER_REQUIRED');
   if(disposed||mine!==epoch){release(targetScene);return{cancelled:true}}
   if(!targetScene||!same(targetScene.getLocation(),prepared.target))throw Error('HOUSE_TARGET_CAPTURE_DRIFT');
   if(current!==origin||!same(world.snapshot(),before)||!same(location(),beforeNative))throw Error('HOUSE_SOURCE_CHANGED_DURING_PREPARE');
   targetScene.bindWorld?.(world);staged={kind:'house',route:{to:beforeNative.mapId},before,location:copy(prepared.target),scene:targetScene,persisted:false};phase='committing';persist(before);finish();return{...prepared.result,committed:true,mapId:beforeNative.mapId};
  }catch(error){if(disposed||mine!==epoch){if(targetScene!==origin&&targetScene!==staged?.scene)release(targetScene);throw error}if(staged&&pair)phase='pending';else{if(targetScene!==origin)release(targetScene);abandon()}throw error}
 }
 async function centerTransition(kind){
  reconcileVisual();if(disposed||conflict||committedVisual||pair||phase!=='idle'||world.busy||world.inputLocked||extraBusy(current))throw Error('CENTER_TRANSITION_BUSY');
  const before=copy(world.snapshot()),beforeNative=location(),origin=current,mine=++epoch;phase='preparing';current.stop();let targetScene;
  try{if(!allowCenter)throw Error('FIXED_CENTER_OWNER_REQUIRED');observe();if(latch)throw Error('ACTION_RELEASE_AND_TRIGGER_EXIT_REQUIRED');const prepared=prepareCenterTransition(origin,kind,registry);if(disposed||mine!==epoch)return{cancelled:true};if(!prepared.target){phase='idle';return prepared.result}
   // Reconstruct the captured target as a fresh complete scene: private movement proof/epoch must start at the target, not inherit the preparation session's old floor.
   targetScene=await prepareScene(copy(prepared.target));if(targetScene===origin)throw Error('CENTER_TEMPORARY_OWNER_REQUIRED');
   if(disposed||mine!==epoch){release(targetScene);return{cancelled:true}}
   if(!targetScene||!same(targetScene.getLocation(),prepared.target))throw Error('CENTER_TARGET_CAPTURE_DRIFT');
   if(current!==origin||!same(world.snapshot(),before)||!same(location(),beforeNative))throw Error('CENTER_SOURCE_CHANGED_DURING_PREPARE');
   targetScene.bindWorld?.(world);staged={kind:'center',route:{to:beforeNative.mapId},before,location:copy(prepared.target),scene:targetScene,persisted:false};phase='committing';persist(before);finish();return{...prepared.result,committed:true,mapId:beforeNative.mapId};
  }catch(error){if(disposed||mine!==epoch){if(targetScene!==origin&&targetScene!==staged?.scene)release(targetScene);throw error}if(staged&&pair)phase='pending';else{if(targetScene!==origin)release(targetScene);abandon()}throw error}
 }
 async function shopTransition(kind){
  reconcileVisual();if(disposed||conflict||committedVisual||pair||phase!=='idle'||world.busy||world.inputLocked||extraBusy(current))throw Error('SHOP_TRANSITION_BUSY');
  const before=copy(world.snapshot()),beforeNative=location(),origin=current,mine=++epoch;phase='preparing';current.stop();let targetScene;
  try{if(!allowShop)throw Error('FIXED_SHOP_OWNER_REQUIRED');observe();if(latch)throw Error('ACTION_RELEASE_AND_TRIGGER_EXIT_REQUIRED');const prepared=prepareShopTransition(origin,kind,registry);if(disposed||mine!==epoch)return{cancelled:true};if(!prepared.target){phase='idle';return prepared.result}
   // Reconstruct the captured target as a fresh complete scene: private movement proof/epoch must start at the target, not inherit the preparation session's old floor.
   targetScene=await prepareScene(copy(prepared.target));if(targetScene===origin)throw Error('SHOP_TEMPORARY_OWNER_REQUIRED');
   if(disposed||mine!==epoch){release(targetScene);return{cancelled:true}}
   if(!targetScene||!same(targetScene.getLocation(),prepared.target))throw Error('SHOP_TARGET_CAPTURE_DRIFT');
   if(current!==origin||!same(world.snapshot(),before)||!same(location(),beforeNative))throw Error('SHOP_SOURCE_CHANGED_DURING_PREPARE');
   targetScene.bindWorld?.(world);staged={kind:'shop',route:{to:beforeNative.mapId},before,location:copy(prepared.target),scene:targetScene,persisted:false};phase='committing';persist(before);finish();return{...prepared.result,committed:true,mapId:beforeNative.mapId};
  }catch(error){if(disposed||mine!==epoch){if(targetScene!==origin&&targetScene!==staged?.scene)release(targetScene);throw error}if(staged&&pair)phase='pending';else{if(targetScene!==origin)release(targetScene);abandon()}throw error}
 }

 function abandon(){release(staged?.scene);staged=null;phase=disposed?'disposed':'idle'}
 return Object.freeze({getWorld:()=>world,getScene:()=>{if(disposed)return null;reconcileRecovery();reconcileVisual();return current},get lastRecovery(){return lastRecovery?copy(lastRecovery):null},get phase(){return phase},get conflict(){return conflict},get canReload(){return conflict&&!world.pending&&!world.story.busy&&!extraBusy(current)},get cleanupErrors(){return [...cleanupErrors]},get pending(){reconcileVisual();return !!committedVisual||!!pair||!!world.story.pendingCommit||extraBusy(current)},getLocation:()=>{reconcileVisual();return location()},exportRaw:()=>store.peek(slot),save(){reconcileVisual();if(disposed||committedVisual||phase!=='idle'||pair||world.busy||world.inputLocked||extraBusy(current))throw Error('OWNER_SAVE_BUSY');current.stop();return persist(world.snapshot())},releaseAction(){if(latch){latch.released=true;observe()}},observePosition(){observe()},get reentryBlocked(){return !!latch},
  async transition(id){if(id==='service:shop:enter')return shopTransition('enter');if(id==='service:shop:exit')return shopTransition('exit');if(id==='service:center:enter')return centerTransition('enter');if(id==='service:center:exit')return centerTransition('exit');if(id==='house:inspect')return houseTransition('inspect');if(id==='house:door')return houseTransition('door');reconcileVisual();if(committedVisual)throw Error('GYM4_VISUAL_ACK_PENDING');observe();if(latch)throw Error('ACTION_RELEASE_AND_TRIGGER_EXIT_REQUIRED');const route=Object.hasOwn(routes,id)?routes[id]:null;if(!route)throw Error('UNREGISTERED_TRANSITION');if(disposed||conflict||pair||phase!=='idle'||world.busy||world.inputLocked||extraBusy(current))throw Error('TRANSITION_BUSY');if(world.snapshot().position.scene!==route.from)throw Error('WRONG_SOURCE_SCENE');const mine=++epoch,before=world.snapshot(),beforeNative=location();phase='preparing';current.stop();let scene;
   try{let target={...(runtimeProjector?registry.describe(route.to,location().retainedHubState,world.snapshot()):registry.describe(route.to,routes===POST_ROUTES?undefined:location().retainedHubState)),foot:[...route.foot],facing:route.facing};if(registry.transferMovement)target=registry.transferMovement(beforeNative,target);checked(target);scene=await prepareScene(copy(target));if(disposed||mine!==epoch){release(scene);return{cancelled:true}}if(scene===current)throw Error('TARGET_OWNER_MUST_BE_NEW');scene.bindWorld?.(world);if(!same(scene.getLocation(),target))throw Error('TARGET_LANDING_DRIFT');if(!same(world.snapshot(),before))throw Error('SOURCE_CHANGED_DURING_PRELOAD');if(routes!==POST_ROUTES&&!same(location(),beforeNative))throw Error('NATIVE_SOURCE_CHANGED_DURING_PRELOAD');staged={id,route,before,location:copy(target),scene,persisted:false};phase='committing';await invokeWarp(world,id);if(disposed)return{disposedAfterCommit:true};finish();return{committed:true,mapId:route.to};}
   catch(error){if(disposed||mine!==epoch){if(scene!==current&&scene!==staged?.scene)release(scene);throw error}if(staged&&(pair||world.story.pendingCommit)){phase=disposed?'disposed':'pending';}else{if(!staged)release(scene);abandon()}throw error}
  },
  async retryCommit(){if(conflict)throw Error('NATIVE_SLOT_CONFLICT_RELOAD_REQUIRED');if(disposed)throw Error('OWNER_DISPOSED');if(!staged){if(world.story.pendingCommit){await world.story.retryCommit();world.syncField()}else if(pair)commitCaptured();else throw Error('NO_PENDING_COMMIT');if(extraBusy(current)){world.reconcileNativeS4Encounter();if(extraBusy(current))await current.resumePendingNativeEncounter?.()}reconcileVisual();return{committed:true,mapId:current.getLocation().mapId}}if(phase!=='pending')throw Error('NO_TRANSITION_RETRY');phase='committing';try{if((staged.kind==='house'||staged.kind==='center'||staged.kind==='shop')){commitCaptured();finish();return{committed:true,mapId:current.getLocation().mapId}}await world.story.retryCommit();world.syncField();finish();return{committed:true,mapId:current.getLocation().mapId}}catch(error){phase='pending';throw error}},
  cancel(){if(phase==='preparing-recovery')return false;if(phase==='preparing'){epoch++;phase='idle';return true}if(phase==='committing'||phase==='pending')return false;return true},
  dispose(){if(disposed)return;disposed=true;epoch++;phase='disposed';release(current);release(staged?.scene);world.dispose()},
 });
}

// Fixed private seams: callers cannot register routes, target maps or arrival feet.
export function createTransitionOwner(options){return createOwner(options,POST_ROUTES,selectedPostRecovery,n=>{const a=n.mapId==='world:hub:POST'?[2642,717]:[28,450];return Math.abs(n.foot[0]-a[0])+Math.abs(n.foot[1]-a[1])<=48})}
const S4_ROUTES=Object.freeze(Object.fromEntries(FIXED_REGISTRATION.map(r=>[r.pointId,r.route])));
const s4Recovery=selectS4RecoveryProposal;
export function createS4FixedTransitionOwner(options){return createOwner(options,S4_ROUTES,s4Recovery,n=>FIXED_REGISTRATION.some(r=>r.mapId===n.mapId&&(r.approach?r.approach.rows.some(([y,lo,hi])=>n.foot[1]===y&&n.foot[0]>=lo&&n.foot[0]<hi):Math.abs(n.foot[0]-r.anchor[0])+Math.abs(n.foot[1]-r.anchor[1])<=48)),hasPendingS4Encounter)}

const GYM4_ROWS=Object.freeze([...FIXED_REGISTRATION,...GYM4_WARPS]),GYM4_ROUTES=Object.freeze(Object.fromEntries(GYM4_ROWS.map(r=>[r.pointId,r.route])));
export function createS4Gym4TransitionOwner(options){return createOwner(options,GYM4_ROUTES,s4Recovery,n=>GYM4_ROWS.some(r=>r.mapId===n.mapId&&r.approach.rows.some(([y,lo,hi])=>n.foot[1]===y&&n.foot[0]>=lo&&n.foot[0]<hi)),hasPendingS4Encounter,(n,next)=>options.registry.projectRuntime(n,next))}

export function createS4CenterTransitionOwner(options){return createOwner(options,GYM4_ROUTES,s4Recovery,n=>n.servicePose?Math.abs(n.servicePose.foot[0]-384)+Math.abs(n.servicePose.foot[1]-524)<=24:(n.mapId==='world:hub:S4'&&SELECTED_HEAL_ROWS['heal:S4'].approachRows[n.retainedHubState]?.some(([y,l,r])=>n.foot[1]===y&&n.foot[0]>=l&&n.foot[0]<r))||GYM4_ROWS.some(r=>r.mapId===n.mapId&&r.approach.rows.some(([y,lo,hi])=>n.foot[1]===y&&n.foot[0]>=lo&&n.foot[0]<hi)),hasPendingS4Encounter,(n,next)=>options.registry.projectRuntime(n,next),true)}

export function createS4ServiceTransitionOwner(options){return createOwner(options,GYM4_ROUTES,s4Recovery,n=>n.servicePose?(n.servicePose.sceneId==='dev:native:S4-service:shop:r3-candidate'?Math.abs(n.servicePose.foot[0]-480)+Math.abs(n.servicePose.foot[1]-625)<=24:Math.abs(n.servicePose.foot[0]-384)+Math.abs(n.servicePose.foot[1]-524)<=24):(n.mapId==='world:hub:S4'&&SELECTED_HEAL_ROWS['heal:S4'].approachRows[n.retainedHubState]?.some(([y,l,r])=>n.foot[1]===y&&n.foot[0]>=l&&n.foot[0]<r))||(n.mapId==='world:hub:S4'&&SELECTED_PURCHASE_ROWS['shop:S4'].approachRows[n.retainedHubState]?.some(([y,l,r])=>n.foot[1]===y&&n.foot[0]>=l&&n.foot[0]<r))||GYM4_ROWS.some(r=>r.mapId===n.mapId&&r.approach.rows.some(([y,lo,hi])=>n.foot[1]===y&&n.foot[0]>=lo&&n.foot[0]<hi)),hasPendingS4Encounter,(n,next)=>options.registry.projectRuntime(n,next),true,true)}
