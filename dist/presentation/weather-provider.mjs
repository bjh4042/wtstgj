const VALID=['CLEAR','CLOUDY','RAIN','HEAVY_RAIN'];
export function weatherValue(value){const result=typeof value==='string'?value:value?.weather;if(!VALID.includes(result))throw Error('Invalid weather value');return result}
export function createMockWeatherProvider(initial='CLEAR'){let weather=weatherValue(initial);return {name:'mock-weather',read:()=>weather,set:value=>(weather=weatherValue(value))}}
export const createLocalFallbackProvider=()=>({name:'local-fallback',read:()=> 'CLEAR'});
/** Inject a future API adapter; no endpoint or credential is embedded here. */
export const createGeojeWeatherProvider=read=>({name:'geoje-weather',read:context=>read(context)});
/** Compatible with EnvironmentService's existing read/setProvider boundary. Independent time/weather providers. */
export function createSplitEnvironmentProvider({timeProvider,weatherProvider=createLocalFallbackProvider(),timeoutMs=1200}={}){
 let lastWeather='CLEAR',hasValidWeather=false,generation=0,error=null;
 const getTime=()=>timeProvider.read();
 return {name:'time+weather',getTime,getStatus:()=>({weatherProvider:weatherProvider.name,error:error??weatherProvider.getStatus?.().error??null,lastWeather,weather:weatherProvider.getStatus?.()??null}),
  async read(context={}){if(!hasValidWeather&&VALID.includes(context.previous?.weather))lastWeather=context.previous.weather;const token=++generation;let timeout;const controller=new AbortController(),abort=()=>controller.abort();context.signal?.addEventListener('abort',abort,{once:true});
   try{if(context.signal?.aborted)throw Error('Weather request cancelled');const next=weatherValue(await Promise.race([Promise.resolve().then(()=>weatherProvider.read({...context,signal:controller.signal})),new Promise((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(Error('Weather provider timeout'))},timeoutMs)})]));if(token===generation&&!context.signal?.aborted){lastWeather=next;hasValidWeather=true;error=null}}
   catch(e){if(token===generation)error=String(e.message??e)}finally{clearTimeout(timeout);context.signal?.removeEventListener('abort',abort)}
   return {time:getTime().time,weather:lastWeather};
  }
 };
}
