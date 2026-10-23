import {deepFreeze,sha256,stableJSON} from './codec.mjs';

// User approval covers composition/+10 only. Conflicting base slots remain HOLD.
export const ENHANCED_ELITE_PARTY_V1=deepFreeze({
 policyId:'ENHANCED_ELITE_PARTY_V1',approvalStatus:'APPROVED',scope:'PARTY_COMPOSITION_AND_LEVEL_ONLY',
 approvalEvidence:'User: latest approved main Elite Four parties, same species/moves/order/ace/settings, level +10; hold unresolved base slots; no POST activation.',
 contentNamespace:'canonical-v1',effectiveVersion:'enhanced-elite-party-v1',levelDelta:10,
 baseCommit:'763c7cce2cc485d1fae8015059d62bf2967bfe00',baseVersion:'canonical-story-v1',
 sourceFile:'geoje_battle_collection_master_v3.json',sourceVersion:'v3_2026-09-17',
 sourceSha256:'0bf068f2ec0e4752e60439f2a7cac5924aff66fcf65e2d23d96e93b96b2f70a8',
 bases:[
  {trainerId:'NPC_ELITE_01_YUNWOO',partyId:'PARTY:NPC_ELITE_01_YUNWOO',sha256:'3cc1ce5ab9ed07e4fbe6f22894a69813c1c6a672ebe9d2b6ccc415fc36b9a6aa',heldSlot:6,reportedApprovedName:'은빛떼'},
  {trainerId:'NPC_ELITE_02_SIYOON',partyId:'PARTY:NPC_ELITE_02_SIYOON',sha256:'048470cb56b4975288a261b16d4a8496a95b275aa5d4eb06865e95a0f27e5d49',heldSlot:6,reportedApprovedName:'돌기린초'},
  {trainerId:'NPC_ELITE_03_EUNMI',partyId:'PARTY:NPC_ELITE_03_EUNMI',sha256:'949f8e812abdbc7a6f7edaf8fef71aa657557e0550ca39f2d81f257763db1980',heldSlot:6,reportedApprovedName:'황부리'},
  {trainerId:'NPC_ELITE_04_JUNHO',partyId:'PARTY:NPC_ELITE_04_JUNHO',sha256:'5ab8efabbe4a9cb6757290d960e580abf9b4b6ae61e37a1f0cf0c3569a7702c2',heldSlot:6,reportedApprovedName:'송이풀빛'}
 ],
 holdEvidence:'2026-09-18 Package C approval summary conflicts with source/runtime slot 6. Exact overriding IDs/levels/moves/ace or superseding approval not recovered. Names are audit evidence, never identity bindings.',
 active:false,developmentOnly:true
});

/** Separate data registry. Always derives from main parties, never from a prior enhanced result. */
export function buildEnhancedEliteParties(adapter,battleText,policy=adapter.elitePartyApproval??ENHANCED_ELITE_PARTY_V1){
 if(sha256(battleText)!==policy.sourceSha256)throw Error('Enhanced elite source changed; review affected base slots');
 const source=JSON.parse(battleText),story=adapter.storyRuntime;
 if(stableJSON(story.elite)!==stableJSON(policy.bases.map(b=>b.trainerId)))throw Error('Enhanced elite order/base identity mismatch');
 const teams={};
 for(const [i,base] of policy.bases.entries()){
  const trainer=story.trainers[base.trainerId],main=story.parties[base.partyId],raw=source.league.elite_four[i];
  if(!main||main.id!==base.partyId||trainer.partyId!==base.partyId||main.members.length!==6||raw.party.length!==6)throw Error('Enhanced elite requires six main slots');
  const slots=main.members.map((member,index)=>{
   const row=raw.party[index],sourceSpecies=adapter.species.find(s=>s.number===row.species_no),reasons=[];
   const correction=policy.corrections?.find(c=>c.trainerId===base.trainerId&&c.slot===index+1);
   const expected=correction?.member??{namespace:'canonical',speciesId:sourceSpecies?.id,level:row.level,moveIds:row.moves.map(m=>m.move_id),ace:row.ace};
   if(member.namespace!=='canonical'||member.speciesId!==expected.speciesId||member.level!==expected.level||stableJSON(member.moveIds)!==stableJSON(expected.moveIds)||typeof expected.ace!=='boolean'||member.ace!==undefined&&member.ace!==expected.ace)reasons.push('SOURCE_RUNTIME_SLOT_MISMATCH');
   if(index+1===base.heldSlot)reasons.push('LATEST_APPROVAL_SLOT_UNRESOLVED');
   if(!Number.isInteger(member.level)||member.level<1||member.level+policy.levelDelta>100)reasons.push('ENHANCED_LEVEL_OUT_OF_RANGE');
   const baseline={...structuredClone(member),ace:member.ace??expected.ace};
   return {slot:index+1,status:reasons.length?'HOLD':'READY',reasons,baseline,
    sourcePointer:`/league/elite_four/${i}/party/${index}`,sourceMember:structuredClone(row),
    ...(correction?{approvalPolicyId:policy.policyId,approvedMember:structuredClone(expected)}:{}),
    ...(index+1===base.heldSlot?{reportedApprovedName:base.reportedApprovedName}:{}),
    enhanced:reasons.length?null:{...structuredClone(baseline),level:member.level+policy.levelDelta}};
  });
  const id=`PARTY:POST_ENHANCED:${base.trainerId}`,ready=slots.every(s=>s.status==='READY');
  teams[base.trainerId]={id,order:i+1,trainerId:base.trainerId,status:ready?'READY':'HOLD',slots,
   basePartyId:main.id,baseVersion:story.version,basePartySha256:sha256(stableJSON(main)),recordedBasePartySha256:base.sha256,
   baseTrainer:structuredClone(trainer),sourceSettings:structuredClone(Object.fromEntries(Object.entries(raw).filter(([key])=>key!=='party'))),
   // A partial team is not a battle party. No old or guessed slot fills the hole.
   party:ready?{...structuredClone(main),id,members:slots.map(s=>s.enhanced)}:null};
 }
 const slots=Object.values(teams).flatMap(t=>t.slots),readySlots=slots.filter(s=>s.status==='READY').length;
 return deepFreeze({policy,active:false,developmentOnly:true,order:policy.bases.map(b=>b.trainerId),teams,
  coverage:{totalSlots:slots.length,readySlots,heldSlots:slots.length-readySlots},ready:readySlots===24});
}

/** Data access only; no trainer registration, progression gate, reward, or battle start. */
export function getEnhancedEliteTestParty(adapter,trainerId,{mode}={}){
 if(!(mode==='development'&&import.meta.env?.DEV===true||mode==='test'&&typeof process!=='undefined'&&!!process.env?.NODE_TEST_CONTEXT))throw Error('Enhanced elite data requires explicit DEV/TEST mode');
 const team=adapter.battleRuntime.enhancedEliteParties?.teams[trainerId];
 if(!team?.party||team.status!=='READY')throw Error('ENHANCED_ELITE_PARTY_HOLD');
 return structuredClone(team.party);
}
