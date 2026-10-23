import {createGameplayReleases} from '../compatibility/gameplay-release.mjs';
import {loadCanonicalRuntimeAdapter} from '../compatibility/canonical-runtime-adapter.mjs';
import {loadCanonical20260927Adapter} from '../compatibility/canonical-20260927-adapter.mjs';
import {mergeApprovedGameplayRelease} from '../compatibility/approved-latest-runtime-adapter.mjs';
/** One immutable graph per page; no storage reads or writes while resolving content. */
let pending;
export function loadOrdinaryGameplayReleases(){
 return pending??=(async()=>{const [historical,staged]=await Promise.all([loadCanonicalRuntimeAdapter({development:true}),loadCanonical20260927Adapter()]);return createGameplayReleases({historical,latest:mergeApprovedGameplayRelease(historical,staged)})})().catch(error=>{pending=null;throw error});
}
