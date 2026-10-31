import{GYM_DOOR_ROWS}from'./contact-rows.mjs';
import{SCENES}from'../hacheong-brackish/scenes.mjs';
import{GYM12}from'../gym12-native/registration.mjs';
const deep=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')deep(v);return Object.freeze(o)};
const s=SCENES.east,g=GYM12[1],pose=(r,foot,facing)=>({sceneId:r.sceneId,mapId:r.mapId,revision:r.revision,imageSHA:r.imageSHA,maskSHA:r.maskSHA,foot,facing});
const identity={sceneId:g.sceneId,mapId:g.mapId,revision:g.revision,imageSHA:g.image.sha256,maskSHA:g.states[0].maskSHA};
// NEW_DEV contacts individually selected on the existing visible dirt/door art.
// Arrival poses are dynamically redescribed against canonical gate state by owner.
export const S1_GYM_WARPS=deep([
{version:1,pointId:'gym-entry:1',sourceRow:g.warpSourceRows[0],sceneId:s.sceneId,mapId:s.mapId,revision:s.revision,imageSHA:s.imageSHA,maskSHA:s.maskSHA,readFoot:[4180,940],facing:'up',approach:{policy:'NEW_DEV selected visible door L1 radius24 clipped to unchanged safe mask',rows:GYM_DOOR_ROWS},landing:{version:1,...pose(identity,[...g.entry],'up'),state:0}},
{version:1,pointId:'gym-entry:1:return',sourceRow:g.warpSourceRows[1],...identity,states:Object.fromEntries(Object.entries(g.states).map(([k,v])=>[k,{imageSHA:g.image.sha256,maskSHA:v.maskSHA}])),readFoot:[...g.entry],facing:'down',approach:{policy:'Selected native return mat; release and leave required',rows:Array.from({length:25},(_,i)=>[g.entry[1]-12+i,g.entry[0]-24,g.entry[0]+25])},landing:pose(s,[4180,1000],'down')}
]);
