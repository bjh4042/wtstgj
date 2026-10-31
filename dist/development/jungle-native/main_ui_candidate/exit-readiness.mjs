import{canCompleteStoryStage}from'../../../story/stage-completion-readiness.mjs';
import{worldStageAccess,worldGate}from'../../../world/state.mjs';
// Build from the actual canonical definition, not a copied list of story requirements.
// Boolean is visual/read-only, NOT a native grant and NOT used to execute a source event.
export function createS5ExitReadiness(definition){const point=definition.points['route:S5:S6'],target=definition.maps[point?.targetMapId];if(point?.kind!=='warp'||point.mapId!=='world:hub:S5'||point.exit!==true||point.stageId!=='S5'||target?.stageId!=='S6')throw Error('S5_EXIT_DEFINITION_DRIFT');return(save,contract)=>{const p=save.progress,already=p.completedStages.includes(point.stageId),canFinish=already||canCompleteStoryStage(save,contract,point.stageId);if(!canFinish)return false;
 // A detached read-only view of what the ORIGINAL exit's completeStage would permit.
 // No caller/save array is modified and no world/story/store API is invoked.
 const view=already?save:{...save,progress:{...p,completedStages:[...p.completedStages,point.stageId]}};return worldStageAccess(view,contract,target.stageId)&&worldGate(view,contract,point.gate)}}
