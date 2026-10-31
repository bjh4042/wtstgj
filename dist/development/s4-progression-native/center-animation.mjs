import{createCenterController}from'../center/center-controller.mjs';
import{loadCenterVisuals}from'../center/center-visual-loader.mjs';
import{CENTER_CONTRACT as C}from'../center-interior/fixed-contract.mjs';
import{isS4OwnedCenterHealBinding}from'./center-heal-binding.mjs';
import{scope}from'./center-common.mjs';
// Presentation/confirmation seam only; the existing selected binding owns all mutation.
export async function prepareCenterAnimation(options={}){
 const{getWorld,selectedBinding,view,readCurrentPose,readVisualInput,signal,onStatus=()=>{},onHealed=()=>{},transactionIdFactory}=options;
 if(typeof getWorld!=='function'||!isS4OwnedCenterHealBinding(selectedBinding)||!view||typeof readCurrentPose!=='function'||typeof readVisualInput!=='function')throw Error('CENTER_TRUSTED_ANIMATION_HOST');
 const s=scope(options),images=new Set(),closed=new WeakSet();let controller=null,confirmation=null,dead=false;
 const closeImage=image=>{if(!image||closed.has(image))return;closed.add(image);try{image.close?.()}catch{}};
 s.onCleanup(()=>{dead=true;confirmation=null});s.onCleanup(()=>controller?.dispose());s.onCleanup(()=>view.invalidateFrame());s.onCleanup(()=>{for(const im of images)closeImage(im);images.clear()});
 try{
 const visuals=await loadCenterVisuals({read:async url=>{const r=await s.wrappedFetch(url);return new Uint8Array(await r.arrayBuffer())},decode:async bytes=>{s.check();const image=await(options.decode??(b=>createImageBitmap(new Blob([b]))))(bytes);if(s.dead||signal?.aborted){closeImage(image);s.check()}images.add(image);s.check();return image}});s.check();
 controller=createCenterController({getWorld,pointId:'heal:S4',nativeController:selectedBinding,selectedBinding,visuals,transactionIdFactory,onStatus,onHealed});
 function ready(){s.check();if(controller.busy||controller.snapshot().result?.requiresReconciliation)throw Error('CENTER_BUSY_OR_RECONCILIATION');const pose=readCurrentPose(),input=readVisualInput(),frame=view.currentFrame();if(!frame||!view.frameMatchesState(frame,pose,input)||pose.state!=='CENTER_R4'||pose.facing!=='up'||input.walking===true||!C.counter.approachRows.some(([y,l,r])=>pose.foot[1]===y&&pose.foot[0]>=l&&pose.foot[0]<r)||!selectedBinding.canHeal())throw Error('CENTER_VISIBLE_COUNTER_REQUIRED');return{world:getWorld(),frame,pose:JSON.stringify(pose),input:JSON.stringify(input)}}
 function close(reason='closed'){confirmation=null;view.invalidateFrame();return controller.close(reason)}
 return Object.freeze({
 requestConfirmation(){if(confirmation)throw Error('CENTER_CONFIRMATION_PENDING');const current=ready(),token=Object.freeze({});confirmation={token,...current,selection:selectedBinding.capture(current.world)};return token},
 confirm(token){const old=confirmation;confirmation=null;if(!old||old.token!==token)throw Error('CENTER_CONFIRMATION_REQUIRED');const current=ready();if(current.world!==old.world||current.pose!==old.pose||!selectedBinding.isCurrent(old.selection,current.world))throw Error('CENTER_CONFIRMATION_STALE');const result=controller.start();view.invalidateFrame();return result},
 cancel(reason='cancelled'){confirmation=null;view.invalidateFrame();return controller.cancel(reason)},close,
 tick(timestamp){s.check();controller.tick(timestamp)},
 draw(ctx){s.check();if(ctx?.canvas?.width!==768||ctx?.canvas?.height!==576||ctx.isContextLost?.()===true){close('context-unavailable');throw Error('CENTER_ANIMATION_VIEWPORT')}const result=controller.draw(ctx);if(ctx.isContextLost?.()===true){close('context-lost');throw Error('CENTER_ANIMATION_CONTEXT_LOST')}return result},
 snapshot:()=>controller.snapshot(),get active(){return !dead&&controller.active},get busy(){return controller.busy},
 dispose(){if(dead)return;s.dispose()}
 });
 }catch(error){s.dispose();throw error}
}
