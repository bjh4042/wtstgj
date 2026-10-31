import {GYM4_ASSET_MANIFEST_SHA} from './asset-pins.mjs';
const assetModuleURL=import.meta.url;
const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
export async function loadGym4Inputs({fetcher=fetch,decode=b=>createImageBitmap(new Blob([b])),signal}={}){
 const base=new URL('./',assetModuleURL),images=[],closed=new WeakSet(),cleanupErrors=[];let disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;for(const im of images)if(!closed.has(im)){closed.add(im);try{im.close?.()}catch(error){cleanupErrors.push(String(error?.message??error))}}};
 const check=()=>{if(disposed||signal?.aborted)throw Error('GYM4_PREPARE_ABORTED')};
 const raw=async p=>{check();const r=await fetcher(new URL(p,base),{signal});if(!r.ok)throw Error('GYM4_ASSET_MISSING');const b=new Uint8Array(await r.arrayBuffer());const owned=new Uint8Array(b);check();return owned};
 try{const bytes=await raw('ASSET_PINS.json');if(await sha(bytes)!==GYM4_ASSET_MANIFEST_SHA)throw Error('GYM4_MANIFEST_PIN');check();const pins=JSON.parse(new TextDecoder().decode(bytes)),result={};
 for(const [key,p]of Object.entries(pins)){const b=await raw(p.path);if(b.length!==p.bytes||await sha(b)!==p.sha256)throw Error('GYM4_ASSET_PIN');check();if(p.kind==='image'){const im=await decode(b);images.push(im);check();if(im.width!==p.dimensions[0]||im.height!==p.dimensions[1])throw Error('GYM4_ASSET_DIMENSION');result[key]=im}else if(p.kind==='mask'){if(b.length!==1448*1086||b.some(v=>v!==0&&v!==1))throw Error('GYM4_MASK_SHAPE');result[key]=b}else result[key]=JSON.parse(new TextDecoder().decode(b));}
 check();return Object.freeze({...result,get cleanupErrors(){return [...cleanupErrors]},dispose});
 }catch(error){dispose();throw error}
}
