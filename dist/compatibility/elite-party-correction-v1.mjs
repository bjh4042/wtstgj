import {deepFreeze,sha256,stableJSON} from './codec.mjs';
import {ENHANCED_ELITE_PARTY_V1} from './enhanced-elite-party-v1.mjs';

// Explicit final user approval. Immutable handoff source and prior HOLD policy remain historical.
const corrections=[
 {trainerId:'NPC_ELITE_01_YUNWOO',slot:5,replaces:'SPECIES_071',member:{namespace:'canonical',speciesId:'SPECIES_065',level:56,moveIds:['MV022','MV214','MV003','MV005'],ace:false}},
 {trainerId:'NPC_ELITE_02_SIYOON',slot:5,replaces:'SPECIES_133',member:{namespace:'canonical',speciesId:'SPECIES_124',level:57,moveIds:['MV041','MV122','MV003','MV005'],ace:false}},
 {trainerId:'NPC_ELITE_03_EUNMI',slot:2,replaces:'SPECIES_073',member:{namespace:'canonical',speciesId:'SPECIES_072',level:57,moveIds:['MV091','MV031','MV004','MV005'],ace:false}},
 {trainerId:'NPC_ELITE_04_JUNHO',slot:2,replaces:'SPECIES_087',member:{namespace:'canonical',speciesId:'SPECIES_130',level:58,moveIds:['MV042','MV103','MV102','MV005'],ace:false}}
];
const approvedHashes=[
 'db3f87bed0fea3c6dc2a1455480a4863ef23748f2d8e22ba82400f9ecaab81e8',
 'b15d447b1c3a2849b792d423090dd78473f4bedf3e8cc3fd71eb4f0bb685aa82',
 'd00746922d5a62e1b583c98d86df20317eeece42f35dae5812f28c1e28758cfd',
 'b747a1760e8cf0bf30cc419a3acbe031ae386ad74ea091cc420b997f97c9c7b2'
];
export const ELITE_PARTY_CORRECTION_V1=deepFreeze({
 policyId:'ELITE_PARTY_CORRECTION_V1',approvalStatus:'APPROVED',
 approvalEvidence:'사용자 최종 승인 — 사천왕 편성 정정 및 강화 파티 완성 v1: 정확히 네 비에이스 슬롯 교체, 기존 6번 에이스 유지, 정정 본편에서 강화 +10. 일반 POST/gate/reward/economy 승인 아님.',
 contentNamespace:'canonical-v1',effectiveVersion:'elite-party-correction-complete-v1',
 baseCommit:'02e67b007b1e724549417b6f17436d11a5fe34b2',baseVersion:ENHANCED_ELITE_PARTY_V1.baseVersion,
 sourceFile:ENHANCED_ELITE_PARTY_V1.sourceFile,sourceVersion:ENHANCED_ELITE_PARTY_V1.sourceVersion,
 sourceSha256:ENHANCED_ELITE_PARTY_V1.sourceSha256,levelDelta:10,corrections,
 bases:ENHANCED_ELITE_PARTY_V1.bases.map((b,i)=>({trainerId:b.trainerId,partyId:b.partyId,previousSha256:b.sha256,sha256:approvedHashes[i]})),
 supersedesHoldPolicy:'ENHANCED_ELITE_PARTY_V1',
 scope:['FOUR_MAIN_PARTY_SLOTS','ENHANCED_PARTY_COMPOSITION_AND_LEVEL'],
 mainPartyOverrideActive:true,active:false,developmentOnly:true,postBattleActivated:false
});

/** Adapter-only copy: no live battle, player creature, save or legacy mutation. */
export function applyElitePartyCorrection(adapter,battleText){
 const p=ELITE_PARTY_CORRECTION_V1;
 if(sha256(battleText)!==p.sourceSha256)throw Error('Elite approval source mismatch');
 const story=adapter.storyRuntime,parties={...story.parties};
 if(stableJSON(story.elite)!==stableJSON(p.bases.map(b=>b.trainerId)))throw Error('Elite approval order mismatch');
 for(const [i,base] of p.bases.entries()){
  const old=parties[base.partyId],correction=p.corrections[i],hash=sha256(stableJSON(old));
  if(!old||old.members.length!==6||story.trainers[base.trainerId]?.partyId!==base.partyId||![base.previousSha256,base.sha256].includes(hash))throw Error('Elite approval baseline mismatch: '+base.partyId);
  const next=structuredClone(old);
  next.members[correction.slot-1]=structuredClone(correction.member);
  if(sha256(stableJSON(next))!==base.sha256)throw Error('Elite approval effective party mismatch: '+base.partyId);
  parties[base.partyId]=next;
 }
 // Encounter activation extends story events but must share the approved party identities.
 const encounterRuntime=adapter.encounterRuntime?.story?{...adapter.encounterRuntime,story:{...adapter.encounterRuntime.story,parties:{...adapter.encounterRuntime.story.parties,...Object.fromEntries(p.bases.map(b=>[b.partyId,parties[b.partyId]]))}}}:adapter.encounterRuntime;
 return deepFreeze({...adapter,storyRuntime:{...story,parties},encounterRuntime,elitePartyApproval:p});
}
