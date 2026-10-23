import {resolveLighting} from './lighting.mjs';
import {resolveWeather} from './weather-layer.mjs';
/** Display-only adapter: observed weather/time, encounters, caches and saves stay intact. */
export function displayTime(date=new Date()) {
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',hourCycle:'h23'}).format(date));
 return hour>=6&&hour<18?'DAY':'NIGHT';
}
export function simpleDisplayFrame(frame,{date=new Date(),sheltered=false}={}) {
 const time=displayTime(date),rain=['RAIN','HEAVY_RAIN'].includes(frame.state?.weather);
 return {...frame,lighting:resolveLighting({forcedState:time,profileId:frame.lighting.profileId}),weather:resolveWeather(rain?'RAIN':'CLEAR',{sheltered}),display:{time,rain,observedWeather:frame.state?.weather??null}};
}
export function withSimpleDisplay(environment,{now=()=>new Date()}={}) {
 return {...environment,getFrame(map={}) {return simpleDisplayFrame(environment.getFrame(map),{date:now(),sheltered:['INDOOR','GYM','CAVE','LEAGUE'].includes(map.biomeId)})}};
}
