import {isShopCounterPose} from './counter-predicate.mjs';
import {readOwnedShopPose,ownedShopWorld} from './shop-interior-scene.mjs';
import {createShopInteriorPurchaseAuthority} from '../../world/selected-purchase-authority.mjs';
const brands=new WeakSet();export const isShopInteriorPurchaseBinding=b=>brands.has(b);
export function createShopInteriorPurchaseBinding({getWorld,getScene,onStateChanged=()=>{}}){
 if(typeof getWorld!=='function'||typeof getScene!=='function')throw Error('SHOP_OWNER_REQUIRED');let disposed=false,lease=null,visualLocked=false;const captures=new WeakMap();
 const read=()=>{const s=getScene(),w=getWorld();return !disposed&&w&&ownedShopWorld(s)===w?readOwnedShopPose(s):null};
 const canPurchase=()=>{const w=getWorld(),p=read();return !!w&&!disposed&&!lease&&!visualLocked&&!w.busy&&!w.inputLocked&&w.field?.menu==null&&w.snapshot().position.scene==='world:hub:S4'&&isShopCounterPose(p)};
 const authority=createShopInteriorPurchaseAuthority({getWorld:()=>disposed?null:getWorld(),getScene:()=>disposed?null:getScene()});
 const b=Object.freeze({authority,pointId:'shop:S4',readNative:read,canPurchase,capture(w){if(w!==getWorld()||!canPurchase())throw Error('SHOP_COUNTER_NOT_READY');const token=Object.freeze({});captures.set(token,{world:w,scene:getScene(),pose:JSON.stringify(read())});return token},isCurrent(t,w){const c=captures.get(t);return !!c&&!disposed&&c.world===w&&getWorld()===w&&c.scene===getScene()&&c.pose===JSON.stringify(read())},acquireVisualLock(){if(lease)throw Error('SHOP_VISUAL_BUSY');lease=Symbol();const t=lease;getScene()?.stop();return()=>{if(lease===t)lease=null}},setVisualLocked(v){visualLocked=v===true;if(visualLocked)getScene()?.stop()},stop(){getScene()?.stop()},async buy({itemId,quantity,transactionId}){if(!canPurchase())throw Error('SHOP_COUNTER_NOT_READY');const w=getWorld(),s=getScene();const result=await w.interactSelectedNativePurchase('shop:S4',{type:'purchase',itemId,quantity,transactionId});if(!disposed&&getWorld()===w&&getScene()===s){try{onStateChanged()}catch{}}return result},dispose(){disposed=true;lease=null;visualLocked=true}});brands.add(b);return b;
}
