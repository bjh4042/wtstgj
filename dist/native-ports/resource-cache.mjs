import {prepareNativeBundle,validateNativeBundle,NATIVE_PINS} from './resources/map_simulation_20261102/bridge_r1/native-providers.mjs';
import {prepareForestPlayer,isAuthoritativeForestPlayer} from './resources/recovery_runtime_20261102/s5_resume/dist/development/hakdong-forest-native/player.mjs';
const SOURCE='world:hub:S7',TARGET='world:hub:S8';
const abortError=()=>new Error('NATIVE_CACHE_ABORTED');
/** One host owns exactly one immutable pair + one immutable appearance actor, never persisted or global. */
export function createNativePortResourceCache({appearance='boy'}={}){
 if(!['boy','girl'].includes(appearance))throw Error('NATIVE_CACHE_APPEARANCE');
 let dead=false,ready=null,pending=null,preparations=0,hits=0;const leases=new Set(),errors=[];
 const note=e=>{if(errors.length===20)errors.shift();errors.push(String(e?.message??e));};
 function close(entry){if(!entry||entry.closed||entry.references)return;entry.closed=true;try{entry.bundle.dispose();}catch(e){note(e);}try{entry.player.dispose();}catch(e){note(e);}}
 function retire(entry){if(!entry)return;entry.retired=true;close(entry);}
 function lease(entry,source,target){
  if(dead||entry.closed||entry.retired)throw Error('NATIVE_CACHE_DISPOSED');
  const maps={[SOURCE]:entry.bundle.source,[TARGET]:entry.bundle.target};let released=false;const token={};entry.references++;leases.add(token);
  return Object.freeze({get source(){return released?null:maps[source];},get target(){return released?null:maps[target];},get player(){return released?null:entry.player;},get disposed(){return released;},dispose(){if(released)return;released=true;leases.delete(token);entry.references--;if(entry.retired)close(entry);},get cleanupErrors(){return Object.freeze([...entry.bundle.cleanupErrors,...errors]);}});
 }
 function begin(){
  const job={abort:new AbortController(),waiters:new Set(),promise:null};pending=job;preparations++;
  job.promise=(async()=>{
   let bundle=null,player=null;const signal=job.abort.signal;
   const tasks=[Promise.resolve().then(()=>prepareNativeBundle({source:SOURCE,target:TARGET,signal})).then(v=>bundle=v),Promise.resolve().then(()=>prepareForestPlayer({appearance,signal})).then(v=>player=v)];
   try{
    await Promise.all(tasks);if(signal.aborted||dead||pending!==job||!job.waiters.size)throw abortError();
    if(!validateNativeBundle(bundle,{source:SOURCE,target:TARGET})||(!isAuthoritativeForestPlayer(player)||player.appearance!==appearance))throw Error('NATIVE_CACHE_BRAND');
    const entry={bundle,player,references:0,retired:false,closed:false};ready=entry;if(pending===job)pending=null;return entry;
   }catch(error){job.abort.abort();await Promise.allSettled(tasks);try{bundle?.dispose();}catch(e){note(e);}try{player?.dispose();}catch(e){note(e);}if(pending===job)pending=null;throw error;}
  })();job.promise.catch(()=>{});return job;
 }
 function acquire({source,target,signal}={}){
  if(source===target||!Object.hasOwn(NATIVE_PINS,source)||!Object.hasOwn(NATIVE_PINS,target))return Promise.reject(Error('BRIDGE_NATIVE_FIXED_PAIR'));
  if(signal!==undefined&&!(signal instanceof AbortSignal))return Promise.reject(Error('NATIVE_CACHE_SIGNAL'));
  if(dead)return Promise.reject(Error('NATIVE_CACHE_DISPOSED'));
  if(signal?.aborted)return Promise.reject(abortError());
  if(ready){hits++;return Promise.resolve(lease(ready,source,target));}
  const job=pending??begin();const waiter={};job.waiters.add(waiter);
  return new Promise((resolve,reject)=>{
   let done=false;const clear=()=>{job.waiters.delete(waiter);signal?.removeEventListener('abort',cancel);};
   const cancel=()=>{if(done)return;done=true;clear();if(!job.waiters.size&&pending===job){pending=null;job.abort.abort();}reject(abortError());};
   signal?.addEventListener('abort',cancel,{once:true});
   job.promise.then(entry=>{if(done)return;done=true;clear();if(dead||signal?.aborted){reject(abortError());return;}try{resolve(lease(entry,source,target));}catch(e){reject(e);}},error=>{if(done)return;done=true;clear();reject(error);});
   if(signal?.aborted)cancel();
  });
 }
 function dispose(){if(dead)return;dead=true;if(pending){const job=pending;pending=null;job.abort.abort();}const old=ready;ready=null;retire(old);}
 return Object.freeze({acquire,dispose,get diagnostics(){return Object.freeze({appearance,disposed:dead,ready:!!ready,pending:!!pending,mapCapacity:2,actorCapacity:1,activeLeases:leases.size,preparations,hits,cleanupErrors:Object.freeze([...errors])});}});
}
