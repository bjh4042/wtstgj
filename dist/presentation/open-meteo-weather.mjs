import {createGeojeWeatherProvider} from './weather-provider.mjs';

export const GEOJE_WEATHER=Object.freeze({
 latitude:34.8806,longitude:128.6211,timeZone:'Asia/Seoul',
 refreshMs:30*60*1000,timeoutMs:5000,maxCacheAgeMs:3*60*60*1000,
 cacheKey:'geoje:environment:open-meteo:v1',
 url:'https://api.open-meteo.com/v1/forecast?latitude=34.8806&longitude=128.6211&current=weather_code&timezone=Asia%2FSeoul&timeformat=unixtime',
});
// Open-Meteo WMO codes. Snow has no renderer: cloudy presentation, neutral encounter hook.
// https://open-meteo.com/en/docs#weathervariables
export function mapOpenMeteoWeather(code){
 if(!Number.isInteger(code))throw Error('Invalid Open-Meteo weather code');
 if([0,1].includes(code))return {weather:'CLEAR',supported:true};
 if([2,3,45,48].includes(code))return {weather:'CLOUDY',supported:true};
 if([51,53,55,56,57,61,63,66,80,81].includes(code))return {weather:'RAIN',supported:true};
 if([65,67,82,95,96,99].includes(code))return {weather:'HEAVY_RAIN',supported:true};
 if([71,73,75,77,85,86].includes(code))return {weather:'CLOUDY',supported:false};
 throw Error('Unsupported Open-Meteo weather code');
}
const browserStorage=()=>{try{return globalThis.localStorage}catch{return null}};
/** Nonblocking read: return the last recent observation and refresh in the background.
 * One fixed location/request per provider, shared by every map in the session.
 * This cache has no player/slot/save data. Storage failures fall back to memory.
 */
export function createOpenMeteoWeatherProvider({fetcher=(...args)=>fetch(...args),storage=browserStorage(),now=()=>Date.now(),timeoutMs=GEOJE_WEATHER.timeoutMs}={}){
 let cached=null,pending=null,lastAttempt=null,error=null,controller=null,disposed=false,source='cache';
 const listeners=new Set();
 const usable=record=>{
  if(!record||record.version!==1||record.latitude!==GEOJE_WEATHER.latitude||record.longitude!==GEOJE_WEATHER.longitude)return false;
  const time=now();
  if(!Number.isFinite(record.receivedAt)||!Number.isFinite(record.observedAt)||record.receivedAt>time||record.observedAt>time+60000||Math.max(time-record.receivedAt,time-record.observedAt)>GEOJE_WEATHER.maxCacheAgeMs)return false;
  try{mapOpenMeteoWeather(record.code);return true}catch{return false}
 };
 try{const record=JSON.parse(storage?.getItem(GEOJE_WEATHER.cacheKey)??'null');if(usable(record)){cached=record;lastAttempt=record.receivedAt}}catch{}
 const snapshot=()=>{
  const good=usable(cached),mapped=good?mapOpenMeteoWeather(cached.code):{weather:'CLEAR',supported:false};
  return {...mapped,valid:good&&mapped.supported&&!error,source:good?(error?'cache':source):'fallback',observedAt:good?cached.observedAt:null,error};
 };
 const request=()=>{
  if(disposed||pending)return pending;
  lastAttempt=now();controller=new AbortController();const currentController=controller;
  pending=(async()=>{
   let timeout;
   try{
    const json=await Promise.race([
     Promise.resolve().then(async()=>{const response=await fetcher(GEOJE_WEATHER.url,{signal:currentController.signal,credentials:'omit'});if(!response.ok)throw Error('Open-Meteo HTTP '+response.status);return response.json()}),
     new Promise((_,reject)=>{timeout=setTimeout(()=>{currentController.abort();reject(Error('Open-Meteo timeout'))},timeoutMs)}),
    ]);
    if(disposed||currentController.signal.aborted)return;
    const receivedAt=now(),record={version:1,latitude:GEOJE_WEATHER.latitude,longitude:GEOJE_WEATHER.longitude,receivedAt,observedAt:json?.current?.time*1000,code:json?.current?.weather_code};
    if(typeof json?.current?.time!=='number'||!usable(record))throw Error('Invalid/stale Open-Meteo current weather');
    cached=record;lastAttempt=receivedAt;error=null;source='live';
    try{storage?.setItem(GEOJE_WEATHER.cacheKey,JSON.stringify(record))}catch{}
   }catch(e){if(!disposed)error=String(e.message??e)}
   finally{clearTimeout(timeout);pending=null;controller=null;if(!disposed)for(const fn of listeners)try{fn()}catch{}}
  })();
  return pending;
 };
 return {...createGeojeWeatherProvider(()=>{
  const time=now();if(lastAttempt===null||time<lastAttempt||time-lastAttempt>=GEOJE_WEATHER.refreshMs)request();
  return snapshot().weather;
 }),name:'open-meteo-geoje',getStatus:snapshot,
  subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)},
  settled:()=>pending??Promise.resolve(),
  dispose(){disposed=true;controller?.abort();listeners.clear()},
 };
}
