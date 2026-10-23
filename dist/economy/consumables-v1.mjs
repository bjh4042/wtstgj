import {deepFreeze,sha256,stableJSON} from '../compatibility/codec.mjs';
export const CONSUMABLE_APPROVAL_ID='CANONICAL_CONSUMABLES_APPROVED_V1';
/** Latest explicit user table only; original Battle v3 catalog remains immutable. */
export const CONSUMABLES_V1=deepFreeze({
 id:CONSUMABLE_APPROVAL_ID,version:1,approvalStatus:'USER_APPROVED',contentNamespace:'canonical-v1',
 baseCommit:'e67aa7911d9e969f5fef90e36406fc134cac9e35',
 authority:'사용자 최종 승인 — 소모품 14종 가격·판매·PP 효과 v1',
 sourceFile:'geoje_battle_collection_master_v3.json',
 sourceSha256:'0bf068f2ec0e4752e60439f2a7cac5924aff66fcf65e2d23d96e93b96b2f70a8',
 stock:'UNLIMITED_APPROVED',resale:false,retroactiveGrants:false,finalPlacementsApproved:false,
 items:{
  potion:{name:'회복약',price:200,unlock:'PROLOGUE',effect:{hp_restore:25}},
  super_potion:{name:'좋은회복약',price:500,unlock:'BADGE2',effect:{hp_restore:60}},
  hyper_potion:{name:'고급회복약',price:1000,unlock:'BADGE4',effect:{hp_restore:120}},
  full_potion:{name:'완전회복약',price:2000,unlock:'BADGE8',effect:{hp_restore:'full'}},
  antidote:{name:'해독제',price:100,unlock:'PROLOGUE',effect:{cure:['poison','bad_poison']}},
  paralyze_heal:{name:'마비치료제',price:200,unlock:'BADGE2',effect:{cure:['paralysis']}},
  burn_heal:{name:'화상치료제',price:200,unlock:'BADGE2',effect:{cure:['burn']}},
  awakening:{name:'잠깨는약',price:200,unlock:'BADGE2',effect:{cure:['sleep']}},
  ice_heal:{name:'해빙제',price:200,unlock:'BADGE2',effect:{cure:['freeze']}},
  full_heal:{name:'만능치료제',price:500,unlock:'BADGE6',effect:{cure:['all_status']}},
  revive:{name:'기력조각',price:1500,unlock:'BADGE6',effect:{revive_hp_percent:50}},
  max_revive:{name:'기력덩이',price:3000,unlock:'BADGE8',effect:{revive_hp_percent:100}},
  ether:{name:'기술회복제',price:500,unlock:'BADGE4',effect:{pp_restore:10}},
  max_ether:{name:'만능기술회복제',price:1500,unlock:'BADGE8',effect:{pp_restore_all:10}}
 }
});
export const CONSUMABLES_V1_HASH=sha256(stableJSON(CONSUMABLES_V1));
export function applyConsumablesApproval(items,battleText){
 if(sha256(battleText)!==CONSUMABLES_V1.sourceSha256)throw Error('Consumables approval source mismatch');
 const effective={...items};
 for(const [id,approved] of Object.entries(CONSUMABLES_V1.items)){
  const old=items[id];if(!old||old.id!==id||old.pocket!=='items')throw Error('Missing existing consumable: '+id);
  effective[id]={...old,...approved,shop:true,consumableApprovalId:CONSUMABLE_APPROVAL_ID};
 }
 return deepFreeze(effective);
}
