import{S1_FIXED_REGISTRATION as R,S1_DISABLED_STREAM_CHOICE as D}from'./fixed-registration.mjs';
const ret=R[1],keys=['sceneId','mapId','revision','imageSHA','maskSHA','foot','facing'];
/** UI descriptions only, never a capability/grant. Owner separately verifies current provider/world/epoch. */
export function listS1ExitChoices(location){
 if(!location||Object.getPrototypeOf(location)!==Object.prototype||Reflect.ownKeys(location).length!==keys.length||keys.some(k=>{const d=Object.getOwnPropertyDescriptor(location,k);return!d?.enumerable||!Object.hasOwn(d,'value')}))return Object.freeze([]);
 if(['sceneId','mapId','revision','imageSHA','maskSHA'].some(k=>location[k]!==ret[k])||location.facing!==ret.facing)return Object.freeze([]);
 const f=location.foot;if(!Array.isArray(f)||Object.getPrototypeOf(f)!==Array.prototype||Reflect.ownKeys(f).length!==3)return Object.freeze([]);const ds=[0,1].map(i=>Object.getOwnPropertyDescriptor(f,String(i)));if(ds.some(d=>!d?.enumerable||!Object.hasOwn(d,'value')||!Number.isSafeInteger(d.value)))return Object.freeze([]);const[x,y]=ds.map(d=>d.value),inside=rows=>rows.some(([yy,a,b])=>y===yy&&x>=a&&x<b),choices=[];
 if(inside(ret.approach.rows))choices.push(Object.freeze({pointId:ret.pointId,label:'장승포로 돌아가기',enabled:true}));
 if(inside(D.rows))choices.push(Object.freeze({pointId:D.pointId,label:D.label,enabled:false,reason:D.reason}));
 return Object.freeze(choices);
}
