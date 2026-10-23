import {deepFreeze,sha256} from './codec.mjs';
import {YEJI_TYPE_STATS_V1} from './yeji-preview-type-stats-v1.mjs';

// Explicit six-ID overlay, never a fallback for unregistered species.
export const YEJI_BASE_EXP_V1=deepFreeze({
 policyId:'YEJI_EDNA_BASE_EXP_V1',approvalStatus:'APPROVED',effectiveVersion:'yeji-edna-base-exp-v1',
 approvalEvidence:'User: 예지 EDNA 6종 BaseEXP 누락 보완; existing EXP v1.2 timing/shares, no separate league reward.',
 contentNamespace:'canonical-v1',speciesNamespace:'npc_preview_species',scope:['baseExp'],
 baseCommit:'760bf68fb1a3a4f055036e5b2d7408f6b8d6a21f',
 sourceFile:'geoje_battle_collection_master_v3.json',sourceSha256:YEJI_TYPE_STATS_V1.sourceSha256['geoje_battle_collection_master_v3.json'],
 sourcePointer:'/battle_balance/exp_contract/base_exp_formula',formula:'clamp(50,180,round5(0.40*BST-60))',
 values:{EDNA_01:155,EDNA_02:155,EDNA_03:155,EDNA_04:155,EDNA_05:155,EDNA_06:160}
});

export function applyYejiBaseExpApproval(contract,sourceText){
 const p=YEJI_BASE_EXP_V1;
 if(typeof sourceText!=='string'||sha256(sourceText)!==p.sourceSha256||JSON.parse(sourceText).battle_balance?.exp_contract?.base_exp_formula!==p.formula)throw Error('Yeji BaseEXP source mismatch');
 if(!contract?.ready||contract.namespace!==p.speciesNamespace||contract.typeStatsApproval?.approvalStatus!=='APPROVED'||Object.keys(contract.byId).length!==6)throw Error('Yeji BaseEXP approval requires approved six-species contract');
 for(const [id,value] of Object.entries(p.values)){
  const row=contract.byId[id],bst=row?.stats.reduce((a,b)=>a+b,0);
  if(!row||row.mainDexInclusion!==false||row.playerObtainable!==false||bst!==YEJI_TYPE_STATS_V1.values[id].bst||value!==Math.max(50,Math.min(180,Math.round((.4*bst-60)/5)*5)))throw Error('Yeji BaseEXP approval mismatch: '+id);
 }
 // Source rows, historical candidate metadata and type/stat-only approval remain intact.
 return deepFreeze({...contract,baseExpApproval:p,baseExpById:p.values});
}
