import{CanonicalWorld}from'../../world/service.mjs';
import{SpeciesCatalogService}from'../../species-catalog-service.mjs';
import{stableJSON}from'../../compatibility/codec.mjs';
import{createSaveSlotStore,decodeSlot,SAVE_SLOTS,SLOT_PREFIX}from'./save-slots.mjs';
import{isCargoMemoryStorage}from'./memory-storage.mjs';
import{loadCargoSaveResources}from'./resources.mjs';
import{REVISION,MAP}from'./native-envelope.mjs';
import{createHostBoundCargoConsumer}from'./host-bound-consumer.mjs';
import{createBossDoorAuthority}from'../../development/cargo-native/boss-door-owner.mjs';
import{createCargoHostReaders}from'../../development/cargo-native/host-readers.mjs';
import{createCargoNativeAuthority}from'../../world/cargo-native-authority.mjs';
import{createCargoOfficerHostReaders}from'../../development/cargo-native/officer-host-readers.mjs';
import{createCargoOfficerAuthority}from'../../world/cargo-officer-authority.mjs';
import{createCargoZoneHostReaders}from'../../development/cargo-native/zone-host-readers.mjs';
import{createCargoZoneAuthority}from'../../world/cargo-zone-authority.mjs';
import{createCargoRescueHostReaders}from'../../development/cargo-native/rescue-host-readers.mjs';
import{createCargoRescueAuthority}from'../../world/cargo-rescue-authority.mjs';
import{createRescuePortAccess}from'../../development/cargo-native/rescue-port-access.mjs';
import{createCargoChestHostReaders}from'../../development/cargo-native/chest-host-readers.mjs';
import{createCargoSupplyAuthority}from'../../world/cargo-supply-authority.mjs';
import{createPresentationScope}from'../../development/jungle-native/teardown_candidate/presentation-scope.mjs';
const hostOwners=new WeakMap(),restorePermits=new WeakMap();
export function consumeCargoRestorePlacement(token,initial){const p=restorePermits.get(token);if(!p||p.used||!p.live()||['sceneId','mapId','foot','facing','layer'].some(k=>stableJSON(initial[k])!==stableJSON(p.location[k])))return false;p.used=true;return true}
export function cargoMemoryHostBinding(owner){const b=hostOwners.get(owner);if(!b)throw Error('CARGO_MEMORY_OWNER_REQUIRED');return b}
const same=(a,b)=>stableJSON(a)===stableJSON(b);
export async function preloadCargoMemoryOwner({featureGate,storage,slot='SLOT_1',adapter,runtime=null,restore=false,readBytes,decodeMask,decodeArt,signal,pageCache,hooks={},battleDriver}){
 if(featureGate!=='CARGO_DEV_ATOMIC_MEMORY_ONLY'||!isCargoMemoryStorage(storage)||!SAVE_SLOTS.includes(slot))throw Error('CARGO_MEMORY_FEATURE_GATE');
 let disposed=false,world,c,epoch=0,pending=null,conflict=false,expectedRaw,restoreDoors=null;const readerBindings={};const materials=new Map(),presentation=createPresentationScope();
 const check=()=>{if(disposed||signal?.aborted)throw Error('CARGO_OWNER_CANCELLED')};check();
 const observedBeforeLoad=storage.getItem(SLOT_PREFIX+slot+'.primary');
 let resources,catalog,store;const teardownErrors=[];
 const cleanCall=fn=>{try{fn()}catch(e){teardownErrors.push(String(e.message??e))}};
 try{resources=await loadCargoSaveResources({readBytes,decodeMask,decodeArt,signal,pageCache});catalog=new SpeciesCatalogService({namespace:'canonical',adapter});store=createSaveSlotStore(storage,{canonicalCatalog:catalog,nativeEnvelopeCodec:resources.codec,readOnlyLoads:true});expectedRaw=store.peek(slot)}catch(e){cleanCall(()=>resources?.dispose());cleanCall(()=>presentation.dispose());throw e}
 const{contract,registry,codec,chestPhysics,engineUpperLayer,roomApproach,portApproach}=resources;
 const decode=raw=>decodeSlot(raw,slot,{canonicalCatalog:catalog,nativeEnvelopeCodec:codec});
 const currentWorld=()=>disposed?null:world;
 const getters={getConsumer:()=>disposed||pending||conflict?null:c,getMaterial:id=>materials.get(id),getWorld:currentWorld,getConsumerWorld:()=>world,getSessionEpoch:()=>epoch,registry};
 let saved=null;
 const cleanup=()=>{cleanCall(()=>presentation.dispose());cleanCall(()=>c?.destroy());for(const m of materials.values())cleanCall(()=>m.dispose());materials.clear();cleanCall(()=>resources.dispose());cleanCall(()=>world?.dispose())};
 function observeConflict(){if(store.peek(slot)!==expectedRaw)conflict=true;return conflict}
 function checkpoint(){const s=c.snapshot(),n=s.native;if(!s.active||s.hidden||s.fixturePending||n.pending||n.clock.paused||s.uiMode!==null||s.draft.length||Object.values(s.doors).some(d=>!['open','closed'].includes(d.phase)))throw Error('CARGO_UNSTABLE_CHECKPOINT');const m=materials.get(n.sceneId),upper=n.movementLayer?.layer==='upper';return{version:1,ownerRevision:REVISION,registryRevision:registry.revision,location:{sceneId:n.sceneId,mapId:MAP,foot:[...n.foot],facing:n.facing,layer:upper?'centralUpper':'ground',imageSHA:m.artSHA256,maskSHA:m.footMaskSHA256,geometryRevision:m.geometryRevision,geometryState:m.geometryState,layerRevision:upper?n.movementLayer.revision:null,layerMaskSHA:upper?n.movementLayer.maskSHA:null},rooms:s.rooms,doors:s.doors}}
 function accept(raw,pair){const record=decode(raw);if(!same(record.runtime,pair.runtime)||!same(record.nativeExtension.checkpoint,pair.native))throw Error('CARGO_READBACK_PAIR_MISMATCH');store.acknowledgeRevision(slot,raw);expectedRaw=raw;pending=null;return record}
 function persist(next){check();if(observeConflict())throw Error('CARGO_SLOT_CONFLICT');if(!same(next.position,world.snapshot().position))throw Error('CARGO_CANONICAL_RELOCATION_HOLD');const pair={runtime:structuredClone(next),native:checkpoint()};if(pending&&!same(pair,pending))throw Error('CARGO_PENDING_PAIR_CHANGED');pending??=pair;try{store.saveNative(slot,pending.runtime,pending.native);return accept(store.peek(slot),pending)}catch(error){if(pending){try{return accept(store.peek(slot),pending)}catch{}}if(store.peek(slot)!==expectedRaw)conflict=true;throw error}}
 try{check();if(expectedRaw!==observedBeforeLoad)throw Error('CARGO_RESTORE_STALE');if(restore){if(expectedRaw===null)throw Error('CARGO_EMPTY_SLOT');saved=decode(expectedRaw);if(saved.compatibilityVersion!==2)throw Error('CARGO_LEGACY_NATIVE_RESUME_HOLD');runtime=saved.runtime;restoreDoors=saved.nativeExtension.checkpoint.doors}else if(expectedRaw!==null)throw Error('CARGO_EXISTING_SLOT_REQUIRES_RESTORE');store.acknowledgeRevision(slot,expectedRaw);
 const bossReaders=createCargoHostReaders({getConsumer:()=>disposed||pending||conflict?null:c,getMaterial:id=>materials.get(id),contract,registry}),bossAuthority=createCargoNativeAuthority({roomContract:contract,...bossReaders});
 const officerReaders=createCargoOfficerHostReaders({...getters,getSignal:()=>presentation.signal}),officerAuthority=createCargoOfficerAuthority({readers:officerReaders,getWorld:currentWorld,contract});
 const zoneReaders=createCargoZoneHostReaders(getters),zoneAuthority=createCargoZoneAuthority({readers:zoneReaders,getWorld:currentWorld});
 const rescueReaders=createCargoRescueHostReaders(getters),rescueAuthority=createCargoRescueAuthority({readers:rescueReaders,getWorld:currentWorld});Object.assign(readerBindings,{officerReaders,zoneReaders,rescueReaders});
 const supplyReaders=createCargoChestHostReaders({...getters,contract,physics:chestPhysics}),supplyAuthority=createCargoSupplyAuthority({getWorld:currentWorld,readNative:supplyReaders.readNative});
 const load=async spec=>{const m=await resources.load(spec,()=>c?.doorSnapshot()??restoreDoors??{});try{check();materials.set(spec.sceneId,m);return m}catch(e){m.dispose();throw e}};
 const initial=saved?{...saved.nativeExtension.checkpoint.location,restoreArrival:true}:{sceneId:'ship_deck_a',foot:[1320,185],facing:'down'};
 const material=await load(registry.scenes[initial.sceneId]);check();if(store.peek(slot)!==expectedRaw)throw Error('CARGO_RESTORE_STALE');
 const rescueAccess=createRescuePortAccess({getWorld:currentWorld,getConsumerWorld:()=>world,registry});readerBindings.rescueAccess=rescueAccess;
 var initialRuntime=structuredClone(runtime),bound=false;
 var bindWorldLocal=(options={})=>{check();if(bound||world)throw Error('CARGO_WORLD_ALREADY_BOUND');if(store.peek(slot)!==expectedRaw)throw Error('CARGO_BIND_STALE');if(options.runtime!==undefined&&!same(options.runtime,initialRuntime))throw Error('CARGO_MAIN_RUNTIME_MISMATCH');bound=true;
  const incomingHooks=options.hooks??hooks,wrapped={...incomingHooks};for(const key of ['dialogue','cutIn','nextFrame'])if(typeof incomingHooks[key]==='function')wrapped[key]=presentation.wrap(incomingHooks[key]);
  try{world=new CanonicalWorld({...options,adapter,runtime:initialRuntime,persist,hooks:wrapped,battleDriver:options.battleDriver??battleDriver,nativeCargoAuthority:bossAuthority,nativeCargoOfficerAuthority:officerAuthority,nativeCargoZoneAuthority:zoneAuthority,nativeCargoRescueAuthority:rescueAuthority,nativeCargoSupplyAuthority:supplyAuthority});if(world.map.id!==MAP||world.snapshot().developmentOnly!==true)throw Error('CARGO_WORLD_REQUIRED');
   if(saved){const permit=Object.freeze({});restorePermits.set(permit,{location:saved.nativeExtension.checkpoint.location,used:false,live:()=>!disposed});initial.restorePermit=permit;}
   c=createHostBoundCargoConsumer({contract,registry,world,expectedSessionId:world.snapshot().sessionId,nativeBossAuthority:bossAuthority,bossDoorAuthority:createBossDoorAuthority({getWorld:currentWorld,getConsumerWorld:()=>world,registry}),rescueAccess,chestPhysics,engineUpperLayer,roomApproach,portApproach,roomState:saved?.nativeExtension.checkpoint.rooms??null,restoredDoors:restoreDoors,initial,initialMaterial:material,loadScene:load,onReleaseMovement:()=>epoch++});
   if(saved){const now=checkpoint();if(!same(now,saved.nativeExtension.checkpoint)||!same(world.snapshot(),saved.runtime))throw Error('CARGO_RESTORE_DRIFT')}return world;
  }catch(e){disposed=true;cleanup();throw e}
 };
 }catch(e){disposed=true;cleanup();throw e}
 const locked=()=>disposed||!world||observeConflict()||!!pending||world.inputLocked||world.busy||world.story.pendingCommit;
 const api={teardownDiagnostics:()=>[...teardownErrors,...resources.teardownDiagnostics()],getWorld:()=>world??null,bindWorld:options=>bindWorldLocal(options),initialRuntime:()=>structuredClone(initialRuntime),snapshot:()=>({ready:!!world,canonical:world?.snapshot()??null,native:c?.snapshot()??null,pending:!!pending,conflict,ownerRevision:REVISION}),save(){if(locked())throw Error('CARGO_SAVE_LOCKED');return persist(world.snapshot())},async retryCommit(){check();if(observeConflict())throw Error('CARGO_SLOT_CONFLICT');if(world.story.pendingCommit){await world.story.retryCommit();world.syncField();return world.snapshot()}if(pending)return persist(pending.runtime);throw Error('NO_PENDING_COMMIT')},exportRaw:()=>store.peek(slot),frame(now){return locked()?0:c.frame(now)},release(token){c.inputUp(token)},dispose(){if(disposed)return;disposed=true;epoch++;cleanup()}};
 // No public raw consumer, checkpoint import, fixture selector, or position setter.
 for(const name of ['recordMovement','toggleRoom','requestRead','acknowledgeDisplayed','confirmRead','cancelRead','openNotebook','closeNotebook','selectCard','undoCard','clearCards','submitCards','requestPort'])api[name]=(...args)=>locked()?false:c[name](...args);
 const hostConsumer={snapshot:()=>c.snapshot(),doorSnapshot:()=>c.doorSnapshot(),roomSnapshot:()=>c.roomSnapshot(),notebook:()=>c.notebook(),directions:()=>c.directions(),canAct:()=>!locked()&&c.canAct(),frame:api.frame,inputUp:token=>c.inputUp(token),destroy:()=>c.setPaused(true),setPaused:v=>c.setPaused(v),setHidden:v=>c.setHidden(v),blur:()=>c.blur(),inspectBoss:()=>c.inspectBoss(),prepareBoss:(...x)=>locked()?{ok:false,reason:'OWNER_LOCKED'}:c.prepareBoss(...x),requestBoss:(...x)=>locked()?Promise.resolve({ok:false,reason:'OWNER_LOCKED'}):c.requestBoss(...x),cancelBoss:()=>c.cancelBoss()};for(const name of ['recordMovement','toggleRoom','requestRead','acknowledgeDisplayed','confirmRead','cancelRead','openNotebook','closeNotebook','selectCard','undoCard','clearCards','submitCards','requestPort'])hostConsumer[name]=api[name];
 hostOwners.set(api,{readers:readerBindings,resources,materials,hostConsumer:Object.freeze(hostConsumer),contract,registry,get world(){return world},locked});
 const abort=()=>api.dispose();signal?.addEventListener('abort',abort,{once:true});const originalDispose=api.dispose;api.dispose=()=>{signal?.removeEventListener('abort',abort);originalDispose()};if(signal?.aborted)api.dispose();return Object.freeze(api);
}

// Test/programmatic convenience; browser entry uses preload + exact main sync bind.
export async function createCargoMemoryOwner(options){const owner=await preloadCargoMemoryOwner(options);try{owner.bindWorld();return owner}catch(e){owner.dispose();throw e}}
