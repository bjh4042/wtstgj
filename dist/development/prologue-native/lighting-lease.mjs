import{loadCurrentLighting}from'../s9-transfer/lighting-loader.mjs';
// Reuse selected current-d31 R3 data once across P0 hub/forest/coast. No shared drawing surface or world state.
let current=null;
export async function acquireP0Lighting({fetcher=fetch,signal}={}){
 if(signal?.aborted)throw Error('P0_LIGHT_CANCELLED');let entry=current;
 if(!entry){entry={refs:0,value:null,controller:new AbortController(),promise:null};current=entry;entry.promise=loadCurrentLighting({fetcher,signal:entry.controller.signal}).then(value=>{entry.value=value;if(entry.refs===0){entry.value=null;value.dispose()}return value}).catch(error=>{if(current===entry)current=null;throw error})}
 entry.refs++;let released=false;
 const release=()=>{if(released)return;released=true;entry.refs--;if(entry.refs===0){if(current===entry)current=null;const value=entry.value;entry.value=null;if(value)value.dispose();else entry.controller.abort()}};
 try{const value=await new Promise((resolve,reject)=>{const abort=()=>{try{release()}catch{}reject(Error('P0_LIGHT_CANCELLED'))};signal?.addEventListener('abort',abort,{once:true});entry.promise.then(value=>{signal?.removeEventListener('abort',abort);if(!released)resolve(value)},error=>{signal?.removeEventListener('abort',abort);try{release()}catch{}reject(error)});if(signal?.aborted)abort()});if(signal?.aborted)throw Error('P0_LIGHT_CANCELLED');return Object.freeze({draw(...args){if(released)throw Error('P0_LIGHT_LEASE_RELEASED');return value.draw(...args)},dispose:release})}catch(e){try{release()}catch{}throw e}
}
