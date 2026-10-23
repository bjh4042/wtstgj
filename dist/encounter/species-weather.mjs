import {WEATHER_STATES} from '../environment-service.mjs';
import {selectEncounter,validateWeightedTable} from './frequency.mjs';
import {SPECIES_WEATHER_CONFIG} from './species-weather-config.mjs';

/** Only called AFTER the existing area/method/acquisition gates authorize a random table.
 * No source mutation, added slots, clock lookup, provider I/O or accumulated multipliers.
 * A total-weight roll is equivalent to normalization by that total.
 */
export function resolveSpeciesWeatherTable(table,snapshot,config=SPECIES_WEATHER_CONFIG){
 if(config?.enabled!==true||table?.rod)return {table,total:100};
 validateWeightedTable(table);
 if(snapshot?.valid!==true||!WEATHER_STATES.includes(snapshot.weather))return {table,total:100};
 const weather=snapshot.weather,configured=config.multipliers??{};
 if(!configured||Array.isArray(configured)||typeof configured!=='object')throw Error('INVALID_SPECIES_WEATHER_CONFIG');
 for(const [id,byWeather] of Object.entries(configured)){
  if(!/^SPECIES_(00[1-9]|0[1-9]\d|1[0-4]\d|15[01])$/.test(id)||!byWeather||Array.isArray(byWeather)||typeof byWeather!=='object')throw Error('INVALID_SPECIES_WEATHER_CONFIG');
  for(const [state,value] of Object.entries(byWeather))if(!WEATHER_STATES.includes(state)||!Number.isFinite(value)||value<=0)throw Error('INVALID_SPECIES_WEATHER_MULTIPLIER');
 }
 const multipliers=table.slots.map(s=>configured[s.speciesId]?.[weather]??1);
 if(multipliers.every(n=>n===1))return {table,total:100};
 const slots=table.slots.map((s,i)=>({...s,weight:s.weight*multipliers[i]})),total=slots.reduce((n,s)=>n+s.weight,0);
 if(!Number.isFinite(total)||total<=0||slots.some(s=>!Number.isFinite(s.weight)||s.weight<=0||s.weight/total<=0))throw Error('INVALID_SPECIES_WEATHER_WEIGHT');
 return {table:{...table,slots},total};
}

/** Diagnostics are optional and supplied only by DEV hosts. RNG failures remain errors;
 * only weather/config calculation failures fall back, BEFORE any selection RNG is used.
 */
export function selectWeatherEncounter(table,rng,{config=SPECIES_WEATHER_CONFIG,environment=null,onDiagnostic=null}={}){
 if(config?.enabled!==true||table?.rod)return selectEncounter(table,rng);
 let effective={table,total:100};
 try{effective=resolveSpeciesWeatherTable(table,environment?.getEncounterWeather?.(),config)}
 catch(error){try{onDiagnostic?.({code:'SPECIES_WEATHER_FALLBACK',tableId:table.id,reason:error.message})}catch{}}
 return selectEncounter(effective.table,rng,effective.total);
}
