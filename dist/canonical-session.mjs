import {CANONICAL_CONTENT,LEGACY_CONTENT} from './compatibility/content-namespaces.mjs';
import {validateSave} from './model.mjs';
import {CANONICAL_BATTLE_SAVE,validateCanonicalBattleSave} from './battle-v3/save.mjs';
import {CANONICAL_STORY_SAVE,validateCanonicalStorySave} from './story/save.mjs';
import {validateEconomyState} from './economy/contract.mjs';
export const CANONICAL_TEST_SAVE='GEOJE_CANONICAL_TEST_SAVE';
const clone=value=>structuredClone(value);
function canonicalCatalog(catalog){if(catalog?.namespace!=='canonical'||catalog.contentVersion!==CANONICAL_CONTENT.contentVersion)throw Error('Canonical session requires its own validated catalog');return catalog}
const uid=()=>globalThis.crypto?.randomUUID?.()??`test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export function canonicalHp(catalog,id,level){const hp=catalog.getBaseStats(id)[0];return Math.floor(2*hp*level/100)+level+10}
export function createCanonicalCreature(catalog,speciesId,level=5){
 canonicalCatalog(catalog);if(!catalog.getSpeciesById(speciesId)||!Number.isInteger(level)||level<1||level>100)throw Error('Invalid canonical creature');
 return {instanceId:uid(),namespace:'canonical',speciesId,level,totalExp:level**3,hp:canonicalHp(catalog,speciesId,level),moves:catalog.getMoveset(speciesId,level).map(m=>({id:m.id,pp:m.pp})),status:null};
}
/** This is an opt-in species/party/save harness, not an active story or battle session. */
export function createCanonicalTestGame(catalog,{mode,starterId,playerName='탐험가',appearance='boy'}={}){
 canonicalCatalog(catalog);
 if(!['development','test'].includes(mode))throw Error('Canonical new game is DEV/TEST only');
 if(!catalog.starterIds.includes(starterId))throw Error('Choose an authoritative canonical starter ID');
 const mon=createCanonicalCreature(catalog,starterId);
 return validateCanonicalTestSave({format:CANONICAL_TEST_SAVE,schemaVersion:1,...CANONICAL_CONTENT,developmentOnly:true,battleEnabled:false,storyEnabled:false,sessionId:uid(),player:{name:playerName,appearance},starterId,party:[mon],box:[],dex:{seen:[starterId],caught:[starterId]},position:{scene:'canonical-test',x:200,y:200,facing:'down'},revision:0,updatedAt:Date.now()},catalog);
}
export function validateCanonicalTestSave(input,catalog){
 return validateCanonicalSessionData(input,catalog);
}
/** Shared identity/slot invariants. Battle policy is supplied only by the versioned Battle v3 validator. */
export function validateCanonicalSessionData(input,catalog,policy={format:CANONICAL_TEST_SAVE,battleEnabled:false}){
 canonicalCatalog(catalog);
 validateEconomyState(input,catalog);
 if(input?.format!==policy.format||input.schemaVersion!==1||input.contentNamespace!==CANONICAL_CONTENT.contentNamespace||input.contentVersion!==catalog.contentVersion||input.speciesNamespace!=='canonical'||input.developmentOnly!==true||input.battleEnabled!==policy.battleEnabled||input.storyEnabled!==(policy.storyEnabled??false))throw Error('Unsupported canonical test save/session boundary');
 if(typeof input.sessionId!=='string'||!input.sessionId||typeof input.player?.name!=='string'||!input.player.name.trim()||input.player.name.length>40||!['boy','girl'].includes(input.player.appearance))throw Error('Invalid canonical player');
 if(!catalog.starterIds.includes(input.starterId))throw Error('Invalid canonical starter identity');
 if(!Array.isArray(input.party)||!input.party.length&&!policy.allowEmptyParty||input.party.length>6||!Array.isArray(input.box)||input.box.length>300)throw Error('Invalid canonical party/storage');
 const owned=[...input.party,...input.box],ids=new Set();
 for(const mon of owned){
  if(mon?.namespace!=='canonical'||!catalog.getSpeciesById(mon.speciesId)||typeof mon.instanceId!=='string'||!mon.instanceId||ids.has(mon.instanceId))throw Error('Invalid or mixed species identity');ids.add(mon.instanceId);
  if(!Number.isInteger(mon.level)||mon.level<1||mon.level>100||!Number.isInteger(mon.totalExp)||mon.totalExp<mon.level**3||mon.totalExp>1000000||!Number.isInteger(mon.hp)||mon.hp<0||mon.hp>canonicalHp(catalog,mon.speciesId,mon.level))throw Error('Invalid canonical growth values');
  if(!Array.isArray(mon.moves)||mon.moves.length>4||!mon.moves.length||new Set(mon.moves.map(m=>m.id)).size!==mon.moves.length)throw Error('Invalid canonical moveset');
  // The preserved Step 3B harness permits only level-up moves; versioned Battle v3 adds canonical TM compatibility.
  const allowed=[...catalog.getSpeciesById(mon.speciesId).moves.filter(m=>m.level<=mon.level).map(m=>m.id),...(policy.extraMoves?.(mon)??[])];
  for(const move of mon.moves){if(!allowed.includes(move.id)||!Number.isInteger(move.pp)||move.pp<0||move.pp>catalog.getMoveById(move.id)?.pp)throw Error('Invalid canonical move reference')}
  if(mon.status!==null&&!policy.statuses?.includes(mon.status))throw Error('Canonical battle statuses are not active in this test harness');
 }
 for(const key of ['seen','caught']){const refs=input.dex?.[key];if(!Array.isArray(refs)||new Set(refs).size!==refs.length||refs.some(id=>!catalog.getSpeciesById(id)))throw Error('Invalid canonical dex identity')}
 if(input.dex.caught.some(id=>!input.dex.seen.includes(id))||owned.some(mon=>!input.dex.caught.includes(mon.speciesId)))throw Error('Canonical dex ownership invariant');
 if(!Number.isInteger(input.revision)||input.revision<0||!Number.isFinite(input.updatedAt)||!Number.isFinite(input.position?.x)||!Number.isFinite(input.position?.y)||typeof input.position.scene!=='string'||!['up','down','left','right'].includes(input.position.facing))throw Error('Invalid canonical session state');
 return clone(input);
}
export function setCanonicalLead(input,catalog,speciesId){
 const next=validateCanonicalTestSave(input,catalog),mon=createCanonicalCreature(catalog,speciesId,next.party[0]?.level??5);
 next.party[0]=mon;
 for(const key of ['seen','caught'])if(!next.dex[key].includes(speciesId))next.dex[key].push(speciesId);
 next.revision++;next.updatedAt=Date.now();return validateCanonicalTestSave(next,catalog);
}
export function createGameSession(runtime,catalog){
 if(catalog?.namespace==='canonical')return {contentNamespace:CANONICAL_CONTENT.contentNamespace,contentVersion:catalog.contentVersion,catalog,runtime:runtime?.format===CANONICAL_STORY_SAVE?validateCanonicalStorySave(runtime,catalog):runtime?.format===CANONICAL_BATTLE_SAVE?validateCanonicalBattleSave(runtime,catalog):validateCanonicalTestSave(runtime,catalog)};
 if(catalog?.namespace==='work-v2'){
  if(runtime?.contentNamespace&&![LEGACY_CONTENT.contentNamespace,'work-v2'].includes(runtime.contentNamespace))throw Error('Catalog/session mismatch');
  if(runtime?.format===CANONICAL_TEST_SAVE)throw Error('Canonical session cannot enter the legacy engine');
  return {contentNamespace:LEGACY_CONTENT.contentNamespace,contentVersion:LEGACY_CONTENT.contentVersion,catalog,runtime:validateSave(runtime)};
 }
 throw Error('Explicit session catalog required');
}
