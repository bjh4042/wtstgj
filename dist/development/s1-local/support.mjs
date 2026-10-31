import{loadS1CompiledMask}from'../s1-compiled-masks/load.mjs';
import{S1_LOCAL_SCENE as R}from'./scene.mjs';
const moduleURL=import.meta.url,KEYS=['sceneId','mapId','revision','imageSHA','maskSHA','foot','facing'];
const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
const footValue=f=>{if(!Array.isArray(f)||Object.getPrototypeOf(f)!==Array.prototype||Reflect.ownKeys(f).length!==3)return null;const d=[0,1].map(i=>Object.getOwnPropertyDescriptor(f,String(i)));return d.every(x=>x?.enumerable&&Object.hasOwn(x,'value')&&Number.isSafeInteger(x.value))?d.map(x=>x.value):null};
/** Fixed mask-only codec support, NOT a visual pin receipt, native reader, warp grant, pose or save owner. */
export async function prepareS1Support({signal,fetcher=fetch}={}){
 const check=()=>{if(signal?.aborted)throw Error('S1_SUPPORT_PREPARE_CANCELLED')};check();let mask=await loadS1CompiledMask('local',{fetcher,signal});check();if(mask.length!==R.width*R.height||await hash(mask)!==R.maskSHA)throw Error('S1_SUPPORT_PIN_MISMATCH');check();let disposed=false;
 const safe=foot=>{const f=footValue(foot);return!disposed&&!!f&&f[0]>=0&&f[1]>=0&&f[0]<R.width&&f[1]<R.height&&mask[f[1]*R.width+f[0]]===1};
 const validate=n=>{if(disposed)return'S1_LOCAL_PRESENTATION_DISPOSED';if(!n||Object.getPrototypeOf(n)!==Object.prototype||Reflect.ownKeys(n).length!==KEYS.length||KEYS.some(k=>{const d=Object.getOwnPropertyDescriptor(n,k);return!d?.enumerable||!Object.hasOwn(d,'value')}))return'INVALID_S1_LOCAL_LOCATION';if(['sceneId','mapId','revision','imageSHA','maskSHA'].some(k=>n[k]!==R[k]))return'S1_LOCAL_LOCATION_PIN_MISMATCH';if(!['up','down','left','right'].includes(n.facing)||!safe(n.foot))return'UNSUPPORTED_S1_LOCAL_POSE';return true};
 return Object.freeze({supportPinsVerified:true,imageBytesVerified:false,safe,validate,dispose(){if(disposed)return;disposed=true;mask=null}});
}
