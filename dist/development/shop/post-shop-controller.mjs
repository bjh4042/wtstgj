import {isShopInteriorPurchaseBinding} from '../shop-interior/purchase-binding.mjs';
import {isJangmokPurchaseBinding} from '../../world/jangmok-service-bindings.mjs';
import {isGohyeonPurchaseBinding} from '../../world/gohyeon-purchase-binding.mjs';
import {shopItems,quotePurchase,activeEconomyPolicy,APPROVED_ID} from '../../economy/contract.mjs';
const owners=new WeakMap(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/** Explicit selection/receipt controller; no prices, stock, inventory or money rules authored here. */
export function createPostShopController(options={}){return createShopController({getWorld:options.getWorld,onResult:options.onResult});}
export function createSelectedShopController(options={}){if(!(isGohyeonPurchaseBinding(options.selectedBinding)||isJangmokPurchaseBinding(options.selectedBinding)||isShopInteriorPurchaseBinding(options.selectedBinding)))throw Error('SELECTED_PURCHASE_BINDING_REQUIRED');return createShopController(options);}
function createShopController({getWorld,onResult=()=>{},selectedBinding=null}={}){
 if(typeof getWorld!=='function')throw Error('SHOP_WORLD_PROVIDER_REQUIRED');let active=null,epoch=0,pending=false,disposed=false,retryable=null;const warnings=[];const publish=value=>{try{onResult(value)}catch(e){warnings.push(e.message);}};
 let selection=null;const current=w=>!selectedBinding||selectedBinding.isCurrent(selection,w);const hubId=selectedBinding?(isJangmokPurchaseBinding(selectedBinding)?'SHOP:S2':'SHOP:S4'):'SHOP:POST';
 const world=()=>{const w=getWorld();if(!w?.snapshot||typeof w[selectedBinding?'interactSelectedNativePurchase':'interactNativeShop']!=='function')throw Error('NATIVE_SHOP_WORLD_REQUIRED');return w;};
 const busy=w=>w.busy||w.inputLocked||owners.has(w);
 const quote=(w,itemId,quantity)=>quotePurchase(w.snapshot(),w.catalog.itemContract,itemId,quantity,{unlimited:true,approved:w.snapshot().economy?.policyId===APPROVED_ID,hubId});
 const verify=(w,result,before,q,item,transactionId)=>{const itemId=item.id,quantity=q.quantity;const after=w.snapshot();if(w.story.pendingCommit||!same(result,after))throw Error('PURCHASE_COMMIT_UNVERIFIED');
    if(Object.hasOwn(before.economy.transactions,transactionId)){const outcome={status:'REPLAYED_TRANSACTION',purchased:false,transactionId};return outcome;}
    const receipt=after.economy.transactions[transactionId]?.result,pocket=item.pocket==='items'?'items':'inventory';
    if(receipt?.kind!=='purchase'||receipt.itemId!==itemId||receipt.quantity!==quantity||receipt.unitPrice!==q.unitPrice||receipt.cost!==q.cost||after.economy.money!==before.economy.money-q.cost)throw Error('PURCHASE_RECEIPT_MISMATCH');
    const bagBefore=pocket==='items'?before.progress.items:before.inventory,bagAfter=pocket==='items'?after.progress.items:after.inventory;
    const expectedBag={...bagBefore,[itemId]:(bagBefore[itemId]??0)+quantity};if(!same(bagAfter,expectedBag))throw Error('PURCHASE_BAG_MISMATCH');if(pocket==='items'&&!same(before.inventory,after.inventory)||pocket==='inventory'&&!same(before.progress.items,after.progress.items))throw Error('PURCHASE_OTHER_POCKET_CHANGED');
    for(const key of ['position','party','box'])if(!same(before[key],after[key]))throw Error('PURCHASE_UNRELATED_STATE_CHANGED');
    const outcome={status:'PURCHASE_VERIFIED',purchased:true,transactionId,receipt};return outcome;
 };

 return {
  open(){if(disposed||pending)throw Error('SHOP_UNAVAILABLE');const w=world();if(busy(w))throw Error('SHOP_BUSY');if(selectedBinding){if(!selectedBinding.canPurchase())throw Error('SELECTED_SHOP_UNAVAILABLE');selection=selectedBinding.capture(w);}const s=w.snapshot();active={world:w,token:Symbol('native-post-purchase'),epoch:++epoch};const items=shopItems(w.catalog,{hubId}).map(item=>{try{const q=quote(w,item.id,1);return Object.freeze({id:item.id,label:item.name??item.id,quote:q,enabled:activeEconomyPolicy(s,w.catalog),owned:(item.pocket==='items'?s.progress.items:s.inventory)[item.id]??0});}catch(e){return Object.freeze({id:item.id,label:item.name??item.id,enabled:false,reason:e.message});}});return Object.freeze({token:active.token,money:s.economy?.money,items:Object.freeze(items),sellSupported:false});},
  quote(itemId,quantity){return quote(world(),itemId,quantity);},
  async buy({token,itemId,quantity,transactionId}={}){
   const w=world(),a=active;if(disposed||pending||!a||a.world!==w||token!==a.token)throw Error('STALE_SHOP_SELECTION');if(busy(w))throw Error('SHOP_BUSY');const before=w.snapshot(),q=quote(w,itemId,quantity),item=w.catalog.itemContract[itemId];active=null;pending=true;owners.set(w,a);
   try{if(!current(w))throw Error('STALE_SHOP_SELECTION');const result=await (selectedBinding?selectedBinding.buy({itemId,quantity,transactionId}):w.interactNativeShop('shop:POST',{type:'purchase',itemId,quantity,transactionId}));if(disposed||a.epoch!==epoch||getWorld()!==w||!current(w))throw Error('STALE_SHOP_RESPONSE');const outcome=verify(w,result,before,q,item,transactionId);retryable=null;publish(outcome);return outcome;
   }catch(error){if(w.story.pendingCommit)retryable={world:w,before,q,item,transactionId};throw error;
   }finally{pending=false;if(owners.get(w)===a)owners.delete(w);}
  },
  async retryCommit(){
   const r=retryable,w=world();if(disposed||pending||!r||r.world!==w||!current(w)||!w.story.pendingCommit||w.story.busy||owners.has(w))throw Error('NO_OWNED_SHOP_COMMIT_TO_RETRY');
   const a={epoch};pending=true;owners.set(w,a);active=null;
   try{const result=await w.story.retryCommit();w.syncField();if(disposed||a.epoch!==epoch||getWorld()!==w||!current(w))throw Error('STALE_SHOP_RESPONSE');const outcome=verify(w,result,r.before,r.q,r.item,r.transactionId);retryable=null;publish(outcome);return outcome;}finally{pending=false;if(owners.get(w)===a)owners.delete(w);}
  },
  get canRetry(){const w=getWorld();return !disposed&&!pending&&retryable?.world===w&&current(w)&&!!w?.story.pendingCommit&&!w.story.busy;},
  close(){epoch++;active=null;return {inFlightNotReversed:pending};},
  dispose(){disposed=true;epoch++;active=null;},get pending(){return pending;},get warnings(){return [...warnings];}
 };
}
