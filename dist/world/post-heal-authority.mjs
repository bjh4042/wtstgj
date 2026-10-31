// Trusted host construction API, not a user-input validation callback.
// Exact checked-in registration only. UI requests cannot choose geometry or identity.
const authorities=new WeakMap(),grants=new WeakMap();
export const POST_HEAL_REGISTRATION=Object.freeze({sceneId:'world:hub:POST',mapId:'world:hub:POST',revision:'POST_NATIVE_2SCENE_DEV_R1:hub',version:1,imageSHA:'29e0513d5d7ed29ba72badb58a4082a0e594853a07ae8e197a6e33e01d6e53f8',pointId:'heal:POST',anchor:Object.freeze([465,377]),range:48});
// Exact intersection of pinned safe49Rows with anchor Manhattan <=48.
// 169 integer feet: y=413..425, x=465 +/- (425-y).
function safeApproach(foot){return Array.isArray(foot)&&foot.length===2&&foot.every(Number.isInteger)&&foot[1]>=413&&foot[1]<=425&&Math.abs(foot[0]-465)<=425-foot[1];}
export function createPostHealAuthority({readNative}={}){if(typeof readNative!=='function')throw Error('NATIVE_HOST_READER_REQUIRED');const authority=Object.freeze({});authorities.set(authority,readNative);return authority;}
export function isPostHealAuthority(authority){return authorities.has(authority);}
function verify(authority,world,pointId){
 const read=authorities.get(authority),r=POST_HEAL_REGISTRATION;if(!read||pointId!==r.pointId)return false;
 const s=world.snapshot(),p=world.definition.points[pointId],n=read();
 if(!p||p.id!==r.pointId||p.kind!=='heal'||p.mapId!==r.mapId||p.hubId!=='CENTER:POST'||p.x!==5||p.y!==12||s.position.scene!==r.mapId||s.world?.mapId!==r.mapId)return false;
 return !!n&&['sceneId','mapId','revision','version','imageSHA'].every(k=>n[k]===r[k])&&n.phase==='field'&&safeApproach(n.foot);
}
export function mintPostHealGrant(authority,world,pointId){if(!verify(authority,world,pointId))throw Error('NATIVE_HEAL_AUTHORITY_REJECTED');const token=Object.freeze({});grants.set(token,{authority,world,pointId});return token;}
export function validatePostHealGrant(token,world,s,pointId){const g=grants.get(token);return !!g&&g.world===world&&g.pointId===pointId&&s.position.scene===POST_HEAL_REGISTRATION.mapId&&s.world?.mapId===POST_HEAL_REGISTRATION.mapId&&verify(g.authority,world,pointId);}
export function revokePostHealGrant(token){grants.delete(token);}
