/** Read-only routing. Historical battles never gain staged AI through a release marker. */
export function approvedTrainerAIContract(adapter,{kind,partyId,previewId}={}){
 if(kind!=='trainer')return null;
 const runtime=adapter.battleRuntime,trainer=Object.values(adapter.storyRuntime?.trainers??{}).find(t=>t.partyId===partyId);
 const id=previewId==='YEJI_FINAL'?'YEJI_FINAL':trainer?.id;
 const rawStaged=runtime?.version==='v3.2_2026-09-27';
 if(!rawStaged&&!runtime?.approvedLatestAITrainerIds?.includes(id))return null;
 const preview=previewId?(previewId==='YEJI_FINAL'?runtime.yejiFinalOpponent??runtime.previewOpponent:runtime.previewOpponent):null;
 return {trainerId:id,aiTier:preview?.aiTier??trainer?.ai??'AI_1',itemUses:preview?.itemUses??trainer?.itemUses??0,itemId:preview?'hyper_potion':trainer?.itemId??null};
}
