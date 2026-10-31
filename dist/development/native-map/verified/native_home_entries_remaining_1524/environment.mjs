import {createClockOwner,createFrameLighting} from '../jangmok_runtime_recovery/runtime_tree/jangmok_layout_revision_plan_20261027/lighting_all_candidate_r3/consumer/frame-lighting.mjs';
import {createScreenLayer} from '../jangmok_runtime_recovery/runtime_tree/jangmok_layout_revision_plan_20261027/lighting_all_candidate_r3/consumer/screen-lighting.mjs';
import {createMonotonicDelta} from '../jangmok_runtime_recovery/runtime_tree/jangmok_layout_revision_plan_20261027/lighting_all_candidate_r3/consumer/monotonic-delta.mjs';
import {sampleNightMix} from '../jangmok_runtime_recovery/runtime_tree/jangmok_layout_revision_plan_20261027/lighting_all_candidate_r3/consumer/day-night.mjs';
import {renderSelectedJangmok} from './jangmok-render.mjs';
export function createJangmokEnvironment(A){
 A.screen=createScreenLayer({manifest:A.LM,indices:A.lightIds,transmission:A.lightTransmission,expectedSourceSHA:A.M.sourceSHA});A.ambient=createFrameLighting({nightTint:A.LM.ambientTint});
 const clock=createClockOwner({absoluteMinutes:720});let delta=createMonotonicDelta(),resumeBaseline=false;const options={water:true,lights:true,b1:true,b2:true,b3:true,b4:true,sort:true,depth:true,paused:false,demo:false};
 const read=()=>({...clock.read(),nightMix:sampleNightMix(clock.read().absoluteMinutes,{dawnStart:300,dayStart:420,duskStart:1080,nightStart:1200}),options:{...options},clockOwnerCount:1});
 return Object.freeze({read,tick(ms){if(!Number.isFinite(ms)||ms<0)throw Error('INVALID_DELTA');if(!options.paused)clock.tick(ms);return read()},resetFrameBaseline(){resumeBaseline=true},tickRAF(now,active=true){if(resumeBaseline&&active){delta=createMonotonicDelta();resumeBaseline=false}const dt=delta(now);if(!active){resumeBaseline=true;return 0}if(!options.paused)clock.tick(dt);return dt},setTime(minutes){clock.scrubLighting(minutes);return read()},setOption(key,value){if(!Object.hasOwn(options,key)||typeof value!=='boolean')throw Error('INVALID_OPTION');options[key]=value;if(key==='demo')clock.setLightingRate(value?1/20:1/60000);return read()},render(g,state){return renderSelectedJangmok(g,A,state,clock,options)}});
}
