import{canCompleteStoryStage}from'../../../story/stage-completion-readiness.mjs';
import{stableJSON}from'../../../compatibility/codec.mjs';
import{S4_KNOWN_WARPS}from'../../s4-progression-native/known-warps.mjs';
const S3_S4_EXIT_SOURCE=S4_KNOWN_WARPS.find(r=>r.pointId==='route:S3:S4').sourceRow;
// Reject-only classifier for a PRIVATE captured original S3 exit attempt.
// Does not complete a stage, authorize a warp, or manufacture native placement.
export function isOriginalS3StageDraft(before,next,row,contract){
 const p=row?.sourceRow;
 if(row?.pointId!=='route:S3:S4'||p?.id!=='route:S3:S4'||p.kind!=='warp'||p.exit!==true||p.stageId!=='S3'||p.mapId!=='world:hub:S3'||p.targetMapId!=='world:hub:S4'||before?.position?.scene!=='world:hub:S3'||before?.world?.mapId!=='world:hub:S3'||before?.progress?.currentStage!=='S3'||before.progress.completedStages.includes('S3')||!canCompleteStoryStage(before,contract,'S3')||next?.revision!==before.revision+1||!Number.isSafeInteger(next.updatedAt))return false;
 if(stableJSON(p)!==stableJSON(S3_S4_EXIT_SOURCE))return false;
 const expected=structuredClone(before);expected.progress.completedStages.push('S3');expected.revision=next.revision;expected.updatedAt=next.updatedAt;return stableJSON(expected)===stableJSON(next);
}
