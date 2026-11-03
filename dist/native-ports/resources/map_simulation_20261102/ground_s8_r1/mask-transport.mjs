// Runtime-only bounded lossless transport. No geometry generator or offline QA imports.
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');
export async function readBoundedStream(stream,bytes,{signal}={}){
 if(!stream?.getReader||!Number.isSafeInteger(bytes)||bytes<0)throw Error('INTERIOR_STREAM');const reader=stream.getReader(),out=new Uint8Array(bytes);let used=0,aborted=false;const abort=()=>{aborted=true;reader.cancel('ABORT').catch(()=>{})};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{while(true){if(aborted)throw Error('AD_SUPPORT_ABORTED');const r=await reader.read();if(aborted)throw Error('AD_SUPPORT_ABORTED');if(r.done)break;if(!(r.value instanceof Uint8Array)||used+r.value.length>bytes)throw Error('INTERIOR_OVERRUN');out.set(r.value,used);used+=r.value.length}if(used!==bytes)throw Error('INTERIOR_SIZE');return out}catch(e){out.fill(0);await reader.cancel().catch(()=>{});throw e}finally{signal?.removeEventListener('abort',abort);reader.releaseLock()}
}
export async function verifyBytes(bytes,sha,{signal}={}){if(signal?.aborted)throw Error('AD_SUPPORT_ABORTED');if(await hash(bytes)!==sha)throw Error('AD_INPUT_PIN');if(signal?.aborted)throw Error('AD_SUPPORT_ABORTED');return bytes}
export async function decodeGzipBounded(gzip,bytes,sha,{signal}={}){
 if(typeof DecompressionStream!=='function')throw Error('INTERIOR_GZIP_UNAVAILABLE');const decoded=await readBoundedStream(new Blob([gzip]).stream().pipeThrough(new DecompressionStream('gzip')),bytes,{signal});try{return await verifyBytes(decoded,sha,{signal})}catch(e){decoded.fill(0);throw e}
}
export async function loadPinnedMask(pin,{base,fetchImpl,signal}={}){
 if(signal?.aborted)throw Error('AD_SUPPORT_ABORTED');
 const compressed=typeof DecompressionStream==='function';const response=await fetchImpl(new URL(compressed?pin.gzipPath:pin.rawPath,base),{signal});if(!response.ok)throw Error('AD_INPUT_MISSING');const data=await readBoundedStream(response.body,compressed?pin.gzipBytes:pin.bytes,{signal});try{await verifyBytes(data,compressed?pin.gzipSHA256:pin.sha256,{signal});if(!compressed)return data;return await decodeGzipBounded(data,pin.bytes,pin.sha256,{signal})}catch(e){data.fill(0);throw e}finally{if(compressed)data.fill(0)}
}
