import{HARIN_ROWS}from'./contact-rows.mjs';
import{SCENES}from'../hacheong-brackish/scenes.mjs';
const deep=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')deep(v);return Object.freeze(o)};
// NEW_DEV R2: selected visible dirt contact, not a recovered lost-stage coordinate.
// NPC foot is outside the player-centre mask; only the read point is support checked.
export const S1_HARIN=deep({foot:[4300,1010],facing:'left',readFoot:[4220,1010],requiredFacing:'right',visibleHeight:80});
const s=SCENES.east;
export const S1_COMPLETION_ROLES=deep([{pointId:'trainer:RIVAL_01',kind:'trainer',sourceRow:{id:'trainer:RIVAL_01',kind:'trainer',mapId:'world:hub:S1',stageId:'S1',areaId:null,x:24,y:14,label:'하린',placementStatus:'DEV_PLACEMENT_NOT_FINAL_GEOGRAPHY',trainerId:'RIVAL_01',npcId:'NPC_RIVAL_HARIN',eventId:'RIVAL_01',required:true,repeatable:false},sceneId:s.sceneId,mapId:s.mapId,revision:s.revision,imageSHA:s.imageSHA,maskSHA:s.maskSHA,gameplayRevision:'NEW_REBUILD_R2_S1_HARIN_ORIGINAL_RIVAL01',requiredFacing:'right',rows:HARIN_ROWS}]);
