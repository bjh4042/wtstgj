import{canCompleteStoryStage}from'../../../story/stage-completion-readiness.mjs';
import{stableJSON}from'../../../compatibility/codec.mjs';
import{S3_KNOWN_WARPS}from'../../s3-progression-native/known-warps.mjs';
const S2_S3_EXIT_SOURCE=S3_KNOWN_WARPS.find(r=>r.pointId==='route:S2:S3').sourceRow;
// Reject-only classifier for a PRIVATE captured original S2 exit attempt.
// Does not complete a stage, authorize a warp, or manufacture native placement.
export function isOriginalS2StageDraft(before,next,row,contract){
 const p=row?.sourceRow;
 if(row?.pointId!=='route:S2:S3'||p?.id!=='route:S2:S3'||p.kind!=='warp'||p.exit!==true||p.stageId!=='S2'||p.mapId!=='world:hub:S2'||p.targetMapId!=='world:hub:S3'||before?.position?.scene!=='world:hub:S2'||before?.world?.mapId!=='world:hub:S2'||before?.progress?.currentStage!=='S2'||before.progress.completedStages.includes('S2')||!canCompleteStoryStage(before,contract,'S2')||next?.revision!==before.revision+1||!Number.isSafeInteger(next.updatedAt))return false;
 if(stableJSON(p)!==stableJSON(S2_S3_EXIT_SOURCE))return false;
 const expected=structuredClone(before);expected.progress.completedStages.push('S2');expected.revision=next.revision;expected.updatedAt=next.updatedAt;return stableJSON(expected)===stableJSON(next);
}
