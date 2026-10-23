import {sha256,stableJSON} from './codec.mjs';
import {migrateHandoffSaveV2ToV3} from './handoff-save-v2-to-v3.mjs';

export const SAVE_V3_SLOTS=Object.freeze([1,2,3]);
export const SAVE_V3_PREFIX='geojeMonster.save.v3.';
export const SAVE_V2_PREFIX='geojeMonster.save.v2.';
export const ORDINARY_SLOT_PREFIX='geoje.monsters.slots.v1.';
const tms=Array.from({length:50},(_,i)=>`TM${String(i+1).padStart(2,'0')}`);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const unique=a=>Array.isArray(a)&&a.every((v,i)=>typeof v==='string'&&a.indexOf(v)===i);
function slotNumber(slot){const n=typeof slot==='string'&&/^SLOT_[123]$/.test(slot)?Number(slot.slice(-1)):Number(slot);if(!SAVE_V3_SLOTS.includes(n))throw Error('Save slot must be 1, 2, or 3');return n}
export function saveV3Keys(slot){const n=slotNumber(slot),base=`${SAVE_V3_PREFIX}slot${n}.`;return {primary:base+'primary',lastKnownGood:base+'lastKnownGood',temp:base+'temp',sourceV2:`${SAVE_V2_PREFIX}slot${n}.primary`}}
function checksum(snapshot){const copy=structuredClone(snapshot);delete copy.integrity.checksum;return sha256(stableJSON(copy))}
export function validateSaveV3(snapshot,{slot=null}={}){
 if(!plain(snapshot)||snapshot.schemaVersion!==3)throw Error('Save v3 schemaVersion required');
 if(!plain(snapshot.profile)||!plain(snapshot.progress)||!plain(snapshot.progress.flags)||!plain(snapshot.inventory)||!plain(snapshot.inventory.items)||!plain(snapshot.inventory.tm)||!plain(snapshot.world)||!plain(snapshot.rewards)||!plain(snapshot.fieldResearch)||!plain(snapshot.integrity))throw Error('Save v3 required sections missing');
 if(typeof snapshot.profile.saveId!=='string'||!snapshot.profile.saveId||!Number.isSafeInteger(snapshot.profile.foregroundPlayTimeSeconds)||snapshot.profile.foregroundPlayTimeSeconds<0||!Number.isFinite(Date.parse(snapshot.profile.createdAt))||!Number.isFinite(Date.parse(snapshot.profile.updatedAt)))throw Error('Invalid save profile metadata');
 if(slot!==null&&Number(snapshot.profile.slotId)!==slotNumber(slot))throw Error('Save v3 slot mismatch');
 if(!tms.every(id=>typeof snapshot.inventory.tm[id]==='boolean')||Object.keys(snapshot.inventory.tm).length!==50)throw Error('TM ownership must contain TM01..TM50 booleans');
 if(Object.hasOwn(snapshot.inventory.items,'full_potion'))throw Error('Obsolete full_potion item');
 if(Object.keys(snapshot.progress.flags).some(id=>/^POST_ENHANCED_LEAGUE(?:_|$)/.test(id))||(snapshot.progress.completedEvents??[]).some(id=>/^POST_ENHANCED_LEAGUE(?:_|$)/.test(id)))throw Error('Obsolete enhanced league progress');
 if(!unique(snapshot.world.defeatedTrainerIds)||!unique(snapshot.world.discoveredLocationIds)||!unique(snapshot.fieldResearch.completedResearchQuestIds)||!unique(snapshot.fieldResearch.claimedResearchRewardIds))throw Error('Duplicate or malformed v3 progress IDs');
 if(!Array.isArray(snapshot.rewards.geojeBallGrantHistory)||snapshot.rewards.geojeBallGrantHistory.some(g=>!Number.isSafeInteger(g.quantity)||g.quantity<0)||snapshot.rewards.geojeBallGrantHistory.reduce((n,g)=>n+g.quantity,0)>12)throw Error('Geoje Ball lifetime grant limit exceeded');
 if(snapshot.progress.flags.YEJI_FINAL_ENDING_DONE&&!snapshot.progress.flags.YEJI_FINAL_DONE)throw Error('Yeji ending requires final victory');
 if((snapshot.progress.completedEvents??[]).includes('YEJI_FINAL_ENDING')&&!snapshot.progress.flags.YEJI_FINAL_DONE)throw Error('Yeji ending event requires final victory');
 if((snapshot.progress.completedEvents??[]).includes('YEJI_FINAL')&&!snapshot.progress.flags.YEJI_FINAL_DONE)throw Error('Yeji victory event requires final victory');
 if((Object.keys(snapshot.progress.flags).some(id=>/^NO_?151_(?:UNLOCK|ACCESS|AVAILABLE|FIXED|FIRST|ENCOUNTER)/.test(id)&&snapshot.progress.flags[id])||(snapshot.progress.completedEvents??[]).some(id=>id==='POST_ONSEOM_GARDEN_FIRST_151'||/^NO_?151_(?:UNLOCK|ACCESS|AVAILABLE|FIXED|FIRST|ENCOUNTER)/.test(id)))&&!snapshot.progress.flags.YEJI_FINAL_ENDING_DONE)throw Error('No151 access requires Yeji final ending');
 if(!Number.isSafeInteger(snapshot.integrity.snapshotGeneration)||snapshot.integrity.snapshotGeneration<0)throw Error('Invalid save generation');
 if(snapshot.integrity.checksum!=null&&snapshot.integrity.checksum!==checksum(snapshot))throw Error('Save v3 checksum mismatch');
 return structuredClone(snapshot);
}
export function encodeSaveV3(snapshot){const valid=validateSaveV3(snapshot);valid.integrity.checksumAlgorithm='SHA-256';valid.integrity.checksum=checksum(valid);return JSON.stringify(valid)}
export function decodeSaveV3(raw,slot){const value=JSON.parse(raw);if(value.integrity?.checksumAlgorithm!=='SHA-256'||typeof value.integrity.checksum!=='string')throw Error('Missing save checksum');return validateSaveV3(value,{slot})}

// The live game's compatibility envelope is a different schema. This gate
// validates its outer checksum before reporting it, without projecting its
// runtime into v3 fields for which there is no proven mapping.
export function inspectOrdinarySlot(storage,slot){
 const name=`SLOT_${slotNumber(slot)}`,key=`${ORDINARY_SLOT_PREFIX}${name}.primary`,raw=storage.getItem(key);
 if(raw===null)return {slot:name,key,present:false,migrationEligible:false};
 try{
  const envelope=JSON.parse(raw),data=envelope?.data;
  if(envelope.checksumAlgorithm!=='SHA-256'||envelope.checksum!==sha256(stableJSON(data)))throw Error('Ordinary slot checksum mismatch');
  if(data?.format!=='GEOJE_COMPATIBILITY_SAVE'||data.compatibilityVersion!==1||data.profile?.slotId!==name||!plain(data.runtime))throw Error('Ordinary slot format mismatch');
  return {slot:name,key,present:true,valid:true,migrationEligible:false,format:data.runtime.format??'legacy-work-v2',reason:'No authoritative ordinary runtime to Save v3 semantic mapping'};
 }catch(error){return {slot:name,key,present:true,valid:false,migrationEligible:false,reason:error.message}}
}

// Recovery changes only location. The caller supplies an already verified safe
// point from the map/eco-center catalog, never a guessed coordinate.
export function escapeSaveV3Softlock(snapshot,{safePoint,battle=false,cutscene=false,modal=false}={}){
 const next=validateSaveV3(snapshot);
 if(battle||cutscene||modal)throw Error('Softlock escape unavailable during battle, cutscene, or modal');
 if(!plain(safePoint)||typeof safePoint.mapId!=='string'||!safePoint.mapId||!plain(safePoint.position)||!Number.isFinite(safePoint.position.x)||!Number.isFinite(safePoint.position.y)||!['up','down','left','right'].includes(safePoint.position.facing)||safePoint.safe!==true)throw Error('Verified safe point required');
 next.progress.currentMapId=safePoint.mapId;
 next.progress.position=structuredClone(safePoint.position);
 delete next.integrity.checksum;
 return next;
}

export function createSaveV3Store(storage,{now=()=>new Date().toISOString()}={}){
 function archive(raw,kind){const key=`${SAVE_V3_PREFIX}${kind}.${sha256(raw)}`,existing=storage.getItem(key);if(existing!==null&&existing!==raw)throw Error('Save archive collision');if(existing===null)storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw Error('Save archive verification failed');return key}
 function read(slot,{backup=false}={}){const keys=saveV3Keys(slot),raw=storage.getItem(backup?keys.lastKnownGood:keys.primary);return raw===null?null:decodeSaveV3(raw,slot)}
 function write(slot,snapshot,{expectedRaw}={}){
  const n=slotNumber(slot),keys=saveV3Keys(n),previous=storage.getItem(keys.primary);
  if(expectedRaw!==undefined&&previous!==expectedRaw)throw Error('Save changed in another tab');
  // A corrupt primary is never promoted into lastKnownGood.
  let prior=null;if(previous!==null){try{prior=decodeSaveV3(previous,n)}catch{archive(previous,'invalidOriginal')}}
  const next=validateSaveV3(snapshot,{slot:n});
  next.profile.updatedAt=now();
  next.integrity.snapshotGeneration=Math.max(prior?.integrity.snapshotGeneration??0,next.integrity.snapshotGeneration)+1;
  next.integrity.lastSuccessfulSaveAt=next.profile.updatedAt;
  delete next.integrity.needsValidatedReseal;
  delete next.integrity.checksum;
  const raw=encodeSaveV3(next);
  storage.setItem(keys.temp,raw);decodeSaveV3(storage.getItem(keys.temp),n);
  if(storage.getItem(keys.primary)!==previous)throw Error('Save changed during commit');
  // Any failed backup write leaves the primary untouched, including autosaves.
  if(prior)storage.setItem(keys.lastKnownGood,previous);
  storage.setItem(keys.primary,raw);
  if(storage.getItem(keys.primary)!==raw)throw Error('Save commit verification failed');
  try{storage.removeItem(keys.temp)}catch{}
  return next;
 }
 function migrate(slot,{sourceRaw,expectedRaw}={}){
  const keys=saveV3Keys(slot),raw=sourceRaw??storage.getItem(keys.sourceV2);
  if(raw===null||raw===undefined)throw Error('Save v2 source missing');
  // The v2 primary is never modified. Explicit sourceRaw is retained verbatim.
  const source=JSON.parse(raw),{candidate,warnings}=migrateHandoffSaveV2ToV3(source);
  if(storage.getItem(keys.primary)!==null&&expectedRaw===undefined)throw Error('Existing v3 slot requires expectedRaw for explicit migration');
  candidate.profile.slotId=slotNumber(slot);
  candidate.profile.saveId=source.profile?.saveId&&!['GENERATE_UUID','uuid'].includes(source.profile.saveId)?source.profile.saveId:(globalThis.crypto?.randomUUID?.()??sha256(raw).slice(0,32));
  candidate.profile.createdAt=Number.isFinite(Date.parse(source.profile?.createdAt))?source.profile.createdAt:now();
  candidate.profile.updatedAt=now();
  candidate.integrity.snapshotGeneration=0;
  candidate.integrity.checksumAlgorithm='SHA-256';delete candidate.integrity.checksum;
  validateSaveV3(candidate,{slot});
  const sourceKey=sourceRaw===undefined?keys.sourceV2:archive(raw,'source');
  const result=write(slot,candidate,{expectedRaw});
  return {snapshot:result,warnings,sourceKey};
 }
 function migrateOrdinary(slot){const status=inspectOrdinarySlot(storage,slot),error=Error(status.reason??'Ordinary slot missing; no migration source');error.code='ORDINARY_SAVE_V3_MAPPING_UNAVAILABLE';error.slotStatus=status;throw error}
 return Object.freeze({keys:saveV3Keys,read,write,autosave:write,migrate,migrateOrdinary,inspectOrdinary:slot=>inspectOrdinarySlot(storage,slot),peek:slot=>storage.getItem(saveV3Keys(slot).primary)});
}
