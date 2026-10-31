import{cargoSaveResourceCapability}from'./resources.mjs';
import{sha256,stableJSON}from'../../compatibility/codec.mjs';
import{CargoRoomInteractions}from'../../development/cargo-native/room-interactions.mjs';
import{verifyEightSceneRegistry,verifyEightSceneMaterial}from'../../world/cargo-eight-scene-geometry.mjs';
import{cargoOfficerBodyClear}from'../../development/cargo-native/officer-registration.mjs';
import{cargoRescueBodyClear}from'../../development/cargo-native/rescue-host-readers.mjs';
import{isCargoChestPhysics,chestPhysicsFootClear}from'../../development/cargo-native/cargo-chest-physics.mjs';
import{engineUpperContains,engineLayerSnapshot,isEngineUpperLayer}from'../../development/cargo-native/engine-upper-layer.mjs';
export const REVISION='CARGO_PRIVATE_CHECKPOINT_R1_STAGE29',MAP='world:ship:S9';
const codecs=new WeakSet();
export const fail=(reason)=>{throw Object.assign(Error(reason),{code:'NATIVE_LOCATION_RECOVERY_REQUIRED',reason})};
export function record(v,keys){if(!v||Object.getPrototypeOf(v)!==Object.prototype)return false;const all=Reflect.ownKeys(v);return all.length===keys.length&&all.every(k=>typeof k==='string'&&keys.includes(k)&&Object.getOwnPropertyDescriptor(v,k)?.enumerable&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k),'value'))}
export function dense(v,pred,length=null){if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype)return false;const d=Object.getOwnPropertyDescriptor(v,'length');if(!d||!Object.hasOwn(d,'value')||length!==null&&d.value!==length||Reflect.ownKeys(v).length!==d.value+1)return false;for(let i=0;i<d.value;i++){const p=Object.getOwnPropertyDescriptor(v,String(i));if(!p||!p.enumerable||!Object.hasOwn(p,'value')||!pred(p.value))return false}return true}
const same=(a,b)=>stableJSON(a)===stableJSON(b);
export function createCargoEnvelopeCodec(capability){
 const{contract,registry,materials,withDoors,chestPhysics,engineUpperLayer}=cargoSaveResourceCapability(capability);
 if(sha256(stableJSON(contract))!=='316425446b5ab2c41094251266c0deab0ef36068a97a9b8fa26e41430caae3e8'||!verifyEightSceneRegistry(registry)||!isCargoChestPhysics(chestPhysics)||!isEngineUpperLayer(engineUpperLayer))fail('UNREGISTERED_CARGO_CHECKPOINT_INPUT');
 const spec=structuredClone(registry),rooms=structuredClone(contract),doorKeys=[...rooms.rooms.map(r=>r.roomId),rooms.bossGate.gateId];
 function validateGeometry(pair,runtime){
  if(!record(pair,['version','ownerRevision','registryRevision','location','rooms','doors'])||pair.version!==1||pair.ownerRevision!==REVISION||pair.registryRevision!==spec.revision)fail('CARGO_REVISION_HOLD');
  if(!record(pair.location,['sceneId','mapId','foot','facing','layer','imageSHA','maskSHA','geometryRevision','geometryState','layerRevision','layerMaskSHA']))fail('CARGO_POSE_SHAPE');
  const n=pair.location;
  if(!['sceneId','mapId','facing','layer','imageSHA','maskSHA','geometryRevision','geometryState'].every(k=>typeof n[k]==='string')||!['layerRevision','layerMaskSHA'].every(k=>n[k]===null||typeof n[k]==='string')||!dense(n.foot,Number.isInteger,2))fail('CARGO_POSE_SHAPE');
  const f=n.foot,s=Object.hasOwn(spec.scenes,n.sceneId)?spec.scenes[n.sceneId]:null;
  if(!s||n.mapId!==MAP||f[0]<0||f[0]>=1536||f[1]<0||f[1]>=1024||!['up','down','left','right'].includes(n.facing))fail('CARGO_POSE_SHAPE');
  const q=pair.rooms;if(!record(q,['namespace','version','visitedRoomIds','readClueIds','acceptedCardOrder'])||typeof q.namespace!=='string'||q.version!==1||!dense(q.visitedRoomIds,x=>typeof x==='string')||!dense(q.readClueIds,x=>typeof x==='string')||q.acceptedCardOrder!==null&&!dense(q.acceptedCardOrder,x=>typeof x==='string',6))fail('CARGO_ROOM_SHAPE');
  if(!record(pair.doors,doorKeys)||Object.values(pair.doors).some(d=>!record(d,['phase','progress'])||!['open','closed'].includes(d.phase)||d.progress!==(d.phase==='open'?1:0)))fail('CARGO_UNSTABLE_DOOR');
  const clean=new CargoRoomInteractions(rooms,pair.rooms).snapshot();if(!same(clean,pair.rooms))fail('CARGO_ROOM_SHAPE');
  // The original committed boss triple is not manufactured from a notebook.
  const progress=runtime.progress,boss='BLACKNET_HWIGYEONG_FINAL',triple=[progress.flags.S9_BLACKNET_BOSS_DEFEATED===true,progress.completedEvents.includes(boss),progress.defeatedTrainers.includes(boss)];
  if(triple.some(Boolean)&&!triple.every(Boolean))fail('CARGO_BOSS_COMMIT_INCONSISTENT');
  const pre=['S9_SHIP_ZONE1_CLEAR','S9_SHIP_ZONE2_RESCUE_CLEAR','S9_BLACKNET_BOMI_DEFEATED','S9_BLACKNET_JUNSEOK_DEFEATED'].every(k=>progress.flags[k]===true)&&clean.acceptedCardOrder!==null;
  const gate=pair.doors[rooms.bossGate.gateId];if(gate.phase==='open'&&!triple.every(Boolean)&&!pre)fail('CARGO_BOSS_DERIVATION');
  if(n.sceneId==='ship_rescue'&&!triple.every(Boolean))fail('CARGO_RESCUE_PREBOSS');
  withDoors(pair.doors,()=>{const m=materials.get(n.sceneId);if(!verifyEightSceneMaterial(s,m)||n.imageSHA!==s.art.sha256||n.maskSHA!==m.footMaskSHA256||n.geometryRevision!==m.geometryRevision||n.geometryState!==m.geometryState)fail('CARGO_PIN_HOLD');
   const layer=engineLayerSnapshot(engineUpperLayer,n.sceneId,f),upper=layer?.layer==='upper';
   if(n.layer!==(upper?'centralUpper':'ground')||n.layerRevision!==(upper?layer.revision:null)||n.layerMaskSHA!==(upper?layer.maskSHA:null))fail('CARGO_LAYER_MISMATCH');
   if(upper?!engineUpperContains(engineUpperLayer,n.sceneId,f):!m.isSafeFoot(f))fail('CARGO_UNSAFE_FOOT_HOLD');
   if(!chestPhysicsFootClear(chestPhysics,n.sceneId,f)||!cargoOfficerBodyClear(n.sceneId,f)||!cargoRescueBodyClear(n.sceneId,f))fail('CARGO_BODY_COLLISION');
   for(const r of rooms.rooms){const[x,y,w,h]=r.door.safetyFootCenterForbidden;if(r.mapId===n.sceneId&&pair.doors[r.roomId].phase!=='open'&&f[0]>=x&&f[0]<=x+w&&f[1]>=y&&f[1]<=y+h)fail('CARGO_CLOSED_DOOR_FOOT');}
  });return structuredClone(pair);
 }
 function validate(pair,runtime){
  if(runtime?.position?.scene!==MAP||runtime.developmentOnly!==true)fail('CARGO_CANONICAL_MAP');
  return validateGeometry(pair,runtime);
 }
 function validateRetainedPair(pair,runtime){if(runtime?.position?.scene!=='world:hub:S9'||runtime?.world?.mapId!=='world:hub:S9'||runtime.developmentOnly!==true)fail('CARGO_RETAINED_MAP');return validateGeometry(pair,runtime)}
 const codec=Object.freeze({validatePair:validate,validateRetainedPair,prepare(pair,runtime,slot){const p=validate(pair,runtime);return{version:1,slot,runtimeSHA:sha256(stableJSON(runtime)),canonicalReturn:structuredClone(runtime.position),checkpoint:p}},validate(e,runtime,slot){if(!record(e,['version','slot','runtimeSHA','canonicalReturn','checkpoint'])||e.version!==1||e.slot!==slot||e.runtimeSHA!==sha256(stableJSON(runtime))||!same(e.canonicalReturn,runtime.position))fail('CARGO_PAIR_MISMATCH');return validate(e.checkpoint,runtime)}});codecs.add(codec);return codec;
}
export const isNativeEnvelopeCodec=c=>codecs.has(c);
export function validateNativeEnvelope(data,slot,codec){if(data.compatibilityVersion===1){if(Object.hasOwn(data,'nativeExtension'))fail('NATIVE_EXTENSION_VERSION_MISMATCH');return}if(data.compatibilityVersion!==2||!codecs.has(codec)||data.contentNamespace!=='canonical-v1'||!data.runtime?.world)fail('NATIVE_LOCATION_NOT_AVAILABLE');codec.validate(data.nativeExtension,data.runtime,slot)}
