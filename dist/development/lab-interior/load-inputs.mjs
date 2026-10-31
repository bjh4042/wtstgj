const trusted=new WeakMap();export const isLabInputs=x=>trusted.has(x);export const readLabSafe=x=>{const s=trusted.get(x);if(!s)throw Error('LAB_VERIFIED_INPUT_REQUIRED');return new Uint8Array(s)};
import {CONTRACT} from './fixed-contract.mjs';
// Pinned candidate inputs; no global resource cache or owned animation loop.
export async function loadLabInputs({registration,readBytes,decode,signal,crypto=globalThis.crypto}={}){
 if(registration&&JSON.stringify(registration)!==JSON.stringify(CONTRACT))throw Error('LAB_FIXED_REGISTRATION_REQUIRED');registration=CONTRACT;
 if(typeof readBytes!=='function'||typeof decode!=='function'||!registration?.assets||!crypto?.subtle)throw Error('LAB_INPUT_HOST_REQUIRED');const resources=new Set(),errors=[];let disposed=false;
 const check=()=>{if(disposed||signal?.aborted)throw Error('LAB_LOAD_CANCELLED')};
 const dispose=()=>{if(disposed)return;disposed=true;const list=[...resources];resources.clear();for(const x of list)try{x.close?.()}catch(e){errors.push(e)}};
 try{const bytes={};for(const [name,sha]of Object.entries(registration.assets)){check();const b=new Uint8Array(await readBytes(name));check();const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');if(actual!==sha)throw Error('LAB_INPUT_SHA_MISMATCH');bytes[name]=b}const assets={};for(const [k,n,w,h]of [['room','assets/room.png',960,640],['yoon','assets/yoon-front-cell256.png',256,256]]){const a=await decode(bytes[n]);resources.add(a);check();if(a.width!==w||a.height!==h)throw Error('LAB_INPUT_DIMENSIONS');assets[k]=a}const safe=bytes['assets/lab.safe.u8'];if(safe.length!==960*640||safe.some(x=>x!==0&&x!==1))throw Error('LAB_SAFE_ENCODING');const result=Object.freeze({assets:Object.freeze(assets),safe:new Uint8Array(safe),dispose,get cleanupErrors(){return [...errors]}});trusted.set(result,new Uint8Array(safe));return result}catch(error){dispose();throw error}
}

export const loadBrowserLabInputs=({signal,fetcher=fetch,decode=async b=>createImageBitmap(new Blob([b]))}={})=>loadLabInputs({signal,decode,readBytes:async n=>{const r=await fetcher(new URL(n,import.meta.url),{signal});if(!r.ok)throw Error("LAB_INPUT_MISSING");return r.arrayBuffer()}});
