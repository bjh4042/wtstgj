// Trusted composition seam only. No user-supplied positions, world facade or POST API widening.
import{SELECTED_PURCHASE_ROWS,createSelectedPurchaseAuthority,matchesSelectedPurchaseNative}from'./selected-purchase-authority.mjs';
const R=SELECTED_PURCHASE_ROWS['shop:S4'],bindings=new WeakSet();
export const isGohyeonPurchaseBinding=value=>bindings.has(value);
// Current pinned renderer maps up->actor9; original actor9 is BACK-facing art.
const POSE_TO_CONTRACT=Object.freeze({up:'BACK',down:'FRONT',left:'LEFT',right:'RIGHT'});
export function createGohyeonPurchaseBinding({getWorld,getScene,onStateChanged=()=>{}}){
 if(typeof getWorld!=='function'||typeof getScene!=='function')throw Error('TRUSTED_GOHYEON_OWNER_REQUIRED');
 let visualLease=null,disposed=false,visualLocked=false,lastScene=null,lastEpoch=null,generation=0;
 const read=({allowVisual=false}={})=>{const scene=getScene();if(disposed||!scene||scene.disposed)return null;const n=scene.snapshot();if(scene!==lastScene||n.epoch!==lastEpoch){lastScene=scene;lastEpoch=n.epoch;generation++;}if(n.scene!=='exterior'||n.pending||!scene.focused||(!allowVisual&&(visualLocked||visualLease))||!Object.hasOwn(R.states,n.mapState)||!Number.isSafeInteger(n.epoch))return null;const state=R.states[n.mapState],source=scene.inputs?.contract?.sources?.['exterior:'+n.mapState];if(source?.sha256!==state.imageSHA||scene.inputs?.exterior?.hub?.revision!==R.revision||!scene.safe('exterior',n.foot))return null;return{sceneId:n.sceneId,mapId:R.mapId,revision:R.revision,version:1,state:n.mapState,...state,foot:[...n.foot],facing:POSE_TO_CONTRACT[n.facing],phase:'field',sessionEpoch:generation};};
 const readNative=()=>read();const captures=new WeakMap();
 const capture=world=>{const n=read();if(!world||getWorld()!==world||!n)throw Error('SELECTED_BINDING_NOT_CURRENT');const token=Object.freeze({});captures.set(token,{world,scene:getScene(),native:JSON.stringify(n)});return token;};
 const isCurrent=(token,world)=>{const c=captures.get(token);return !!c&&!disposed&&c.world===world&&getWorld()===world&&c.scene===getScene()&&c.native===JSON.stringify(read({allowVisual:true}));};
 const authority=createSelectedPurchaseAuthority({readNative,getWorld});
 const canPurchase=()=>{const w=getWorld();return !!w&&!disposed&&!w.busy&&!w.inputLocked&&w.snapshot().position.scene===R.mapId&&matchesSelectedPurchaseNative(R.pointId,readNative());};
 const binding=Object.freeze({authority,pointId:R.pointId,readNative,capture,isCurrent,acquireVisualLock(){if(visualLease)throw Error("SELECTED_VISUAL_LEASE_BUSY");const token=Symbol();visualLease=token;getScene()?.stop();let released=false;return()=>{if(released)return;released=true;if(visualLease===token)visualLease=null;};},canPurchase,
  stop(){getScene()?.stop();},setVisualLocked(value){visualLocked=value===true;if(visualLocked)getScene()?.stop();},
  async buy({itemId,quantity,transactionId}){const w=getWorld(),scene=getScene();if(!canPurchase())throw Error('GOHYEON_PURCHASE_NOT_AVAILABLE');const beforeEpoch=readNative().sessionEpoch;const result=await w.interactSelectedNativePurchase(R.pointId,{type:'purchase',itemId,quantity,transactionId});if(!disposed&&getWorld()===w&&getScene()===scene&&readNative()?.sessionEpoch===beforeEpoch){try{onStateChanged();}catch{/* presentation refresh cannot turn committed purchase into a failed service */}}return result;},
  dispose(){disposed=true;visualLocked=true;generation++;}
 });bindings.add(binding);return binding;
}
