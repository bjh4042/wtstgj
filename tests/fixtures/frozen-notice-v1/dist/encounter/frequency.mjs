export const ENCOUNTER_PROFILES=Object.freeze({NONE:0,SPARSE:.05,NORMAL:.09,RICH:.12,VERY_RICH:.16});
export const FREQUENCY_POLICY=Object.freeze({safeStepsAfterEncounter:5,dryStart:10,dryInterval:4,dryIncrement:.02,dryCap:.08});
export function roll(rng){const v=rng();if(!Number.isFinite(v)||v<0||v>=1)throw Error('RNG must return [0,1)');return v}
export function effectiveChance(profile,state,config=FREQUENCY_POLICY){
 if(!Object.hasOwn(ENCOUNTER_PROFILES,profile))throw Error('Unknown encounter profile');
 const base=ENCOUNTER_PROFILES[profile];if(!base||state.safeStepsRemaining>0)return 0;
 const ramp=state.dryStreak<config.dryStart?0:Math.floor((state.dryStreak-config.dryStart)/config.dryInterval)+1;
 return Math.min(1,base+Math.min(config.dryCap,ramp*config.dryIncrement));
}
export function checkEncounterStep(state,profile,rng=Math.random,config=FREQUENCY_POLICY){
 const chance=effectiveChance(profile,state,config);if(profile==='NONE')return {triggered:false,eligible:false,chance:0};
 state.eligibleSteps++;
 if(state.safeStepsRemaining>0){state.safeStepsRemaining--;return {triggered:false,eligible:true,safe:true,chance:0}}
 const triggered=roll(rng)<chance;state.dryStreak=triggered?0:state.dryStreak+1;
 return {triggered,eligible:true,chance};
}
export function afterWildBattle(state,config=FREQUENCY_POLICY){state.safeStepsRemaining=config.safeStepsAfterEncounter;state.dryStreak=0}
export function validateWeightedTable(table,total=100){
 if(!Number.isFinite(total)||total<=0||!table?.slots?.length||table.slots.some(s=>!Number.isFinite(s.weight)||s.weight<=0)||table.slots.reduce((n,s)=>n+s.weight,0)!==total)throw Error('Invalid weighted table');
}
export function selectWeightedSlot(table,rng=Math.random,total=100){
 validateWeightedTable(table,total);
 let value=roll(rng)*total;for(const slot of table.slots){if(value<slot.weight)return slot;value-=slot.weight}return table.slots.at(-1);
}
export function selectEncounter(table,rng=Math.random,total=100){const slot=selectWeightedSlot(table,rng,total),[low,high]=slot.level;return {namespace:'canonical',speciesId:slot.speciesId,level:low+Math.floor(roll(rng)*(high-low+1)),slotId:slot.slotId,tableId:table.id}}
