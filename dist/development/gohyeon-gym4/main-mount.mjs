import {preloadS4FixedPair} from './bootstrap.mjs';
import {installS4FixedPairReviewHost} from '../gohyeon-pair/main-host.mjs';
// startCanonicalWorld is the actual main entry import supplied by the sole source entry owner.
export async function mountS4FixedPairWithMain({startCanonicalWorld,preparationOptions,visuals,replacePrevious=()=>{},signal=preparationOptions?.signal,hostFactory=installS4FixedPairReviewHost}){
 if(typeof startCanonicalWorld!=='function')throw Error('ACTUAL_MAIN_ENTRY_REQUIRED');let prepared,lifecycle,disposed=false;
 const check=()=>{if(disposed||signal?.aborted){const e=Error('S4_MAIN_MOUNT_ABORTED');e.name='AbortError';throw e}};
 const dispose=()=>{if(disposed)return;disposed=true;signal?.removeEventListener('abort',dispose);try{lifecycle?.dispose()}finally{prepared?.dispose()}};signal?.addEventListener('abort',dispose,{once:true});
 try{check();prepared=await preloadS4FixedPair({...preparationOptions,signal});if(disposed||signal?.aborted){prepared.dispose();check()}check();replacePrevious();check();const next=await startCanonicalWorld({developmentAdapter:preparationOptions.adapter,developmentFixture:()=>prepared.runtimeForMain(),developmentWorldFactory:options=>{check();return prepared.bindWorld(options)},developmentReview:options=>{check();return hostFactory({...options,owner:prepared.owner,selectedServices:{...prepared.selectedServices,visuals}})}});if(disposed||signal?.aborted){next.dispose();check()}lifecycle=next;return{getWorld:prepared.getWorld,get owner(){return prepared.owner},storage:prepared.storage,dispose};}catch(e){dispose();throw e}
}
