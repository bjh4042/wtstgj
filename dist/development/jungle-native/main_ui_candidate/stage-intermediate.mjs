import{canCompleteStoryStage}from'../../../story/stage-completion-readiness.mjs';
import{stableJSON}from'../../../compatibility/codec.mjs';
// Reject-only classifier for a private captured route attempt. This function
// does not execute completion, mutate progress or issue any warp authority.
export function isOriginalPrologueStageDraft(before,next,row,contract){
 if(row?.pointId!=='route:PROLOGUE:S1'||row.sourceRow?.exit!==true||before.progress.currentStage!=='PROLOGUE'||before.progress.completedStages.includes('PROLOGUE')||!canCompleteStoryStage(before,contract,'PROLOGUE')||next.revision!==before.revision+1||!Number.isSafeInteger(next.updatedAt))return false;
 const expected=structuredClone(before);expected.progress.completedStages.push('PROLOGUE');expected.revision=next.revision;expected.updatedAt=next.updatedAt;return stableJSON(expected)===stableJSON(next);
}
