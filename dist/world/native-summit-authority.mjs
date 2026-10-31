import {SUMMIT_REGISTRATION as R,nativeSummitGuard} from './summit-native-guard.mjs';
const authorities=new WeakMap(),grants=new WeakMap();
export function createNativeSummitAuthority({readNative}={}){if(typeof readNative!=='function')throw Error('NATIVE_HOST_READER_REQUIRED');const a=Object.freeze({});authorities.set(a,readNative);return a}
export const isNativeSummitAuthority=a=>authorities.has(a);
export function isNativeSummitRequest(id,a){return !!a&&Object.getPrototypeOf(a)===Object.prototype&&Reflect.ownKeys(a).length===1&&Object.hasOwn(a,'type')&&Object.hasOwn(Object.getOwnPropertyDescriptor(a,'type'),'value')&&((id===R.battle.pointId&&a.type==='battle')||(id===R.return.pointId&&a.type==='return'))}
function verify(a,w,id,type){
 const read=authorities.get(a);if(!read||!isNativeSummitRequest(id,{type}))return false;
 const s=w.snapshot(),d=w.definition,p=d.points[id];if(s.position.scene!==R.mapId||s.world?.mapId!==R.mapId||!p||p.mapId!==R.mapId||!nativeSummitGuard(read(),id,type))return false;
 if(type==='return')return p.kind==='warp'&&p.x===2&&p.y===12&&p.targetMapId===R.return.canonicalTargetMapId&&p.target?.length===2&&p.target[0]===33&&p.target[1]===7&&p.gate==null;
 const actors=d.maps[R.mapId]?.actors?.filter(x=>x.npcId==='NPC_POST_YEJI'&&x.eventId==='YEJI_FINAL')??[];
 return p.kind==='yeji-final'&&p.x===24&&p.y===8&&p.npcId==='NPC_POST_YEJI'&&p.eventId==='YEJI_FINAL'&&p.gate==='CAN_BATTLE_YEJI_FINAL'&&d.eventBindings.YEJI_FINAL===id&&d.trainerBindings.YEJI_FINAL===id&&actors.length===1&&actors[0].pointId===id&&!w.story.eventCompleted('YEJI_FINAL')&&w.story.eventAvailable('YEJI_FINAL')&&w.story.trainerAvailable('YEJI_FINAL')&&w.story.gate(p.gate);
}
export function mintNativeSummitGrant(a,w,id,type){if(!verify(a,w,id,type))throw Error('NATIVE_SUMMIT_AUTHORITY_REJECTED');const token=Object.freeze({});grants.set(token,{a,w,id,type});return token}
export function validateNativeSummitGrant(token,w,s,id,type){const g=grants.get(token);return !!g&&g.w===w&&g.id===id&&g.type===type&&s.position.scene===R.mapId&&s.world?.mapId===R.mapId&&verify(g.a,w,id,type)}
export function revokeNativeSummitGrant(token){grants.delete(token)}
