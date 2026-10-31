/** Geometry-only legacy codec dependency. No presentation bitmaps are retained. */
const assetModuleURL=import.meta.url;
const RESOURCE_BASE=new URL('./',assetModuleURL);
const MANIFEST_SHA='d71576611ef0e12fb98274c2dd536bb3171e9808fc2e449a8581c9a31a475b07';
const MASKS=Object.freeze({exterior:'jungle_environment_candidate_r7/R5_VISIBLE_SAFE_FLOOR.png',stairs:'interior_original_runtime/assets/stairs.png',upper:'interior_original_runtime/assets/upper.png'});
const BINS=Object.freeze({OPEN:'interior_base_composites/ground_finalR2.u8',CLOSED:'interior_base_composites/ground_closed_finalR2.u8',legacy:'legacy_ground_finalR2.u8'});
const digest=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
export async function loadLegacySupportResources({signal}={}){
 let disposed=false;const check=()=>{if(signal?.aborted)throw Error('LEGACY_SUPPORT_CANCELLED')};
 async function bytes(url,expected){check();const response=await fetch(url,{signal});if(!response.ok)throw Error('LEGACY_SUPPORT_MISSING');const b=await response.arrayBuffer();check();if(await digest(b)!==expected)throw Error('LEGACY_SUPPORT_PIN');check();return b}
 const raw=await bytes(new URL('RESOURCE_PINS.json',RESOURCE_BASE),MANIFEST_SHA),pins=JSON.parse(new TextDecoder().decode(raw));
 async function read(key){const p=pins[key];if(!p?.url||!/^[0-9a-f]{64}$/.test(p.sha256))throw Error('LEGACY_SUPPORT_KEY');return bytes(new URL(p.url,RESOURCE_BASE),p.sha256)}
 async function mask(key){const b=await read(key);let bitmap,canvas;let error;
  try{bitmap=await createImageBitmap(new Blob([b]));check();if(bitmap.width!==1536||bitmap.height!==1024)throw Error('LEGACY_SUPPORT_MASK_SIZE');canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;check();return{width:1536,height:1024,data:Uint8Array.from({length:1536*1024},(_,i)=>rgba[i*4]>127?1:0)}}catch(e){error=e;throw e}finally{let cleanupError;try{if(canvas){canvas.width=1;canvas.height=1}}catch(e){cleanupError=e}try{bitmap?.close?.()}catch(e){cleanupError??=e}if(!error&&cleanupError)throw cleanupError}
 }
 const ext=await mask(MASKS.exterior),layerMasks={stairs:await mask(MASKS.stairs),upper:await mask(MASKS.upper)},inside={},items={};
 for(const[k,key]of Object.entries(BINS)){const b=await read(key);if(b.byteLength!==4608*1024)throw Error('LEGACY_SUPPORT_BINARY_SIZE');if(k==='legacy')items[key]=b;else inside[k]={width:4608,height:1024,data:new Uint8Array(b)}}check();
function supports(layers,[x,y],state){if(disposed)return false;if(!Array.isArray(layers)||!layers.length||layers.length>2||!layers.every(k=>['ground','stairs','upper'].includes(k))||layers.length===2&&!layers.includes('stairs')||!inside[state]||!Number.isInteger(x)||!Number.isInteger(y)||x<24||y<18||x+24>=4608||y+18>=1024)return false;for(let yy=y-18;yy<=y+18;yy++)for(let xx=x-24;xx<=x+24;xx++)if(!layers.some(k=>{const m=k==='ground'?inside[state]:layerMasks[k];return xx<m.width&&yy<m.height&&m.data[yy*m.width+xx]}))return false;return true}
return{items,get pinsVerified(){return!disposed},supports,safe(scene,[x,y],state){if(disposed)return false;if(scene==='jungle-interior-r2')return supports(['ground'],[x,y],state);const m=scene==='jungle-exterior-r7'?ext:null;if(!m||!Number.isInteger(x)||!Number.isInteger(y)||x<24||y<18||x+24>=m.width||y+18>=m.height)return false;for(let yy=y-18;yy<=y+18;yy++)for(let xx=x-24;xx<=x+24;xx++)if(!m.data[yy*m.width+xx])return false;return true},dispose(){if(disposed)return;disposed=true;ext.data=new Uint8Array(0);for(const m of Object.values(layerMasks))m.data=new Uint8Array(0);for(const m of Object.values(inside))m.data=new Uint8Array(0);for(const k of Object.keys(items))delete items[k]}};
}
