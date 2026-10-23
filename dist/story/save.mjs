import {adoptHiddenGeoje,validateHiddenHistory} from '../world/hidden-geoje-ledger.mjs';
import {shopItems} from '../economy/contract.mjs';
import {createCanonicalTestGame} from '../canonical-session.mjs';
import {validateWorldState} from '../world/state.mjs';
import {activateCanonicalBattleSave,validateCanonicalBattleData,validateCanonicalBattleSave,CANONICAL_BATTLE_SAVE} from '../battle-v3/save.mjs';
import {STORY_VERSION} from '../compatibility/story-adapter.mjs';
import {validateEnhancedLeagueState} from './enhanced-league.mjs';
import {validateHarinPostState} from './harin-rematch.mjs';
import {storyContractFor,validateEncounterState,ENCOUNTER_VERSION,encounterState} from '../encounter/state.mjs';
export const CANONICAL_STORY_SAVE='GEOJE_CANONICAL_STORY_V1_SAVE';
const list=(value,allowed,label)=>{
 if(!Array.isArray(value)||new Set(value).size!==value.length||value.some(id=>!allowed.includes(id)))throw Error('Invalid story '+label);
};
export function createCanonicalStoryGame(catalog,options){
 const s=activateCanonicalBattleSave(createCanonicalTestGame(catalog,options),catalog),contract=catalog.storyContract;
 if(!contract||contract.version!==STORY_VERSION)throw Error('Validated story contract required');
 Object.assign(s,{format:CANONICAL_STORY_SAVE,storyEnabled:true,storyVersion:STORY_VERSION,party:[],dex:{seen:[],caught:[]},inventory:{ecology_ball:0,affinity_ball:0,resonance_ball:0,geoje_ball:0},progress:{currentStage:'PROLOGUE',flags:Object.fromEntries(Object.keys(contract.flags).map(id=>[id,false])),completedEvents:[],completedStages:[],defeatedTrainers:[],gymClears:[],badges:[],leagueWins:[],leagueRunState:'idle',rewardClaims:[],geojeBallGrantHistory:[],items:{}}});
 return validateCanonicalStorySave(s,catalog);
}
export function validateCanonicalStorySave(input,catalog){
 const c=storyContractFor(input,catalog);if(!c||input?.storyVersion!==STORY_VERSION)throw Error('Unsupported canonical story contract');
 const s=validateCanonicalBattleData(adoptHiddenGeoje(input,catalog,c),catalog,{format:CANONICAL_STORY_SAVE,storyEnabled:true,allowEmptyParty:true}),p=s.progress;
 validateWorldState(s);
 if(!p||!c.stages[p.currentStage]||!p.flags||Object.keys(p.flags).length!==Object.keys(c.flags).length||Object.keys(c.flags).some(id=>typeof p.flags[id]!=='boolean')||Object.keys(p.flags).some(id=>!c.flags[id]))throw Error('Invalid story state/flags');
 list(p.completedEvents,Object.values(c.events).filter(e=>e.active).map(e=>e.id),'events');
 list(p.completedStages,c.sequence.filter(id=>id!=='POST'),'stages');
 list(p.defeatedTrainers,Object.keys(c.trainers),'trainers');
 list(p.gymClears,c.gyms.map(g=>g.id),'gym clears');list(p.badges,c.gyms.map(g=>g.badgeId),'badges');
 list(p.leagueWins,c.elite,'league');list(p.rewardClaims,Object.keys(c.rewards),'reward ledger');if(!s.geojeHidden)list(p.geojeBallGrantHistory,Object.keys(c.geojeGrants),'Geoje ledger');
 if(p.completedStages.some((id,i)=>id!==c.sequence[i])||p.leagueWins.some((id,i)=>id!==c.elite[i]))throw Error('Invalid story progression order');
 const unlockedIndex=p.completedStages.length;if(c.sequence.indexOf(p.currentStage)>unlockedIndex)throw Error('Locked current stage');
 for(const eId of p.completedEvents){
  const e=c.events[eId];if(c.sequence.indexOf(e.stageId)>unlockedIndex||e.requiresEvents.some(id=>!p.completedEvents.includes(id))||e.trainerId&&!p.defeatedTrainers.includes(e.trainerId))throw Error('Unproven story event');
 }
 for(const f of Object.values(c.flags)){
  const expected=f.set_by.some(id=>p.completedEvents.includes(c.aliases[id]??id));
  if(p.flags[f.id]!==expected)throw Error('Story flag/event provenance mismatch: '+f.id);
 }
 const partner=p.completedEvents.includes('P02_FIRST_PARTNER');
 if(partner!==!!s.party.length||partner&&!s.dex.caught.includes(s.starterId)||!partner&&(s.box.length||s.dex.caught.length))throw Error('Starter acquisition invariant');
 for(const g of c.gyms){const won=p.defeatedTrainers.includes(g.id);if(won!==p.gymClears.includes(g.id)||won!==p.badges.includes(g.badgeId)||won!==p.flags[g.badgeId]||won!==p.completedEvents.includes(g.eventId))throw Error('Gym reward invariant')}
 for(const tId of p.defeatedTrainers){const t=c.trainers[tId];if(t.eventId&&!p.completedEvents.includes(t.eventId)||t.kind==='elite'&&!p.leagueWins.includes(tId)||c.sequence.indexOf(t.stageId)>unlockedIndex)throw Error('Trainer result provenance')}
 for(const id of c.elite)if(p.leagueWins.includes(id)!==p.defeatedTrainers.includes(id))throw Error('Elite result invariant');
 const expectedLeague=p.flags.MAIN_STORY_CLEAR?'idle':p.leagueWins.length===4?'champion':p.currentStage==='FINAL'||p.leagueWins.length?`elite_${p.leagueWins.length+1}`:'idle';
 if(p.leagueRunState!==expectedLeague)throw Error('League checkpoint invariant');
 if(p.completedEvents.includes('FINAL_LEAGUE')&&p.leagueWins.length!==4)throw Error('Incomplete league');
 if(!p.items||typeof p.items!=='object'||Array.isArray(p.items)||Object.entries(p.items).some(([id,n])=>!storyItemIds(c,catalog).has(id)||!Number.isInteger(n)||n<0||n>9999))throw Error('Invalid story inventory');
 for(const r of Object.values(c.rewards))if(p.rewardClaims.includes(r.id)!==p.completedEvents.includes(r.triggerEvent))throw Error('Reward/event atomicity invariant');
 if(!validateHiddenHistory(s,c)){
 for(const g of Object.values(c.geojeGrants))if(s.world?p.geojeBallGrantHistory.includes(g.id)&&!p.completedEvents.includes(g.triggerEvent):p.geojeBallGrantHistory.includes(g.id)!==p.completedEvents.includes(g.triggerEvent))throw Error('Geoje/event atomicity invariant');
 if(p.geojeBallGrantHistory.reduce((n,id)=>n+c.geojeGrants[id].quantity,0)!==s.geojeBallsGranted)throw Error('Geoje lifetime provenance');
 }
 for(const stId of p.completedStages){const st=c.stages[stId];if(st.eventIds.some(id=>!p.completedEvents.includes(id))||st.requiredTrainerIds.some(id=>!p.defeatedTrainers.includes(id)))throw Error('Incomplete stage recorded as complete')}
 validateEncounterState(s,catalog);validateEnhancedLeagueState(s);validateHarinPostState(s);return s;
}
/** Explicit opt-in, preserving existing Step 6 saves and the caller's original snapshot. */
export function activateCanonicalEncounterSave(input,catalog){
 const next=validateCanonicalStorySave(input,catalog);if(next.encounterVersion)return next;
 next.encounterVersion=ENCOUNTER_VERSION;next.encounter=encounterState();next.revision++;
 return validateCanonicalStorySave(next,catalog);
}
export function storyItemIds(c,catalog=null){return new Set([...Object.values(c.rewards).flatMap(r=>[...Object.keys(r.grant??{}),...Object.keys(r.consume??{})]).filter(id=>!id.startsWith('TM')&&!['ecology_ball','affinity_ball','resonance_ball','geoje_ball'].includes(id)),...(catalog?shopItems(catalog).filter(i=>i.pocket==='items').map(i=>i.id):[])])}
/** Battle v3 remains the sole combat model; narrative state never enters its mutable state. */
export function storyBattleInput(input,catalog){
 const s=validateCanonicalStorySave(input,catalog);
 if(s.economy)s.bagItems=Object.fromEntries(Object.entries(s.progress.items).filter(([id])=>catalog.itemContract[id]?.pocket==='items'));
 delete s.progress;delete s.storyVersion;
 Object.assign(s,{format:CANONICAL_BATTLE_SAVE,storyEnabled:false});return validateCanonicalBattleSave(s,catalog);
}
export function mergeStoryAftermath(story,aftermath,catalog){
 const battle=validateCanonicalBattleSave(aftermath,catalog);
 if(battle.sessionId!==story.sessionId)throw Error('Battle belongs to another story session');
 const progress=structuredClone(story.progress);if(battle.economy&&battle.bagItems)for(const [id,n] of Object.entries(battle.bagItems))progress.items[id]=n;
 delete battle.bagItems;
 return {...battle,format:CANONICAL_STORY_SAVE,storyEnabled:true,storyVersion:STORY_VERSION,progress};
}
