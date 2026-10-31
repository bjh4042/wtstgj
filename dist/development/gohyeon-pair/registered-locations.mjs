// Fixed S4 pair candidate only. No arbitrary registration, storage or actor placement.
import {FIXED_REGISTRATION} from './fixed-registration.mjs';
const fields=['version','sceneId','mapId','mapRevision','imageSHA','maskSHA','foot','facing','retainedHubState'];
const sha=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
const data=(o,k)=>{const d=Object.getOwnPropertyDescriptor(o,k);return d&&Object.hasOwn(d,'value')&&d.enumerable?d:null};
const pins=[];for(const r of FIXED_REGISTRATION){if(pins.some(p=>p.mapId===r.mapId))continue;for(const [state,p] of Object.entries(r.states??{FIXED:r}))pins.push(Object.freeze({mapId:r.mapId,revision:r.revision,width:r.width,height:r.height,state,imageSHA:p.imageSHA,maskSHA:p.maskSHA}))}
export async function createS4FixedLocationRegistry({hubOpenMask,hubClosedMask,greenbeltMask,parkMask}){
 // Own ALL bytes before the first asynchronous digest.
 const supplied=[hubOpenMask,hubClosedMask,parkMask,greenbeltMask];
 const owned=supplied.map(b=>{if(!(b instanceof Uint8Array))throw Error('MASK_BYTES_REQUIRED');return new Uint8Array(b)});
 const masks=new Map();for(let i=0;i<pins.length;i++){const p=pins[i],b=owned[i];if(b.length!==p.width*p.height||await sha(b)!==p.maskSHA)throw Error('EXACT_SELECTED_MASK_REQUIRED');masks.set(p.maskSHA,b)}
 function validate(n){
  if(!n||Object.getPrototypeOf(n)!==Object.prototype||Reflect.ownKeys(n).length!==fields.length||fields.some(k=>!data(n,k)))return 'INVALID_LOCATION_SCHEMA';
  if(n.version!==1)return 'UNKNOWN_NATIVE_VERSION';if(!['OPEN','CLOSED'].includes(n.retainedHubState))return 'UNKNOWN_RETAINED_HUB_STATE';const candidates=pins.filter(p=>p.mapId===n.sceneId);if(!candidates.length)return 'UNKNOWN_NATIVE_SCENE';
  if(n.mapId!==n.sceneId)return 'NATIVE_MAP_MISMATCH';if(!candidates.some(p=>p.revision===n.mapRevision))return 'UNKNOWN_MAP_REVISION';
  const p=candidates.find(p=>p.revision===n.mapRevision&&p.imageSHA===n.imageSHA&&p.maskSHA===n.maskSHA);if(!p)return 'NATIVE_PIN_MISMATCH';if(p.mapId==='world:hub:S4'&&p.state!==n.retainedHubState)return 'RETAINED_HUB_PIN_MISMATCH';
  if(!['up','down','left','right'].includes(n.facing))return 'INVALID_FACING';
  const f=n.foot;if(!Array.isArray(f)||f.length!==2||Reflect.ownKeys(f).length!==3||[0,1].some(i=>!data(f,String(i))||!Number.isSafeInteger(data(f,String(i)).value)))return 'INVALID_FOOT';
  const[x,y]=f;if(x<0||y<0||x>=p.width||y>=p.height||masks.get(p.maskSHA)[y*p.width+x]!==1)return 'UNSUPPORTED_FOOT';return null;
 }
 return Object.freeze({validate,describe(id,retainedHubState){if(!['OPEN','CLOSED'].includes(retainedHubState))throw Error('RETAINED_HUB_STATE_REQUIRED');const state=id==='world:hub:S4'?retainedHubState:'FIXED';const p=pins.find(p=>p.mapId===id&&p.state===state);if(!p)throw Error('UNKNOWN_NATIVE_SCENE');return {version:1,sceneId:id,mapId:id,mapRevision:p.revision,imageSHA:p.imageSHA,maskSHA:p.maskSHA,retainedHubState}}});
}
