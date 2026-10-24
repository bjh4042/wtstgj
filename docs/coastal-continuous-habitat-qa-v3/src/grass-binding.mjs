import contract from './grass-contract.mjs';
import {createGrassState,acceptFootstep,tickGrass,updateContact,setPresentationMode} from './tuft-motion.mjs';
export const PRESENTATION_STEP_DISTANCE=26;
export const SUBSEQUENT_CONTACT_INTERVAL=52; // A-IDLE-B-IDLE: contact only after A or B, not every quarter-cycle.
export function cloneGrass(s){return {...s,impulses:Object.fromEntries(Object.entries(s.impulses).map(([id,v])=>[id,{pulses:v.pulses.map(p=>({...p}))}]))};}
export function initialHabitat(){return {grass:createGrassState(),presentationStepSerial:0,presentationStepRemainder:0,presentationStepThreshold:PRESENTATION_STEP_DISTANCE,lastPresentationSteps:[],reducedMotion:false,presentationPaused:false};}
export function bindLegalMotion(previous,actor,dt){
 const grass=cloneGrass(previous.grass),frameStartTime=previous.grass.time,paused=!!(previous.presentationPaused||actor.modal);setPresentationMode(grass,{paused,reducedMotion:previous.reducedMotion});
 let remainder=previous.presentationStepRemainder,serial=previous.presentationStepSerial,threshold=previous.presentationStepThreshold??PRESENTATION_STEP_DISTANCE;const events=[];
 if(paused||!actor.moving){remainder=0;threshold=PRESENTATION_STEP_DISTANCE;}
 if(Number.isFinite(dt)&&dt>0){tickGrass(grass,Math.min(dt,.1));
  if(!paused&&actor.moving)for(const [segmentIndex,[from,to]]of (actor.lastMotionSegments??[]).entries()){const dx=to[0]-from[0],dy=to[1]-from[1],length=Math.hypot(dx,dy);if(!(length>0))continue;let used=0;
   while(remainder+length-used>=threshold-1e-10){const distance=Math.max(0,threshold-remainder);used+=distance;const fraction=Math.min(1,used/length);const segmentTime=actor.lastMotionTimeline?.[segmentIndex];if(!segmentTime)throw Error('Missing accepted movement segment time');const eventTime=frameStartTime+Math.min(dt,.1)*(segmentTime.t0+(segmentTime.t1-segmentTime.t0)*fraction);const event={serial:++serial,time:eventTime,accepted:true,distance:threshold,contactPhase:'IDLE_AFTER_A_OR_B',foot:{x:from[0]+dx*fraction,y:from[1]+dy*fraction},direction:{x:dx/length,y:dy/length},source:'accepted_controller_segment_distance_not_canonical_encounter'};const tuftIds=acceptFootstep(grass,event,contract);events.push({...event,tuftIds});remainder=0;threshold=SUBSEQUENT_CONTACT_INTERVAL;if(length-used<1e-10)break;}
   remainder+=Math.max(0,length-used);
  }
 }
 updateContact(grass,actor,contract);
 return {grass,presentationStepSerial:serial,presentationStepRemainder:remainder,presentationStepThreshold:threshold,lastPresentationSteps:events};
}
export {contract};
