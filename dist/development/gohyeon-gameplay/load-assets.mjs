import{ASSETS}from'./asset-index.mjs';
const assetModuleURL=import.meta.url;
export function createS4GameplayAssetReader({fetcher=fetch,signal}={}){return async pin=>{const p=ASSETS[pin?.path];if(!p||p.sha256!==pin.sha256||p.bytes!==pin.bytes)throw Error('UNREGISTERED_GAMEPLAY_ASSET');if(signal?.aborted)throw Error('GAMEPLAY_ASSETS_ABORTED');const response=await fetcher(new URL(p.path,new URL('./',assetModuleURL)),{signal});if(!response.ok)throw Error('GAMEPLAY_ASSET_MISSING');const b=await response.arrayBuffer();return b instanceof ArrayBuffer?new Uint8Array(b.slice(0)):new Uint8Array(b)}}
