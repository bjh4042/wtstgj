import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SPECIES_WEATHER_CONFIG} from '../dist/encounter/species-weather-config.mjs';
import {resolveSpeciesWeatherTable,selectWeatherEncounter} from '../dist/encounter/species-weather.mjs';
import {selectEncounter,selectWeightedSlot} from '../dist/encounter/frequency.mjs';
import {createEnvironmentService,createMockEnvironment} from '../dist/environment-service.mjs';
import {createSplitEnvironmentProvider,createMockWeatherProvider} from '../dist/presentation/weather-provider.mjs';
import {createMockTimeProvider} from '../dist/presentation/time-provider.mjs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';

// Synthetic multipliers exist only in this isolated test, never in runtime config/save.
const config=multipliers=>({enabled:true,multipliers});
const rain={weather:'RAIN',valid:true},environment={getEncounterWeather:()=>rain};
const table=Object.freeze({id:'TEST:land_grass',rod:null,slots:Object.freeze([
 Object.freeze({slotId:0,speciesId:'SPECIES_010',weight:30,level:[2,3]}),
 Object.freeze({slotId:1,speciesId:'SPECIES_010',weight:20,level:[4,5]}),
 Object.freeze({slotId:2,speciesId:'SPECIES_012',weight:50,level:[6,7]}),
])});
test('OFF/all 1.0 preserve original slots, boundaries and RNG consumption',()=>{
 assert.deepEqual(SPECIES_WEATHER_CONFIG,{version:'species-weather-weights-v1',enabled:false,defaultMultiplier:1,multipliers:{}});
 for(const cfg of [SPECIES_WEATHER_CONFIG,config({}),config({SPECIES_010:{RAIN:1},SPECIES_012:{RAIN:1}})]){
  assert.equal(resolveSpeciesWeatherTable(table,rain,cfg).table,table);
  for(const n of [0,.299999,.3,.499999,.5,.999999]){
   let calls=0;const result=selectWeatherEncounter(table,()=>{calls++;return n},{config:cfg,environment});
   assert.deepEqual(result,selectEncounter(table,()=>n));assert.equal(calls,2);
  }
 }
 selectWeatherEncounter(table,()=>0,{environment:{getEncounterWeather(){throw Error('OFF must not read weather')}}});
});
test('sparse multipliers normalize per slot; duplicates agree, no added species or compounding',()=>{
 const cfg=config({SPECIES_010:{RAIN:2},SPECIES_012:{RAIN:.5},SPECIES_001:{RAIN:100}}),before=JSON.stringify(table);
 const result=resolveSpeciesWeatherTable(table,rain,cfg);
 assert.deepEqual(result.table.slots.map(s=>s.weight),[60,40,25]);assert.equal(result.total,125);
 assert.deepEqual(result.table.slots.map(s=>s.weight/result.total),[.48,.32,.2]);
 for(const [n,slotId] of [[0,0],[.47999,0],[.48,1],[.79999,1],[.8,2],[.99999,2]])assert.equal(selectWeatherEncounter(table,()=>n,{config:cfg,environment}).slotId,slotId);
 assert.deepEqual(resolveSpeciesWeatherTable(table,rain,cfg),result);assert.equal(JSON.stringify(table),before);
 for(const weather of ['CLEAR','CLOUDY','HEAVY_RAIN'])assert.equal(resolveSpeciesWeatherTable(table,{weather,valid:true},cfg).table,table);
 let reads=0;selectWeatherEncounter(table,()=>.4,{config:cfg,environment:{getEncounterWeather(){reads++;return rain}}});assert.equal(reads,1);
});
test('missing/invalid weather and invalid/overflow multipliers fall back without another table or RNG',()=>{
 for(const snapshot of [null,{},rain&&{weather:'RAIN',valid:false},{weather:'SNOW',valid:true}])assert.equal(resolveSpeciesWeatherTable(table,snapshot,config({SPECIES_010:{RAIN:2}})).table,table);
 for(const value of [0,-1,NaN,Infinity,'2',Number.MAX_VALUE,Number.MIN_VALUE]){
  const diagnostics=[];let calls=0;
  const result=selectWeatherEncounter(table,()=>{calls++;return .4},{config:config({SPECIES_010:{RAIN:value}}),environment,onDiagnostic:d=>diagnostics.push(d)});
  assert.deepEqual(result,selectEncounter(table,()=>.4));assert.equal(calls,2);assert.equal(diagnostics.length,1);
 }
 assert.deepEqual(selectWeatherEncounter(table,()=>.4,{config:config({}),environment:{getEncounterWeather(){throw Error('unavailable')}}}),selectEncounter(table,()=>.4));
 assert.throws(()=>selectWeightedSlot({slots:[{weight:99}]},()=>0),/weighted/);
 assert.throws(()=>selectWeatherEncounter(table,()=>NaN,{config:config({}),environment}),/RNG/);
});
test('render fallback/cached weather is neutral; normal MOCK/split readings are usable',async()=>{
 const env=createEnvironmentService(createMockEnvironment({time:'DAY',weather:'RAIN'}));
 assert.equal(env.getEncounterWeather().valid,false);await env.refresh();assert.deepEqual(env.getEncounterWeather(),rain);
 await env.setProvider({read(){throw Error('offline')}});assert.equal(env.getState().weather,'RAIN');assert.equal(env.getEncounterWeather().valid,false);
 const weather=createMockWeatherProvider('RAIN');const split=createSplitEnvironmentProvider({timeProvider:createMockTimeProvider(),weatherProvider:weather});
 await env.setProvider(split);assert.deepEqual(env.getEncounterWeather(),rain);
 weather.read=()=>({weather:'INVALID'});await env.refresh();assert.equal(env.getState().weather,'RAIN');assert.equal(env.getEncounterWeather().valid,false);
 await env.setProvider(createSplitEnvironmentProvider({timeProvider:createMockTimeProvider()}));assert.equal(env.getState().weather,'CLEAR');assert.equal(env.getEncounterWeather().valid,false);
 await env.setProvider(createMockEnvironment());env.setMock({weather:'RAIN'});assert.deepEqual(env.getEncounterWeather(),rain);env.stop();
});
test('fishing selection bypasses species-weather configuration entirely',()=>{
 const fishing={...table,rod:'basic_rod'};
 assert.deepEqual(selectWeatherEncounter(fishing,()=>.4,{config:config({SPECIES_010:{RAIN:2}}),environment:{getEncounterWeather(){throw Error('Fishing must not read weather')}}}),selectEncounter(fishing,()=>.4));
});

const adapter=await loadCanonicalRuntimeAdapter({readText:async file=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+file,import.meta.url),'utf8')});
const enabled={...adapter,encounterRuntime:{...adapter.encounterRuntime,speciesWeatherWeights:config({SPECIES_010:{RAIN:2}})}};
async function partner(a=adapter,env=environment,runtime=null){
 const w=new CanonicalWorld({adapter:a,mode:'test',runtime,encounterEnvironment:env});
 if(!runtime)for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await w.story.runEvent(id);
 return w;
}
const movement=w=>({from:{x:1,y:1},to:{x:2,y:1},serial:w.snapshot().encounter.movementSerial+1,areaId:w.snapshot().encounter.areaId,method:w.snapshot().encounter.method,eligible:true,moved:true,blocked:false});
test('canonical random step binds snapshot after gates; trigger/safe/dry rules remain independent',async()=>{
 assert.deepEqual(adapter.encounterRuntime.speciesWeatherWeights,SPECIES_WEATHER_CONFIG);
 for(const [a,expected,readsExpected] of [[adapter,'SPECIES_012',0],[enabled,'SPECIES_010',1]]){
  let reads=0;const w=await partner(a,{getEncounterWeather(){reads++;return rain}});
  try{
   await w.story.enterArea('P_ECO_CENTER_EDGE','land_grass');
   const failed=await w.story.encounterStep(movement(w),{rng:()=>.1});assert.equal(failed.triggered,false);assert.equal(failed.chance,.09);assert.equal(reads,0);assert.equal(w.snapshot().encounter.dryStreak,1);
   const rolls=[0,.35,0];const result=await w.story.encounterStep(movement(w),{rng:()=>rolls.length?rolls.shift():0,battleDriver:b=>b.act({type:'flee'})});
   assert.equal(result.selection.speciesId,expected);assert.equal(result.outcome,'fled');assert.equal(reads,readsExpected);
   assert.equal(w.snapshot().encounter.safeStepsRemaining,5);assert.equal(w.snapshot().encounter.dryStreak,0);
   assert.equal((await w.story.encounterStep(movement(w),{rng:()=>{throw Error('safe')}})).safe,true);assert.equal(reads,readsExpected);
  }finally{w.dispose()}
 }
});
test('approved excluded surf and locked regions cannot consult weather or create replacement encounters',async()=>{
 const initial=await partner(enabled);const runtime=initial.snapshot();initial.dispose();
 const t=Object.values(adapter.encounterRuntime.policyExcludedTables)[0];runtime.encounter.areaId=t.areaId;runtime.encounter.method=t.method;
 const w=await partner(enabled,{getEncounterWeather(){throw Error('gate must run first')}},runtime);
 try{
  const before=w.snapshot();assert.equal((await w.story.encounterStep(movement(w))).reason,'POLICY_NO_RANDOM_ENCOUNTER');assert.deepEqual(w.snapshot(),before);
  await assert.rejects(()=>w.story.enterArea('S8_GUJORA_OFFSHORE'),/LOCKED/);
 }finally{w.dispose()}
});
