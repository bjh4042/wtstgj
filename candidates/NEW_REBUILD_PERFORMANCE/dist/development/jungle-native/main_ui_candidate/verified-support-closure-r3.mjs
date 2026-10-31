const assetModuleURL=import.meta.url;
const base=new URL('./',assetModuleURL),PIN='36752c7794b6c3559df799faeebc6b9e8e4e1e16fe712a709940f1bbf7a02f3a';
const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
export async function verifySupportClosure(name,{signal,fetcher=fetch,retain=()=>false}={}){
 const check=()=>{if(signal?.aborted)throw Object.assign(Error('SUPPORT_CANCELLED'),{name:'AbortError'})};
 const read=async url=>{check();const r=await fetcher(url,{signal});if(!r.ok)throw Error('SUPPORT_INPUT_MISSING');const b=new Uint8Array(await r.arrayBuffer());check();return b};
 const mb=await read(new URL('SUPPORT_CLOSURE_R3.json',base));if(await hash(mb)!==PIN)throw Error('SUPPORT_CLOSURE_PIN');const rows=JSON.parse(new TextDecoder().decode(mb)).providers[name];if(!rows)throw Error('SUPPORT_PROVIDER');const kept=new Map;
 for(const p of rows){const url=new URL(p.url,base),b=await read(url);if(b.byteLength!==p.bytes||await hash(b)!==p.sha256)throw Error('SUPPORT_BYTE_PIN '+p.url);check();if(retain(url))kept.set(url.href,b);}
 return url=>{const b=kept.get(String(url));if(!b)throw Error('SUPPORT_RETAIN_MISSING '+url);return b};
}
