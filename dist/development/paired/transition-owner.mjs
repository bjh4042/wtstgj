import {selectedPostRecovery} from './post-recovery.mjs';
// Memory-only candidate. No user storage, RAF, input listeners, or canonical coordinate writes.
import{createSaveSlotStore,decodeSlot}from'../native-save/save-slots.mjs';
import{stableJSON}from'../../compatibility/codec.mjs';
const memories=new WeakSet();
export function createTransitionMemoryStorage(){const values=new Map();let fault=null;const storage={getItem:k=>values.get(k)??null,setItem(k,v){const mode=fault?.(k,v);if(mode==='before')throw Error('MEMORY_WRITE_FAILED');values.set(k,String(v));if(mode==='after')throw Error('MEMORY_AFTER_WRITE_FAILED')},removeItem:k=>values.delete(k),injectFault:f=>{fault=f},exportRaw:()=>new Map(values)};memories.add(storage);return storage}
export function inspectTransitionMemorySave({storage,codec,catalog,slot}){if(!memories.has(storage))throw Error('DEV_MEMORY_GATE_REQUIRED');const store=createSaveSlotStore(storage,{canonicalCatalog:catalog,nativeEnvelopeCodec:codec}),raw=store.peek(slot),saved=store.load(slot);if(saved?.compatibilityVersion!==2)throw Error('NATIVE_RESUME_REQUIRED');return {raw,runtime:structuredClone(saved.runtime),location:structuredClone(saved.nativeExtension.location)}}
const same=(a,b)=>stableJSON(a)===stableJSON(b),copy=structuredClone;
const routes=Object.freeze({
 'post-entry:nojasan-summit':Object.freeze({from:'world:hub:POST',to:'world:post:nojasan-summit',cell:[3,12],foot:[68,450],facing:'right'}),
 'post-entry:nojasan-summit:return':Object.freeze({from:'world:post:nojasan-summit',to:'world:hub:POST',cell:[33,7],foot:[2642,765],facing:'down'})
});
/** Trusted integration dependencies supplied once; public transitions accept only the point ID. */
export function createTransitionOwner({worldFactory,initialScene,prepareScene,invokeWarp,registry,storage,codec,catalog,slot,featureGate,restoreRaw=null}){
 if(featureGate!=='NATIVE_MEMORY_TRANSITION_ONLY'||!memories.has(storage))throw Error('DEV_MEMORY_GATE_REQUIRED');
 const store=createSaveSlotStore(storage,{canonicalCatalog:catalog,nativeEnvelopeCodec:codec});
 const existing=store.peek(slot);let restored=null;if(restoreRaw===null){if(existing!==null)throw Error('EXISTING_SLOT_REQUIRES_RESTORE')}else{if(existing!==restoreRaw)throw Error('STALE_RESTORE');restored=store.load(slot);if(restored?.compatibilityVersion!==2)throw Error('NATIVE_RESUME_REQUIRED');if(!same(restored.nativeExtension.location,initialScene.getLocation()))throw Error('RESTORE_LOCATION_MISMATCH')}
 store.acknowledgeRevision(slot,existing);let expectedRaw=existing,conflict=false;
 let current=initialScene,staged=null,pair=null,disposed=false,phase='idle',epoch=0,world,lastRecovery=null,latch=restored?{released:false,left:false}:null;
 const cleanupErrors=[],releasedScenes=new WeakSet();const release=scene=>{if(!scene||releasedScenes.has(scene))return;releasedScenes.add(scene);try{scene.dispose()}catch(error){cleanupErrors.push(String(error?.message??error))}};
 const location=()=>copy(current.getLocation());
 const checked=n=>{const error=registry.validate(n);if(error)throw Error(error);return n};checked(location());
 function persist(next){
  if(disposed)throw Error('OWNER_DISPOSED');
  if(!staged){const recovery=selectedPostRecovery({world,before:world.snapshot(),next,registry});if(recovery)return prepareRecovery(next,recovery);}
  let native=location();
  if(staged?.kind==='recovery'){if(!same(next,staged.next))throw Error('RECOVERY_CAPTURED_DRAFT_CHANGED');native=staged.location;}
  else if(staged){const r=staged.route,p=next.position,last=next.world?.routeLog?.at(-1);if(p.scene!==r.to||p.x!==r.cell[0]*48+24||p.y!==r.cell[1]*48+24||next.world.warps!==staged.before.world.warps+1||last?.warpId!==staged.id||last?.from!==r.from||last?.to!==r.to)throw Error('STAGED_WARP_PAIR_MISMATCH');native=staged.location;}
  if(!staged&&!same(next.position,world.snapshot().position))throw Error('UNREGISTERED_CANONICAL_RELOCATION');
  checked(native);if(next.position.scene!==native.mapId)throw Error('UNREGISTERED_MAP_TRANSITION');
  const candidate={runtime:copy(next),location:copy(native)};if(pair&&!same(pair,candidate))throw Error('PENDING_PAIR_CHANGED');pair??=candidate;
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
  try{const result=store.saveNative(slot,pair.runtime,pair.location);expectedRaw=store.peek(slot);pair=null;if(staged)staged.persisted=true;return result}
  catch(error){const raw=store.peek(slot);try{const saved=raw===null?null:decodeSlot(raw,slot,{canonicalCatalog:catalog,nativeEnvelopeCodec:codec});if(saved?.compatibilityVersion===2&&same(saved.runtime,pair.runtime)&&same(saved.nativeExtension.location,pair.location)){store.acknowledgeRevision(slot,raw);expectedRaw=raw;pair=null;if(staged)staged.persisted=true;return saved}}catch{}if(raw!==expectedRaw)conflict=true;throw error}
 }

 world=worldFactory({persist,runtime:restored?copy(restored.runtime):null});current.bindWorld?.(world);if(world.snapshot().position.scene!==location().mapId||(restored&&!same(world.snapshot(),restored.runtime))){world.dispose();release(current);throw Error('INITIAL_MAP_MISMATCH')}
 function observe(){if(!latch)return;const n=checked(location()),anchor=n.mapId==='world:hub:POST'?[2642,717]:[28,450];if(Math.abs(n.foot[0]-anchor[0])+Math.abs(n.foot[1]-anchor[1])>48)latch.left=true;if(latch.left&&latch.released)latch=null}
 function finish(){if(!staged?.persisted||pair||world.story.pendingCommit)throw Error('WARP_COMMIT_NOT_CONFIRMED');const state=world.snapshot();if(state.position.scene!==staged.route.to)throw Error('CANONICAL_TARGET_NOT_CONFIRMED');const old=current;if(staged.kind==='recovery')lastRecovery={battleId:staged.next.economy.recovery.battleId,hubId:staged.next.economy.recovery.hubId,mapId:staged.location.mapId};current=staged.scene;staged=null;phase='idle';latch={released:false,left:false};release(old);current.stop();}
 function abandon(){release(staged?.scene);staged=null;phase=disposed?'disposed':'idle'}
 return Object.freeze({getWorld:()=>world,getScene:()=>{if(disposed)return null;reconcileRecovery();return current},get lastRecovery(){return lastRecovery?copy(lastRecovery):null},get phase(){return phase},get conflict(){return conflict},get canReload(){return conflict&&!world.pending&&!world.story.busy},get cleanupErrors(){return [...cleanupErrors]},get pending(){return !!pair||!!world.story.pendingCommit},getLocation:()=>location(),exportRaw:()=>store.peek(slot),save(){if(disposed||phase!=='idle'||pair||world.busy||world.inputLocked)throw Error('OWNER_SAVE_BUSY');current.stop();return persist(world.snapshot())},releaseAction(){if(latch){latch.released=true;observe()}},observePosition(){observe()},get reentryBlocked(){return !!latch},
  async transition(id){observe();if(latch)throw Error('ACTION_RELEASE_AND_TRIGGER_EXIT_REQUIRED');const route=Object.hasOwn(routes,id)?routes[id]:null;if(!route)throw Error('UNREGISTERED_TRANSITION');if(disposed||conflict||pair||phase!=='idle'||world.busy||world.inputLocked)throw Error('TRANSITION_BUSY');if(world.snapshot().position.scene!==route.from)throw Error('WRONG_SOURCE_SCENE');const mine=++epoch,before=world.snapshot();phase='preparing';current.stop();let scene;
   try{const target={...registry.describe(route.to),foot:[...route.foot],facing:route.facing};checked(target);scene=await prepareScene(copy(target));if(disposed||mine!==epoch){release(scene);return{cancelled:true}}if(scene===current)throw Error('TARGET_OWNER_MUST_BE_NEW');scene.bindWorld?.(world);if(!same(scene.getLocation(),target))throw Error('TARGET_LANDING_DRIFT');if(!same(world.snapshot(),before))throw Error('SOURCE_CHANGED_DURING_PRELOAD');staged={id,route,before,location:copy(target),scene,persisted:false};phase='committing';await invokeWarp(world,id);if(disposed)return{disposedAfterCommit:true};finish();return{committed:true,mapId:route.to};}
   catch(error){if(disposed||mine!==epoch){if(scene!==current&&scene!==staged?.scene)release(scene);throw error}if(staged&&(pair||world.story.pendingCommit)){phase=disposed?'disposed':'pending';}else{if(!staged)release(scene);abandon()}throw error}
  },
  async retryCommit(){if(conflict)throw Error('NATIVE_SLOT_CONFLICT_RELOAD_REQUIRED');if(disposed)throw Error('OWNER_DISPOSED');if(!staged){if(world.story.pendingCommit){await world.story.retryCommit();world.syncField()}else if(pair)commitCaptured();else throw Error('NO_PENDING_COMMIT');return{committed:true,mapId:current.getLocation().mapId}}if(phase!=='pending')throw Error('NO_TRANSITION_RETRY');phase='committing';try{await world.story.retryCommit();world.syncField();finish();return{committed:true,mapId:current.getLocation().mapId}}catch(error){phase='pending';throw error}},
  cancel(){if(phase==='preparing-recovery')return false;if(phase==='preparing'){epoch++;phase='idle';return true}if(phase==='committing'||phase==='pending')return false;return true},
  dispose(){if(disposed)return;disposed=true;epoch++;phase='disposed';release(current);release(staged?.scene);world.dispose()},
 });
}
