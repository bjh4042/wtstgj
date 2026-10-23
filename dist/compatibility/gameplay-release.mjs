// Native gameplay releases are separate from the stable species/save namespace.
// Missing metadata means historical content, never the newest installed content.
import {SpeciesCatalogService} from '../species-catalog-service.mjs';
export const HISTORICAL_GAMEPLAY_RELEASE='canonical-historical-55';
export const LATEST_GAMEPLAY_RELEASE='canonical-20260927';
const releases=new Set([HISTORICAL_GAMEPLAY_RELEASE,LATEST_GAMEPLAY_RELEASE]);
export function gameplayReleaseFor(runtime){
 const id=runtime&&Object.hasOwn(runtime,'gameplayRelease')?runtime.gameplayRelease:HISTORICAL_GAMEPLAY_RELEASE;
 if(!releases.has(id)){const e=Error('Unknown gameplay release: '+String(id));e.code='UNKNOWN_GAMEPLAY_RELEASE';throw e}
 return id;
}
export function createGameplayReleases({historical,latest=null}){
 if(!historical)throw Error('Historical adapter required');
 const adapters=new Map([[HISTORICAL_GAMEPLAY_RELEASE,historical]]);if(latest)adapters.set(LATEST_GAMEPLAY_RELEASE,latest);
 const catalogs=new Map([...adapters].map(([id,adapter])=>[id,new SpeciesCatalogService({namespace:'canonical',adapter})]));
 const get=(map,runtime)=>{const id=gameplayReleaseFor(runtime);if(!map.has(id)){const e=Error('Gameplay release unavailable: '+id);e.code='GAMEPLAY_RELEASE_UNAVAILABLE';throw e}return map.get(id)};
 return Object.freeze({kind:'gameplay-release-registry',newGameRelease:latest?LATEST_GAMEPLAY_RELEASE:HISTORICAL_GAMEPLAY_RELEASE,adapterFor:runtime=>get(adapters,runtime),catalogFor:runtime=>get(catalogs,runtime)});
}
/** Latest gameplay must be the approved merged release, not the raw staging adapter.
 * Explicit injection also keeps historical-only and candidate graphs isolated. */
export async function loadGameplayReleases({historicalOptions={},latestOptions={},latestLoader}={}){
 if(typeof latestLoader!=='function')throw Error('Approved latest gameplay loader required');
 const {loadCanonicalRuntimeAdapter}=await import('./canonical-runtime-adapter.mjs');
 const [historical,latest]=await Promise.all([loadCanonicalRuntimeAdapter(historicalOptions),latestLoader(latestOptions)]);
 return createGameplayReleases({historical,latest});
}
