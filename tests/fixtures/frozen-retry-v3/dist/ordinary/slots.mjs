// Ordinary-menu binding. Existing checksummed slot format/validators own persistence.
import {createSaveSlotStore,decodeSlot,encodeSlot,SAVE_SLOTS,LEGACY_SAVE_KEYS} from '../compatibility/save-slots.mjs';
import {migrateSave,requireCurrentRuntime} from '../compatibility/save-migration.mjs';
import {CanonicalWorld} from '../world/service.mjs';
import {validateCanonicalStorySave} from '../story/save.mjs';
import {validateWorldLocation,adoptPlacementPosition} from '../world/state.mjs';
import {createGameplayReleases,gameplayReleaseFor} from '../compatibility/gameplay-release.mjs';
import {stableJSON} from '../compatibility/codec.mjs';
export {SAVE_SLOTS};
export function createOrdinarySlots(storage,adapter){
 const releases=adapter?.kind==='gameplay-release-registry'?adapter:createGameplayReleases({historical:adapter});
 const newGameIdentity={gameplayRelease:releases.newGameRelease},catalog=releases.catalogFor(newGameIdentity),adapterFor=releases.adapterFor,catalogFor=releases.catalogFor;
 const store=createSaveSlotStore(storage,{canonicalCatalog:catalog,canonicalCatalogFor:catalogFor,readOnlyLoads:true});
 const checkSlot=slot=>{if(!SAVE_SLOTS.includes(slot))throw Error('저장 슬롯을 선택하세요.');};
 const stamp=slot=>{checkSlot(slot);return {slot,primary:store.peek(slot),legacy:slot==='SLOT_1'?LEGACY_SAVE_KEYS.map(k=>storage.getItem(k)):[]}};
 const check=t=>{if(!t||stableJSON(stamp(t.slot))!==stableJSON(t))throw Error('다른 화면에서 저장이 변경되었습니다. 슬롯을 다시 선택하세요.');};
 function validate(runtime){
  if(runtime?.candidatePolicyId)throw Error('후보 저장은 일반 슬롯으로 가져올 수 없습니다.');
  if(runtime?.contentNamespace==='canonical-v1'){
   const s=validateCanonicalStorySave(runtime,catalogFor(runtime));
   if(!s.world)throw Error('월드 연결이 없는 이전 canonical 저장입니다. 원본을 유지합니다.');
   const w=new CanonicalWorld({adapter:adapterFor(s),runtime:s});try{validateWorldLocation(adoptPlacementPosition(s,w.host),w.host)}finally{w.dispose()}
   return s;
  }
  return requireCurrentRuntime(migrateSave(runtime));
 }
 function read(slot){checkSlot(slot);const saved=store.load(slot);if(!saved)throw Error('빈 슬롯입니다.');validate(saved.runtime);return saved}
 function summarize(slot){
  checkSlot(slot);if(!store.has(slot))return {slot,empty:true};
  try{const data=store.load(slot);if(!data?.runtime)throw Error('지원하지 않는 저장');const s=data.runtime;validate(s);return {slot,empty:false,name:s.player?.name??data.profile?.playerName,stage:s.progress?.currentStage,badges:s.progress?.badges?.length??s.badges?.length,savedAt:data.profile?.savedAt??s.updatedAt,namespace:data.contentNamespace,recovered:!!data.recovery};}
  catch(e){return {slot,empty:false,error:e.message}}
 }
 function commitReplacement(ticket,raw,profile,confirmed,originalRaw=null){
  check(ticket);const occupied=ticket.primary!==null||ticket.legacy.some(x=>x!==null);if(occupied&&!confirmed)throw Error('기존 저장 덮어쓰기 확인이 필요합니다.');
  if(originalRaw!==null)store.archive(originalRaw);
  for(const original of ticket.legacy)if(original!==null)store.archive(original);
  const result=store.importSave(ticket.slot,raw,profile,{expectedRaw:ticket.primary});if(!result.committed)throw Error('지원하지 않는 저장입니다. 기존 슬롯은 유지됩니다.');return result.prepared;
 }
 function newGame(ticket,options,{confirmed=false}={}){
  check(ticket);const w=new CanonicalWorld({adapter:adapterFor(newGameIdentity),mode:'development',starterId:options.starterId,playerName:options.playerName,appearance:options.appearance});let s;try{s=w.snapshot();s.gameplayRelease=releases.newGameRelease}finally{w.dispose()}
  return commitReplacement(ticket,JSON.stringify(s),{playerName:s.player.name,savedAt:Date.now()},confirmed);
 }
 function inspectImport(raw){
  if(typeof raw!=='string'||raw.length>1000000)throw Error('저장 파일 크기를 확인하세요.');
  const parsed=JSON.parse(raw);let runtime=parsed,profile={};
  if(parsed.checksumAlgorithm){const from=parsed.data?.profile?.slotId;checkSlot(from);const data=decodeSlot(raw,from,{canonicalCatalog:catalog,canonicalCatalogFor:catalogFor});runtime=data.runtime;profile=data.profile}
  else if(!parsed.format){const data=migrateSave(raw);runtime=requireCurrentRuntime(data);profile=data.profile}
  validate(runtime);return {raw,runtime,profile};
 }
 function importFile(ticket,raw,{confirmed=false}={}){const input=inspectImport(raw);check(ticket);return commitReplacement(ticket,JSON.stringify(input.runtime),input.profile,confirmed,raw)}
 function exportFile(slot){const saved=read(slot);return {filename:`geoje-monsters-${slot}.json`,text:encodeSlot(saved)}}
 return {catalog,store,stamp,read,summarize,newGame,inspectImport,importFile,exportFile,adapterFor,catalogFor,gameplayReleaseFor,newGameRelease:releases.newGameRelease};
}
