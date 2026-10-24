import {approvedAtlasFrame,loadApprovedAtlas,approvedAtlasRevision,cancellableAtlasImage} from '../approved-atlas-runtime.mjs';
import {APPROVED_PLAYER_FRAMES} from './approved-player-bindings.mjs';

let lastDraw=null;export const approvedPlayerDrawStatus=()=>lastDraw;
const images=new Map();let pending;let pendingRevision=-1;
const direction=Object.freeze({down:'FRONT',right:'RIGHT',left:'LEFT',up:'BACK'}),cycle=['A','IDLE','B','IDLE'];
export const APPROVED_PLAYER_HEIGHT=38; // Same visible height as the previous active W03 player; no movement/collision change.
export const approvedPlayerIdentity=appearance=>['girl','female','player-girl'].includes(appearance)?'PLAYER_FEMALE':'PLAYER_MALE';
export function approvedPlayerPose({appearance='boy',facing='down',moving=false,walk=0,x,y,cameraY=0,visibleHeight=APPROVED_PLAYER_HEIGHT}){
 if(!direction[facing])throw Error('Invalid player direction');
 const identity=approvedPlayerIdentity(appearance),pose=moving?cycle[Math.floor(Math.max(0,walk)/26)%4]:'IDLE';
 const key=`${identity}.${direction[facing]}.${pose}`,frame=APPROVED_PLAYER_FRAMES[key];
 const [left,top,right,bottom]=frame.bounds,w=right-left,h=bottom-top,scale=visibleHeight/h;
 return {key,frame,source:approvedAtlasFrame('player',key)?.frame.source??[left,top,w,h],destination:[Math.round(x)-w*scale/2,Math.round(y-cameraY)-visibleHeight,w*scale,visibleHeight]};
}
export function loadApprovedPlayers(loader=cancellableAtlasImage){
 const revision=approvedAtlasRevision();if(pendingRevision!==revision){pending=undefined;pendingRevision=revision}
 return pending??=(async()=>{await Promise.all(Object.entries(APPROVED_PLAYER_FRAMES).map(async([key,frame])=>{try{const image=await loadApprovedAtlas('player',key,loader);if(image)images.set(key,image)}catch{/* Missing art does not affect rules or saves; no legacy copied-art fallback. */}}))})();
}
export function drawApprovedPlayer(context,actor,cameraY=0){
 const pose=approvedPlayerPose({...actor,cameraY}),image=images.get(pose.key);lastDraw={key:pose.key,imageReady:!!image,source:pose.source,destination:pose.destination,canvas:[context.canvas?.width??0,context.canvas?.height??0],alpha:context.globalAlpha??1};if(!image)return false;
 context.save();context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,...pose.source,...pose.destination);context.restore();return true;
}
