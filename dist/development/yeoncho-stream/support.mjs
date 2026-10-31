import{STREAM_SCENE as R}from'./scene.mjs';
const moduleURL=import.meta.url,KEYS=['sceneId','mapId','revision','imageSHA','maskSHA','foot','facing'];
const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
const footValue=f=>{if(!Array.isArray(f)||Object.getPrototypeOf(f)!==Array.prototype||Reflect.ownKeys(f).length!==3)return null;const d=[0,1].map(i=>Object.getOwnPropertyDescriptor(f,String(i)));return d.every(x=>x?.enumerable&&Object.hasOwn(x,'value')&&Number.isSafeInteger(x.value))?d.map(x=>x.value):null};
/** Fixed mask-only codec support, NOT a visual pin receipt, native reader, warp grant, pose or save owner. */
export async function prepareYeonchoStreamSupport({signal,fetcher=fetch}={}){
 const check=()=>{if(signal?.aborted)throw Error('STREAM_SUPPORT_PREPARE_CANCELLED')};check();const response=await fetcher(new URL('./assets/bounded-safe.u8',moduleURL),{signal});if(!response.ok)throw Error('STREAM_SUPPORT_INPUT_MISSING');const raw=await response.arrayBuffer();let mask=new Uint8Array(raw instanceof ArrayBuffer?raw.slice(0):raw);check();if(mask.length!==1448*5159||await hash(mask)!==R.maskSHA)throw Error('STREAM_SUPPORT_PIN_MISMATCH');check();let disposed=false;
 const safe=foot=>{const f=footValue(foot);return!disposed&&!!f&&f[0]>=984&&f[1]>=1550&&f[0]<2432&&f[1]<6709&&mask[(f[1]-1550)*1448+f[0]-984]===1};
 const validate=n=>{if(disposed)return'STREAM_LOCAL_PRESENTATION_DISPOSED';if(!n||Object.getPrototypeOf(n)!==Object.prototype||Reflect.ownKeys(n).length!==KEYS.length||KEYS.some(k=>{const d=Object.getOwnPropertyDescriptor(n,k);return!d?.enumerable||!Object.hasOwn(d,'value')}))return'INVALID_STREAM_LOCAL_LOCATION';if(['sceneId','mapId','revision','imageSHA','maskSHA'].some(k=>n[k]!==R[k]))return'STREAM_LOCAL_LOCATION_PIN_MISMATCH';if(!['up','down','left','right'].includes(n.facing)||!safe(n.foot))return'UNSUPPORTED_STREAM_LOCAL_POSE';return true};
 return Object.freeze({supportPinsVerified:true,imageBytesVerified:false,safe,validate,dispose(){if(disposed)return;disposed=true;mask=null}});
}
