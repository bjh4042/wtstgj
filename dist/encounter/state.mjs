import {ENCOUNTER_VERSION} from '../compatibility/encounter-adapter.mjs';
import {isPost20260927} from '../story/post-20260927.mjs';
export {ENCOUNTER_VERSION};
export const encounterState=()=>({areaId:null,method:null,safeStepsRemaining:0,dryStreak:0,eligibleSteps:0,movementSerial:0,acquisitionCompleted:[],fixedCompleted:[],surveys:[],receipts:{}});
export function storyContractFor(input,catalog){
 if(input?.encounterVersion===undefined){if(input?.encounter!==undefined)throw Error('Unversioned encounter state');return catalog.storyContract}
 if(input.encounterVersion!==ENCOUNTER_VERSION||catalog.encounterContract?.version!==ENCOUNTER_VERSION)throw Error('Unsupported encounter version');
 return catalog.encounterContract.story;
}
export function validateEncounterState(s,catalog){
 if(s.encounterVersion===undefined)return;
 const c=catalog.encounterContract,e=s.encounter;
 if(!e||!Number.isInteger(e.safeStepsRemaining)||e.safeStepsRemaining<0||e.safeStepsRemaining>5||['dryStreak','eligibleSteps','movementSerial'].some(k=>!Number.isSafeInteger(e[k])||e[k]<0))throw Error('Invalid encounter counters');
 if(e.areaId!==null&&!c.areas[e.areaId]||e.method!==null&&!c.tables[`${e.areaId}:${e.method}`]&&!c.policyExcludedTables?.[`${e.areaId}:${e.method}`])throw Error('Invalid encounter location');
 for(const key of ['acquisitionCompleted','fixedCompleted','surveys'])if(!Array.isArray(e[key])||new Set(e[key]).size!==e[key].length||e[key].some(id=>!c.events[id]))throw Error('Invalid acquisition ledger');
 if(!e.receipts||typeof e.receipts!=='object'||Array.isArray(e.receipts)||Object.keys(e.receipts).some(id=>!e.acquisitionCompleted.includes(id)))throw Error('Invalid acquisition receipts');
 for(const id of e.acquisitionCompleted){
  const event=c.events[id],r=e.receipts[id],allowed=event.speciesId?[event.speciesId]:event.candidateIds;
  if(!r||!Array.isArray(r.speciesIds)||!r.speciesIds.length||new Set(r.speciesIds).size!==r.speciesIds.length||r.speciesIds.some(x=>!allowed.includes(x)||!s.dex.caught.includes(x))||!s.progress.completedEvents.includes(event.storyId))throw Error('Unproven acquisition receipt');
  if(event.mode==='battle_capture'&&(!e.fixedCompleted.includes(id)||r.outcome!=='captured'))throw Error('Unproven fixed capture');
  if(event.mode==='npc_trade'&&(r.outcome!=='traded'||r.consumedSpeciesId!==event.requiredSpeciesId||typeof r.consumedInstanceId!=='string'))throw Error('Unproven NPC trade');
 }
 if(e.fixedCompleted.some(id=>c.events[id].mode!=='battle_capture'||!e.acquisitionCompleted.includes(id)))throw Error('Fixed capture ledger mismatch');
 for(const event of Object.values(c.events)){
  if(event.id==='STARTER_CHOICE_PROLOGUE')continue;
  const storyDone=s.progress.completedEvents.includes(event.storyId),caught=e.acquisitionCompleted.includes(event.id);
  // A sanctuary victory and the first No.151 battle are story evidence, not a capture receipt.
  if(isPost20260927(c)&&['LEGEND_148_CAPTURE','LEGEND_149_CAPTURE','LEGEND_150_CAPTURE','MYTHIC_151_CAPTURE'].includes(event.id)){
   if(caught&&!storyDone)throw Error('Acquisition/story atomicity');
  }else if(storyDone!==caught)throw Error('Acquisition/story atomicity');
 }
}
/** Inheritance is explicit, chain-validated, versioned, and preserves learned moves. */
export function inheritedMoveIds(mon,catalog){
 const history=mon.evolutionHistory??[];if(!Array.isArray(history)||history.length>2)throw Error('Invalid evolution history');
 const allowed=[];
 for(const [i,h] of history.entries()){
  const from=catalog.getSpeciesById(h.from),to=catalog.getSpeciesById(h.to);
  if(!from||!to||from.evo!==h.to||!Number.isInteger(h.level)||h.level<from.evoLevel||h.level>mon.level||i>0&&(history[i-1].to!==h.from||history[i-1].level>h.level))throw Error('Invalid evolution provenance');
  allowed.push(...from.moves.filter(m=>m.level<=h.level).map(m=>m.id),...from.tmIds.map(id=>catalog.getTmById(id).moveId));
 }
 if(history.length&&history.at(-1).to!==mon.speciesId)throw Error('Evolution identity mismatch');return allowed;
}
