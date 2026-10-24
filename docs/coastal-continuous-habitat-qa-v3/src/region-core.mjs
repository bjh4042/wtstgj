import {initialState as actorInitial,advance,action} from './movement-core.mjs';
import {setCamera} from './camera-core.mjs';
import {initialHabitat,bindLegalMotion} from './grass-binding.mjs';
export const REGION_ID='qa_coastal_master_v1';
export function initialRegion(){return {regionId:REGION_ID,actor:actorInitial(),camera:{x:8,y:8},drawMode:'slices',actorVisible:true,chunkWarpCount:0,...initialHabitat()};}
export function followActor(state){return setCamera(state,state.actor.x-480,state.actor.y-320);}
export function advanceRegion(state,input,dt){const actor=state.presentationPaused?{...state.actor,moving:false,phase:'IDLE',gaitDistance:0,lastMotionSegments:[],lastMotionTimeline:[]}:advance(state.actor,input,dt);return followActor({...state,actor,...bindLegalMotion(state,actor,dt)});}
export function regionAction(state,key){const actor={...state.actor,lastMotionSegments:[],lastMotionTimeline:[]};action(actor,key);return {...state,actor,...bindLegalMotion(state,actor,0)};}
export function resetRegion(state){return {...initialRegion(),drawMode:state.drawMode,reducedMotion:state.reducedMotion,actor:{...actorInitial(),height:state.actor.height}};}
