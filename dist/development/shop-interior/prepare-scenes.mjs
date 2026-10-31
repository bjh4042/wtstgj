import {createS4DistanceShopScene as createShopInteriorScene} from '../gohyeon-gameplay/encounter/movement-proof.mjs';
import {createGohyeonPurchaseBinding} from '../../world/gohyeon-purchase-binding.mjs';
import {SHOP_CONTRACT as C} from './fixed-contract.mjs';
// Compose around the existing center/house preparer, never replace its world or clock.
export function createShopJourneyScenePreparer({basePrepare,registry,shopInputs,playerActors,canvasFactory,onSuccessfulPixel}){let epoch=0;return async location=>{
 if(registry.validate(location))throw Error('SHOP_LOCATION_INVALID');
 if(location.servicePose?.sceneId===C.sceneId)return createShopInteriorScene({safe:shopInputs.safe,retainedExterior:location,epoch:++epoch,assets:{...shopInputs.assets,playerFrames:playerActors},canvasFactory,onSuccessfulPixel});
 const scene=await basePrepare(location);if(scene.mapId!=='world:hub:S4'||location.servicePose||location.indoorPose)return scene;
 const original=scene.inspect.bind(scene);const canEnter=()=>{if(scene.getLocation().servicePose||scene.getLocation().indoorPose)return false;const b=createGohyeonPurchaseBinding({getWorld:()=>scene.world,getScene:()=>scene.scene});try{return b.canPurchase()}finally{b.dispose()}};
 scene.inspect=execute=>canEnter()?execute('service:shop:enter'):original(execute);return scene;
}}
