import {withSimpleDisplay} from './simple-display.mjs';
import {createEnvironmentService,createMockEnvironment} from '../environment-service.mjs';
import {createGeojeTimeProvider} from './time-provider.mjs';
import {createSplitEnvironmentProvider} from './weather-provider.mjs';
import {createOpenMeteoWeatherProvider} from './open-meteo-weather.mjs';

/** Ordinary canonical only. DEV retains its own MOCK and never starts a real request.
 * Time refreshes independently of weather's 30-minute cache/request cadence.
 */
export function createSessionEnvironment({ordinary=false,weatherOptions={},timeOptions={},windowTarget=globalThis.window,documentTarget=globalThis.document}={}){
 if(!ordinary){const mock=createEnvironmentService(createMockEnvironment());void mock.refresh();return mock}
 const weather=createOpenMeteoWeatherProvider(weatherOptions),time=createGeojeTimeProvider(timeOptions);
 const provider={...createSplitEnvironmentProvider({timeProvider:time,weatherProvider:weather}),name:'geoje-live'};
 const environment=createEnvironmentService(provider,{pollMs:60000});
 const refresh=()=>{if(environment.getStatus().provider==='geoje-live')void environment.refresh()};
 const visible=()=>{if(documentTarget?.visibilityState!=='hidden')refresh()};
 // A fast response can arrive during the first service refresh; apply it after that
 // refresh settles rather than dropping the update to the in-flight deduplication.
 const unsubscribe=weather.subscribe(()=>{if(environment.getStatus().provider==='geoje-live')void environment.refresh().then(refresh)}),stop=environment.stop;
 documentTarget?.addEventListener('visibilitychange',visible);
 windowTarget?.addEventListener('pageshow',refresh);windowTarget?.addEventListener('focus',refresh);
 environment.stop=()=>{unsubscribe();weather.dispose();documentTarget?.removeEventListener('visibilitychange',visible);windowTarget?.removeEventListener('pageshow',refresh);windowTarget?.removeEventListener('focus',refresh);stop()};
 // Do not await weather or block player/session initialization.
 void environment.start();
 return withSimpleDisplay(environment,{now:timeOptions.now??(()=>new Date())});
}
