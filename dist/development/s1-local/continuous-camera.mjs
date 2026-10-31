// NEW root-selected local presentation only. This module grants no movement, warp or save permission.
// Host supplies privately pinned local114480 support and opaque-origin predicates; never public UI inputs.
const readFoot=f=>{if(!Array.isArray(f)||Object.getPrototypeOf(f)!==Array.prototype||Reflect.ownKeys(f).length!==3)return null;const d=[0,1].map(i=>Object.getOwnPropertyDescriptor(f,''+i));return d.every(x=>x?.enumerable&&Object.hasOwn(x,'value')&&Number.isSafeInteger(x.value))?d.map(x=>x.value):null};
export function createS1ContinuousLocalCamera({initialFoot,isSupportedFoot,isSupportedOrigin}){
 if(typeof isSupportedFoot!=='function'||typeof isSupportedOrigin!=='function')throw Error('PINNED_SUPPORT_REQUIRED');let disposed=false,foot=null,origin=null;
 const pose=f=>{const v=readFoot(f);if(disposed||!v||!isSupportedFoot(v))throw Error('UNSUPPORTED_S1_LOCAL_CAMERA_FOOT');const o=[1044,v[1]-270];if(o[1]<693||o[1]>1430||v[0]-o[0]<53||v[0]-o[0]>906||!isSupportedOrigin(o))throw Error('S1_LOCAL_CAMERA_FRUSTUM');return{v,o}};
 const reset=f=>{const{v,o}=pose(f);foot=v;origin=o;return[...origin]};reset(initialFoot);
 return Object.freeze({getOrigin:()=>disposed?null:[...origin],getFoot:()=>disposed?null:[...foot],trackFoot(f){const{v,o}=pose(f);if(Math.abs(v[0]-foot[0])+Math.abs(v[1]-foot[1])>16)throw Error("S1_CAMERA_REQUIRES_SCENE_RESET");const step=Math.sign(o[1]-origin[1]);for(let y=origin[1];step&&y!==o[1];y+=step)if(v[1]-y<90||v[1]-y>523||!isSupportedOrigin([1044,y]))throw Error('S1_LOCAL_CAMERA_OPAQUE_GAP');foot=v;origin=o;return[...origin]},resetForSceneOrRestore:reset,dispose(){disposed=true;foot=null;origin=null}})
}
