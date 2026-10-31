import{SELECTED_HEAL_ROWS,createSelectedHealAuthority,matchesSelectedHealNative}from'./selected-heal-authority.mjs';
import{SELECTED_PURCHASE_ROWS,createSelectedPurchaseAuthority,matchesSelectedPurchaseNative}from'./selected-purchase-authority.mjs';
import{NativeReviewAdapter}from'../development/native-map/native-adapter.mjs';
const healBindings=new WeakSet(),purchaseBindings=new WeakSet();
export const isJangmokHealBinding=b=>healBindings.has(b);
export const isJangmokPurchaseBinding=b=>purchaseBindings.has(b);
export const createJangmokHealBinding=options=>createBinding(options,'heal');
export const createJangmokPurchaseBinding=options=>createBinding(options,'purchase');
function createBinding({getWorld,getAdapter,onStateChanged=()=>{}},kind){
 if(typeof getWorld!=='function'||typeof getAdapter!=='function')throw Error('TRUSTED_JANGMOK_OWNER_REQUIRED');
 const pointId=kind==='heal'?'heal:S2':'shop:S2',row=(kind==='heal'?SELECTED_HEAL_ROWS:SELECTED_PURCHASE_ROWS)[pointId],matches=kind==='heal'?matchesSelectedHealNative:matchesSelectedPurchaseNative;
 let disposed=false,focused=false,visualLease=null,lastAdapter=null,lastSession=null,lastEpoch=null,generation=0;const captures=new WeakMap();
 const stop=()=>{if(disposed)return;const a=lastAdapter,s=lastSession;if(a instanceof NativeReviewAdapter&&a.session===s&&!a.disposed){a.route=null;a.remainder=0;s?.stopGait();}};
 function read({allowVisual=false}={}){
  const w=getWorld(),a=getAdapter();if(disposed||!focused||(!allowVisual&&visualLease)||!(a instanceof NativeReviewAdapter)||a.world!==w||!a.active||a.disposed||!a.session)return null;
  const session=a.session,n=session.snapshot();if(session.disposed||n.pending||n.scene!=='exterior'||n.moving||!row.sceneIds.includes(n.sceneId)||!Number.isSafeInteger(n.epoch)||n.epoch<0)return null;
  if(a!==lastAdapter||session!==lastSession||n.epoch!==lastEpoch){lastAdapter=a;lastSession=session;lastEpoch=n.epoch;generation++;}
  for(const c of [a.contract,session.c])if(c?.sources?.exterior?.sha256!==row.states.STATIC.imageSHA||c?.masks?.exterior?.sha256!==row.states.STATIC.maskSHA||c?.nativeWorldSize?.[0]!==5120||c?.nativeWorldSize?.[1]!==1536)return null;
  if(!session.safe('exterior',n.foot))return null;
  return {sceneId:n.sceneId,mapId:row.mapId,revision:row.revision,version:1,state:'STATIC',...row.states.STATIC,foot:[...n.foot],facing:{up:'BACK',down:'FRONT',left:'LEFT',right:'RIGHT'}[n.facing],phase:'field',sessionEpoch:generation};
 }
 const readNative=()=>read(),authority=(kind==='heal'?createSelectedHealAuthority:createSelectedPurchaseAuthority)({getWorld,readNative});
 const can=()=>{const w=getWorld(),n=readNative();return !!n&&!!w&&typeof w.snapshot==='function'&&!w.busy&&!w.inputLocked&&w.snapshot().position.scene===row.mapId&&matches(pointId,n);};
 const capture=w=>{const n=readNative();if(!n||getWorld()!==w)throw Error('JANGMOK_OWNER_NOT_CURRENT');const token=Object.freeze({});captures.set(token,{world:w,adapter:getAdapter(),session:getAdapter().session,native:JSON.stringify(n)});return token;};
 const isCurrent=(token,w)=>{const c=captures.get(token);return !!c&&!disposed&&c.world===w&&getWorld()===w&&getAdapter()===c.adapter&&getAdapter()?.session===c.session&&JSON.stringify(read({allowVisual:true}))===c.native;};
 const purchaseRequest=request=>{if(!request||Object.getPrototypeOf(request)!==Object.prototype||Reflect.ownKeys(request).length!==3)throw Error('JANGMOK_PURCHASE_REQUEST');const out={type:'purchase'};for(const key of ['itemId','quantity','transactionId']){const d=Object.getOwnPropertyDescriptor(request,key);if(!d?.enumerable||!Object.hasOwn(d,'value'))throw Error('JANGMOK_PURCHASE_REQUEST');out[key]=d.value;}return out;};
 const invoke=async request=>{const payload=kind==='purchase'?purchaseRequest(request):null;const w=getWorld();if(!can())throw Error('JANGMOK_SERVICE_NOT_AVAILABLE');const token=capture(w);const result=await(kind==='heal'?w.interactSelectedNativeHeal(pointId,{type:'heal',transactionId:request}):w.interactSelectedNativePurchase(pointId,payload));if(isCurrent(token,w)){try{onStateChanged()}catch{}}return result;};
 const binding=Object.freeze({authority,pointId,readNative,capture,isCurrent,stop,
  setFocused(value){if(disposed)return;focused=value===true;if(focused){const a=getAdapter();if(a instanceof NativeReviewAdapter&&a.world===getWorld()&&a.active&&!a.disposed){lastAdapter=a;lastSession=a.session;}}else stop();},
  acquireVisualLock(){if(disposed||!readNative())throw Error('JANGMOK_OWNER_NOT_CURRENT');if(visualLease)throw Error('SELECTED_VISUAL_LEASE_BUSY');const token=Symbol();visualLease=token;stop();let released=false;return()=>{if(released)return;released=true;if(visualLease===token)visualLease=null;};},
  ...(kind==='heal'?{canHeal:can,heal:invoke}:{canPurchase:can,buy:invoke}),
  dispose(){disposed=true;focused=false;generation++;}
 });(kind==='heal'?healBindings:purchaseBindings).add(binding);return binding;
}
