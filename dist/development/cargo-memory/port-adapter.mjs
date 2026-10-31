import{consumeCargoRestorePlacement}from'./session-owner.mjs';
import{cargoOfficerBodyClear}from'../../development/cargo-native/officer-registration.mjs';
import{isRescuePort,isRescuePortAccess,containsRescuePort,allowsRescuePort,captureRescuePort,assertRescuePort,releaseRescuePort}from'../../development/cargo-native/rescue-port-access.mjs';
import{cargoRescueBodyClear}from'../../development/cargo-native/rescue-host-readers.mjs';
import{verifyEightSceneRegistry,verifyEightSceneMaterial}from'../../world/cargo-eight-scene-geometry.mjs';
import {isCargoChestPhysics,chestPhysicsAllowsFoot,chestPhysicsFootClear} from '../../development/cargo-native/cargo-chest-physics.mjs';
import {isEngineUpperLayer,canEngineLayerStep,engineLayerSnapshot} from '../../development/cargo-native/engine-upper-layer.mjs';
import {isPortApproach,containsPortApproach,allowsPortApproach} from '../../development/cargo-native/port-approach.mjs';
import {verifySevenSceneMaterial} from '../../world/cargo-seven-scene-geometry.mjs';
/** Native presentation only. Does not write saves, story flags, floor, or canonical world position. */
const clone=x=>structuredClone(x);
const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===2&&a.every((v,i)=>v===b[i]);
const foot=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger);
const facing=f=>['up','down','left','right'].includes(f);
const deepFreeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')deepFreeze(v);return Object.freeze(o)};
export function validateRegistry(input){
 const r=clone(input),ids=new Set(),permitted=['DEV_ONLY_CURRENT_OPEN_PASSAGES','ROOT_AUTHORIZED_NEW_OPEN_DECK_CONTINUATION_DEV_ONLY'];
 if(r.scope!=='ISOLATED_DEVELOPMENT_MEMORY_ONLY'||r.canonicalInstalled!==false||r.sourceCoordinateSystem!=='nativePixels')throw Error('REGISTRY_SCOPE');
 for(const d of r.directions){
  if(ids.has(d.id)||d.mode!=='development'||d.canonicalInstalled!==false||!(permitted.includes(d.condition)||(d.condition==='ORIGINAL_COMMITTED_BOSS_RESCUE_EDGE'&&verifyEightSceneRegistry(r)&&isRescuePort(d)))||!foot(d.departureFoot)||!foot(d.arrivalFoot)||!foot(d.returnDepartureFoot)||!facing(d.departureFacing)||!facing(d.arrivalFacing))throw Error('REGISTRY_DIRECTION');
  ids.add(d.id);
  if(!r.scenes[d.sourceSceneId]||!r.scenes[d.targetSceneId]||d.sourceSceneId===d.targetSceneId||d.sourceMapId!==r.scenes[d.sourceSceneId].mapId||d.targetMapId!==r.scenes[d.targetSceneId].mapId)throw Error('REGISTRY_SCENE');
 }
 for(const d of r.directions){const reverse=r.directions.find(p=>p.id===d.reverseId);if(!reverse||reverse.reverseId!==d.id||reverse.pairId!==d.pairId||reverse.sourceSceneId!==d.targetSceneId||reverse.targetSceneId!==d.sourceSceneId||!same(d.returnDepartureFoot,reverse.departureFoot))throw Error('REGISTRY_REVERSE');}
 for(const h of r.holds??[])if(h.active!==false||ids.has(h.id))throw Error('REGISTRY_HOLD');
 return deepFreeze(r);
}
export function verifyMaterial(spec,m){if(spec.geometry)return verifyEightSceneMaterial(spec,m);return !!m&&m.sceneId===spec.sceneId&&m.artSHA256===spec.art.sha256&&m.footMaskSHA256===spec.footCenters.sha256&&m.width===spec.width&&m.height===spec.height&&typeof m.isSafeFoot==='function';}
export function createPortAdapter({registry,initial,initialMaterial,loadScene,releaseMovement=()=>{},portApproach=null,engineUpperLayer=null,chestPhysics=null,rescueAccess=null}){
 if(rescueAccess!==null&&!isRescuePortAccess(rescueAccess))throw Error('UNREGISTERED_RESCUE_ACCESS');
 if(chestPhysics!==null&&!isCargoChestPhysics(chestPhysics))throw Error('UNREGISTERED_CHEST_PHYSICS');
 if(engineUpperLayer!==null&&!isEngineUpperLayer(engineUpperLayer))throw Error('UNREGISTERED_ENGINE_LAYER');
 if(portApproach!==null&&!isPortApproach(portApproach))throw Error('UNREGISTERED_PORT_APPROACH');
 const restoredPlacement=consumeCargoRestorePlacement(initial.restorePermit,initial);if(initial.restoreArrival===true&&!restoredPlacement)throw Error('REGISTERED_OWNER_RESTORE_REQUIRED');
 const r=validateRegistry(registry),byId=new Map(r.directions.map(p=>[p.id,p]));
 if(typeof loadScene!=='function'||!r.scenes[initial.sceneId]||!verifyMaterial(r.scenes[initial.sceneId],initialMaterial)||!foot(initial.foot)||!(initialMaterial.isSafeFoot(initial.foot)||(restoredPlacement&&initial.layer==='centralUpper'&&engineLayerSnapshot(engineUpperLayer,initial.sceneId,initial.foot)?.layer==='upper')))throw Error('INITIAL_SOURCE_PROOF');
 if(chestPhysics&&!chestPhysicsAllowsFoot(chestPhysics,r.scenes[initial.sceneId],initialMaterial,initial.foot))throw Error('INITIAL_CHEST_COLLISION');
 if(!cargoOfficerBodyClear(initial.sceneId,initial.foot))throw Error('INITIAL_OFFICER_BODY');
 if(!cargoRescueBodyClear(initial.sceneId,initial.foot))throw Error('INITIAL_RESCUE_BODY');
 const clock={elapsedMs:0,minutes:720,paused:false,...clone(initial.clock??{})};
 if(!Number.isFinite(clock.elapsedMs)||clock.elapsedMs<0||!Number.isFinite(clock.minutes)||typeof clock.paused!=='boolean'||!facing(initial.facing??'down'))throw Error('INITIAL_STATE');
 let state={sceneId:initial.sceneId,mapId:r.scenes[initial.sceneId].mapId,foot:[...initial.foot],facing:initial.facing??'down',clock,options:clone(initial.options??{water:true}),transitionCount:0};
 let material=initialMaterial,pending=null,epoch=0,active=true,arrivalGuard=null,lastFrame=null,lastResult=null,hidden=false;
 const held=new Set(),disposed=new WeakSet();
 const contains=(d,p)=>isRescuePort(d)?containsRescuePort(rescueAccess,d,p):portApproach?containsPortApproach(portApproach,d,p):same(p,d.departureFoot);
 const allows=(d,p,m)=>isRescuePort(d)?allowsRescuePort(rescueAccess,d,p,m):portApproach?allowsPortApproach(portApproach,d,p,m):same(d.departureFoot,p);
 // Restored owners never inherit held keys or an armed arrival press.
 if(restoredPlacement){const d=r.directions.find(d=>d.sourceSceneId===state.sceneId&&contains(d,state.foot));if(d)arrivalGuard={sceneId:state.sceneId,portId:d.id,departureFoot:[...d.departureFoot],released:false,leftTrigger:false};}
 function dispose(m){if(m&&typeof m==='object'&&!disposed.has(m)){disposed.add(m);try{m.dispose?.()}catch{}}}
 function result(ok,reason,extra={}){lastResult={ok,reason,...extra};return clone(lastResult)}
 function snapshot(){return {...clone(state),movementLayer:engineLayerSnapshot(engineUpperLayer,state.sceneId,state.foot),pending:pending?{id:pending.id,epoch:pending.epoch}:null,active,arrivalGuard:clone(arrivalGuard),heldInputCount:held.size,lastResult:clone(lastResult)}}
 function release(){releaseMovement();lastFrame=null;}
 function inputUp(token){held.delete(token);if(arrivalGuard&&held.size===0)arrivalGuard.released=true;}
 function cancel(reason='CANCELLED'){
  if(pending){const old=pending;pending=null;epoch++;old.controller.abort(reason);lastFrame=null;try{release()}catch{};return result(false,reason,{restoredSource:true});}
  return result(false,'NOT_PENDING');
 }
 function setFoot(next,facing=state.facing){
  if(!active||hidden||state.clock.paused||pending||!foot(next)||!['up','down','left','right'].includes(facing))return false;
  const extended=engineUpperLayer&&state.sceneId==='ship_engine'&&(!material.isSafeFoot(next)||!material.isSafeFoot(state.foot));
  if(extended?!canEngineLayerStep(engineUpperLayer,r.scenes[state.sceneId],material,state.foot,next):!material.isSafeFoot(next))return false;
  if(chestPhysics&&!chestPhysicsFootClear(chestPhysics,state.sceneId,next))return false;
  if(!cargoOfficerBodyClear(state.sceneId,next))return false;
  if(!cargoRescueBodyClear(state.sceneId,next))return false;
  state.foot=[...next];state.facing=facing;
  if(arrivalGuard&&arrivalGuard.sceneId===state.sceneId&&!contains(byId.get(arrivalGuard.portId),next))arrivalGuard.leftTrigger=true;
  return true;
 }
 async function request(portId,{token,repeat=false}={}){
  if(!active)return result(false,'DISPOSED');
  if(hidden)return result(false,'HIDDEN');
  if(state.clock.paused)return result(false,'PAUSED');
  if(typeof token!=='string'||token.length===0)return result(false,'EXPLICIT_INPUT_REQUIRED');
  if(repeat||held.has(token))return result(false,'INPUT_REPEAT');
  const anotherHeld=held.size>0;held.add(token);
  if(anotherHeld)return result(false,'INPUT_RELEASE_REQUIRED');
  if(pending)return result(false,'BUSY');
  const d=byId.get(portId);
  if(!d)return result(false,(r.holds??[]).some(p=>p.id===portId)?'HELD_PORT':'UNKNOWN_PORT');
  if(arrivalGuard&&(!arrivalGuard.released||!arrivalGuard.leftTrigger))return result(false,'ARRIVAL_LATCH');
  if(d.sourceSceneId!==state.sceneId)return result(false,'WRONG_SOURCE');
  if(!allows(d,state.foot,material)||d.departureFacing!==state.facing)return result(false,'SOURCE_FOOT_FACING');
  if(!verifyMaterial(r.scenes[state.sceneId],material)||!material.isSafeFoot(state.foot)||(chestPhysics&&!chestPhysicsAllowsFoot(chestPhysics,r.scenes[state.sceneId],material,state.foot)))return result(false,'SOURCE_PROOF');
  let rescueTicket=null;try{if(isRescuePort(d))rescueTicket=captureRescuePort(rescueAccess,d)}catch{return result(false,'RESCUE_POSTBOSS_COMMIT_REQUIRED')}
  const ticket={id:portId,epoch:++epoch,controller:new AbortController()},sourceScene=state.sceneId;pending=ticket;
  let nextMaterial=null,abortListener;
  try{
   release();
   const {signal}=ticket.controller;
   const loading=Promise.resolve().then(()=>loadScene(r.scenes[d.targetSceneId],{signal}));
   loading.then(m=>{if(signal.aborted)dispose(m)},()=>{});
   const aborted=new Promise((_,reject)=>{abortListener=()=>reject(Error('ABORTED'));signal.addEventListener('abort',abortListener,{once:true});if(signal.aborted)abortListener();});
   nextMaterial=await Promise.race([loading,aborted]);
   if(!active||signal.aborted||pending!==ticket||epoch!==ticket.epoch)return {ok:false,reason:'STALE_COMPLETION',restoredSource:true};
   if(rescueTicket)assertRescuePort(rescueTicket);
   if(!verifyMaterial(r.scenes[d.targetSceneId],nextMaterial))throw Error('TARGET_PROOF');
   if(!cargoOfficerBodyClear(d.targetSceneId,d.arrivalFoot)||!cargoRescueBodyClear(d.targetSceneId,d.arrivalFoot)||!nextMaterial.isSafeFoot(d.arrivalFoot)||(chestPhysics&&!chestPhysicsAllowsFoot(chestPhysics,r.scenes[d.targetSceneId],nextMaterial,d.arrivalFoot)))throw Error('TARGET_UNSAFE');
   // All fallible external operations happen before the atomic native-state swap.
   release();
   if(!active||signal.aborted||pending!==ticket||epoch!==ticket.epoch)return {ok:false,reason:'STALE_COMPLETION',restoredSource:true};
   if(rescueTicket)assertRescuePort(rescueTicket);
   const previous=material;material=nextMaterial;nextMaterial=null;
   state={...state,sceneId:d.targetSceneId,mapId:d.targetMapId,foot:[...d.arrivalFoot],facing:d.arrivalFacing,transitionCount:state.transitionCount+1};
   arrivalGuard={sceneId:d.targetSceneId,portId:d.reverseId,departureFoot:[...d.returnDepartureFoot],released:held.size===0,leftTrigger:!contains(byId.get(d.reverseId),d.arrivalFoot)};
   pending=null;lastFrame=null;dispose(previous);
   return result(true,'TRANSITIONED',{portId,sourceScene,targetScene:d.targetSceneId,canonicalInstalled:false});
  }catch(error){
   if(ticket.controller.signal.aborted||!active||epoch!==ticket.epoch)return {ok:false,reason:'CANCELLED',restoredSource:true};
   return result(false,error.message==='TARGET_PROOF'?'TARGET_PROOF':error.message==='TARGET_UNSAFE'?'TARGET_UNSAFE':'LOAD_FAILED',{restoredSource:true});
  }finally{
   if(rescueTicket)releaseRescuePort(rescueTicket);
   ticket.controller.signal.removeEventListener('abort',abortListener);
   if(pending===ticket)pending=null;
   if(nextMaterial)dispose(nextMaterial);
   lastFrame=null;
  }
 }
 return {
  snapshot,request,inputUp,cancel,setFoot,
  directions:()=>r.directions.filter(d=>d.sourceSceneId===state.sceneId),
  setOption(key,value){if(active)state.options={...state.options,[key]:clone(value)}},
  setClockMinutes(minutes){if(active&&Number.isFinite(minutes))state.clock.minutes=((minutes%1440)+1440)%1440},
  setPaused(paused){if(!active)return false;state.clock.paused=!!paused;lastFrame=null;if(state.clock.paused){cancel('PAUSED_CANCEL');held.clear();if(arrivalGuard)arrivalGuard.released=true;try{release()}catch{}}},
  frame(now){if(!Number.isFinite(now))return 0;if(hidden||pending||!active||state.clock.paused){lastFrame=null;return 0}const dt=lastFrame===null?0:Math.max(0,Math.min(100,now-lastFrame));lastFrame=now;state.clock.elapsedMs+=dt;return dt},
  setHidden(value){hidden=!!value;lastFrame=null;if(hidden){cancel('HIDDEN_CANCEL');held.clear();if(arrivalGuard)arrivalGuard.released=true;try{release()}catch{}}},
  blur(){cancel('BLUR_CANCEL');held.clear();if(arrivalGuard)arrivalGuard.released=true;lastFrame=null;try{release()}catch{}},
  destroy(){cancel('DISPOSED');active=false;epoch++;try{release()}catch{};dispose(material)}
 };
}
