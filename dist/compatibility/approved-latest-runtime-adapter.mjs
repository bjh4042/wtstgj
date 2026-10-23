import {approvedPartyMoveExceptions} from '../battle-v3/approved-party-move-exceptions.mjs';
import {loadCanonicalRuntimeAdapter} from './canonical-runtime-adapter.mjs';
import {loadCanonical20260927Adapter} from './canonical-20260927-adapter.mjs';
import {deepFreeze,sha256,stableJSON} from './codec.mjs';

// Explicit release boundary: story/geography/coverage advance; combat does not.
export const RETAINED_COMBAT_FIELDS=Object.freeze(['starters','species','byId','moves','tms','fishing','acquisition','characters','battleContract','saveContract','migrationContract','elitePartyApproval','hiddenPlacementPolicy','economyPolicy','consumableApproval','harinPostRematch','enhancedLeague']);
const copy=x=>structuredClone(x), digest=x=>sha256(stableJSON(x));
export function mergeApprovedGameplayRelease(historical,staged){
 if(!historical.validation?.ready||!staged.validation?.ready)throw Error('Both verified gameplay sources are required');
 const out={version:'canonical-20260927',active:true,namespace:historical.namespace};
 const provenance={policy:'LATEST_STORY_RETAINED_COMBAT_V1',fields:{},historicalIntegrity:copy(historical.validation.integrity??null),stagedHashes:copy(staged.validation.hashes)};
 function take(key,source,label){if(source[key]!==undefined){out[key]=copy(source[key]);provenance.fields[key]={source:label,sha256:digest(source[key])}}}
 for(const key of RETAINED_COMBAT_FIELDS)take(key,historical,'historical-approved-runtime');
 for(const key of ['stages','story','sourceVersions'])take(key,staged,'verified-staged-20260927');
 // Existing display names and teams are unchanged. Only genuinely new IDs are added.
 out.trainers={};const added=[];
 for(const [id,row] of Object.entries(staged.trainers)){out.trainers[id]=copy(historical.trainers[id]??row);if(!historical.trainers[id])added.push(id)}
 if(Object.keys(historical.trainers).some(id=>!out.trainers[id]))throw Error('Latest trainer coverage removes a historical trainer');
 out.storyRuntime=copy(staged.storyRuntime);
 for(const [id,party] of Object.entries(historical.storyRuntime.parties))if(out.storyRuntime.parties[id])out.storyRuntime.parties[id]=copy(party);
 // Retain combat-facing values, while keeping latest event/gate/placement bindings.
 const combatTrainerKeys=['label','partyId','variantPartyIds','ai','itemUses','itemId','repeatable'];
 for(const [id,old] of Object.entries(historical.storyRuntime.trainers)){
  const row=out.storyRuntime.trainers[id];if(!row)throw Error('Latest story removes historical trainer '+id);
  for(const key of combatTrainerKeys){if(key in old)row[key]=copy(old[key]);else delete row[key]}
 }
 out.encounters=copy(historical.encounters);
 out.encounterRuntime=copy(staged.encounterRuntime);
 for(const key of ['areas','tables','chains','modifiers']){
  if(stableJSON(historical.encounterRuntime[key])!==stableJSON(staged.encounterRuntime[key]))throw Error('Unapproved ordinary encounter retune: '+key);
  out.encounterRuntime[key]=copy(historical.encounterRuntime[key]);
 }
 for(const key of ['speciesWeatherWeights','policy','policyExcludedTables','sourceAudit'])if(historical.encounterRuntime[key]!==undefined)out.encounterRuntime[key]=copy(historical.encounterRuntime[key]);
 out.encounterRuntime.story=out.storyRuntime;
 out.encounterRuntime.retainedTrainerRewardIds=Object.keys(historical.storyRuntime.trainers);
 out.battleRuntime=copy(historical.battleRuntime);
 out.battleRuntime.yejiFinal=copy(staged.battleRuntime.yejiFinal);
 out.battleRuntime.yejiFinalOpponent=copy(staged.battleRuntime.previewOpponent);
 out.battleRuntime.approvedLatestAITrainerIds=[...added,'YEJI_FINAL'];
 const exception={trainerId:'ROUTE_S3_06',partyId:'PARTY:ROUTE_S3_06',speciesId:'SPECIES_012',level:21,moveId:'MV111'};
 if(!added.includes(exception.trainerId)||!staged.storyRuntime.parties[exception.partyId]?.members.some(m=>m.speciesId===exception.speciesId&&m.level===exception.level&&m.moveIds.includes(exception.moveId)))throw Error('Exact source-authored trainer move exception no longer matches');
 out.battleRuntime.approvedPartyMoveExceptions=[exception];
 provenance.trainerMoveCompatibility={decision:'Preserve exact new source-authored NPC party without altering player learnsets or move mechanics',allowlist:[copy(exception)]};
 // Each new party is checked against the retained species/move identity catalog.
 const errors=[];
 for(const [id,party] of Object.entries(out.storyRuntime.parties))for(const mon of party.members){
  if(mon.namespace==='npc_preview_species'){if(!out.battleRuntime.yejiFinalOpponent.byId[mon.speciesId])errors.push('Unknown preview species '+id);}
  else if(!out.byId[mon.speciesId])errors.push('Unknown species '+id+':'+mon.speciesId);
  for(const move of mon.moveIds??[])if(!out.moves[move])errors.push('Unknown move '+id+':'+move);
  if(mon.namespace==='canonical'&&out.byId[mon.speciesId]){
   const species=out.byId[mon.speciesId],allowed=[...species.moves.filter(m=>m.level<=mon.level).map(m=>m.id),...species.tmIds.map(id=>out.tms[id]?.moveId),...(party.moveLevelExceptions??[]).filter(e=>e.level===mon.level).map(e=>e.move_id),...approvedPartyMoveExceptions(out,id,mon)];
   for(const move of mon.moveIds??[])if(!allowed.includes(move))errors.push('Illegal retained-catalog party move '+id+':'+mon.speciesId+':'+move);
  }
 }
 if(added.length!==49||Object.keys(out.trainers).length!==104)errors.push('Unexpected latest trainer coverage');
 if(errors.length)throw Error('Merged release invalid: '+errors.join('; '));
 provenance.fields.trainers={source:'historical existing IDs; staged added IDs',addedIds:added,sha256:digest(out.trainers)};
 provenance.fields.storyRuntime={source:'latest events/gates/rewards; retained historical parties and combat-facing trainer fields',sha256:digest(out.storyRuntime)};
 provenance.fields.encounterRuntime={source:'latest story encounters; identical ordinary tables; retained weather/aquatic policy',sha256:digest(out.encounterRuntime)};
 provenance.fields.battleRuntime={source:'historical baseline plus separate latest yejiFinal/yejiFinalOpponent',sha256:digest(out.battleRuntime)};
 out.releaseProvenance=provenance;
 out.validation={...copy(staged.validation),ready:true,errors:[],mergedPolicy:provenance.policy};
 return deepFreeze(out);
}
export async function loadApprovedLatestRuntimeAdapter({historicalOptions={},stagedOptions={}}={}){
 const [historical,staged]=await Promise.all([loadCanonicalRuntimeAdapter(historicalOptions),loadCanonical20260927Adapter(stagedOptions)]);
 return mergeApprovedGameplayRelease(historical,staged);
}
