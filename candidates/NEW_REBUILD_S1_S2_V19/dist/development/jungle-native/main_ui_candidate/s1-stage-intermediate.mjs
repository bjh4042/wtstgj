import{canCompleteStoryStage}from'../../../story/stage-completion-readiness.mjs';
import{stableJSON}from'../../../compatibility/codec.mjs';
import{S1_S2_EXIT_SOURCE}from'./s1-s2-route-contract.mjs';
// Reject-only classifier for a PRIVATE captured original S1 exit attempt.
// Does not complete a stage, authorize a warp, or manufacture native placement.
export function isOriginalS1StageDraft(before,next,row,contract){
 const p=row?.sourceRow;
 if(row?.pointId!=='route:S1:S2'||p?.id!=='route:S1:S2'||p.kind!=='warp'||p.exit!==true||p.stageId!=='S1'||p.mapId!=='world:hub:S1'||p.targetMapId!=='world:hub:S2'||before?.position?.scene!=='world:hub:S1'||before?.world?.mapId!=='world:hub:S1'||before?.progress?.currentStage!=='S1'||before.progress.completedStages.includes('S1')||!canCompleteStoryStage(before,contract,'S1')||next?.revision!==before.revision+1||!Number.isSafeInteger(next.updatedAt))return false;
 if(stableJSON(p)!==stableJSON(S1_S2_EXIT_SOURCE))return false;
 const expected=structuredClone(before);expected.progress.completedStages.push('S1');expected.revision=next.revision;expected.updatedAt=next.updatedAt;return stableJSON(expected)===stableJSON(next);
}
