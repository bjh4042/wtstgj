import {packCargoSafeRedToBits} from './cargo-safe-mask.mjs';
import {sha256,stableJSON} from '../compatibility/codec.mjs';
import {BRIDGE_REGISTRATION as R,BRIDGE_MANIFEST_SHA} from './cargo-bridge-registration.mjs';
const ORIGINAL='112d585497b087dff7e25569c22a2ead584c486e837595bffa39380d969a9072';
const materials=new WeakMap();
const ownBytes=value=>{if(value instanceof ArrayBuffer)return new Uint8Array(value.slice(0));if(value instanceof Uint8Array)return new Uint8Array(value);throw Error('BRIDGE_BYTE_TYPE')};
const byteHash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
const pin=p=>({...p,path:'bridge-r4/'+p.path});
const geometry={revision:R.revision,manifestSHA:BRIDGE_MANIFEST_SHA,selectionSHA:R.selection.sha256,states:Object.fromEntries(Object.entries(R.states).map(([id,s])=>[id,pin(s.safeCenters)])),isolatedForbidden:[71,872,208,909]};
export function createBridgeSelectedRegistry(base){if(sha256(stableJSON(base))!==ORIGINAL)throw Error('ORIGINAL_REGISTRY_PIN');const r=structuredClone(base);r.revision=R.revision;r.scenes.ship_bridge.geometry=structuredClone(geometry);r.scenes.ship_bridge.footCenters=pin(R.states.doors_111.safeCenters);return r;}
export function verifyBridgeRegistry(r){try{if(r.revision!==R.revision||stableJSON(r.scenes.ship_bridge.geometry)!==stableJSON(geometry)||stableJSON(r.scenes.ship_bridge.footCenters)!==stableJSON(pin(R.states.doors_111.safeCenters)))return false;const old=structuredClone(r);old.revision=R.legacyGeometry.revision;delete old.scenes.ship_bridge.geometry;old.scenes.ship_bridge.footCenters={path:'assets/ship_bridge_foot_centers.png',sha256:R.legacyGeometry.bridgeFootMaskSHA,bytes:3066};return sha256(stableJSON(old))===ORIGINAL}catch{return false}}
export function bridgeDoorState(doors){return 'doors_'+R.bitOrder.map(id=>{const d=doors?.[id];return d?.phase==='open'&&d?.progress===1?'0':'1'}).join('');}
export function bridgeAllowsPlacement(foot,purpose='movement'){if(!['movement','spawn','warp','save','npc'].includes(purpose)||!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isInteger))return false;const[x,y]=foot;return x>=0&&x<1536&&y>=0&&y<1024&&!(x>=71&&x<208&&y>=872&&y<909)}
export function isBridgeRegistrationDTO(n){return n?.revision===R.revision&&Object.hasOwn(R.states,n?.geometryState)&&n.maskSHA===R.states[n.geometryState].safeCenters.sha256&&n.geometryManifestSHA===BRIDGE_MANIFEST_SHA;}
export async function createBridgeMaterial({spec,readBytes,decodeMask,readDoors,decodeArt,dispose=()=>{}}){
 if(stableJSON(spec.geometry)!==stableJSON(geometry)||spec.art.sha256!==R.sourceImage.sha256||spec.sceneId!=='ship_bridge'||typeof readDoors!=='function'||typeof decodeArt!=='function')throw Error('BRIDGE_REGISTRATION_REQUIRED');
 const artBytes=ownBytes(await readBytes(spec.art.path));if(await byteHash(artBytes)!==R.sourceImage.sha256)throw Error('BRIDGE_IMAGE_SHA');
 const masks={};for(const[id,p]of Object.entries(geometry.states)){const bytes=ownBytes(await readBytes(p.path));if(await byteHash(bytes)!==p.sha256)throw Error('BRIDGE_MASK_SHA');const mask=await decodeMask(bytes);if(mask.width!==1536||mask.height!==1024||!(mask.data instanceof Uint8Array||mask.data instanceof Uint8ClampedArray)||mask.data.length!==1536*1024*4)throw Error('BRIDGE_MASK_DECODE');masks[id]=packCargoSafeRedToBits(mask.data);}
 // Read selection and manifest bytes too; path replay cannot substitute another selection.
 for(const[path,hash]of [['bridge-r4/ROOT_SELECTION.json',R.selection.sha256],['bridge-r4/BRIDGE_R4_RUNTIME_MANIFEST.json',BRIDGE_MANIFEST_SHA]])if(await byteHash(ownBytes(await readBytes(path)))!==hash)throw Error('BRIDGE_SELECTION_SHA');
 const art=await decodeArt(artBytes);if(!art||art.width!==1536||art.height!==1024){art?.close?.();throw Error('BRIDGE_IMAGE_DIMENSIONS')}
 let dead=false;const state=()=>bridgeDoorState(readDoors());
 const m={sceneId:'ship_bridge',artSHA256:R.sourceImage.sha256,width:1536,height:1024,art,get maskStorageBytes(){return Object.values(masks).reduce((n,a)=>n+a.byteLength,0)},get footMaskSHA256(){return geometry.states[state()].sha256},get geometryState(){return state()},geometryRevision:R.revision,geometryManifestSHA:BRIDGE_MANIFEST_SHA,isSafeFoot(foot){if(dead||!bridgeAllowsPlacement(foot))return false;const i=foot[1]*1536+foot[0];return (masks[state()][i>>>3]&(1<<(i&7)))!==0},allowsPlacement(foot,purpose){return bridgeAllowsPlacement(foot,purpose)&&m.isSafeFoot(foot)},dispose(){if(!dead){dead=true;for(const key of Object.keys(masks))delete masks[key];try{art.close?.()}finally{dispose()}}}};materials.set(m,{spec:stableJSON(spec),live:()=>!dead});return Object.freeze(m);
}
export function verifyBridgeMaterial(spec,m){const p=materials.get(m);return !!p&&p.live()&&p.spec===stableJSON(spec)&&Object.hasOwn(geometry.states,m.geometryState)&&m.footMaskSHA256===geometry.states[m.geometryState].sha256;}
