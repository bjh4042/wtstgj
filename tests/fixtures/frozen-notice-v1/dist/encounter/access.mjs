import {evaluateStoryExpression} from '../story/gates.mjs';
import {ENCOUNTER_VERSION,RESTRICTED_AREAS} from '../compatibility/encounter-adapter.mjs';
export function stageAccessible(save,c,stageId){const st=c.story.stages[stageId];return !!st&&st.prerequisites.every(id=>save.progress.completedStages.includes(id))&&(!st.entryGate||evaluateStoryExpression(st.entryGate,save,c.story))}
export function requirementMet(save,c,id,eventId=null){
 if(id==='story_evening_survey')return save.encounter.surveys.includes(eventId);
 if(id==='field_ability_surf')return evaluateStoryExpression('CAN_SURF',save,c.story);
 if(Object.hasOwn(c.rodMethods,id))return evaluateStoryExpression(`CAN_FISH_${id.split('_')[0].toUpperCase()}`,save,c.story);
 return false; // Unknown requirements fail closed; no real clock/weather gates.
}
export function areaAccess(save,c,areaId){
 if(save?.contentNamespace!=='canonical-v1'||save.encounterVersion!==ENCOUNTER_VERSION)return 'ENCOUNTER_NOT_ACTIVE';
 if(!c.areas[areaId])return 'UNKNOWN_AREA';
 if(!stageAccessible(save,c,c.areas[areaId].stageId))return 'AREA_STAGE_LOCKED';
 return null;
}
export function tableAccess(save,c,tableId){
 if(save?.contentNamespace==='canonical-v1'&&c.policyExcludedTables?.[tableId])return 'POLICY_NO_RANDOM_ENCOUNTER';
 const t=c.tables[tableId];if(!t)return 'UNKNOWN_TABLE';
 const areaError=areaAccess(save,c,t.areaId);if(areaError)return areaError;
 if(RESTRICTED_AREAS.includes(t.areaId)||c.areas[t.areaId].restricted)return 'RESTRICTED_AREA';
 if(save.encounter.areaId!==t.areaId)return 'AREA_MISMATCH';
 if(!t.active)return 'TABLE_QUARANTINED';
 if(t.slots.some(slot=>{const chain=Object.values(c.chains).find(ch=>ch.speciesIds.includes(slot.speciesId));return !chain||!stageAccessible(save,c,chain.firstStage)}))return 'ACQUISITION_STAGE_LOCKED';
 if(!stageAccessible(save,c,t.availableFrom)||t.gate&&!evaluateStoryExpression(t.gate,save,c.story))return 'TABLE_GATE_LOCKED';
 if(t.requirements.some(id=>!requirementMet(save,c,id)))return 'FIELD_REQUIREMENT_LOCKED';
 // A stage may be unlocked before its rod reward is earned (S7 completion unlocks S8).
 // Enforce existing per-chain requirements; this cannot remove the quarantine above.
 if(t.slots.some(slot=>{const chain=Object.values(c.chains).find(ch=>ch.speciesIds.includes(slot.speciesId));return chain.requirements.some(id=>!requirementMet(save,c,id))}))return 'ACQUISITION_REQUIREMENT_LOCKED';
 return null;
}
/** Read-only explanation: expose all progression layers even when quarantine is the first blocker.
 * eligible is always the real tableAccess result, never a hypothetical gate-only authorization.
 */
export function explainTableAccess(save,c,tableId){
 if(c.policyExcludedTables?.[tableId])return {tableId,eligible:false,error:null,reason:'POLICY_NO_RANDOM_ENCOUNTER',policyExcluded:true,quarantined:false,policyId:c.policy.policyId,slots:[]};
 const t=c.tables[tableId],error=tableAccess(save,c,tableId);if(!t)return {tableId,eligible:false,error,slots:[]};
 const requirement=id=>({id,satisfied:requirementMet(save,c,id)});
 return {tableId,eligible:error===null,error,quarantined:!t.active,areaStage:c.areas[t.areaId]?.stageId,areaUnlocked:stageAccessible(save,c,c.areas[t.areaId]?.stageId),availableFrom:t.availableFrom,availableFromUnlocked:stageAccessible(save,c,t.availableFrom),tableGate:t.gate,tableGateSatisfied:!t.gate||evaluateStoryExpression(t.gate,save,c.story),tableRequirements:t.requirements.map(requirement),slots:t.slots.map(slot=>{
  const chain=Object.values(c.chains).find(ch=>ch.speciesIds.includes(slot.speciesId));
  return {speciesId:slot.speciesId,firstStage:chain?.firstStage??null,firstStageUnlocked:!!chain&&stageAccessible(save,c,chain.firstStage),acquisitionRequirements:(chain?.requirements??[]).map(requirement),randomAllowed:chain?.randomAllowed??null,ballAllowed:chain?.ballAllowed??null,interactionMode:chain?.mode??null,listedFishingMethod:t.rod??null};
 })};
}
export function acquisitionAccess(save,c,eventId){
 const e=c.events[eventId];if(!e?.active||eventId==='STARTER_CHOICE_PROLOGUE')return 'EVENT_UNAVAILABLE';
 const areaError=areaAccess(save,c,e.areaId);if(areaError)return areaError;
 if(save.encounter.areaId!==e.areaId)return 'AREA_MISMATCH';
 if(e.mode==='battle_capture'&&RESTRICTED_AREAS.includes(e.areaId))return 'RESTRICTED_AREA';
 if(e.gate&&!evaluateStoryExpression(e.gate,save,c.story)||e.requiredRegistered.some(id=>!save.dex.caught.includes(id)))return 'EVENT_GATE_LOCKED';
 if(e.requirements.some(id=>!requirementMet(save,c,id,eventId)))return 'FIELD_REQUIREMENT_LOCKED';
 const narrative=c.story.events[e.storyId];if(narrative?.requiresEvents.some(id=>!save.progress.completedEvents.includes(id)))return 'EVENT_ORDER_LOCKED';
 if(e.firstCaptureOnly&&save.encounter.fixedCompleted.includes(eventId))return 'ALREADY_CAPTURED';
 if(save.encounter.acquisitionCompleted.includes(eventId)&&e.mode!=='npc_trade')return 'ALREADY_COMPLETED';
 const chain=Object.values(c.chains).find(x=>x.speciesIds.includes(e.speciesId));
 if(chain&&!stageAccessible(save,c,chain.firstStage))return 'ACQUISITION_STAGE_LOCKED';
 return null;
}
