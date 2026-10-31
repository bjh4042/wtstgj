// Explicit movement-only extension. Original ground material is never relabelled.
import {verifySevenSceneMaterial} from '../../world/cargo-seven-scene-geometry.mjs';
const owned=new WeakMap();
const ownBytes=x=>x instanceof ArrayBuffer?new Uint8Array(x.slice(0)):x instanceof Uint8Array?new Uint8Array(x):null;
const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
// Filled only after root exact-layer selection; no caller supplied pinset.
const PINS={"UPPER_SAFE49x37.png": "5e224f32fe7a9bf5e6a022feeb29943cc7ba9f3f2269b57fdba0c7a56b55c447", "LAYER_CONTRACT.json": "cc53471141673f0ad6159158092679f1d5f115ed7580754760c252cb6b32d120", "ROOT_RUNTIME_SELECTION.json": "37609d3c0b01fc5f8a10dacad5d96ff711e362d9cf2baef0a0a1f8704f521989"};
export async function loadEngineUpperLayer({readBytes,decodeMask}){
 const values={};for(const[path,pin]of Object.entries(PINS)){const b=ownBytes(await readBytes('engine-upper-r1/'+path));if(!b||await hash(b)!==pin)throw Error('ENGINE_UPPER_PIN');values[path]=b}
 const contract=JSON.parse(new TextDecoder().decode(values['LAYER_CONTRACT.json'])),selection=JSON.parse(new TextDecoder().decode(values['ROOT_RUNTIME_SELECTION.json']));if(selection.status!=='ROOT_SELECTED_EXACT_LAYER_AND_RAILING')throw Error('ENGINE_UPPER_NOT_SELECTED');
 const mask=await decodeMask(values['UPPER_SAFE49x37.png']);if(mask.width!==1536||mask.height!==1024||mask.data.length!==1536*1024*4)throw Error('ENGINE_UPPER_MASK');const bits=new Uint8Array(1536*1024/8);for(let i=0;i<1536*1024;i++)if(mask.data[i*4]===255)bits[i>>>3]|=1<<(i&7);
 const authority=Object.freeze({revision:contract.revision});owned.set(authority,{contract,bits});return authority;
}
export const isEngineUpperLayer=a=>owned.has(a);
export function engineUpperContains(a,sceneId,foot){const o=owned.get(a);if(!o||sceneId!=='ship_engine'||!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isInteger)||foot[0]<0||foot[1]<0||foot[0]>=1536||foot[1]>=1024)return false;const i=foot[1]*1536+foot[0];return !!(o.bits[i>>>3]&(1<<(i&7)))}
export function engineLayerSnapshot(a,sceneId,foot){const o=owned.get(a);if(!o||sceneId!=='ship_engine')return null;return {revision:o.contract.revision,sourceImageSHA:o.contract.imageSHA,maskSHA:o.contract.safe.sha256,layer:engineUpperContains(a,sceneId,foot)&&foot[1]<230?'upper':'ground',allowedPurposes:['movement'],spawnWarpSaveNPC:false}}
export function canEngineLayerStep(a,spec,material,from,to){const o=owned.get(a);if(!o||spec?.sceneId!=='ship_engine'||spec.art.sha256!==o.contract.imageSHA||!verifySevenSceneMaterial(spec,material)||![from,to].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger))||Math.abs(from[0]-to[0])+Math.abs(from[1]-to[1])>1)return false;return [from,to].every(p=>material.isSafeFoot(p)||engineUpperContains(a,spec.sceneId,p))}
export function drawEngineUpperForeground(a,ctx,spec,material,foot){const o=owned.get(a);if(!o||!verifySevenSceneMaterial(spec,material)||engineLayerSnapshot(a,spec.sceneId,foot)?.layer!=='upper'||foot[1]>164)return false;ctx.save();ctx.beginPath();for(const polygon of o.contract.railings.polygons){ctx.moveTo(...polygon[0]);for(const p of polygon.slice(1))ctx.lineTo(...p);ctx.closePath()}ctx.clip();ctx.drawImage(material.art,0,0);ctx.restore();return true}
export function engineSideStairNotice(a,sceneId,foot,direction){if(!owned.has(a)||sceneId!=='ship_engine'||direction!=='up')return null;return foot[1]>=230&&foot[1]<=260&&([640,895].some(x=>Math.abs(foot[0]-x)<=38))?'측면 계단 점검 중 — 중앙 계단을 이용해 주세요.':null}
export function disposeEngineUpperLayer(a){const o=owned.get(a);if(o){o.bits.fill(0);owned.delete(a)}}
