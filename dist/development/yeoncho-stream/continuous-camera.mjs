// NEW bounded-stream presentation candidate. No movement, world or save authority.
// Called only after the owning loader verifies the exact floor and alpha-derived bounds.
const readFoot=f=>{if(!Array.isArray(f)||Object.getPrototypeOf(f)!==Array.prototype||Reflect.ownKeys(f).length!==3)return null;const d=[0,1].map(i=>Object.getOwnPropertyDescriptor(f,String(i)));return d.every(x=>x?.enumerable&&Object.hasOwn(x,'value')&&Number.isSafeInteger(x.value))?d.map(x=>x.value):null};
export function createStreamContinuousCamera({initialFoot,isSupportedFoot,isOpaqueOrigin,bounds}){
 if(typeof isSupportedFoot!=='function'||typeof isOpaqueOrigin!=='function'||!bounds)throw Error('PINNED_INTERNAL_SUPPORT_REQUIRED');
 const lower=Object.freeze([...bounds.lower]),upper=Object.freeze([...bounds.upper]),start=bounds.originYStart,end=bounds.originYEnd;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||lower.length!==end-start+1||upper.length!==lower.length||lower.some((x,i)=>!Number.isSafeInteger(x)||!Number.isSafeInteger(upper[i])||x>upper[i]||(i&&Math.max(Math.abs(x-lower[i-1]),Math.abs(upper[i]-upper[i-1]))>1)))throw Error('CAMERA_BOUND_SHAPE');
 let disposed=false,foot=null,origin=null;
 const pose=f=>{const v=readFoot(f);if(disposed||!v||!isSupportedFoot(v))throw Error('UNSUPPORTED_STREAM_CAMERA_FOOT');const y=Math.min(end,Math.max(start,v[1]-270)),i=y-start,x=Math.min(upper[i],Math.max(lower[i],v[0]-480)),o=[x,y];if(v[0]-x<53||v[0]-x>906||v[1]-y<90||v[1]-y>523||!isOpaqueOrigin(o))throw Error('STREAM_CAMERA_FRUSTUM_OR_ALPHA');return{v,o}};
 const reset=f=>{const{v,o}=pose(f);foot=v;origin=o;return [...o]};reset(initialFoot);
 return Object.freeze({getOrigin:()=>disposed?null:[...origin],getFoot:()=>disposed?null:[...foot],resetForSceneOrRestore:reset,trackFoot(f){const p=pose(f);const dx=p.v[0]-foot[0],dy=p.v[1]-foot[1],n=Math.abs(dx)+Math.abs(dy);if(n>240||(dx&&dy))throw Error('STREAM_CAMERA_REQUIRES_UNIT_STEP_BATCH');const staged=[];for(let i=1;i<=n;i++){const q=pose([foot[0]+Math.sign(dx)*i,foot[1]+Math.sign(dy)*i]);const prev=staged.at(-1)?.o??origin;if(Math.max(Math.abs(q.o[0]-prev[0]),Math.abs(q.o[1]-prev[1]))>1)throw Error('STREAM_CAMERA_DISCONTINUITY');staged.push(q)}foot=p.v;origin=p.o;return [...origin]},dispose(){disposed=true;foot=null;origin=null}});
}
