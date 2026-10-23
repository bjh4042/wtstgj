import {deepFreeze,sha256,stableJSON} from './codec.mjs';

export const HARIN_POST_V1=deepFreeze({
 id:'HARIN_POST_REMATCH_V1',version:1,approvalStatus:'APPROVED',active:true,contentNamespace:'canonical-v1',
 approvalEvidence:'User: RIVAL_05 three starter variants, six original slots/moves/settings, level +15; main champion/POST gate, explicit unlimited rematches, no entry/win heal, verified loss recovery, EXP only.',
 baseCommit:'a5bef1337555b46e5f51ad0810bd9b396ee1b96e',baseTrainerId:'RIVAL_05',levelDelta:15,
 sourceFile:'geoje_battle_collection_master_v3.json',sourceSha256:'0bf068f2ec0e4752e60439f2a7cac5924aff66fcf65e2d23d96e93b96b2f70a8',
 npcId:'NPC_RIVAL_HARIN',pointId:'post:harin',mapId:'world:hub:PROLOGUE',cell:[22,17],
 partyPrefix:'PARTY:POST_HARIN:',baseLevels:[51,47,48,49,50,50],
 basePartySha256:{
  SPECIES_001:'a1958bf4a06416982dea165f7e70ac20287233c3f95b8728377e8d6b783afd9a',
  SPECIES_004:'eea5ffd00d5e662902852a13a4bfb99fd00e55e0c990e0881018490b58536a36',
  SPECIES_007:'5dfc6757f3948f629fb53f63ac9f0b1204e2af5bf41fb08158ef85c63a16351d'
 },
 rewards:{money:0,items:[],geojeBalls:0},experience:'existing EXP v1.2 per defeated opponent; no completion bonus',
 repeatable:true,entryHeal:false,winHeal:false,lossMoneyPenalty:0
});

/** Derive only from the recorded, effective MAIN party; never increment an existing POST party. */
export function buildHarinPostRematch(adapter,sourceText){
 const p=HARIN_POST_V1,c=adapter.storyRuntime,t=c.trainers[p.baseTrainerId];
 if(sha256(sourceText)!==p.sourceSha256||!t?.variantPartyIds)throw Error('Harin approved base source mismatch');
 const variants={};
 for(const [starterId,hash] of Object.entries(p.basePartySha256)){
  const main=c.parties[t.variantPartyIds[starterId]];
  if(!main||main.id!==`PARTY:RIVAL_05:${starterId}`||sha256(stableJSON(main))!==hash||stableJSON(main.members.map(m=>m.level))!==stableJSON(p.baseLevels))throw Error('Harin approved main party mismatch: '+starterId);
  if(stableJSON(main)!==stableJSON(adapter.encounterRuntime.story.parties[main.id]))throw Error('Harin world/story base party mismatch');
  variants[starterId]={basePartyId:main.id,baseVersion:c.version,basePartySha256:hash,
   party:{...structuredClone(main),id:p.partyPrefix+starterId,members:main.members.map(m=>({...structuredClone(m),level:m.level+p.levelDelta}))}};
 }
 const raw=JSON.parse(sourceText).rival.battles.find(r=>r.id===p.baseTrainerId);
 return deepFreeze({policy:p,active:true,ready:true,baseTrainer:structuredClone(t),sourceSettings:structuredClone(Object.fromEntries(Object.entries(raw).filter(([k])=>k!=='variants'))),variants});
}

export function resolveHarinPostParty(adapter,starterId){
 const c=adapter.harinPostRematch;
 if(!c?.ready||!c.active||c.policy.id!==HARIN_POST_V1.id||c.policy.approvalStatus!=='APPROVED'||!Object.hasOwn(c.variants,starterId))throw Error('Approved Harin POST party unavailable');
 return structuredClone(c.variants[starterId].party);
}
