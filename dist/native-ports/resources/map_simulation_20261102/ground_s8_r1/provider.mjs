import{loadPinnedMask}from'./mask-transport.mjs';
import{CLOSED_MASK_TRANSPORT}from'./mask-transport-pin.mjs';
import{GROUND_CONTACT,contactSafe}from'../ground_contact_r2/contact-policy.mjs';
// READONLY_MAP_SIMULATION only. New traced geometry; no game authority or save integration.
const FIXED_PINS = {"revision":"NEW_REBUILD_S8_GEOMETRY_R2","assets":{"OPEN_raw":{"path":"bank/OPEN.raw.u8","sha256":"83424a3b44fc5443b0ba83fe4b9157090fbda9a8a3099a8e65a15d46074fe8f9","bytes":6635520},"OPEN_safe":{"path":"bank/OPEN.safe.u8","sha256":"f5cbdba7267f48f63324bd6e9dd628a62850b40d0738bdc48f088965e8a7c847","bytes":6635520},"CLOSED_raw":{"path":"bank/CLOSED.raw.u8","sha256":"617a378432d8c7ac710c767d370635b3f23ee6c9cfdae20cdbcad3728dce002d","bytes":6635520},"CLOSED_safe":{"path":"bank/CLOSED.safe.u8","sha256":"28a237f88fbfd62e6fc28a64e9e47119852e4ccba7fa332b9c8de43e5b3e3f28","bytes":6635520},"OPEN_art":{"path":"assets/OPEN.png","sha256":"9fed4f62c9c692d881cbdae11e39197e23e95979e2388a6387606fcfa0102c3d","bytes":13268603},"CLOSED_art":{"path":"assets/CLOSED.png","sha256":"f602c93bdee4c4bd7d08f87d9951b34515d9ffbb34769aea28a4331ffb8b5e06","bytes":13270263}}};
const fetchDefault=globalThis.fetch?.bind(globalThis);
const decodeDefault=globalThis.createImageBitmap?.bind(globalThis);
const live = new WeakSet();
export const isS8SimulationProvider = p => live.has(p) && !p.disposed;
const WIDTH=3840, HEIGHT=1728;
export async function prepareS8Hub({state,signal}={}) {
 if(state!=='OPEN'&&state!=='CLOSED')throw Error('S8_STATE');
 const guard=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};guard();
 if(!fetchDefault||!decodeDefault)throw Error('S8_DEFAULT_CAPABILITY');
 const pins=FIXED_PINS;
 if(pins.revision!=='NEW_REBUILD_S8_GEOMETRY_R2')throw Error('S8_REVISION');
 async function bytes(pin){guard();if(pin===FIXED_PINS.assets.CLOSED_raw){const exact=await loadPinnedMask(CLOSED_MASK_TRANSPORT,{base:import.meta.url,fetchImpl:fetchDefault,signal});guard();return exact.buffer;}const r=await fetchDefault(new URL('../s8_hub_r2/'+pin.path,import.meta.url),{signal});if(!r.ok)throw Error('S8_FETCH');const b=await r.arrayBuffer();const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');if(h!==pin.sha256||b.byteLength!==pin.bytes)throw Error('S8_PIN');guard();return b;}
 let bitmap=null,disposed=false;const abort=()=>dispose();
 function closeBitmap(){const b=bitmap;bitmap=null;try{b?.close();}catch{}}
 function dispose(){if(disposed)return;disposed=true;live.delete(p);signal?.removeEventListener('abort',abort);closeBitmap();}
 let p;
 try{
 const [s,b]=await Promise.all([bytes(pins.assets[state+'_raw']),bytes(pins.assets[state+'_art'])]);
 const safe=new Uint8Array(s);if(safe.length!==WIDTH*HEIGHT||safe.some(x=>x!==0&&x!==1))throw Error('S8_BINARY');
 const ih=new DataView(b);if(ih.getUint32(0)!==0x89504e47||ih.getUint32(4)!==0x0d0a1a0a||ih.getUint32(16)!==WIDTH||ih.getUint32(20)!==HEIGHT)throw Error('S8_PNG_HEADER');
 bitmap=await decodeDefault(new Blob([b],{type:'image/png'}));guard();if(bitmap.width!==WIDTH||bitmap.height!==HEIGHT)throw Error('S8_DIMENSIONS');
 const identity=Object.freeze({mapId:'world:hub:S8',revision:'NEW_S8_GROUND_CONTACT_R1',contactPolicy:GROUND_CONTACT.id,footWidth:30,footHeight:8,state,width:WIDTH,height:HEIGHT,imageSHA256:pins.assets[state+'_art'].sha256,rawFloorSHA256:pins.assets[state+'_raw'].sha256,supportRule:'NEW_IDLE30_DEPTH8_HALFOPEN_ON_PINNED_S8_R2_RAW',contactOffsetHalfOpen:GROUND_CONTACT.offsetHalfOpen,gameplayAuthority:false});
 p=Object.freeze({identity,get disposed(){return disposed||!!signal?.aborted;},safe(x,y){return !disposed&&!signal?.aborted&&contactSafe(safe,WIDTH,HEIGHT,x,y);},camera(x,y){if(disposed||signal?.aborted||!Number.isFinite(x)||!Number.isFinite(y))return null;return Object.freeze({x:Math.max(0,Math.min(2880,Math.round(x-480))),y:Math.max(0,Math.min(1188,Math.round(y-270))),width:960,height:540});},drawBase(ctx,c){if(disposed||signal?.aborted||!bitmap||!c||c.width!==960||c.height!==540||!Number.isInteger(c.x)||!Number.isInteger(c.y)||c.x<0||c.y<0||c.x>2880||c.y>1188)return false;ctx.drawImage(bitmap,c.x,c.y,960,540,0,0,960,540);return true;},dispose});
 signal?.addEventListener('abort',abort,{once:true});guard();live.add(p);return p;
 }catch(e){signal?.removeEventListener('abort',abort);closeBitmap();throw e;}
}
