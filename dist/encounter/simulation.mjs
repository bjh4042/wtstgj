import {selectWeightedSlot,checkEncounterStep,afterWildBattle} from './frequency.mjs';
import {encounterState} from './state.mjs';
export function seededRng(seed=0x7351){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}}
/** Binomial 6-sigma + 2/n tolerance, deterministic seed; no gameplay RNG consumption. */
export function simulateDistribution(table,count=100000,seed=0x7351){
 if(!Number.isInteger(count)||count<1||count>1000000)throw Error('Invalid simulation count');
 const rng=seededRng(seed),counts=Array(table.slots.length).fill(0);
 for(let i=0;i<count;i++){const selected=selectWeightedSlot(table,rng);counts[table.slots.indexOf(selected)]++}
 const slots=table.slots.map((s,i)=>{const expected=s.weight/100,observed=counts[i]/count,tolerance=6*Math.sqrt(expected*(1-expected)/count)+2/count;return {speciesId:s.speciesId,slotId:s.slotId,expected,observed,count:counts[i],tolerance,pass:Math.abs(expected-observed)<=tolerance}});
 return {tableId:table.id,active:table.active,samples:count,seed,pass:slots.every(s=>s.pass),slots};
}
export function simulateFrequency(profile,count=100000,seed=0x7351){
 if(profile==='NONE'||!Number.isInteger(count)||count<1||count>1000000)throw Error('Invalid frequency simulation');
 const rng=seededRng(seed),state=encounterState(),intervals=[];afterWildBattle(state);
 for(let i=0;i<count;i++){
  let steps=0;while(++steps<100000){if(checkEncounterStep(state,profile,rng).triggered)break}
  if(steps===100000)throw Error('Frequency simulation exceeded drought bound');intervals.push(steps);afterWildBattle(state);
 }
 intervals.sort((a,b)=>a-b);return {profile,samples:count,seed,includesSafeSteps:5,meanSteps:intervals.reduce((a,b)=>a+b,0)/count,medianSteps:intervals[Math.ceil(count*.5)-1],p95Drought:intervals[Math.ceil(count*.95)-1]};
}
