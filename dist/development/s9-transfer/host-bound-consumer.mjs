import{verifyEightSceneRegistry}from'../../world/cargo-eight-scene-geometry.mjs';
import {verifySevenSceneRegistry} from '../../world/cargo-seven-scene-geometry.mjs';
import {verifyFiveSceneRegistry} from '../../world/cargo-five-scene-geometry.mjs';
import {verifyThreeSceneRegistry} from '../../world/cargo-three-scene-geometry.mjs';
import {verifyBridgeRegistry} from '../../world/cargo-bridge-geometry.mjs';
import {createPortRoomSession} from './port-room-session.mjs';
import {createCanonicalCargoGateReader,createJoinedRoomContextReader,createDevelopmentBossRequestBinding} from '../cargo-native/canonical/canonical-gate.mjs';
import {sha256,stableJSON} from '../../compatibility/codec.mjs';

// The host owns this exact module graph, its session, persistence and battle UI.
export {CanonicalWorld} from '../../world/service.mjs';
export {loadApprovedLatestRuntimeAdapter} from '../../compatibility/approved-latest-runtime-adapter.mjs';

/** Optional source host, never an auto-created save or pretend world.
 * Native pixels and canonical cells are deliberately NOT synchronized here. */
export function createHostBoundCargoConsumer(options){
 const {world=null,expectedSessionId=null,nativeBossAuthority=null,onReleaseMovement=()=>{},...nativeOptions}=options;
 const contract=structuredClone(options.contract),registry=structuredClone(options.registry);
 if(sha256(stableJSON(contract))!=='316425446b5ab2c41094251266c0deab0ef36068a97a9b8fa26e41430caae3e8'||(sha256(stableJSON(registry))!=='112d585497b087dff7e25569c22a2ead584c486e837595bffa39380d969a9072'&&!verifyBridgeRegistry(registry)&&!verifyThreeSceneRegistry(registry)&&!verifyFiveSceneRegistry(registry)&&!verifySevenSceneRegistry(registry)&&!verifyEightSceneRegistry(registry)))throw Error('PINNED_NATIVE_CONTRACT_REQUIRED');
 let binding=null,prepared=null,inFlight=null,destroyed=false,lastStatus=null,serial=0,clockHeld=false;
 const held=new Set();
 function invalidate(){prepared=null;return binding?.cancel();}
 const native=createPortRoomSession({...nativeOptions,contract,registry,onReleaseMovement(){invalidate();try{onReleaseMovement();}catch{/* A view callback cannot strand the source operation. */}}});
 const reader=createCanonicalCargoGateReader({world,expectedSessionId,nativeAuthority:nativeBossAuthority,roomContract:contract,readRoomContext:createJoinedRoomContextReader(native)});
 binding=createDevelopmentBossRequestBinding(reader);
 const atTerminal=()=>{const n=native.snapshot().native;return n.sceneId===contract.bossGate.mapId&&contract.bossGate.switchInteractionPadCenters.some(p=>p.every((v,i)=>Math.abs(v-n.foot[i])<=8));};
 const locked=()=>destroyed||!!inFlight;
 const hostInputLocked=()=>world?.busy===true||world?.inputLocked===true||world?.story?.pendingCommit===true;
 const nativeLocked=()=>locked()||hostInputLocked();
 function inspectBoss(){
  let status;
  if(destroyed)status={canRequestDevelopment:false,reason:'CONSUMER_DISPOSED'};
  else if(inFlight)status={canRequestDevelopment:false,reason:'CANONICAL_OPERATION_PENDING'};
  else if(!world)status={canRequestDevelopment:false,reason:'HOST_UNBOUND'};
  else if(!native.canAct())status={canRequestDevelopment:false,reason:'NATIVE_CONTEXT_LOCKED'};
  else if(!atTerminal())status={canRequestDevelopment:false,reason:'NATIVE_TERMINAL_APPROACH_REQUIRED'};
  else status=reader.inspect();
  lastStatus=status;return structuredClone(status);
 }
 function prepareBoss({token,repeat=false,explicitInteract=false}={}){
  invalidate();
  if(locked())return {ok:false,reason:destroyed?'CONSUMER_DISPOSED':'CANONICAL_OPERATION_PENDING'};
  if(explicitInteract!==true||typeof token!=='string'||!token)return {ok:false,reason:'EXPLICIT_INPUT_REQUIRED'};
  if(repeat||held.has(token))return {ok:false,reason:'INPUT_REPEAT'};
  if(held.size)return {ok:false,reason:'INPUT_RELEASE_REQUIRED'};
  held.add(token);
  const status=inspectBoss();if(!status.canRequestDevelopment)return {ok:false,reason:status.reason,status};
  const source=binding.prepare();if(!source.ok)return source;
  const ticket=Object.freeze({id:++serial});prepared={ticket,sourceToken:source.token};
  return {ok:true,reason:'HOST_REQUEST_PREPARED',token:ticket,status};
 }
 async function requestBoss(token){
  if(locked())return {ok:false,reason:destroyed?'CONSUMER_DISPOSED':'CANONICAL_OPERATION_PENDING'};
  if(!prepared||prepared.ticket!==token)return {ok:false,reason:'STALE_OR_DUPLICATE_REQUEST'};
  const sourceToken=prepared.sourceToken;prepared=null;
  const status=inspectBoss();if(!status.canRequestDevelopment){binding.cancel();return {ok:false,reason:status.reason,status};}
  // Source binding rechecks canonical revision, room digest and all original gates.
  // Set the wrapper lock before calling source code: host hooks may re-enter.
  // The reader uses the underlying owned native context, not this wrapper lock.
  const ticket={};inFlight=ticket;
  try{const task=binding.request(sourceToken);native.cancelContext('CANONICAL_OPERATION_STARTED');return await task;}
  finally{if(inFlight===ticket)inFlight=null;if(!destroyed)native.blur();lastStatus=null;}
 }
 const cancelBoss=()=>{const result=invalidate();held.clear();return result;};
 const canAct=()=>!nativeLocked()&&native.canAct();
 const api={
  inspectBoss,prepareBoss,requestBoss,cancelBoss,canAct,
  snapshot(){return {...native.snapshot(),boss:{hostProvided:world!==null,pending:!!inFlight,hostInputLocked:hostInputLocked(),developmentNativeBinding:true,userSaveCertified:false,lastInspected:lastStatus?structuredClone(lastStatus):null,reason:inFlight?'CANONICAL_OPERATION_PENDING':destroyed?'CONSUMER_DISPOSED':lastStatus?.reason??(world?'HOST_NOT_INSPECTED':'HOST_UNBOUND')}};},
  notebook:()=>native.notebook(),roomSnapshot:()=>native.roomSnapshot(),doorSnapshot:()=>native.doorSnapshot(),directions:()=>native.directions(),
  inputUp(token){held.delete(token);native.inputUp(token);},
  frame(now){if(nativeLocked()){if(!clockHeld){clockHeld=true;native.blur();}return 0;}if(clockHeld){clockHeld=false;native.blur();}return native.frame(now);},
  cancelContext(reason){cancelBoss();native.cancelContext(reason);},
  blur(){cancelBoss();native.blur();},
  setHidden(value){if(value)cancelBoss();native.setHidden(value);},
  setPaused(value){if(value)cancelBoss();native.setPaused(value);},
  cancelRead(){invalidate();native.cancelRead();},
  closeNotebook(){invalidate();native.closeNotebook();},
  destroy(){if(destroyed)return;destroyed=true;cancelBoss();binding.dispose();reader.dispose();native.destroy();}
 };
 const denied={recordMovement:false,toggleRoom:'INTERACTION_LOCKED',requestRead:null,acknowledgeDisplayed:false,confirmRead:{ok:false,reason:'INTERACTION_LOCKED'},openNotebook:false,selectCard:false,undoCard:undefined,clearCards:undefined,submitCards:{ok:false,reason:'INTERACTION_LOCKED'},setClockMinutes:false,setOption:false,loadCheckpoint:false,reset:false};
 for(const [method,rejected] of Object.entries(denied))api[method]=(...args)=>{if(nativeLocked())return structuredClone(rejected);invalidate();return native[method](...args);};
 for(const method of ['requestPort','selectFixture'])api[method]=async(...args)=>{if(nativeLocked())return {ok:false,reason:destroyed?'CONSUMER_DISPOSED':inFlight?'CANONICAL_OPERATION_PENDING':'WORLD_OR_STORY_LOCKED'};invalidate();return native[method](...args);};
 return Object.freeze(api);
}
