import {createGohyeonPurchaseBinding} from '../../world/gohyeon-purchase-binding.mjs';
import {readOwnedShopPose,ownedShopWorld} from './shop-interior-scene.mjs';
import {SHOP_CONTRACT as C} from './fixed-contract.mjs';
// Exterior readiness must be read by existing branded Gohyeon purchase binding at composition seam.
export function prepareShopTransition(source,kind,registry){
 const n=source.getLocation();if(n.mapId!=='world:hub:S4'||!registry.shopPose)throw Error('SHOP_SOURCE_REQUIRED');
 if(kind==='enter'){if(n.servicePose||n.indoorPose||source.disposed||!source.world||!source.scene)throw Error('ORIGINAL_SHOP_APPROACH_REQUIRED');const binding=createGohyeonPurchaseBinding({getWorld:()=>source.world,getScene:()=>source.scene});let available;try{available=binding.canPurchase()}finally{binding.dispose()}if(!available)throw Error('ORIGINAL_SHOP_APPROACH_REQUIRED');return {target:{...n,servicePose:registry.shopPose(C.entry,'up')},result:{kind:'shop-enter',executed:true}}}
 if(kind==='exit'){const p=readOwnedShopPose(source);if(!p||ownedShopWorld(source)!==source.world||!n.servicePose?.released||!n.servicePose?.left||p.facing!=='down'||!source.isReturnTrigger())throw Error('SHOP_RELEASE_LEAVE_RETURN_REQUIRED');return {target:{...n,servicePose:null},result:{kind:'shop-exit',executed:true}}}
 throw Error('SHOP_ACTION_REQUIRED');
}
