import {evaluateStoryExpression} from '../story/gates.mjs';

// Presentation/collision sidecar only. Logical points, event gates and coordinates
// remain in definition.mjs and continue through the existing interaction service.
export const PROLOGUE_EVENT_MARKERS=Object.freeze(['P00_HOME_START','P04_SUSPICIOUS_TRACE']);
const DOCTOR_PHASES=Object.freeze(['P01_ECO_CENTER','P02_FIRST_PARTNER','P03_TUTORIAL']);
function nextDoctorEvent(save,story){
 const progress=save.progress;
 if(!progress||progress.currentStage!=='PROLOGUE'||save.enhancedLeague?.phase==='active')return null;
 return DOCTOR_PHASES.find(id=>{const event=story.events[id];return event?.active&&!event.acquisitionOnly&&!progress.completedEvents.includes(id)&&event.requiresEvents.every(required=>progress.completedEvents.includes(required))&&event.requiresGates.every(gate=>evaluateStoryExpression(gate,save,story))})??null;
}
/** The one actor list used by rendering, core collisions and host/save landing checks. */
export function physicalActorsForMap(def,mapId,save,story){
 const map=def.maps[mapId];if(!map)return [];
 if(mapId!=='world:hub:PROLOGUE')return map.actors;
 const activeDoctorEvent=nextDoctorEvent(save,story);
 return map.actors.filter(actor=>{
  if(PROLOGUE_EVENT_MARKERS.includes(actor.eventId))return false;
  if(actor.npcId==='NPC_CHAMPION_DOCTOR_YOON'&&DOCTOR_PHASES.includes(actor.eventId))return actor.eventId===activeDoctorEvent;
  return true;
 });
}
