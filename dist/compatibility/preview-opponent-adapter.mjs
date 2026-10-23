import {deepFreeze} from './codec.mjs';
import {PREVIEW_NAMESPACE} from './opponent-namespace.mjs';

export {PREVIEW_NAMESPACE} from './opponent-namespace.mjs';
export const PREVIEW_DEFINITION_STATUS='V3_FUNCTIONAL_CANDIDATE__NOT_MAIN_DEX_LOCK';
const statKeys=['hp','atk','def','spa','spd','spe'];
/** An optional opponent contract, never part of the 151-species/ownership catalog. */
export function adaptYejiPreview(manifest,battle){
 const errors=[],issue=(code,path)=>errors.push({code,path});
 const lock=manifest?.league?.enhanced_post_league,scope=manifest?.species_system?.npc_preview_species;
 const source=battle?.enhanced_post_league,rows=battle?.npc_preview_species??[],party=source?.party??[];
 if(lock?.status!=='LOCKED'||scope?.namespace!==PREVIEW_NAMESPACE||scope?.main_dex_inclusion!==false||scope?.obtainable_by_player!==false)issue('PREVIEW_SCOPE','manifest.species_system.npc_preview_species');
 if(source?.id!=='NPC_EXP_PREVIEW_EDNA'||rows.length!==6||party.length!==6||new Set(rows.map(s=>s.preview_species_id)).size!==6||new Set(party.map(s=>s.preview_species_id)).size!==6)issue('PREVIEW_COVERAGE','battle.enhanced_post_league');
 const moves=new Map((battle?.move_catalog??[]).map(m=>[m.id,m])),types=new Set((battle?.type_system?.types??[]).map(t=>t.id)),byId={};
 rows.forEach((s,i)=>{
  const path=`battle.npc_preview_species[${i}]`,stats=statKeys.map(k=>s.base_stats?.[k]);
  if(!/^EDNA_0[1-6]$/.test(s.preview_species_id)||s.main_dex_inclusion!==false||s.player_obtainable!==false||s.definition_status!==PREVIEW_DEFINITION_STATUS)issue('PREVIEW_IDENTITY_OR_STATUS',path);
  if(!Array.isArray(s.types)||!s.types.length||s.types.some(t=>!types.has(t))||stats.some(v=>!Number.isInteger(v)||v<1)||stats.reduce((a,b)=>a+b,0)!==s.bst)issue('PREVIEW_CANDIDATE_STATS',path);
  byId[s.preview_species_id]={id:s.preview_species_id,namespace:PREVIEW_NAMESPACE,name:s.name,types:s.types,stats,definitionStatus:s.definition_status,mainDexInclusion:false,playerObtainable:false,sourcePath:path};
 });
 const members=party.map((p,i)=>{
  const path=`battle.enhanced_post_league.party[${i}]`,s=byId[p.preview_species_id],ids=(p.moves??[]).map(m=>m.move_id);
  // Names are a consistency check only; the binding always uses preview_species_id.
  if(!s||s.name!==p.name||lock?.party?.[i]!==p.name||scope?.six_final_forms?.[i]?.name!==p.name)issue('PREVIEW_PARTY_REFERENCE',path);
  if(!Number.isInteger(p.level)||p.level<1||p.level>100||ids.length!==4||new Set(ids).size!==ids.length||ids.some(id=>!moves.has(id)))issue('PREVIEW_PARTY_MOVES_OR_LEVEL',path);
  return {namespace:PREVIEW_NAMESPACE,speciesId:p.preview_species_id,level:p.level,moveIds:ids,ace:p.ace};
 });
 return deepFreeze({version:'yeji-preview-opponent-v1',ready:!errors.length,errors,active:false,approvalStatus:'PENDING_USER_APPROVAL',namespace:PREVIEW_NAMESPACE,
  partyStatus:lock?.status??null,definitionStatus:PREVIEW_DEFINITION_STATUS,byId,party:{id:source?.id??null,members},
  unlock:source?.unlock??null,repeatability:source?.repeatability??null,aiTier:source?.ai_tier??null,itemUses:source?.item_uses??null,
  deferred:['type/stat approval','enhanced elite four parties/progression','rewards and preview EXP','AI_4 and trainer item use']});
}
