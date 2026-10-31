import {mountCenterOverlay} from '../center/center-overlay.mjs';
import {mountPostShopOverlay} from '../shop/post-shop-overlay.mjs';
/** UI only: supplied owner retains world, persistence, scene and transition authority. No RAF. */
export function installPairedReviewHost({root,canvas,owner,environment,clearInput=()=>{},onStatus=()=>{},refreshCanonical=()=>{},visuals=null,onRestore=null,windowTarget=root?.ownerDocument?.defaultView,mountCenter=mountCenterOverlay,mountShop=mountPostShopOverlay}={}){
 if(!root?.ownerDocument||!canvas||!owner?.getWorld||!owner?.getScene)throw Error('PAIRED_HOST_DEPENDENCIES_REQUIRED');
 const doc=root.ownerDocument;const title=root.querySelector?.('h1');if(title&&title!==root)title.textContent='QA 메모리 저장·지도 전환 · POST ↔ 노자산';let disposed=false,focused=true,acting=false,held=false,epoch=0,elapsed=0,overlayElapsed=0,scene=null,world=null,nativeEpoch=null,center=null,shop=null,pauseCount=0,seenRecovery=null;
 const bar=doc.createElement('section'),label=doc.createElement('p');label.textContent='POST ↔ 노자산 · QA 메모리 슬롯 · 새로고침하면 소멸 · 실제 사용자 저장 변경 없음';bar.append(label);
 const report=(message,token=epoch)=>{if(!disposed&&token===epoch)onStatus(message);};
 function clear(){scene?.stop?.();clearInput();}
 function modal(){return !!center?.active||!!shop?.active;}
 function capture(){return {scene,world,epoch};}
 function valid(c){return !disposed&&c.epoch===epoch&&c.scene===owner.getScene()&&c.world===owner.getWorld()&&c.scene?.readNative?.()?.sessionEpoch===nativeEpoch;}
 function acquirePause(){const c=capture();pauseCount++;clear();let released=false;return()=>{if(released)return;released=true;pauseCount=Math.max(0,pauseCount-1);if(valid(c)){clear();refreshCanonical();sync();}};}
 function reconcile(){if(disposed)return;const next=owner.getScene(),w=owner.getWorld(),e=next?.readNative?.()?.sessionEpoch;if(next&&(!Number.isSafeInteger(e)||e<0||next.sessionEpoch!==e))throw Error('PAIRED_SCENE_EPOCH_INVALID');if(next===scene&&w===world&&e===nativeEpoch)return;epoch++;center?.dispose();shop?.dispose();center=shop=null;pauseCount=0;scene?.stop?.();scene=next;world=w;nativeEpoch=e;acting=false;scene?.setFocused?.(focused);clear();
  if(scene?.mapId==='world:hub:POST'){
   const c=capture(),getWorld=()=>valid(c)?c.world:null,callbacks={container:root,getWorld,nativeController:scene,windowTarget,acquirePresentationPause:acquirePause,onStateChanged:()=>{if(valid(c))refreshCanonical();},onMessage:m=>{if(valid(c))report(m,c.epoch);}};
   if(visuals)center=mountCenter({...callbacks,visuals});shop=mountShop(callbacks);
  }
  if(!disposed&&owner.getScene()===scene&&owner.getWorld()===world){refreshCanonical();const recovery=owner.lastRecovery;if(recovery?.battleId&&recovery.battleId!==seenRecovery){seenRecovery=recovery.battleId;report('대결에서 패배하여 POST 센터 앞으로 돌아왔습니다. 파티가 회복되었습니다. 새로 조사 키를 눌러 행동하세요.');}}
 }
 const button=(text,fn)=>{const b=doc.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>{const token=epoch;return Promise.resolve().then(()=>disposed?undefined:fn()).catch(e=>report(e.message,token));};bar.append(b);return b;};
 const inspectButton=button('조사 · 현재 위치',()=>action().finally(()=>releaseAction()));
 const healButton=button('센터 회복',()=>openCenter());
 const shopButton=button('상점 구매',()=>openShop());
 const routeButton=button('안전 경로 따라 노자산 입구로',()=>{reconcile();if(blocked()||!scene?.routeToEntry)return;clear();const result=scene.routeToEntry();report(result.ok?'검증된 안전 경로를 따라 입구로 걷습니다.':'입구로 가는 안전 경로를 찾지 못했습니다.');sync()});
 const saveButton=button('현재 위치·진행을 메모리 슬롯에 저장',()=>memoryOperation(false));
 const restoreButton=button('메모리 슬롯에서 위치·진행 복원',()=>memoryOperation(true));
 const retryButton=button('대기 중인 처리만 재시도',()=>retry());
 function blocked(){return disposed||!focused||acting||pauseCount>0||modal()||owner.phase!=='idle'||owner.pending||world?.busy||world?.inputLocked;}
 function canRestore(){return !blocked()||(!disposed&&focused&&!acting&&!modal()&&pauseCount===0&&owner.canReload===true)}
 function sync(){if(disposed)return;const b=blocked();inspectButton.disabled=b;healButton.hidden=shopButton.hidden=scene?.mapId!=='world:hub:POST';healButton.disabled=b||!center||!scene?.canHeal?.();shopButton.disabled=b||!shop||!scene?.canShop?.();routeButton.hidden=scene?.mapId!=='world:hub:POST';routeButton.disabled=b||!scene?.routeToEntry;saveButton.disabled=b||!owner.save;restoreButton.disabled=!canRestore()||!onRestore||!owner.exportRaw?.();retryButton.disabled=disposed||acting||modal()||!owner.pending||owner.conflict;root.dataset.pairedNativeActive=String(!disposed);root.dataset.pairedPhase=owner.phase;}
 function openCenter(){reconcile();if(blocked()||!center||!scene.canHeal?.())return;clear();overlayElapsed=0;const r=center.open();if(!r.accepted)report(r.reason);sync();return r;}
 function openShop(){reconcile();if(blocked()||!shop||!scene.canShop?.())return;clear();const r=shop.open();if(!r.accepted)report(r.reason);sync();return r;}
 async function memoryOperation(restore){reconcile();if((restore?!canRestore():blocked())||(restore&&(!onRestore||!owner.exportRaw?.())))return;const c=capture();acting=true;clear();sync();try{if(restore)await onRestore();else{owner.save();if(valid(c))report('메모리 슬롯 저장 완료 · 실제 사용자 저장소 변경 없음')}}catch(error){if(valid(c))report(error.message)}finally{if(valid(c))acting=false;reconcile();sync()}}
 async function action(){reconcile();if(held||blocked())return;held=true;if(scene.canHeal?.())return openCenter();if(scene.canShop?.())return openShop();const c=capture();acting=true;clear();sync();try{const result=await scene.inspect();if(valid(c)){refreshCanonical();report(result?.completed===true&&result?.outcome==='won'?'예지와의 마지막 대결에서 승리했습니다.':result?.status==='SOURCE_FINAL_GATE_LOCKED'?'아직 마지막 대결의 조건을 갖추지 못했습니다.':result?.status==='SOURCE_FINAL_ALREADY_COMPLETED'?'이미 완료한 마지막 대결입니다.':'조사를 마쳤습니다.')}else if(!disposed&&owner.getWorld()===c.world&&result?.committed&&owner.getLocation().mapId===result.mapId){reconcile();report(result.mapId==='world:hub:POST'?'POST 입구로 돌아왔습니다.':'노자산에 도착했습니다.');refreshCanonical();}}catch(error){if(valid(c))report(error.message,c.epoch);}finally{if(valid(c))acting=false;reconcile();sync();}}
 async function retry(){reconcile();if(disposed||acting||modal()||!owner.pending||owner.conflict)return;const c=capture();acting=true;clear();sync();try{await owner.retryCommit();if(valid(c)){report('대기 중인 처리 재시도 완료 · 행동 재실행 없음');refreshCanonical();}}catch(error){if(valid(c))report(error.message);}finally{if(valid(c))acting=false;reconcile();sync();}}
 function releaseAction(){if(disposed)return;held=false;owner.releaseAction();scene?.releaseAction?.();}
 const blur=()=>{if(disposed)return;focused=false;releaseAction();center?.close('blur');shop?.close('blur');clear();scene?.setFocused?.(false);sync();},focus=()=>{if(disposed)return;focused=true;scene?.setFocused?.(true);clear();sync();};
 const onActionKeyUp=e=>{if(['z','Z','Enter'].includes(e.key)||['KeyZ','Enter','NumpadEnter'].includes(e.code))releaseAction()};
 windowTarget?.addEventListener('keyup',onActionKeyUp);windowTarget?.addEventListener('blur',blur);windowTarget?.addEventListener('focus',focus);(root.querySelector?.('.world-play')??root).prepend(bar);reconcile();sync();
 return {get active(){return !disposed;},get blocked(){return !disposed;},frame(dt,dir){if(disposed)return;reconcile();dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,50)):0;
  if(center?.active){overlayElapsed+=dt;center.frame(overlayElapsed);sync();return;}if(shop?.active){shop.frame();sync();return;}
  if(!blocked()){scene.frame(dt,dir);owner.observePosition();elapsed+=dt;}else scene?.stop?.();const e=environment.getFrame(world.map);scene?.draw(canvas.getContext('2d'),{ms:elapsed,minutes:e.lighting.minutes});sync();
 },action,releaseAction,cancel(){center?.cancel('user-cancel');shop?.close('user-cancel');clear();},pause:blur,resume(){if(!disposed&&doc.hasFocus?.()!==false)focus()},dispose(){if(disposed)return;disposed=true;epoch++;center?.dispose();shop?.dispose();center=shop=null;clear();windowTarget?.removeEventListener('keyup',onActionKeyUp);windowTarget?.removeEventListener('blur',blur);windowTarget?.removeEventListener('focus',focus);bar.remove();owner.dispose();}};
}
