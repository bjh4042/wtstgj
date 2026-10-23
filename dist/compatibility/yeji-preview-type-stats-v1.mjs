import {deepFreeze,sha256,stableJSON} from './codec.mjs';

// Same authority pattern as Aquatic Policy A: immutable source + hash-bound user approval.
export const YEJI_TYPE_STATS_V1=deepFreeze({
 policyId:'YEJI_PREVIEW_TYPE_STATS_V1',approvalStatus:'APPROVED',approvedOn:'2026-09-22',
 approvalEvidence:'User: 예지 전용 6종 타입·종족값 v1 확정; types/base stats only. No POST activation, progression/rewards or economy approval.',
 contentNamespace:'canonical-v1',speciesNamespace:'npc_preview_species',
 effectiveVersion:'yeji-preview-type-stats-v1',scope:['types','base_stats','bst'],
 sourceVersion:'v3_2026-09-17',sourcePointer:'/npc_preview_species',
 sourceSha256:{
  'geoje_battle_collection_master_v3.json':'0bf068f2ec0e4752e60439f2a7cac5924aff66fcf65e2d23d96e93b96b2f70a8',
  'geoje_final_source_manifest_v1.json':'915e0ac814afb9bfa4142bd0d0884a9005c1ce9afe4e790154c39267b43248dc'
 },
 statOrder:['hp','atk','def','spa','spd','spe'],
 values:{
  EDNA_01:{types:['bug','steel'],stats:[90,110,110,55,90,80],bst:535},
  EDNA_02:{types:['grass','water'],stats:[95,55,80,105,110,90],bst:535},
  EDNA_03:{types:['poison','psychic'],stats:[80,60,75,120,90,110],bst:535},
  EDNA_04:{types:['water','ground'],stats:[100,105,90,65,85,90],bst:535},
  EDNA_05:{types:['flying','dark'],stats:[75,110,75,70,80,125],bst:535},
  EDNA_06:{types:['water','fighting'],stats:[105,125,95,60,85,75],bst:545}
 },
 restrictions:{mainDexInclusion:false,playerObtainable:false,postBattleActivated:false}
});

/** Status-only overlay. Source values and the battle activation approval are untouched. */
export function applyYejiTypeStatsApproval(contract,texts){
 const p=YEJI_TYPE_STATS_V1;
 for(const [file,hash] of Object.entries(p.sourceSha256))if(typeof texts[file]!=='string'||sha256(texts[file])!==hash)throw Error('Yeji type/stat approval source mismatch');
 if(!contract?.ready||contract.namespace!==p.speciesNamespace||Object.keys(contract.byId).length!==6)throw Error('Yeji type/stat approval contract mismatch');
 const approval=deepFreeze({policyId:p.policyId,approvalStatus:p.approvalStatus,effectiveVersion:p.effectiveVersion,scope:p.scope});
 const byId={};
 for(const [id,approved] of Object.entries(p.values)){
  const row=contract.byId[id];
  if(!row||row.id!==id||stableJSON(row.types)!==stableJSON(approved.types)||stableJSON(row.stats)!==stableJSON(approved.stats)||row.stats.reduce((a,b)=>a+b,0)!==approved.bst||row.mainDexInclusion!==false||row.playerObtainable!==false)throw Error('Yeji approved type/stat mismatch: '+id);
  byId[id]={...row,typeStatsApproval:approval};
 }
 return deepFreeze({...contract,byId,typeStatsApproval:approval,approvalScope:'POST_BATTLE_ACTIVATION',
  // definitionStatus remains the historical source label; typeStatsApproval is effective authority.
  deferred:contract.deferred.filter(reason=>reason!=='type/stat approval')});
}
