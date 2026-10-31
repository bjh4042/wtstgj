// FEATURE GATE: memory-only ordinary-envelope end-to-end candidate, no user keys.
import {createSaveSlotStore,decodeSlot,SLOT_PREFIX,SAVE_SLOTS} from './save-slots.mjs';
import {CanonicalWorld} from '../../world/service.mjs';
import {SpeciesCatalogService} from '../../species-catalog-service.mjs';
import {stableJSON} from '../../compatibility/codec.mjs';
import {NativeHomeSession} from '../native-map/verified/native_home_entries_remaining_1524/session.mjs';
import {SELECTED_MAP_REVISION} from './native-location.mjs';
const memories=new WeakSet();
export function createNativeMemoryStorage(){const values=new Map();let fail=null;const storage={getItem:k=>values.get(k)??null,setItem(k,v){const verdict=fail?.(k,v);if(verdict==='before')throw Error('MEMORY_WRITE_FAILED');values.set(k,String(v));if(verdict==='after')throw Error('MEMORY_AFTER_WRITE_FAILED')},removeItem:k=>values.delete(k),injectFault(fn){fail=fn},exportRaw:()=>new Map(values)};memories.add(storage);return storage;}
export async function createNativeMemorySession({featureGate,storage,slot,adapter,codec,contract,masks,runtime=null,restore=false,signal=null}){
 const checkAbort=()=>{if(signal?.aborted)throw Error('NATIVE_RESTORE_CANCELLED')};checkAbort();
 if(!SAVE_SLOTS.includes(slot))throw Error('Unknown save slot');
 if(featureGate!=='NATIVE_MEMORY_E2E_ONLY'||!memories.has(storage))throw Error('NATIVE_MEMORY_FEATURE_GATE_REQUIRED');
 const initialRaw=storage.getItem(SLOT_PREFIX+slot+'.primary');
 if(!restore&&initialRaw!==null)throw Error('NATIVE_EXISTING_SLOT_REQUIRES_RESTORE');
 contract=structuredClone(contract);masks=Object.fromEntries(Object.entries(masks).map(([key,bytes])=>[key,bytes.slice()]));
 const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
 for(const[key,meta]of Object.entries(contract.masks)){checkAbort();if(!(masks[key] instanceof Uint8Array)||await hash(masks[key])!==meta.sha256)throw Error('NATIVE_MOVEMENT_MASK_PIN_MISMATCH');}checkAbort();
 if(restore&&storage.getItem(SLOT_PREFIX+slot+'.primary')!==initialRaw)throw Error('NATIVE_RESTORE_STALE');
 const catalog=new SpeciesCatalogService({namespace:'canonical',adapter}),store=createSaveSlotStore(storage,{canonicalCatalog:catalog,nativeEnvelopeCodec:codec});
 store.acknowledgeRevision(slot,initialRaw);let expectedRaw=initialRaw,conflict=false;
 const saved=restore?decodeSlot(initialRaw,slot,{canonicalCatalog:catalog,nativeEnvelopeCodec:codec}):null;if(restore&&saved?.compatibilityVersion!==2)throw Error('NATIVE_RESUME_REQUIRED');
 if(saved)runtime=saved.runtime;
 const session=new NativeHomeSession({contract,homeId:'upper',masks});let world=null,disposed=false,pending=null;
 if(saved){const n=saved.nativeExtension.location;if(n.sceneId!=='native:jangmok:exterior'||!session.safe('exterior',n.foot)){session.dispose();throw Error('NATIVE_SCENE_NOT_INSTALLED');}session.scene='exterior';session.foot=structuredClone(n.foot);session.facing=n.facing;}
 const location=()=>({version:1,sceneId:'native:jangmok:exterior',mapId:'world:hub:S2',mapRevision:SELECTED_MAP_REVISION,imageSHA:contract.sources.exterior.sha256,maskSHA:contract.masks.exterior.sha256,foot:[...session.foot],facing:session.facing});
 const persist=next=>{
  if(disposed)throw Error('NATIVE_OWNER_DISPOSED');if(conflict||store.peek(slot)!==expectedRaw){conflict=true;throw Error('NATIVE_SLOT_CONFLICT_RELOAD_REQUIRED')}
  if(stableJSON(next.position)!==stableJSON(world.snapshot().position))throw Error('UNREGISTERED_CANONICAL_RELOCATION');
  const pair={runtime:structuredClone(next),location:location()};
  if(pending&&stableJSON(pending.runtime)!==stableJSON(pair.runtime))throw Error('NATIVE_PENDING_SNAPSHOT_CHANGED');
  pending??=pair; // Retries retain the exact original native/runtime pair.
  try{const result=store.saveNative(slot,pending.runtime,pending.location);expectedRaw=store.peek(slot);pending=null;return result;}
  catch(error){
   // A storage implementation may throw after an atomic primary write. Accept
   // only exact validated readback; never rerun the gameplay action.
   const raw=store.peek(slot);try{const current=raw===null?null:decodeSlot(raw,slot,{canonicalCatalog:catalog,nativeEnvelopeCodec:codec});if(current?.compatibilityVersion===2&&stableJSON(current.runtime)===stableJSON(pending.runtime)&&stableJSON(current.nativeExtension.location)===stableJSON(pending.location)){store.acknowledgeRevision(slot,raw);expectedRaw=raw;pending=null;return current;}}catch{}
   if(raw!==expectedRaw)conflict=true;
   throw error;
  }
 };
 let hooks={};const hookBridge=Object.fromEntries(['dialogue','cutIn','nextFrame','battleReady','battleFinished'].map(key=>[key,(...args)=>hooks[key]?.(...args)]));
 try{world=new CanonicalWorld({adapter,runtime,persist,hooks:hookBridge});if(world.map.id!=='world:hub:S2')throw Error('NATIVE_LOGICAL_MAP_REQUIRED');}
 catch(error){session.dispose();world?.dispose();throw error;}
 return {
  getWorld:()=>world,bindPresentation(next){if(disposed||world.busy)throw Error('NATIVE_OWNER_BUSY');hooks=next??{};},getNativeState:()=>session.snapshot(),stop(){session.stopGait()},getLocation:()=>structuredClone(location()),get conflict(){return conflict},get canReload(){return conflict&&!world.pending&&!world.story.busy},get pending(){return conflict||!!pending||!!world.story.pendingCommit},
  move(direction){if(disposed||conflict||world.inputLocked||pending)return {ok:false,reason:'INPUT_LOCKED'};return session.move(direction)},
  save(){if(disposed||conflict||world.inputLocked||pending)throw Error('NATIVE_SAVE_BUSY');return persist(world.snapshot())},
  async retryCommit(){if(conflict)throw Error('NATIVE_SLOT_CONFLICT_RELOAD_REQUIRED');if(disposed)throw Error('NATIVE_OWNER_DISPOSED');if(world.story.pendingCommit){await world.story.retryCommit();world.syncField();return;}if(pending)return persist(pending.runtime);throw Error('NO_PENDING_COMMIT');},
  exportRaw:()=>store.peek(slot),
  dispose(){disposed=true;session.dispose();world.dispose()}
 };
}
