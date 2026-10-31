import {mountCenterOverlay} from '../center/center-overlay.mjs';
import {mountSelectedShopOverlay} from '../shop/selected-shop-overlay.mjs';
import {isJangmokHealBinding,isJangmokPurchaseBinding} from '../../world/jangmok-service-bindings.mjs';

/** Presentation owner only. Main retains movement, rendering and its sole RAF.
 * Bindings must be the SAME objects whose authorities constructed getWorld(). */
export function installJangmokSelectedServices({container,getWorld,getScene,healBinding,shopBinding,visuals,onStateChanged=()=>{},onMessage=()=>{},retryCommit,windowTarget=container?.ownerDocument?.defaultView,clearInput=()=>{}}={}){
 if(!isJangmokHealBinding(healBinding)||!isJangmokPurchaseBinding(shopBinding)||typeof getWorld!=='function'||typeof getScene!=='function')throw Error('SELECTED_SERVICE_OWNER_REQUIRED');
 let disposed=false,held=false,paused=false,acting=false,clock=0,capturedWorld=getWorld(),capturedScene=getScene();
 const valid=()=>!disposed&&getWorld()===capturedWorld&&getScene()===capturedScene;
 const stopOwned=()=>{capturedScene?.stop();if(valid())clearInput();};const releaseAction=()=>{held=false;stopOwned();};
 let pauseToken=null;const pause=()=>{const token=Symbol();if(paused)throw Error('SERVICE_MODAL_ALREADY_OWNED');paused=true;pauseToken=token;const ownScene=capturedScene,ownWorld=capturedWorld;stopOwned();let released=false;return()=>{if(released)return;released=true;if(pauseToken!==token)return;pauseToken=null;paused=false;ownScene?.stop();if(!disposed&&getWorld()===ownWorld&&getScene()===ownScene)clearInput();};};
 const refresh=()=>{if(valid())onStateChanged();};
 const center=mountCenterOverlay({container,getWorld,pointId:healBinding.pointId,nativeController:healBinding,selectedBinding:healBinding,visuals,acquirePresentationPause:pause,onMessage,onStateChanged:refresh,windowTarget});
 const shop=mountSelectedShopOverlay({container,getWorld,nativeController:shopBinding,acquirePresentationPause:pause,onMessage,onStateChanged:refresh,windowTarget});
 function close(reason){center.close(reason);shop.close(reason);stopOwned();}
 function reconcile(){if(disposed)return false;if(!valid()){close('owner-changed');capturedWorld=getWorld();capturedScene=getScene();held=true;}return true;}
 const blocked=()=>disposed||acting||paused||center.busy||shop.busy||!!getWorld()?.inputLocked;
 const action=()=>{if(!reconcile())return {accepted:false,reason:'DISPOSED'};if(held||blocked())return {accepted:false,reason:held?'ACTION_RELEASE_REQUIRED':'SERVICE_INPUT_LOCKED'};held=true;if(healBinding.canHeal())return center.open();if(shopBinding.canPurchase())return shop.open();return false;};
 const blur=()=>{close('blur');releaseAction();},hide=()=>{if(container.ownerDocument.hidden)blur();},keyup=e=>{if(['Enter',' ','a','A','z','Z'].includes(e.key))releaseAction();};
 windowTarget.addEventListener('keyup',keyup,true);windowTarget.addEventListener('blur',blur);windowTarget.addEventListener('pagehide',blur);container.ownerDocument.addEventListener('visibilitychange',hide);
 return {action,releaseAction,pause:blur,resume:releaseAction,
  frame(dtMs){if(!reconcile())return false;if(!Number.isFinite(dtMs)||dtMs<0)throw Error('SERVICE_FRAME_DELTA_REQUIRED');clock+=dtMs;center.frame(clock);shop.frame();return paused;},
  get blocksInput(){return blocked();},get pausesExternalClock(){return paused;},get active(){return center.active||shop.active;},
  async retryPending(){if(!reconcile()||paused||acting||center.busy||shop.busy||typeof retryCommit!=='function')return false;const w=getWorld(),s=getScene();if(!w?.story.pendingCommit||w.story.busy)return false;const token=healBinding.capture(w);acting=true;releaseAction();try{await retryCommit(w);if(!disposed&&getWorld()===w&&getScene()===s&&healBinding.isCurrent(token,w))onStateChanged();return true;}finally{acting=false;}},
  dispose(){if(disposed)return;disposed=true;close('disposed');center.dispose();shop.dispose();windowTarget.removeEventListener('keyup',keyup,true);windowTarget.removeEventListener('blur',blur);windowTarget.removeEventListener('pagehide',blur);container.ownerDocument.removeEventListener('visibilitychange',hide);},
 };
}
