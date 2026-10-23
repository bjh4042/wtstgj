/** Pure migration candidate for the 2026-09-27 canonical snapshot schema.
 * No storage writes occur here. Callers must validate and atomically commit
 * against a backup before replacing a v2 slot.
 */
const obsolete=id=>/^POST_ENHANCED_LEAGUE(?:_|$)/.test(id);
const tmIds=Array.from({length:50},(_,i)=>`TM${String(i+1).padStart(2,'0')}`);
function owned(value){
 if(value==null||value===false||value===0)return false;
 if(value===true)return true;
 if(Number.isSafeInteger(value)&&value>0)return true;
 if(value&&typeof value==='object'){
  if(value.owned===true)return true;
  if(value.owned===false&&value.quantity==null)return false;
  if(Number.isSafeInteger(value.quantity)&&value.quantity>=0)return value.quantity>0;
 }
 throw Error('Invalid v2 TM ownership marker');
}
export function migrateHandoffSaveV2ToV3(snapshot){
 if(!snapshot||snapshot.schemaVersion!==2)throw Error('Expected canonical Save v2');
 const next=structuredClone(snapshot),warnings=[];
 const oldTms=next.inventory?.tm??{};
 for(const id of Object.keys(oldTms))if(!tmIds.includes(id))throw Error('Unrecognized v2 TM ID: '+id);
 next.inventory.tm=Object.fromEntries(tmIds.map(id=>[id,owned(oldTms[id])]));
 const items=next.inventory.items??{};
 if(Object.hasOwn(items,'full_potion')){
  const n=items.full_potion;
  if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid full_potion inventory');
  if((items.full_restore??0)>0&&n>0)throw Error('Conflicting old and new full recovery quantities; preserve original for review');
  items.full_restore=Math.max(n,items.full_restore??0);
  delete items.full_potion;
 }
 const flags=next.progress?.flags??{};
 for(const id of Object.keys(flags))if(obsolete(id)){delete flags[id];warnings.push('archived obsolete flag '+id)}
 next.progress.completedEvents=(next.progress.completedEvents??[]).filter(id=>{
  if(obsolete(id)){warnings.push('archived obsolete event '+id);return false}
  return true;
 });
 const oldChampion=flags.MAIN_STORY_CLEAR===true&&next.progress.completedEvents.includes('FINAL_CHAMPION');
 if(oldChampion)for(const id of ['POST_UNLOCKED','ONLINE_FRIEND_BATTLE_UNLOCKED','POST_SANCTUARIES_UNLOCKED','POST_STARTER_RESEARCH_UNLOCKED'])flags[id]=true;
 // The source schema predates the independent Yeji finale. Even if a source
 // carries future-looking event IDs, none is evidence of the new victory or
 // ending. The untouched source is retained by the store for manual review.
 const unproven=id=>id==='FINAL_ENDING_RECORD'||id==='YEJI_FINAL'||id==='YEJI_FINAL_ENDING'||id==='POST_ONSEOM_GARDEN_FIRST_151'||/^NO_?151_(?:UNLOCK|ACCESS|AVAILABLE|FIXED|FIRST|ENCOUNTER)/.test(id);
 next.progress.completedEvents=next.progress.completedEvents.filter(id=>{if(!unproven(id))return true;warnings.push('archived unproven v3 event '+id);return false});
 delete flags.YEJI_FINAL_DONE;delete flags.YEJI_FINAL_ENDING_DONE;
 // The old compass/caught-legend gate did not establish the new Yeji finale.
 for(const id of Object.keys(flags))if(/^NO_?151_(?:UNLOCK|ACCESS|AVAILABLE|FIXED|FIRST|ENCOUNTER)/.test(id))delete flags[id];
 for(const n of [148,149,150]){
  const caught=(next.dex?.caughtSpeciesNos??[]).includes(n);
  if(caught)flags[`SANCTUARY_${n}_RESOLVED`]=true;
  // Not caught does not imply unresolved; old saves may lack victory evidence.
 }
 next.world??={};
 next.world.defeatedTrainerIds=[...new Set(next.world.defeatedTrainerIds??[])];
 const visited=next.world.visitedMapIds??[];
 next.world.discoveredLocationIds=[...new Set([...visited,...(next.progress?.currentMapId?[next.progress.currentMapId]:[])])];
 // A claimed one-time TM is reliable evidence even when the old bag quantity was spent.
 const claimed=new Set([...(next.world.claimedOneTimeItemIds??[]),...(next.rewards?.claimedOneTimeRewardIds??[])]);
 for(const id of tmIds)if(claimed.has(id)&&!next.inventory.tm[id]){next.inventory.tm[id]=true;warnings.push('restored TM ownership from claim '+id)}
 next.fieldResearch={completedResearchQuestIds:[],claimedResearchRewardIds:[]};
 const grants=next.rewards?.geojeBallGrantHistory??[];
 if(grants.reduce((sum,x)=>sum+(x.quantity??0),0)>12)throw Error('Geoje Ball lifetime grant limit exceeded');
 // Roamer HP/status is deliberately not copied into a persistent encounter.
 if(next.world.roamingLegends)for(const state of Object.values(next.world.roamingLegends)){
  if(state&&typeof state==='object'){delete state.currentHp;delete state.majorStatus;state.resetOnNextEncounter=true}
 }
 next.schemaVersion=3;
 next.contentVersions={...next.contentVersions,battle:'geoje_battle_collection_master_v3_2',trainer:'geoje_trainer_npc_master_v2_2',character:'geoje_character_npc_master_v2_1',stage:'geoje_stage_master_v2_4',encounter:'geoje_encounter_master_v2_4',flags:'geoje_story_flags_master_v3',save:'geoje_save_schema_v3'};
 next.migration={sourceSchemaVersion:2,sourceContentVersions:structuredClone(snapshot.contentVersions??{}),migrationId:'GEOJE_20260927_V2_TO_V3',warnings};
 if(next.integrity){delete next.integrity.checksum;next.integrity.needsValidatedReseal=true}
 return {candidate:next,warnings};
}
