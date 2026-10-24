import {createMockTimeProvider} from './presentation/time-provider.mjs';
import {resolveLighting,timeForState} from './presentation/lighting.mjs';
import {resolveWeather} from './presentation/weather-layer.mjs';
export const TIME_STATES=Object.freeze(['DAWN','DAY','EVENING','NIGHT']);
export const WEATHER_STATES=Object.freeze(['CLEAR','CLOUDY','RAIN','HEAVY_RAIN']);
export const DEFAULT_ENVIRONMENT=Object.freeze({time:'DAY',weather:'CLEAR'});
export function validateEnvironment(value){if(!TIME_STATES.includes(value?.time)||!WEATHER_STATES.includes(value?.weather))throw Error('Invalid environment state');return Object.freeze({time:value.time,weather:value.weather});}
export function geojeTimeState(date=new Date()){
 const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',hourCycle:'h23'}).format(date));return h>=5&&h<8?'DAWN':h>=8&&h<18?'DAY':h>=18&&h<20?'EVENING':'NIGHT';
}
export function createMockEnvironment(initial=DEFAULT_ENVIRONMENT){let state=validateEnvironment(initial),forcedState=state.time;const clock=createMockTimeProvider(timeForState(state.time));return {name:'mock',read:(_context={})=>state,getTime:()=>({...clock.read(),forcedState}),set(value){const next=validateEnvironment({...state,...value});if(value.time){clock.force(next.time);forcedState=next.time}return state=next},setTime(minutes){const t=clock.setMinutes(minutes);forcedState=null;return state=validateEnvironment({...state,time:t.time})}};}
export function environmentVisuals({time,weather}){
 const tones={DAWN:['#edb77f',.13],DAY:['#000000',0],EVENING:['#cf765f',.20],NIGHT:['#17274d',.42]};const [tint,opacity]=tones[time];
 const rain=weather==='RAIN'?80:weather==='HEAVY_RAIN'?180:0;
 return {tint,opacity,darkness:weather==='CLEAR'?0:weather==='CLOUDY'?.10:weather==='RAIN'?.16:.25,rain,particles:weather==='HEAVY_RAIN'?40:weather==='RAIN'?14:0,sound:rain?'weather.rain.'+(weather==='HEAVY_RAIN'?'heavy':'light'):'weather.rain.stop'};
}
/** Provider contract: read({signal,now,location}) => state | Promise<state>.
 * Last valid value survives errors/timeouts. Superseded responses cannot overwrite a newer provider.
 */
export function createEnvironmentService(provider=createMockEnvironment(),{pollMs=60000,timeoutMs=5000}={}){
 let hasEncounterWeather=false;let lightingOverride=null;let state=DEFAULT_ENVIRONMENT,version=0,timer=null,controller=null,inFlight=null,error=null;
 const listeners=new Set();
 const emit=value=>{const next=validateEnvironment(value);hasEncounterWeather=true;if(next.time!==state.time||next.weather!==state.weather){state=next;for(const fn of listeners){try{fn(state,environmentVisuals(state))}catch{/* A sound/UI hook must not stop the field. */}}}return state;};
 const refresh=()=>{if(inFlight)return inFlight;const current=version;controller=new AbortController();const requestController=controller,requestProvider=provider,signal=requestController.signal;
  const request=(async()=>{let timeout;try{const value=await Promise.race([Promise.resolve().then(()=>requestProvider.read({signal,previous:state,now:new Date(),location:{latitude:34.8806,longitude:128.6211,timeZone:'Asia/Seoul'}})),new Promise((_,reject)=>{timeout=setTimeout(()=>{requestController.abort();reject(Error('Environment provider timeout'))},timeoutMs)})]);if(current===version){emit(value);error=null}}catch(e){if(current===version)error=String(e.message??e)}finally{clearTimeout(timeout);if(current===version)inFlight=null}return state})();inFlight=request;return request;};
 const stop=()=>{clearInterval(timer);timer=null;version++;controller?.abort();inFlight=null;};
 // Rendering may keep cached/default weather; species weights require a usable reading.
 const getEncounterWeather=()=>{try{const status=provider.getStatus?.();return {weather:state.weather,valid:hasEncounterWeather&&!error&&!status?.error&&status?.weather?.valid!==false&&status?.weatherProvider!=='local-fallback'&&provider.name!=='local-fallback'}}catch{return {weather:state.weather,valid:false}}};
 return {getState:()=>state,getEncounterWeather,getFrame(map={}){let t;try{t=provider.getTime?.();if(t&&!Number.isFinite(t.minutes))t=null}catch{}const lighting=resolveLighting({minutes:t?.minutes??timeForState(state.time),forcedState:t?t.forcedState:state.time,profileId:lightingOverride??map.lightingProfileId??'COAST'});return {state,lighting,weather:resolveWeather(state.weather,{sheltered:['INDOOR','GYM','CAVE','LEAGUE'].includes(map.biomeId)})}},setLightingProfile(id=null){lightingOverride=id},setMockTime(minutes){if(!provider.setTime)throw Error('Current provider is not mock time');version++;controller?.abort();inFlight=null;const next=emit(provider.setTime(minutes));error=null;return next},getStatus:()=>({provider:provider.name??'custom',error}),refresh,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)},setMock(value){if(!provider.set)throw Error('Current provider is not mock');version++;controller?.abort();inFlight=null;const next=emit(provider.set(value));error=null;return next},setProvider(next){const running=timer!==null;stop();hasEncounterWeather=false;provider=next;if(running)timer=setInterval(refresh,pollMs);return refresh()},start(){if(timer===null)timer=setInterval(refresh,pollMs);return refresh()},stop};
}
export const geojeEnvironment=createEnvironmentService();
/** Field-only overlay before UI; zero pixels changed by default DAY/CLEAR. */
export function drawEnvironment(c,state,timeMs,width,height){
 const v=environmentVisuals(state);if(!v.opacity&&!v.darkness&&!v.rain)return;
 c.save();c.globalAlpha=v.opacity;c.fillStyle=v.tint;c.fillRect(0,0,width,height);c.globalAlpha=v.darkness;c.fillStyle='#122237';c.fillRect(0,0,width,height);
 c.globalAlpha=.6;c.strokeStyle='#c6dfea';c.lineWidth=2;
 for(let i=0;i<v.rain;i++){const x=(i*127.3+timeMs*.08)%width,y=(i*79.7+timeMs*.6)%height;c.beginPath();c.moveTo(x,y);c.lineTo(x-7,y+19);c.stroke()}
 c.globalAlpha=.32;for(let i=0;i<v.particles;i++){const x=(i*193)%width,y=(i*131)%height,r=(timeMs/90+i)%6;c.beginPath();c.ellipse(x,y,r*2,r,0,0,Math.PI*2);c.stroke()}c.restore();
}
