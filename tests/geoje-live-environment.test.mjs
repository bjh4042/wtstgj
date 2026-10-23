import test from 'node:test';
import assert from 'node:assert/strict';
import {GEOJE_WEATHER,createOpenMeteoWeatherProvider,mapOpenMeteoWeather} from '../dist/presentation/open-meteo-weather.mjs';
import {createSessionEnvironment} from '../dist/presentation/session-environment.mjs';
import {createMockEnvironment} from '../dist/environment-service.mjs';
import {SPECIES_WEATHER_CONFIG} from '../dist/encounter/species-weather-config.mjs';

const initial=Date.parse('2026-09-23T14:59:00Z');
const response=(stamp,code=61)=>({ok:true,json:async()=>({current:{time:stamp/1000,weather_code:code}})});
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve()};

test('Open-Meteo WMO mapping uses only four states, snow is neutral cloudy, bad data rejected',()=>{
 for(const [codes,state] of [[[0,1],'CLEAR'],[[2,3,45,48],'CLOUDY'],[[51,53,55,56,57,61,63,66,80,81],'RAIN'],[[65,67,82,95,96,99],'HEAVY_RAIN']])for(const code of codes)assert.deepEqual(mapOpenMeteoWeather(code),{weather:state,supported:true});
 for(const code of [71,73,75,77,85,86])assert.deepEqual(mapOpenMeteoWeather(code),{weather:'CLOUDY',supported:false});
 for(const code of [null,'61',NaN,999])assert.throws(()=>mapOpenMeteoWeather(code));
 const url=new URL(GEOJE_WEATHER.url);assert.equal(url.hostname,'api.open-meteo.com');assert.equal(url.searchParams.get('current'),'weather_code');assert.equal(url.searchParams.get('latitude'),'34.8806');assert.equal(url.searchParams.get('longitude'),'128.6211');assert.equal(url.searchParams.get('timezone'),'Asia/Seoul');assert.equal(url.searchParams.has('hourly'),false);assert.equal(url.searchParams.has('daily'),false);
 assert.equal(GEOJE_WEATHER.refreshMs,1800000);assert.equal(GEOJE_WEATHER.timeoutMs,5000);assert.equal(GEOJE_WEATHER.maxCacheAgeMs,10800000);
});
test('background read never waits; concurrent/map reads share one request and 30-minute cadence',async()=>{
 let stamp=initial,calls=0;const first=deferred(),storage=memory();
 const p=createOpenMeteoWeatherProvider({storage,now:()=>stamp,fetcher:async(url,options)=>{calls++;assert.equal(options.credentials,'omit');assert.equal(url,GEOJE_WEATHER.url);return calls===1?first.promise:response(stamp,65)}});
 assert.equal(p.read(),'CLEAR');assert.equal(p.read(),'CLEAR');assert.equal(p.getStatus().valid,false);await flush();assert.equal(calls,1);
 first.resolve(response(stamp));await p.settled();assert.equal(p.read(),'RAIN');assert.equal(p.getStatus().valid,true);assert.equal(calls,1);
 stamp+=GEOJE_WEATHER.refreshMs-1;assert.equal(p.read(),'RAIN');await flush();assert.equal(calls,1);
 stamp++;assert.equal(p.read(),'RAIN');p.read();await p.settled();assert.equal(calls,2);assert.equal(p.read(),'HEAVY_RAIN');p.dispose();
 let reused=0;const q=createOpenMeteoWeatherProvider({storage,now:()=>stamp,fetcher:()=>{reused++;throw Error('should use cache')}});assert.equal(q.read(),'HEAVY_RAIN');await flush();assert.equal(reused,0);q.dispose();
});
test('offline/malformed responses use recent cache, then CLEAR after 3 hours; fallback never rewrites good cache',async()=>{
 let stamp=initial,fail=false,calls=0;const storage=memory();
 const p=createOpenMeteoWeatherProvider({storage,now:()=>stamp,fetcher:async()=>{calls++;if(fail)throw Error('offline');return response(stamp)}});
 p.read();await p.settled();const saved=storage.getItem(GEOJE_WEATHER.cacheKey);fail=true;stamp+=GEOJE_WEATHER.refreshMs;
 p.read();await p.settled();assert.equal(p.read(),'RAIN');assert.equal(p.getStatus().source,'cache');assert.equal(p.getStatus().valid,false);assert.match(p.getStatus().error,/offline/);assert.equal(storage.getItem(GEOJE_WEATHER.cacheKey),saved);assert.equal(calls,2);
 stamp=initial+GEOJE_WEATHER.maxCacheAgeMs+1;p.read();await p.settled();assert.equal(p.read(),'CLEAR');assert.equal(p.getStatus().source,'fallback');assert.equal(p.getStatus().valid,false);p.dispose();
 const bad=createOpenMeteoWeatherProvider({storage:null,now:()=>stamp,fetcher:async()=>({ok:true,json:async()=>({current:{time:stamp/1000,weather_code:null}})})});bad.read();await bad.settled();assert.equal(bad.read(),'CLEAR');assert.match(bad.getStatus().error,/Invalid/);bad.dispose();
});
test('bounded timeout preserves recent cache; corrupt/blocked storage cannot stop the provider',async()=>{
 let stamp=initial;const storage=memory();const seed=createOpenMeteoWeatherProvider({storage,now:()=>stamp,fetcher:async()=>response(stamp)});seed.read();await seed.settled();seed.dispose();stamp+=GEOJE_WEATHER.refreshMs;
 for(const store of [storage,{getItem:()=>'{bad',setItem(){throw Error('quota')}},{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}]){
  let aborted=false;const p=createOpenMeteoWeatherProvider({storage:store,now:()=>stamp,timeoutMs:8,fetcher:(_url,{signal})=>{signal.addEventListener('abort',()=>aborted=true);return new Promise(()=>{})}});
  assert.equal(p.read(),store===storage?'RAIN':'CLEAR');await p.settled();assert.match(p.getStatus().error,/timeout/);assert.equal(aborted,true);assert.equal(p.getStatus().valid,false);p.dispose();
 }
});
test('ordinary session uses Seoul clock immediately and on midnight/app return, independently of pending weather',async()=>{
 let stamp=initial,calls=0;const first=deferred(),windowTarget=new EventTarget(),documentTarget=new EventTarget();documentTarget.visibilityState='visible';
 const env=createSessionEnvironment({ordinary:true,windowTarget,documentTarget,timeOptions:{now:()=>new Date(stamp)},weatherOptions:{now:()=>stamp,storage:null,fetcher:()=>{calls++;return first.promise}}});
 try{
  await env.refresh();assert.equal(calls,1);assert.equal(env.getStatus().provider,'geoje-live');assert.equal(env.getState().time,'NIGHT');assert.equal(env.getState().weather,'CLEAR');assert.equal(env.getEncounterWeather().valid,false);
  stamp=Date.parse('2026-09-23T15:01:00Z');windowTarget.dispatchEvent(new Event('pageshow'));await env.refresh();assert.equal(env.getState().time,'NIGHT');assert.equal(calls,1);
  stamp=Date.parse('2026-09-23T20:30:00Z');documentTarget.dispatchEvent(new Event('visibilitychange'));await env.refresh();assert.equal(env.getState().time,'DAWN');assert.equal(calls,1);
  first.resolve(response(stamp,65));await flush();await env.refresh();assert.equal(env.getState().weather,'HEAVY_RAIN');assert.equal(env.getState().time,'DAWN');
 }finally{env.stop()}
 assert.equal(SPECIES_WEATHER_CONFIG.enabled,false);assert.equal(SPECIES_WEATHER_CONFIG.defaultMultiplier,1);assert.deepEqual(SPECIES_WEATHER_CONFIG.multipliers,{});
});
test('DEV never starts live weather; switching a live session to MOCK defeats late API responses',async()=>{
 let calls=0;const first=deferred(),targets={windowTarget:new EventTarget(),documentTarget:new EventTarget()};
 const dev=createSessionEnvironment({ordinary:false,...targets,weatherOptions:{fetcher:()=>{calls++;throw Error('DEV must not fetch')}}});await dev.refresh();dev.setMock({time:'EVENING',weather:'RAIN'});assert.equal(calls,0);assert.equal(dev.getState().weather,'RAIN');dev.stop();
 const live=createSessionEnvironment({ordinary:true,...targets,weatherOptions:{storage:null,now:()=>initial,fetcher:()=>{calls++;return first.promise}}});
 try{
  await live.refresh();assert.equal(calls,1);await live.setProvider(createMockEnvironment({time:'DAY',weather:'CLOUDY'}));
  first.resolve(response(initial,65));await flush();targets.windowTarget.dispatchEvent(new Event('focus'));await live.refresh();assert.deepEqual(live.getState(),{time:'DAY',weather:'CLOUDY'});assert.equal(calls,1);
 }finally{live.stop()}
});
test('fast API completion is applied, with snow/default fallback kept neutral for encounter weights',async()=>{
 const env=createSessionEnvironment({ordinary:true,windowTarget:null,documentTarget:null,weatherOptions:{storage:null,now:()=>initial,fetcher:async()=>response(initial,71)}});
 try{await flush();await env.refresh();assert.equal(env.getState().weather,'CLOUDY');assert.equal(env.getEncounterWeather().valid,false)}finally{env.stop()}
});
