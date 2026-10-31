// Resolve raw pinned asset roots at runtime; do not let Vite rewrite directory URLs.
const assetModuleURL=import.meta.url;
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
export async function loadCenterVisuals({read,decode}={}) {
 if(typeof read!=='function'||typeof decode!=='function')throw Error('CENTER_VISUAL_LOADERS_REQUIRED');
 const raw=await read(new URL('./ART_PINS.json',assetModuleURL));if(await hash(raw)!=='7cc7b7c820d3eb3476c00a5212cf9c1330bf829ef8630c274a2f264c53278a15')throw Error('CENTER_PINSET_MISMATCH');const pins=JSON.parse(new TextDecoder().decode(raw));
 const bytes=async path=>{const b=await read(new URL(path,assetModuleURL));if(await hash(b)!==pins[path])throw Error('CENTER_ART_HASH_MISMATCH:'+path);return b;};
 const layout=JSON.parse(new TextDecoder().decode(await bytes('approved-animation/layout.json'))),assets={};
 for(const key of ['room','doctor','foreground']){const path='approved-animation/assets/'+key+'.png';assets[key]=await decode(await bytes(path),new URL(path,assetModuleURL));}
 const ballPath='approved-animation/'+layout.ballAsset.path;assets.ball=await decode(await bytes(ballPath),new URL(ballPath,assetModuleURL));
 if(assets.room.width!==768||assets.room.height!==576)throw Error('CENTER_ART_SIZE_MISMATCH');
 return {assets,layout};
}
