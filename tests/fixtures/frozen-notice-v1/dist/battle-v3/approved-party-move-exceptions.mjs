/** Exact NPC-only compatibility binding. Never consulted by player learnsets or TMs. */
export function approvedPartyMoveExceptions(adapter,partyId,member){
 return (adapter.battleRuntime?.approvedPartyMoveExceptions??[]).filter(e=>e.partyId===partyId&&adapter.storyRuntime?.trainers[e.trainerId]?.partyId===partyId&&e.speciesId===member.speciesId&&e.level===member.level&&member.namespace==='canonical').map(e=>e.moveId);
}
