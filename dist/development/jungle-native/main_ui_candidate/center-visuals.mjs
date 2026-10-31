import{loadCenterVisuals}from'../../center/center-visual-loader.mjs';
/** Original pinned R4 visuals, borrowed only by the same-clock modal. */
export async function prepareCenterVisuals({signal,fetcher=globalThis.fetch,decode=async(bytes)=>createImageBitmap(new Blob([bytes]))}={}){
 const owned=new Set();let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;for(const image of owned)image.close?.();owned.clear()},check=()=>{if(disposed||signal?.aborted)throw Error('CENTER_VISUALS_CANCELLED')};
 try{check();const result=await loadCenterVisuals({read:async url=>{check();const r=await fetcher(url,{signal});if(!r.ok)throw Error('CENTER_ASSET_FETCH');const b=await r.arrayBuffer();check();return b},decode:async(bytes,url)=>{check();const image=await decode(bytes,url);owned.add(image);check();return image}});check();return Object.freeze({...result,dispose})}catch(error){dispose();throw error}
}
