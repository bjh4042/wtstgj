import contract from './asset-contract.mjs';
export const REGION_ID=contract.regionId;
export const S=contract.textureScaleNumerator/contract.textureScaleDenominator;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function initialState(){return {regionId:REGION_ID,actor:{x:500,y:650,facing:'FRONT',phase:'IDLE',height:80},camera:{x:32,y:360},drawMode:'slices',actorVisible:true,chunkWarpCount:0};}
export function setCamera(state,x,y){if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Camera coordinates must be finite');return {...state,camera:{x:clamp(x,...contract.cameraBounds.x),y:clamp(y,...contract.cameraBounds.y)}};}
export function panCamera(state,input,dt){if(!Number.isFinite(dt)||dt<=0)return state;let x=Number(input?.x)||0,y=Number(input?.y)||0;if(!Number.isFinite(x))x=0;if(!Number.isFinite(y))y=0;const length=Math.hypot(x,y);if(!length)return state;const distance=180*Math.min(dt,.1);return setCamera(state,state.camera.x+x/length*distance,state.camera.y+y/length*distance);}
export function resetCamera(state){return setCamera(state,32,360);}
export function setMode(state,mode){if(!['slices','reference'].includes(mode))throw Error('Unknown draw mode');return {...state,drawMode:mode};}
export function setActorHeight(state,height){if(![80,110].includes(height))throw Error('Unsupported actor comparison size');return {...state,actor:{...state.actor,height}};}
// No actor movement, collision, storage, scene transition or warp is implemented in this camera-only stage.
