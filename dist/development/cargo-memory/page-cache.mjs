// Page-owned immutable data only. No world, material, bitmap, door or authority cache.
const own=v=>{if(v instanceof ArrayBuffer)return new Uint8Array(v.slice(0));if(v instanceof Uint8Array)return new Uint8Array(v);throw Error('CACHE_BYTES')};
const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
export function createCargoPageCache({maxBytes=80*1024*1024}={}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<0)throw Error('CACHE_LIMIT');
 const entries=new Map(),pending=new Map();let dead=false,total=0;const counts={byteLoads:0,byteHits:0,maskDecodes:0,maskHits:0};
 const live=()=>{if(dead)throw Error('CACHE_DISPOSED')};
 const keep=(key,value,size)=>{live();if(size>maxBytes)return;while(total+size>maxBytes&&entries.size){const[k,v]=entries.entries().next().value;entries.delete(k);total-=v.size}entries.set(key,{value,size});total+=size};
 const get=key=>{live();const e=entries.get(key);if(e){entries.delete(key);entries.set(key,e)}return e?.value};
 const once=async(key,load)=>{live();if(pending.has(key))return pending.get(key);const p=Promise.resolve().then(load);pending.set(key,p);try{return await p}finally{if(pending.get(key)===p)pending.delete(key)}};
 return Object.freeze({
  async readVerified(path,pin,readBytes){
   live();if(typeof path!=='string'||!pin||typeof pin.sha256!=='string'||!/^[a-f0-9]{64}$/.test(pin.sha256)||!(pin.bytes===undefined||Number.isSafeInteger(pin.bytes)&&pin.bytes>=0))throw Error('CACHE_PIN');
   const sha=pin.sha256,bytes=pin.bytes,key='b:'+path+':'+sha+':'+String(bytes);let value=get(key);
   if(value)counts.byteHits++;else value=await once(key,async()=>{counts.byteLoads++;const b=own(await readBytes(path));live();if(bytes!==undefined&&b.length!==bytes||await hash(b)!==sha)throw Error('CARGO_RESOURCE_PIN:'+path);live();keep(key,b,b.byteLength);return b});
   live();return own(value);
  },
  async decodeSupport(input,decodeMask){
   live();const bytes=own(input),sha=await hash(bytes);live();const key='m:'+sha;let value=get(key);
   if(value)counts.maskHits++;else value=await once(key,async()=>{counts.maskDecodes++;const m=await decodeMask(bytes);live();if(!Number.isSafeInteger(m?.width)||!Number.isSafeInteger(m?.height)||m.width<1||m.height<1||m.width*m.height>16777216||!(m.data instanceof Uint8Array||m.data instanceof Uint8ClampedArray)||m.data.length!==m.width*m.height*4)throw Error('CACHE_MASK');const bits=new Uint8Array(Math.ceil(m.width*m.height/8));for(let i=0;i<m.width*m.height;i++)if(m.data[i*4]===255)bits[i>>>3]|=1<<(i&7);const packed={width:m.width,height:m.height,bits};keep(key,packed,bits.byteLength);return packed});
   live();const data=new Uint8ClampedArray(value.width*value.height*4);for(let i=0;i<value.width*value.height;i++)if(value.bits[i>>>3]&(1<<(i&7)))data[i*4]=255;
   return{width:value.width,height:value.height,data};
  },
  stats(){return Object.freeze({...counts,storedBytes:total,entries:entries.size,pending:pending.size,disposed:dead})},
  dispose(){if(dead)return;dead=true;entries.clear();pending.clear();total=0}
 });
}
