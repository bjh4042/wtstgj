// Separate, exact POST shop purchase authority. Does not widen heal authority.
const authorities=new WeakMap(),grants=new WeakMap();
export const POST_SHOP_REGISTRATION=Object.freeze({sceneId:'world:hub:POST',mapId:'world:hub:POST',revision:'POST_NATIVE_2SCENE_DEV_R1:hub',version:1,imageSHA:'29e0513d5d7ed29ba72badb58a4082a0e594853a07ae8e197a6e33e01d6e53f8',pointId:'shop:POST',anchor:Object.freeze([1095,377]),range:48});
// Entire exact safe49-mask intersection: 529 integer foot positions.
const near=foot=>Array.isArray(foot)&&foot.length===2&&foot.every(Number.isInteger)&&foot[1]>=403&&foot[1]<=425&&Math.abs(foot[0]-1095)<=425-foot[1];
export function createPostShopAuthority({readNative}={}){if(typeof readNative!=='function')throw Error('NATIVE_SHOP_READER_REQUIRED');const a=Object.freeze({});authorities.set(a,readNative);return a;}
export const isPostShopAuthority=a=>authorities.has(a);
export function isNativeShopRequest(a){const keys=['type','itemId','quantity','transactionId'];if(!a||Object.getPrototypeOf(a)!==Object.prototype||Reflect.ownKeys(a).length!==keys.length||keys.some(k=>!Object.hasOwn(Object.getOwnPropertyDescriptor(a,k)??{},'value')))return false;return a.type==='purchase'&&typeof a.itemId==='string'&&!!a.itemId&&Number.isSafeInteger(a.quantity)&&a.quantity>=1&&a.quantity<=9999&&typeof a.transactionId==='string'&&!!a.transactionId.trim()&&a.transactionId.length<=160;}
function verify(a,w,id){const read=authorities.get(a),r=POST_SHOP_REGISTRATION;if(!read||id!==r.pointId)return false;const s=w.snapshot(),p=w.definition.points[id],n=read();if(!p||p.id!==id||p.kind!=='shop'||p.mapId!==r.mapId||p.hubId!=='SHOP:POST'||p.x!==9||p.y!==12||s.position.scene!==r.mapId||s.world?.mapId!==r.mapId)return false;return !!n&&['sceneId','mapId','revision','version','imageSHA'].every(k=>n[k]===r[k])&&n.phase==='field'&&near(n.foot);}
export function mintPostShopGrant(a,w,id){if(!verify(a,w,id))throw Error('NATIVE_SHOP_AUTHORITY_REJECTED');const token=Object.freeze({});grants.set(token,{a,w,id});return token;}
export function validatePostShopGrant(token,w,s,id){const g=grants.get(token);return !!g&&g.w===w&&g.id===id&&s.position.scene===POST_SHOP_REGISTRATION.mapId&&s.world?.mapId===POST_SHOP_REGISTRATION.mapId&&verify(g.a,w,id);}
export function revokePostShopGrant(token){grants.delete(token);}
