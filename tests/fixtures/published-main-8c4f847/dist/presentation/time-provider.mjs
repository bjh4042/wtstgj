/** All wall-clock access for presentation is confined to providers. Minutes are local to the provider's zone. */
export const TIME_MARKS=Object.freeze({DAWN:390,DAY:720,EVENING:1110,NIGHT:1380});
export function normalizeMinutes(value){if(!Number.isFinite(value))throw Error('Invalid time minutes');return ((value%1440)+1440)%1440}
export function timeState(minutes){const m=normalizeMinutes(minutes);return m>=300&&m<480?'DAWN':m>=480&&m<1080?'DAY':m>=1080&&m<1200?'EVENING':'NIGHT'}
export function createMockTimeProvider(minutes=720){let value=normalizeMinutes(minutes);return {name:'mock-time',read:()=>({minutes:value,time:timeState(value),timeZone:'MOCK'}),setMinutes(next){value=normalizeMinutes(next);return this.read()},force(state){if(!(state in TIME_MARKS))throw Error('Invalid time state');value=TIME_MARKS[state];return this.read()}}}
export function createLocalTimeProvider({now=()=>new Date(),timeZone=undefined}={}){
 return {name:timeZone==='Asia/Seoul'?'geoje-time':'local-time',read(){const date=now();let minutes;
  if(timeZone){const p=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date),v=k=>Number(p.find(x=>x.type===k)?.value);minutes=v('hour')*60+v('minute')+v('second')/60}
  else minutes=date.getHours()*60+date.getMinutes()+date.getSeconds()/60;
  minutes=normalizeMinutes(minutes);return {minutes,time:timeState(minutes),timeZone:timeZone??'browser-local'};
 }};
}
export const createGeojeTimeProvider=options=>createLocalTimeProvider({...options,timeZone:'Asia/Seoul'});
