import {isNativeEnvelopeCodec,validateNativeEnvelope} from './native-envelope.mjs';
import {CANONICAL_TEST_SAVE,validateCanonicalTestSave,createGameSession} from '../../canonical-session.mjs';
import {CANONICAL_BATTLE_SAVE,validateCanonicalBattleSave} from '../../battle-v3/save.mjs';
import {CANONICAL_STORY_SAVE,validateCanonicalStorySave} from '../../story/save.mjs';
import {LEGACY_CONTENT,CANONICAL_CONTENT} from '../../compatibility/content-namespaces.mjs';
import {evaluateCanonicalMigration} from '../../compatibility/migration-eligibility.mjs';
import {validateSave} from '../../model.mjs';
import {migrateSave,requireCurrentRuntime,COMPATIBILITY_FORMAT} from '../../compatibility/save-migration.mjs';
import {gameplayReleaseFor} from '../../compatibility/gameplay-release.mjs';
import {sha256,stableJSON} from '../../compatibility/codec.mjs';
export const SAVE_SLOTS=Object.freeze(['SLOT_1','SLOT_2','SLOT_3']);
export const SLOT_PREFIX='geoje.monsters.slots.v1.';
export const LEGACY_SAVE_KEYS=Object.freeze(['geoje.monsters.save.v2','geoje.monsters.save.v1']);
const slotKey=(slot,snapshot)=>{if(!SAVE_SLOTS.includes(slot))throw Error('Unknown save slot');return SLOT_PREFIX+slot+'.'+snapshot};
const isCanonicalSave=value=>[CANONICAL_TEST_SAVE,CANONICAL_BATTLE_SAVE,CANONICAL_STORY_SAVE].includes(value?.format);
const validateCanonical=(value,catalog)=>value?.format===CANONICAL_STORY_SAVE?validateCanonicalStorySave(value,catalog):value?.format===CANONICAL_BATTLE_SAVE?validateCanonicalBattleSave(value,catalog):validateCanonicalTestSave(value,catalog);
export function encodeSlot(data){return JSON.stringify({data,checksumAlgorithm:'SHA-256',checksum:sha256(stableJSON(data))})}
export function decodeSlot(raw,slot,{canonicalCatalog=null,canonicalCatalogFor=null,allowCandidate=false,nativeEnvelopeCodec=null}={}){
 const envelope=JSON.parse(raw);
 if(envelope.checksumAlgorithm!=='SHA-256'||sha256(stableJSON(envelope.data))!==envelope.checksum)throw Error('Save checksum mismatch');
 const data=envelope.data;
 if(data?.compatibilityVersion>2){const e=Error('UNKNOWN_NATIVE_ENVELOPE_VERSION');e.code='NATIVE_EXTENSION_VERSION_MISMATCH';throw e;}
 if(data?.runtime?.candidatePolicyId&&!allowCandidate)throw Error('Candidate save is prohibited in normal slots');
 if(data?.format!==COMPATIBILITY_FORMAT||![1,2].includes(data.compatibilityVersion)||data.profile?.slotId!==slot)throw Error('Save slot/format mismatch');
 if(isCanonicalSave(data.runtime)){
  if(data.contentNamespace!==CANONICAL_CONTENT.contentNamespace||data.contentVersion!==CANONICAL_CONTENT.contentVersion)throw Error('Canonical slot namespace/version mismatch');
  gameplayReleaseFor(data.runtime);
  const catalog=canonicalCatalogFor?canonicalCatalogFor(data.runtime):canonicalCatalog;
  if(!catalog){const error=Error('Canonical slot requires a canonical session catalog');error.code='CATALOG_NOT_AVAILABLE';throw error}
  validateCanonical(data.runtime,catalog);
 }else if(data.runtime){
  if(data.contentNamespace&&data.contentNamespace!==LEGACY_CONTENT.contentNamespace)throw Error('Legacy slot namespace mismatch');
  if(data.contentVersion&&data.contentVersion!==LEGACY_CONTENT.contentVersion)throw Error('Legacy slot content version mismatch');
  requireCurrentRuntime(data);
  // Backward-compatible read of pre-3B wrappers; the archived bytes remain unchanged.
  data.contentNamespace=LEGACY_CONTENT.contentNamespace;data.contentVersion=LEGACY_CONTENT.contentVersion;
 }
 validateNativeEnvelope(data,slot,nativeEnvelopeCodec);
 return structuredClone(data);
}
export function createSaveSlotStore(storage,{canonicalCatalog=null,canonicalCatalogFor=null,legacyCatalog=null,allowCandidate=false,readOnlyLoads=false,nativeEnvelopeCodec=null}={}){
 const catalogFor=runtime=>{gameplayReleaseFor(runtime);return canonicalCatalogFor?canonicalCatalogFor(runtime):canonicalCatalog};
 const decode=(raw,slot)=>decodeSlot(raw,slot,{canonicalCatalog,canonicalCatalogFor,allowCandidate,nativeEnvelopeCodec});
 function prepare(input,profile,slot){
  const value=typeof input==='string'?JSON.parse(input):input;
  if(value?.candidatePolicyId&&!allowCandidate)throw Error('Candidate save is prohibited in normal slots');
  if(isCanonicalSave(value)){
   const runtime=validateCanonical(value,catalogFor(value));
   if(value.format===CANONICAL_STORY_SAVE)return {format:COMPATIBILITY_FORMAT,compatibilityVersion:1,contentNamespace:CANONICAL_CONTENT.contentNamespace,contentVersion:CANONICAL_CONTENT.contentVersion,profile:{...profile,slotId:slot,playerName:runtime.player.name},runtime,sourceSnapshot:structuredClone(value),migration:{sourceFormat:CANONICAL_STORY_SAVE,sourceNamespace:'canonical',warnings:[],canActivate:false,canActivateCanonicalBattle:true,canActivateCanonicalStory:true,canonicalGameplayReady:false}};
   if(value.format===CANONICAL_BATTLE_SAVE)return {format:COMPATIBILITY_FORMAT,compatibilityVersion:1,contentNamespace:CANONICAL_CONTENT.contentNamespace,contentVersion:CANONICAL_CONTENT.contentVersion,profile:{...profile,slotId:slot,playerName:runtime.player.name},runtime,sourceSnapshot:structuredClone(value),migration:{sourceFormat:CANONICAL_BATTLE_SAVE,sourceNamespace:'canonical',warnings:[],canActivate:false,canActivateCanonicalBattle:true,canonicalGameplayReady:false}};
   return {format:COMPATIBILITY_FORMAT,compatibilityVersion:1,contentNamespace:CANONICAL_CONTENT.contentNamespace,contentVersion:CANONICAL_CONTENT.contentVersion,profile:{...profile,slotId:slot,playerName:runtime.player.name},runtime,sourceSnapshot:structuredClone(value),migration:{sourceFormat:CANONICAL_TEST_SAVE,sourceNamespace:'canonical',warnings:[],canActivate:false,canActivateCanonicalTest:true,canonicalGameplayReady:false}};
  }
  const result=migrateSave(input,{...profile,slotId:slot});
  if(result.runtime)result.migration.canonicalCandidate=evaluateCanonicalMigration(value);
  return result;
 }
 const revisions=new Map();
 function archive(raw){
  if(typeof raw!=='string')throw Error('Archive requires original text');
  const key=SLOT_PREFIX+'original.'+sha256(raw),existing=storage.getItem(key);
  if(existing!==null&&existing!==raw)throw Error('Original archive collision');
  if(existing===null)storage.setItem(key,raw);
  if(storage.getItem(key)!==raw)throw Error('Original backup failed; migration cancelled');
  return key;
 }
 function peek(slot){return storage.getItem(slotKey(slot,'primary'))}
 function commit(slot,data,{expectedRaw=undefined}={}){
  const primary=slotKey(slot,'primary'),lkg=slotKey(slot,'lastKnownGood'),temp=slotKey(slot,'temp'),previous=storage.getItem(primary);
  if(expectedRaw!==undefined&&previous!==expectedRaw)throw Error('Save changed in another tab');
  let validPrevious=null;
  if(previous!==null){try{decode(previous,slot);validPrevious=previous}catch{archive(previous)}}
  const value=structuredClone(data);value.profile.slotId=slot;
  value.generation=(validPrevious?decode(validPrevious,slot).generation:0)+1;
  const raw=encodeSlot(value);decode(raw,slot);
  storage.setItem(temp,raw);decode(storage.getItem(temp),slot);
  // Preserve the last good snapshot before the single atomic primary setItem.
  if(value.compatibilityVersion===2&&validPrevious&&decode(validPrevious,slot).compatibilityVersion===1){archive(validPrevious);storage.setItem(lkg,raw);}else if(validPrevious)storage.setItem(lkg,validPrevious);
  if(storage.getItem(primary)!==previous)throw Error('Save changed during commit');
  storage.setItem(primary,raw);
  if(storage.getItem(primary)!==raw)throw Error('Save commit verification failed');
  // Primary is committed; failure to clean temp must not report loss of a saved game.
  try{storage.removeItem(temp)}catch{}
  revisions.set(slot,raw);return structuredClone(value);
 }
 function importSave(slot,raw,profile={},commitOptions={}){
  slotKey(slot,'primary');
  let incoming;try{incoming=JSON.parse(raw)}catch{};const incomingData=incoming?.data??incoming;if(incomingData?.compatibilityVersion>=2||incomingData&&Object.hasOwn(incomingData,'nativeExtension')){const e=Error('NATIVE_IMPORT_REQUIRES_NATIVE_FLOW');e.code='NATIVE_IMPORT_REQUIRES_NATIVE_FLOW';throw e;}
  // No migration/normalization occurs until the verbatim input has a durable backup.
  const archiveKey=archive(raw);let prepared;
  try{prepared=prepare(raw,profile,slot)}catch(error){prepared=migrateSave(raw,{...profile,slotId:slot});prepared.runtime=null;prepared.migration.canActivate=false;prepared.migration.warnings.push({code:'SESSION_IMPORT_REJECTED',detail:error.message})}
  if(!prepared.runtime)return {committed:false,archiveKey,prepared};
  prepared.sourceArchiveKey=archiveKey;delete prepared.originalRaw;
  prepared.profile={...prepared.profile,...structuredClone(profile),slotId:slot};
  const result=commit(slot,prepared,commitOptions);return {committed:true,archiveKey,prepared:result};
 }
 function bootstrapLegacy(slot='SLOT_1'){
  if(slot!=='SLOT_1'||peek(slot)!==null)return null;
  let failed=null;
  for(const key of LEGACY_SAVE_KEYS){const raw=storage.getItem(key);if(raw===null)continue;
   const result=importSave(slot,raw,{playerName:storage.getItem('geoje.monsters.name')??'여행자'});
   if(result.committed)return result.prepared;failed=result;
  }
  if(failed)return failed.prepared;
  return null;
 }
 function load(slot,{backup=false,legacyFallback=true}={}){
  slotKey(slot,'primary');
  if(!backup&&peek(slot)===null&&legacyFallback){if(readOnlyLoads){for(const key of slot==='SLOT_1'?LEGACY_SAVE_KEYS:[]){const raw=storage.getItem(key);if(raw!==null){const value=migrateSave(raw,{slotId:slot,playerName:storage.getItem('geoje.monsters.name')??'여행자'});if(value.runtime)return value}}}else{const initial=bootstrapLegacy(slot);if(initial)return initial}}
  const keys=backup?['lastKnownGood']:['primary','lastKnownGood'];let error=null;
  for(const snapshot of keys){const raw=storage.getItem(slotKey(slot,snapshot));if(raw===null)continue;
   try{const value=decode(raw,slot);revisions.set(slot,peek(slot));if(snapshot==='lastKnownGood')value.recovery={source:'lastKnownGood'};return value}catch(e){if(['CATALOG_NOT_AVAILABLE','UNKNOWN_GAMEPLAY_RELEASE','GAMEPLAY_RELEASE_UNAVAILABLE','NATIVE_LOCATION_NOT_AVAILABLE','NATIVE_LOCATION_RECOVERY_REQUIRED','NATIVE_EXTENSION_VERSION_MISMATCH'].includes(e.code))throw e;if(!readOnlyLoads)archive(raw);error=e}
  }
  if(error)throw error;
  if(backup&&slot==='SLOT_1'&&legacyFallback){const raw=storage.getItem('geoje.monsters.save.v2.backup');if(raw!==null){const key=readOnlyLoads?null:archive(raw),prepared=migrateSave(raw,{slotId:slot,playerName:storage.getItem('geoje.monsters.name')??'여행자'});prepared.sourceArchiveKey=key;return prepared}}
  return null;
 }
 function save(slot,runtime,profile={},nativeLocation=undefined){
  if(runtime?.candidatePolicyId&&!allowCandidate)throw Error('Candidate save is prohibited in normal slots');
  if(nativeLocation!==undefined&&!isNativeEnvelopeCodec(nativeEnvelopeCodec))throw Error('NATIVE_CODEC_REQUIRED');
  const isCanonical=isCanonicalSave(runtime);
  if(!isCanonical&&runtime?.contentNamespace&&![LEGACY_CONTENT.contentNamespace,'work-v2'].includes(runtime.contentNamespace))throw Error('Unknown runtime namespace');
  if(!isCanonical&&runtime?.contentVersion&&runtime.contentVersion!==LEGACY_CONTENT.contentVersion)throw Error('Unknown runtime content version');
  const clean=isCanonical?validateCanonical(runtime,catalogFor(runtime)):validateSave(runtime); // Validate before writes.
  const previousRaw=peek(slot);let previous=null;
  if(isCanonical&&slot==='SLOT_1'&&previousRaw===null&&LEGACY_SAVE_KEYS.some(k=>storage.getItem(k)!==null))throw Error('SLOT_1 contains an unmigrated legacy save; choose an empty slot');
  if(previousRaw!==null){
   let header;try{header=JSON.parse(previousRaw).data}catch{}
   if(header?.contentNamespace&&header.contentNamespace!==(isCanonical?CANONICAL_CONTENT:LEGACY_CONTENT).contentNamespace)throw Error('Slot catalog mismatch; use explicit import or an empty slot');
   try{previous=decode(previousRaw,slot)}catch(error){if(['CATALOG_NOT_AVAILABLE','UNKNOWN_GAMEPLAY_RELEASE','GAMEPLAY_RELEASE_UNAVAILABLE','NATIVE_LOCATION_NOT_AVAILABLE','NATIVE_LOCATION_RECOVERY_REQUIRED','NATIVE_EXTENSION_VERSION_MISMATCH'].includes(error.code))throw error;archive(previousRaw)}
  }
  if(previous&&previous.contentNamespace!==(isCanonical?CANONICAL_CONTENT:LEGACY_CONTENT).contentNamespace)throw Error('Slot catalog mismatch; use an explicit import or an empty slot');
  if(previous&&isCanonical&&gameplayReleaseFor(previous.runtime)!==gameplayReleaseFor(clean))throw Error('Gameplay release mismatch; use explicit replacement');
  if(previous?.compatibilityVersion===2&&nativeLocation===undefined)throw Error('NATIVE_LOCATION_REQUIRED_FOR_SAVE');
  const prepared=prepare(isCanonical?clean:runtime,profile,slot);
  if(nativeLocation!==undefined){if(!isCanonical||!clean.world)throw Error('NATIVE_CANONICAL_WORLD_REQUIRED');prepared.compatibilityVersion=2;prepared.nativeExtension=nativeEnvelopeCodec.prepare(nativeLocation,clean,slot);}
  if(!previous&&slot==='SLOT_1')for(const key of LEGACY_SAVE_KEYS){const original=storage.getItem(key);if(original!==null){const sourceKey=archive(original);prepared.sourceArchiveKey??=sourceKey}}
  prepared.sourceArchiveKey=previous?.sourceArchiveKey??prepared.sourceArchiveKey??archive(JSON.stringify(runtime));
  // Keep the migration source even as the live runtime evolves and changes party order.
  prepared.sourceSnapshot=previous?.sourceSnapshot??structuredClone(runtime);
  if(!isCanonical&&previous?.sourceSnapshot){
   const sourceCandidate=evaluateCanonicalMigration(previous.sourceSnapshot);
   prepared.migration.preservedSourceCandidate=sourceCandidate;
   if(!sourceCandidate.eligible){prepared.migration.canonicalCandidate.eligible=false;prepared.migration.canonicalCandidate.blockers.push(...sourceCandidate.blockers.map(b=>({...b,path:'sourceSnapshot.'+(b.path??''),preservedSource:true})))}
  }
  prepared.migration.originalSourceFormat=previous?.migration.originalSourceFormat??previous?.migration.sourceFormat??prepared.migration.sourceFormat;
  prepared.migration.previousWarnings=previous?.migration.previousWarnings??previous?.migration.warnings??[];
  prepared.profile={...previous?.profile,...prepared.profile,...structuredClone(profile),slotId:slot};delete prepared.originalRaw;
  return commit(slot,prepared,{expectedRaw:revisions.has(slot)?revisions.get(slot):previousRaw});
 }
 function has(slot){return peek(slot)!==null||(slot==='SLOT_1'&&LEGACY_SAVE_KEYS.some(k=>storage.getItem(k)!==null))}
 return Object.freeze({acknowledgeRevision(slot,raw){slotKey(slot,'primary');if(raw!==null&&typeof raw!=='string')throw Error('Exact revision bytes required');if(peek(slot)!==raw)throw Error('Save changed in another tab');if(raw!==null)decode(raw,slot);revisions.set(slot,raw);},save:(slot,runtime,profile)=>save(slot,runtime,profile),saveNative:(slot,runtime,location,profile)=>save(slot,runtime,profile,location),load,importSave,bootstrapLegacy,has,archive,peek,loadSession:(slot,options)=>{const saved=load(slot,options);if(!saved)return null;if(saved.compatibilityVersion===2){const e=Error('NATIVE_RESUME_REQUIRED');e.code='NATIVE_RESUME_REQUIRED';throw e;}return createGameSession(saved.runtime,saved.contentNamespace===CANONICAL_CONTENT.contentNamespace?catalogFor(saved.runtime):legacyCatalog)},keys:slot=>({primary:slotKey(slot,'primary'),lastKnownGood:slotKey(slot,'lastKnownGood'),temp:slotKey(slot,'temp')})});
}
