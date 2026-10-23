import {deepFreeze} from '../compatibility/codec.mjs';
/** Existing STEP 2 QA geometry only. This is NOT an authored Geoje map or approved geography. */
export const ECONOMY_TEST_PLACEMENT=deepFreeze({developmentOnly:true,initialHub:'TEST_CENTER',hubs:{TEST_CENTER:{id:'TEST_CENTER',position:{scene:'qa_a',x:384,y:384,facing:'down'},stageId:'PROLOGUE'}},points:{OBS_A:{position:{scene:'qa_a',x:480,y:384}},OBS_B:{position:{scene:'qa_a',x:480,y:480}},OBS_C:{position:{scene:'qa_a',x:384,y:480}}}});
