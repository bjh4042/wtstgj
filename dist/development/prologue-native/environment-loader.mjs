import{preparePrologueEnvironment,CURRENT_SOURCE_SHA}from'./environment.mjs';
const moduleURL=import.meta.url,files=Object.freeze(['sw.indices','sw.rgb','central.indices','central.rgb','boats.indices','boats.rgb']);
// Fixed immutable payload owner only. No shared canvas/image/camera. Abort releases only that caller's opaque lease.
let current=null;
export async function acquirePrologueEnvironment({fetcher=fetch,signal}={}){
 if(signal?.aborted)throw Error('ENVIRONMENT_CANCELLED');
 let entry=current;
 if(!entry){entry={refs:0,value:null,promise:null,controller:new AbortController()};current=entry;entry.promise=preparePrologueEnvironment({sourceSHA:CURRENT_SOURCE_SHA,signal:entry.controller.signal,readBytes:async name=>{if(!files.includes(name))throw Error('ENVIRONMENT_INPUT_UNKNOWN');const r=await fetcher(new URL('./assets/environment/'+name,moduleURL),{signal:entry.controller.signal});if(!r.ok)throw Error('ENVIRONMENT_INPUT_MISSING');return r.arrayBuffer()}}).then(value=>{entry.value=value;if(entry.refs===0)value.dispose();return value}).catch(error=>{if(current===entry)current=null;throw error})}
 entry.refs++;let released=false;
 const release=()=>{if(released)return;released=true;entry.refs--;if(entry.refs===0){if(current===entry)current=null;if(entry.value)entry.value.dispose();else entry.controller.abort()}};
 try{const value=await new Promise((resolve,reject)=>{const abort=()=>{release();reject(Error('ENVIRONMENT_CANCELLED'))};signal?.addEventListener('abort',abort,{once:true});entry.promise.then(value=>{signal?.removeEventListener('abort',abort);if(!released)resolve(value)},error=>{signal?.removeEventListener('abort',abort);release();reject(error)});if(signal?.aborted)abort()});if(signal?.aborted)throw Error('ENVIRONMENT_CANCELLED');return Object.freeze({drawBackground(ctx,options){if(released)throw Error('ENVIRONMENT_LEASE_RELEASED');return value.drawBackground(ctx,options)},dispose:release})}catch(error){release();throw error}
}
