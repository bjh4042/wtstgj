const assetModuleURL=import.meta.url;
import {loadSelectedLampExtensions} from './lamp_extension_candidates/load.mjs';
import {loadSelectedDoorApproach} from './door_approach_proposal/load.mjs';
import {loadSelectedLampLayers} from './lamp_layer_proposal/load.mjs';
import {PINS_SHA} from './pins.mjs';
const H='../house3/House3_Environment_Native_R1/',G='../gohyeon/runtime/',D=H+'native_house_entry_gohyeon3_env_1456/';
const sha=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function loadGohyeonInputs({fetcher=fetch,decode=async b=>createImageBitmap(new Blob([b]))}={}){
 const base=new URL('./',assetModuleURL),raw=async url=>{const r=await fetcher(url);if(!r.ok)throw Error('INPUT_MISSING '+url);return r.arrayBuffer()},p=await raw(new URL('INPUT_PINS.json',base));if(await sha(p)!==PINS_SHA)throw Error('PINS_SHA_MISMATCH');const pins=JSON.parse(new TextDecoder().decode(p)),allowed=new Map(Object.entries(pins).map(([k,v])=>[new URL(k,base).href,v]));
 const read=async path=>{const u=new URL(path,base),expected=allowed.get(u.href);if(!expected)throw Error('INPUT_NOT_PINNED');const b=await raw(u);if(await sha(b)!==expected)throw Error('INPUT_SHA_MISMATCH '+path);return b},json=async path=>JSON.parse(new TextDecoder().decode(await read(path)));
 const decoded=[],closed=new WeakSet(),dispose=()=>{for(const image of decoded)if(image&&typeof image==='object'&&!closed.has(image)){closed.add(image);image.close?.()}};const decodeAsset=async b=>{const im=await decode(b);decoded.push(im);return im};
 try{
 const contract=await json(D+'contract.json'),exterior=await json(D+contract.exteriorContract.path),inside=await json(D+contract.interiorContract.path),assets={},masks={};
 if(exterior.hub.mapId!=='world:hub:S4'||contract.canonicalMapBinding!==null||contract.worldConnected!==false)throw Error('RECOVERED_CONTRACT_SCOPE_DRIFT');
 for(const [key,x]of Object.entries(contract.sources))assets[key]=await decodeAsset(await read(D+x.path));for(const [key,x]of Object.entries(contract.actors))assets['actor:'+key]=await decodeAsset(await read(D+x.path));for(const [key,x]of Object.entries(contract.floorMasks))masks[key]=new Uint8Array(await read(D+x.path));
 for(const key of ['OPEN','CLOSED']){masks[key]=new Uint8Array(await read(key+'.safe.u8'));if(masks[key].length!==4294*2400||assets['exterior:'+key].width!==4294||assets['exterior:'+key].height!==2400)throw Error('EXTERIOR_DIMENSION_DRIFT')}
 for(const key of ['1F','2F'])if(masks[key].length!==696*464||assets[key].width!==696||assets[key].height!==464)throw Error('INTERIOR_DIMENSION_DRIFT');
 const signs=[];for(const x of exterior.signs){const image=await decodeAsset(await read(G+x.file));if(image.width!==96||image.height!==94)throw Error('SIGN_DIMENSION_DRIFT');signs.push({image,...x.contract})}
 const L=H+'gohyeon_outdoor_lighting_r2/',W=H+'gohyeon_outdoor_lighting_r1/upstream/Gohyeon_Expanded4294_River_CalmRefraction_Selected_R1/consumer/';
 const effectAssets={lightManifest:await json(L+'MANIFEST.json'),waterManifest:await json(W+'MANIFEST.json'),lightIds:new Uint32Array(await read(L+'indices.u32')),lightTransmission:new Float64Array(await read(L+'transmission.f64')),waterIds:new Uint32Array(await read(W+'indices.u32')),waterRGB:new Uint8Array(await read(W+'refraction48.rgb'))};
 const doorApproachSelection=await loadSelectedDoorApproach({fetcher,contract});
 const selectedLamps=await loadSelectedLampLayers({fetcher,lightingManifest:effectAssets.lightManifest});
 const extensions=await loadSelectedLampExtensions({fetcher,lightingManifest:effectAssets.lightManifest});
 return {doorApproachSelection,foregroundLayers:[...selectedLamps.layers,...extensions.layers],lampExtensionSelection:extensions.selection,lampSelection:selectedLamps.selection,contract,exterior,inside,assets,masks,signs,effectAssets,canonicalMapId:'world:hub:S4',dispatchConnected:false,dispose};
 }catch(e){dispose();throw e}
}

