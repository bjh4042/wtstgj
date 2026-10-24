import {validateHiddenLifetime} from '../world/hidden-geoje-ledger.mjs';
import {validateCanonicalSessionData,validateCanonicalTestSave} from '../canonical-session.mjs';
import {MAJOR_STATUSES} from '../compatibility/status-enum.mjs';
import {ENCOUNTER_VERSION,inheritedMoveIds} from '../encounter/state.mjs';
export {MAJOR_STATUSES} from '../compatibility/status-enum.mjs';
export const CANONICAL_BATTLE_SAVE='GEOJE_CANONICAL_BATTLE_V3_SAVE';
export const BATTLE_VERSION='v3_2026-09-17';
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
/** Explicit opt-in upgrade, never a legacy conversion. Caller retains/archives the input through the existing slot store. */
export function activateCanonicalBattleSave(input,catalog){
 const next=validateCanonicalTestSave(input,catalog);
 Object.assign(next,{format:CANONICAL_BATTLE_SAVE,battleEnabled:true,battleVersion:BATTLE_VERSION,inventory:{ecology_ball:5,affinity_ball:0,resonance_ball:0,geoje_ball:0},ownedTms:[],pendingMoves:[],battleHistory:[],geojeBallsGranted:0});
 next.revision++;return validateCanonicalBattleSave(next,catalog);
}
export function validateCanonicalBattleSave(input,catalog){
 return validateCanonicalBattleData(input,catalog);
}
/** Shared aftermath invariants. Only the versioned story validator supplies a story policy. */
export function validateCanonicalBattleData(input,catalog,policy={}){
 if(input?.battleVersion!==BATTLE_VERSION)throw Error('Unsupported canonical battle version');
 const next=validateCanonicalSessionData(input,catalog,{format:CANONICAL_BATTLE_SAVE,battleEnabled:true,...policy,statuses:MAJOR_STATUSES,extraMoves:mon=>{
  const ids=catalog.getSpeciesById(mon.speciesId).tmIds;
  return [...ids.map(id=>catalog.getTmById(id)?.moveId).filter(Boolean),...(input.encounterVersion===ENCOUNTER_VERSION?inheritedMoveIds(mon,catalog):[])];
 }});
 if(!next.inventory||Object.keys(next.inventory).some(id=>!['ecology_ball','affinity_ball','resonance_ball','geoje_ball'].includes(id))||['ecology_ball','affinity_ball','resonance_ball','geoje_ball'].some(id=>!integer(next.inventory[id],0,9999)))throw Error('Invalid canonical battle inventory');
 if(!validateHiddenLifetime(next)&&(!integer(next.geojeBallsGranted,0,12)||next.inventory.geoje_ball>next.geojeBallsGranted))throw Error('Geoje ball lifetime cap');
 if(!Array.isArray(next.ownedTms)||new Set(next.ownedTms).size!==next.ownedTms.length||next.ownedTms.some(id=>!/^TM(0[1-9]|[1-4][0-9]|50)$/.test(id)))throw Error('Invalid TM inventory');
 const owned=[...next.party,...next.box];
 for(const mon of owned){
  if(mon.level<100&&mon.totalExp>=(mon.level+1)**3)throw Error('Unapplied canonical level-up');
  if(mon.statusState!==undefined){const s=mon.statusState;if(!s||!integer(s.sleepTurns,0,3)||!integer(s.freezeTurns,0,3)||!integer(s.toxicTurns,1,16))throw Error('Invalid persistent status counters')}
 }
 if(!Array.isArray(next.pendingMoves)||next.pendingMoves.length>1000||next.pendingMoves.some(p=>!owned.some(m=>m.instanceId===p.instanceId&&(catalog.getSpeciesById(m.speciesId).moves.some(x=>x.id===p.moveId&&x.level<=m.level)||input.encounterVersion===ENCOUNTER_VERSION&&inheritedMoveIds(m,catalog).includes(p.moveId)))))throw Error('Invalid pending move choice');
 if(!Array.isArray(next.battleHistory)||next.battleHistory.length>50||next.battleHistory.some(b=>!b||!['wild','trainer'].includes(b.kind)||!['won','lost','captured','fled'].includes(b.outcome)||!Number.isInteger(b.turns)||b.turns<0))throw Error('Invalid battle history');
 return next;
}
export function teachTm(input,catalog,rules,instanceId,tmId,slot){
 const next=validateCanonicalBattleSave(input,catalog),mon=next.party.find(m=>m.instanceId===instanceId),tm=rules.tms[tmId];
 if(!tm||!next.ownedTms.includes(tmId)||!mon||!catalog.getSpeciesById(mon.speciesId).tmIds.includes(tmId))throw Error('TM is not owned or compatible');
 if(mon.moves.some(m=>m.id===tm.moveId))throw Error('Move already known');
 if(!integer(slot,0,Math.min(3,mon.moves.length)))throw Error('Choose a move slot');
 mon.moves[slot]={id:tm.moveId,pp:rules.moves[tm.moveId].pp};next.revision++;
 return validateCanonicalBattleSave(next,catalog); // Reusable TM; never consumed.
}
export function learnPendingMove(input,catalog,instanceId,moveId,slot=null){
 const next=validateCanonicalBattleSave(input,catalog),i=next.pendingMoves.findIndex(p=>p.instanceId===instanceId&&p.moveId===moveId),mon=next.party.find(m=>m.instanceId===instanceId);
 if(i<0||!mon)throw Error('No pending move');
 if(slot!==null){if(!integer(slot,0,Math.min(3,mon.moves.length)))throw Error('Choose a move slot');if(!mon.moves.some(m=>m.id===moveId))mon.moves[slot]={id:moveId,pp:catalog.getMoveById(moveId).pp}}
 next.pendingMoves.splice(i,1);next.revision++;return validateCanonicalBattleSave(next,catalog);
}
