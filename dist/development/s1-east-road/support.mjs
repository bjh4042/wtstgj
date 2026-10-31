import{S1_EAST_ROAD as R}from'./registration.mjs';
const dirs=['up','down','left','right'],keys=['sceneId','mapId','revision','imageSHA','maskSHA','foot','facing'];
const digest=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
function foot(f){if(!Array.isArray(f)||Object.getPrototypeOf(f)!==Array.prototype||Reflect.ownKeys(f).length!==3||Object.getOwnPropertyDescriptor(f,'length')?.value!==2)return null;const a=[0,1].map(i=>Object.getOwnPropertyDescriptor(f,''+i));return a.every(d=>d?.enumerable&&Object.hasOwn(d,'value')&&Number.isSafeInteger(d.value))?a.map(d=>d.value):null}
function record(o){if(!o||Object.getPrototypeOf(o)!==Object.prototype||Reflect.ownKeys(o).length!==keys.length)return null;const r={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(o,k);if(!d?.enumerable||!Object.hasOwn(d,'value'))return null;r[k]=d.value}return r}
// Mask-only support. No image decoding, presentation, world clock, save or authority grants.
export async function prepareS1EastRoadSupport({signal,fetcher=fetch}={}){
 let disposed=false;const rows=new Map(),check=()=>{if(disposed||signal?.aborted)throw Error('S1_EAST_ROAD_SUPPORT_ABORTED')};check();const response=await fetcher(new URL(R.rowsPath,import.meta.url),{signal});if(!response.ok)throw Error('S1_EAST_ROAD_SUPPORT_HTTP');const bytes=await response.arrayBuffer();check();if(await digest(bytes)!==R.rowsSHA)throw Error('S1_EAST_ROAD_SUPPORT_PIN');check();const parsed=JSON.parse(new TextDecoder().decode(bytes));if(!Array.isArray(parsed))throw Error('S1_EAST_ROAD_SUPPORT_ROWS');let lastY=-1,lastEnd=-1;for(const r of parsed){if(!Array.isArray(r)||r.length!==3||!r.every(Number.isSafeInteger))throw Error('S1_EAST_ROAD_SUPPORT_ROW');const[y,a,b]=r;if(y<0||y>=R.height||a<0||a>=b||b>R.width||y<lastY||y===lastY&&a<lastEnd)throw Error('S1_EAST_ROAD_SUPPORT_RANGE');if(!rows.has(y))rows.set(y,[]);rows.get(y).push([a,b]);lastY=y;lastEnd=b}
 const dispose=()=>{if(disposed)return;disposed=true;rows.clear();signal?.removeEventListener('abort',dispose)};signal?.addEventListener('abort',dispose,{once:true});if(signal?.aborted){dispose();throw Error('S1_EAST_ROAD_SUPPORT_ABORTED')}
 const safe=f=>{const p=foot(f);return!disposed&&!!p&&p[0]>=0&&p[0]<R.width&&p[1]>=0&&p[1]<R.height&&!!rows.get(p[1])?.some(([a,b])=>p[0]>=a&&p[0]<b)};
 const describe=(f,facing)=>{const p=foot(f);if(!p||!dirs.includes(facing)||!safe(p))throw Error('S1_EAST_ROAD_POSE_SUPPORT');return{sceneId:R.sceneId,mapId:R.mapId,revision:R.revision,imageSHA:R.imageSHA,maskSHA:R.maskSHA,foot:[...p],facing}};
 // One explicit prior geometry only. Old pins cannot authorize newly added ground.
 const legacy={"sceneId":"native:yeoncho:local","mapId":"world:hub:S1","revision":"NEW_REBUILD_S1_EAST_ROAD_RELAXED_CONTACT_R3","imageSHA":"9309737253c4f43393162ab6b8ba9b316cb4f32ba030c9630e9c8ae01f152357","maskSHA":"a6c629bd8dc3f1a8c1361e73643db186fe62ae710c49d5c4cd29b58a87ea1909"};
 const added=f=>f[0]>=4421&&f[0]<4501&&f[1]>=1007&&f[1]<1027;
 const validate=p=>{const q=record(p);if(!q||!dirs.includes(q.facing)||!safe(q.foot))return false;return keys.slice(0,5).every(k=>q[k]===R[k])||keys.slice(0,5).every(k=>q[k]===legacy[k])&&!added(q.foot)};
 return Object.freeze({registration:R,get supportPinsVerified(){return!disposed},safe,describe,validate,dispose});
}
