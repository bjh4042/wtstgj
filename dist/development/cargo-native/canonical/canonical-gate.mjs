import {inspectCargoBossAuthority} from '../../../world/cargo-native-authority.mjs';
import {CanonicalWorld} from '../../../world/service.mjs';
import {StoryProgressionService} from '../../../story/progression-service.mjs';
import {validateCanonicalStorySave} from '../../../story/save.mjs';
import {validateWorldLocation} from '../../../world/state.mjs';
import {pointDistance} from '../../../world/definition.mjs';
import {sha256,stableJSON} from '../../../compatibility/codec.mjs';
import {CargoRoomInteractions} from './room-interactions.mjs';

export const SOURCE_COMMIT='645923a3634e08878966ac72210f2189386011f8';
export const BOSS_ID='BLACKNET_HWIGYEONG_FINAL';
export const BOSS_POINT_ID='trainer:BLACKNET_HWIGYEONG_FINAL';
export const BOSS_FLAG='S9_BLACKNET_BOSS_DEFEATED';
export const RESCUE_EVENT='S9_RELEASE_RESCUED';
export const RESCUE_FLAG='S9_FINAL_RESCUE_COMPLETE';
export const REQUIRED_FLAGS=Object.freeze([
 'S9_SHIP_ZONE1_CLEAR','S9_SHIP_ZONE2_RESCUE_CLEAR',
 'S9_BLACKNET_BOMI_DEFEATED','S9_BLACKNET_JUNSEOK_DEFEATED'
]);
const flagSources=Object.freeze({S9_SHIP_ZONE1_CLEAR:'S9_SHIP_ZONE1_COMPLETE_EVENT',S9_SHIP_ZONE2_RESCUE_CLEAR:'S9_SHIP_ZONE2_RESCUE_EVENT',S9_BLACKNET_BOMI_DEFEATED:'BLACKNET_BOMI_FINAL',S9_BLACKNET_JUNSEOK_DEFEATED:'BLACKNET_JUNSEOK_FINAL'});
const bound=new WeakMap(),clone=x=>structuredClone(x);

/** Read exact source-owned committed in-memory state. Never supplies durable:true.
 * This is not installed into the frozen native scene consumer or a user's save. */
export function createCanonicalCargoGateReader({world=null,roomContract,readRoomContext=null,expectedSessionId=null,nativeAuthority=null}={}){
 let disposed=false;
 const originalStory=world?.story,originalCatalog=world?.catalog,originalDefinition=world?.definition;
 const base=()=>({sourceCommit:SOURCE_COMMIT,canRequestDevelopment:false,nativeConsumerInstalled:false,
  durableSaveCertified:false,persistence:'UNKNOWN_NO_PUBLIC_PERSISTENCE_RECEIPT',
  userSaveBound:false,bossPointId:BOSS_POINT_ID,writesFlags:false,writesRewards:false});
 const fail=(reason,extra={})=>({...base(),reason,...extra});
 function inspect(){
  if(disposed)return fail('READER_DISPOSED');
  if(!world)return fail('HOLD_WORLD_UNBOUND');
  if(world.story!==originalStory||world.catalog!==originalCatalog||world.definition!==originalDefinition)return fail('HOST_IDENTITY_CHANGED_REBIND_REQUIRED');
  if(Object.getPrototypeOf(world)!==CanonicalWorld.prototype||Object.getPrototypeOf(world.story)!==StoryProgressionService.prototype)return fail('PINNED_WORLD_CLASS_REQUIRED');
  for(const name of ['snapshot','interact','operation','nearby'])if(Object.hasOwn(world,name))return fail('CANONICAL_WORLD_METHOD_OVERRIDDEN');
  for(const name of ['snapshot','runTrainer','runEvent','trainerAvailable','gate'])if(Object.hasOwn(world.story,name))return fail('CANONICAL_STORY_METHOD_OVERRIDDEN');
  if(world.adapter?.version!=='canonical-20260927'||world.adapter?.releaseProvenance?.policy!=='LATEST_STORY_RETAINED_COMBAT_V1'||world.catalog?.namespace!=='canonical')return fail('APPROVED_SOURCE_RELEASE_REQUIRED');
  let snapshot;
  try{
   snapshot=world.snapshot();
   if(typeof expectedSessionId!=='string'||!expectedSessionId||snapshot.sessionId!==expectedSessionId)return fail('SESSION_IDENTITY_MISMATCH');
   if(!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0)return fail('INVALID_REVISION');
   validateCanonicalStorySave(snapshot,world.catalog);validateWorldLocation(snapshot,world.host);
   if(stableJSON(snapshot)!==stableJSON(world.story.snapshot()))return fail('WORLD_STORY_SNAPSHOT_MISMATCH');
  }catch(error){return fail('CANONICAL_SNAPSHOT_INVALID',{detail:error.message});}
  const contract=world.story.contract,point=world.definition.points[BOSS_POINT_ID];
  const expr=REQUIRED_FLAGS.join('&&');
  if(contract.gates.CAN_FIGHT_HWIGYEONG?.expr.replace(/\s/g,'')!==expr||REQUIRED_FLAGS.some(id=>!contract.flags[id]?.set_by.includes(flagSources[id]))||world.definition.trainerBindings[BOSS_ID]!==BOSS_POINT_ID||point?.kind!=='trainer'||point.trainerId!==BOSS_ID||point.mapId!=='world:ship:S9'||contract.trainers[BOSS_ID]?.eventId!==BOSS_ID)return fail('CANONICAL_BOSS_BINDING_MISMATCH');
  const flags=Object.fromEntries(REQUIRED_FLAGS.map(id=>[id,snapshot.progress.flags[id]]));
  const evidence={sessionId:snapshot.sessionId,revision:snapshot.revision,flags,
   flagEventSources:clone(flagSources),bossDefeated:snapshot.progress.flags[BOSS_FLAG]===true,
   finalRescueComplete:snapshot.progress.flags[RESCUE_FLAG]===true,
   sourceSnapshotValidated:true,inMemoryCommitted:world.story.pendingCommit===false,
   canonicalPosition:clone(snapshot.position),pointDistance:pointDistance(snapshot.position,point)};
  if(world.busy||world.pending||world.story.busy||world.story.pendingCommit||world.inputLocked)return fail('WORLD_OR_STORY_LOCKED',evidence);
  if(snapshot.progress.flags[BOSS_FLAG]===true||snapshot.progress.defeatedTrainers.includes(BOSS_ID))return fail('BOSS_ALREADY_DEFEATED',evidence);
  if(typeof readRoomContext!=='function')return fail('ROOM_OWNER_UNBOUND',evidence);
  let room,roomState;
  try{
   room=readRoomContext();if(!room||room.locked!==false)return fail('ROOM_CONTEXT_LOCKED',evidence);
   roomState=clone(room.state);const probe=new CargoRoomInteractions(roomContract,roomState);
   if(!probe.readyForCode())return fail('ALL_15_VISITS_AND_READS_REQUIRED',evidence);
   if(!probe.passwordAccepted)return fail('EXACT_SIX_CARD_ORDER_REQUIRED',evidence);
  }catch(error){return fail('ROOM_STATE_INVALID',{...evidence,detail:error.message});}
  const missingFlags=REQUIRED_FLAGS.filter(id=>flags[id]!==true);
  if(missingFlags.length)return fail('EXISTING_FOUR_FLAGS_REQUIRED',{...evidence,missingFlags});
  if(!world.story.gate('CAN_FIGHT_HWIGYEONG')||!world.story.trainerAvailable(BOSS_ID))return fail('SOURCE_TRAINER_UNAVAILABLE',evidence);
  if(!inspectCargoBossAuthority(nativeAuthority,world,BOSS_POINT_ID))return fail('NATIVE_CARGO_AUTHORITY_REJECTED',evidence);
  if(snapshot.developmentOnly!==true)return fail('DEVELOPMENT_HOST_REQUIRED',evidence);
  const latest=world.snapshot();
  if(world.story!==originalStory||latest.sessionId!==snapshot.sessionId||latest.revision!==snapshot.revision)return fail('WORLD_CHANGED_DURING_READ',evidence);
  const stamp={sessionId:snapshot.sessionId,revision:snapshot.revision,roomDigest:sha256(stableJSON(roomState)),positionDigest:sha256(stableJSON(snapshot.position))};
  return {...base(),...evidence,canRequestDevelopment:true,reason:'DEV_EXISTING_INTERACTION_ELIGIBLE_ONLY',stamp};
 }
 const reader=Object.freeze({inspect,dispose(){disposed=true;}});
 bound.set(reader,{world,inspect});return reader;
}

/** Connect the already-built joined room owner without replacing its live state. */
export function createJoinedRoomContextReader(session){
 if(typeof session?.snapshot!=='function'||typeof session?.roomSnapshot!=='function')throw Error('JOINED_ROOM_SESSION_REQUIRED');
 return ()=>{const s=session.snapshot();return {state:session.roomSnapshot(),locked:s.active!==true||s.hidden===true||s.fixturePending===true||s.native?.active!==true||!!s.native.pending||typeof s.native.clock?.paused!=='boolean'||s.native.clock.paused===true||s.uiMode!==null};};
}

/** Explicit opt-in DEV binding. It calls only the existing world.interact path.
 * It does not unlock native doors, call runTrainer directly, set flags, invent
 * rewards, install a persistence owner, or cancel a battle that already started. */
export function createDevelopmentBossRequestBinding(reader){
 const owner=bound.get(reader);if(!owner)throw Error('SOURCE_BOUND_READER_REQUIRED');
 let prepared=null,pending=null,serial=0,disposed=false;
 const used=new WeakSet();
 function prepare(){
  if(disposed)return {ok:false,reason:'BINDING_DISPOSED'};
  if(pending)return {ok:false,reason:'REQUEST_PENDING'};
  prepared=null;
  const status=owner.inspect();if(!status.canRequestDevelopment)return {ok:false,reason:status.reason,status};
  const stamp=clone(status.stamp),token=Object.freeze({requestId:++serial,stamp:Object.freeze(clone(stamp))});prepared={token,stamp};
  return {ok:true,reason:'DEV_REQUEST_PREPARED',token,status};
 }
 async function request(token){
  if(disposed)return {ok:false,reason:'BINDING_DISPOSED'};
  if(pending)return {ok:false,reason:'REQUEST_PENDING'};
  if(!token||typeof token!=='object'||token!==prepared?.token||used.has(token))return {ok:false,reason:'STALE_OR_DUPLICATE_REQUEST'};
  const expectedStamp=prepared.stamp;used.add(token);prepared=null;
  const status=owner.inspect();
  if(!status.canRequestDevelopment)return {ok:false,reason:status.reason,status};
  if(stableJSON(status.stamp)!==stableJSON(expectedStamp))return {ok:false,reason:'STATE_CHANGED_REPREPARE_REQUIRED',status};
  const ticket={id:token.requestId};pending=ticket;
  try{
   // No await exists between the final snapshot check and the source-owned call.
   // The original world validates distance/lock and delegates trainer/event/battle.
   const result=await owner.world.interactNativeCargo(BOSS_POINT_ID,{type:'challenge'});
   return {ok:true,reason:'EXISTING_WORLD_INTERACTION_RESOLVED',developmentOnly:true,
    sourceOwnedResult:result,after:owner.inspect(),nativeGateChanged:false};
  }catch(error){return {ok:false,reason:'EXISTING_WORLD_INTERACTION_REJECTED',message:error.message,after:owner.inspect(),nativeGateChanged:false};}
  finally{if(pending===ticket)pending=null;}
 }
 function cancel(){
  prepared=null;
  return pending?{cancelled:false,reason:'CANONICAL_OPERATION_ALREADY_STARTED',hostStillRunning:true,rollbackPerformed:false}:{cancelled:true,reason:'PREPARED_REQUEST_CANCELLED',hostStillRunning:false,rollbackPerformed:false};
 }
 return Object.freeze({prepare,request,cancel,get pending(){return !!pending;},dispose(){disposed=true;return cancel();}});
}
