import assert from'node:assert/strict';
// Draft reusable flow. All adapters must be bound to reviewed visible DOM controls before execution.
// No storage writes, owner injection, or saved payload reads are performed by this helper.
export function assertPersistentBinding(a,b,expected){
 assert(expected&&typeof expected==='object','Frozen source binding required');
 for(const k of['storageMode','namespace','slotId','sourcePinsDigest','identityProfile']){assert.equal(typeof a[k],'string','Missing binding '+k);assert(a[k].length>0);assert.equal(a[k],b[k],'Cross-page binding changed: '+k);assert.equal(a[k],expected[k],'Unexpected source binding: '+k)}
 assert.equal(a.storageMode,'indexeddb');assert.match(a.namespace,/^[-A-Za-z0-9_]{1,64}$/);assert.match(a.sourcePinsDigest,/^[0-9a-f]{64}$/);
}
export function assertSavedState(saved,restored){
 for(const k of['pose','revision','resourceGeneration','checkpointSupported','mechanicsDigest','effectJournalDigest','baselineMechanicsDigest','journalCount','money','inventory','items','receiptIds']){assert(Object.hasOwn(saved,k)&&Object.hasOwn(restored,k),'Missing full-state observation: '+k);assert.deepEqual(restored[k],saved[k],'Restored mismatch: '+k)}
 for(const k of['mechanicsDigest','effectJournalDigest','baselineMechanicsDigest'])assert.match(saved[k],/^[0-9a-f]{64}$/);
 assert.equal(restored.ui.phase,'field');assert(saved.journalCount>0,'Saved scene must include actual accepted effects');
}
export async function freshPageDurability({context,origin,ui,expectedBinding,prepareSavedScene,continueFromRestored}){
 const first=await context.newPage();let second;
 try{
  await first.goto(origin);await ui.assertNotStarted(first);
  await ui.startExplicitPersistentProfile(first);const firstBinding=await ui.binding(first);
  assertPersistentBinding(firstBinding,firstBinding,expectedBinding);
  await prepareSavedScene(first);const saved=await ui.observe(first);assert.equal(saved.ui.phase,'field');assert(saved.journalCount>0);
  await ui.clickSaveAndAwaitConfirmedCommit(first);const afterSave=await ui.observe(first);assertSavedState(saved,afterSave);
  const databaseBefore=await ui.databaseEvidence(first);
  const stored=await ui.binding(first);assertPersistentBinding(firstBinding,stored,expectedBinding);assert(Number.isSafeInteger(stored.generation)&&stored.generation>0);
  // Stop/dispose closes the owned connection but must not erase the checkpoint.
  await ui.stop(first);await first.close();assert(first.isClosed());
  second=await context.newPage();assert.notEqual(second,first);await second.goto(origin);await ui.assertNotStarted(second);const databaseAfter=await ui.databaseEvidence(second);assert.deepEqual(databaseAfter,databaseBefore,'DEV database metadata must survive page closure');
  await ui.startExplicitPersistentProfile(second);const fresh=await ui.observe(second),secondBinding=await ui.binding(second);
  assertPersistentBinding(stored,secondBinding,expectedBinding);assert.equal(fresh.baselineMechanicsDigest,saved.baselineMechanicsDigest);
  assert.equal(fresh.ui.phase,'field');assert.equal(fresh.journalCount,0,'Must not automatically hydrate before explicit Load');
  assert.notDeepEqual(fresh.pose,saved.pose,'Prepare a noninitial pose before save');
  await ui.clickLoadAndAwaitInstalled(second);const restored=await ui.observe(second);assertSavedState(saved,restored);
  assert.notEqual(restored.ownerOrdinal,fresh.ownerOrdinal,'Load must install a new owner in the new page');
  // Ordinals restart per page. Never compare first-page ordinal with second-page ordinal as identity proof.
  const loadedBinding=await ui.binding(second);assertPersistentBinding(stored,loadedBinding,expectedBinding);assert.equal(loadedBinding.generation,stored.generation);
  const canvas=await ui.canvasEvidence(second);assert(canvas.opaque>100&&canvas.colors>20,'Restored frame must be nonblank');
  const continuation=await continueFromRestored(second,{saved,restored});
  await ui.stop(second);
  return{kind:'explicit-dev-indexeddb-fresh-page-round-trip',newPageInSameBrowserContext:true,oldPageClosed:true,databaseMetadataSurvived:true,automaticHydration:false,exactPose:true,exactMechanics:true,exactEffectJournal:true,baselineIndependentlyRecreated:true,generation:stored.generation,namespace:stored.namespace,identityProfile:stored.identityProfile,productionSaveClaim:false,physicalDiskGuarantee:false,canvas,continuation};
 }finally{if(!first.isClosed())await first.close();if(second&&!second.isClosed())await second.close()}
}
