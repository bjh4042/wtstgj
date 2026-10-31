// Shared read-only predicate for the original progression commit and exit presentation.
// This function never mutates a save, grants a reward, or completes a stage.
export function canCompleteStoryStage(save,contract,id){const st=contract.stages[id],p=save.progress;return !!st?.completionEnabled&&id===p.currentStage&&!st.eventIds.some(e=>!p.completedEvents.includes(e))&&!st.requiredTrainerIds.some(t=>!p.defeatedTrainers.includes(t))}
