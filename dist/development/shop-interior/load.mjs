import {SHOP_ASSET_PINS as P} from './asset-pins.mjs';
import {SHOP_CONTRACT as C} from './fixed-contract.mjs';
const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
export async function loadShopInteriorInputs({fetcher=fetch,decode=b=>createImageBitmap(new Blob([b])),signal}={}){
 const decoded=new Set(),cleanupErrors=[];let disposed=false;const check=()=>{if(signal?.aborted)throw Error('SHOP_LOAD_ABORTED')},cleanup=()=>{const pending=[...decoded];decoded.clear();for(const i of pending)try{i.close?.()}catch(e){cleanupErrors.push(e)}};
 const read=async(path,pin)=>{check();const r=await fetcher(new URL(path,import.meta.url),{signal});if(!r.ok)throw Error('SHOP_INPUT_MISSING');const b=new Uint8Array(await r.arrayBuffer());check();if(b.length!==pin.bytes||await sha(b)!==pin.sha256)throw Error('SHOP_INPUT_PIN');return b};
 try{const safe=await read('./public_safe.u8',C.pins['public_safe.u8']),assets={};for(const [key,name,w,h]of [['room','room.png',1448,1086],['cashier','cashier.png',256,256]]){const b=await read('./assets/'+name,P[name]),im=await decode(b);decoded.add(im);check();if(im.width!==w||im.height!==h)throw Error('SHOP_IMAGE_DIMENSIONS');assets[key]=im}return Object.freeze({safe,assets,cleanupErrors,get disposed(){return disposed},dispose(){if(disposed)return;disposed=true;cleanup()}})}catch(e){cleanup();throw e}
}
