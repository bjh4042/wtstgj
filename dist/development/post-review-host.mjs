import {mountPostShopOverlay} from './shop/post-shop-overlay.mjs';
import {mountCenterOverlay} from './center/center-overlay.mjs';
/** Single owner-loop POST UI; native foot, not canonical relocation, authorizes healing. */
export function installPostReviewHost({root,canvas,getWorld,environment,clearInput,onStatus,host,visuals=null,refreshCanonical=()=>{}}){
 const world=getWorld(),position=JSON.stringify(world.snapshot().position),windowTarget=globalThis.window;host.bindWorld(world);
 let active=true,disposed=false,acting=false,epoch=0,elapsed=0,overlayElapsed=0,direction=null,focused=true;
 const clear=()=>{direction=null;host.stop();clearInput()};
 const overlay=visuals?mountCenterOverlay({container:root,getWorld,nativeController:host,visuals,onStateChanged:()=>{if(!disposed&&getWorld()===world)refreshCanonical()},
  acquirePresentationPause:()=>{clear();return ()=>{clear();sync();if(!disposed)refreshCanonical()}},onMessage:message=>{if(!disposed)onStatus(message)}}):null;
 const shopOverlay=host.readNative?mountPostShopOverlay({container:root,getWorld,nativeController:host,onStateChanged:()=>{if(!disposed&&getWorld()===world)refreshCanonical()},acquirePresentationPause:()=>{clear();return ()=>{clear();sync();if(!disposed)refreshCanonical()}},onMessage:message=>{if(!disposed)onStatus(message)}}):null;
 const modalActive=()=>!!overlay?.active||shopOverlay?.active;
 const onBlur=()=>{focused=false;overlay?.close('blur');shopOverlay?.close('blur');clear();host.setFocused(false)},onFocus=()=>{focused=true;host.setFocused(true)};
 windowTarget?.addEventListener('blur',onBlur);windowTarget?.addEventListener('focus',onFocus);
 const bar=document.createElement('section');bar.dataset.postNative='';
 const label=document.createElement('p');label.textContent='POST 실제 native 이동 → 센터 회복 연결 · 상점 구매 연결 · QA 메모리 전용 · 다른 사건/워프 미연결';bar.append(label);
 const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.onclick=()=>{const owner=epoch;return Promise.resolve().then(()=>disposed?undefined:fn()).catch(e=>{if(!disposed&&owner===epoch)onStatus(e.message)})};bar.append(b);return b};
 const heal=button('센터 회복 · 가까이에서만',action);
 const route=button('안전 경로 따라 센터로',()=>{if(!active||acting||modalActive())return;clear();onStatus(JSON.stringify(host.routeToHeal?.()??{reason:'경로 자동 안내 준비 중'}))});
 const back=button('canonical 위치로 복귀',()=>{if(acting||world.busy||modalActive())throw Error('진행 중인 회복 화면을 먼저 닫으세요.');if(JSON.stringify(world.snapshot().position)!==position)throw Error('CANONICAL_POSITION_CHANGED');active=false;epoch++;clear();host.setFocused(false);onStatus('native 회복 결과 유지 · canonical 좌표 변경 없이 복귀');sync()});
 const resume=button('POST native 다시 보기',()=>{if(disposed||acting||world.busy)return;if(JSON.stringify(world.snapshot().position)!==position)throw Error('CANONICAL_POSITION_CHANGED');active=true;epoch++;host.setFocused(focused);clear();sync()});
 const shop=button('상점 구매 · 가까이에서만',()=>{if(!active||acting||modalActive()||!shopOverlay)return;clear();const result=shopOverlay.open();if(!result.accepted)onStatus(result.reason);sync()});
 const shopRoute=button('안전 경로 따라 상점으로',()=>{if(!active||acting||modalActive())return;clear();onStatus(JSON.stringify(host.routeToShop?.()??{reason:'상점 경로 미설치'}))});
 const retry=button('대기 중인 저장만 재시도',async()=>{if(!active||disposed||acting||modalActive()||!world.story?.pendingCommit)return;const owner=epoch;acting=true;clear();sync();try{await world.story.retryCommit();world.syncField();if(!disposed&&owner===epoch)onStatus('대기 중인 처리 재시도 완료 · 구매/회복 행동 재실행 없음');}finally{if(!disposed&&owner===epoch){acting=false;sync()}}});
 function sync(){const blocked=acting||modalActive();heal.disabled=!active||blocked||!host.canHeal();shop.disabled=!active||blocked;shopRoute.disabled=!active||blocked;retry.disabled=!active||blocked||!world.story?.pendingCommit;route.disabled=!active||blocked;back.disabled=!active||blocked;resume.disabled=active||blocked;root.dataset.postNativeActive=String(active);root.dataset.centerOverlayActive=String(!!overlay?.active)}
 async function action(){
  if(!active||acting||disposed||modalActive())return;const owner=epoch;acting=true;clear();sync();
  try{if(overlay){overlayElapsed=0;const started=overlay.open();if(!started.accepted)throw Error(started.reason);await started.completion;}
   else{await host.heal('POST_NATIVE:'+crypto.randomUUID());if(owner===epoch&&!disposed)onStatus('센터 회복 완료 · 현재 native 위치와 canonical 위치 유지');}
  }catch(e){if(owner===epoch&&!disposed)onStatus(e.message)}finally{if(owner===epoch){acting=false;sync()}}
 }
 root.querySelector('.world-play').prepend(bar);canvas.width=960;canvas.height=540;sync();
 return {
  get active(){return active&&!disposed},get blocked(){return active||acting},
  frame(dt,dir){if(!active||disposed)return;host.setFocused(focused);if(shopOverlay?.active){shopOverlay.frame();sync();return;}if(overlay?.active){overlayElapsed+=dt;overlay.frame(overlayElapsed);sync();return;}
   if(dir!==direction){if(direction)host.key({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[direction],false);direction=dir;}if(dir)host.key({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[dir],true);
   host.tick(dt/1000);elapsed+=dt;const e=environment.getFrame(world.map);host.render(canvas.getContext('2d'),{ms:elapsed,minutes:e.lighting.minutes});sync();
  },action,releaseAction(){},cancel(){overlay?.cancel('user-cancel');shopOverlay?.close('user-cancel');clear()},pause(){overlay?.close('visibility-pause');shopOverlay?.close('visibility-pause');host.setFocused(false);clear()},
  dispose(){disposed=true;active=false;epoch++;overlay?.dispose();shopOverlay?.dispose();host.dispose();windowTarget?.removeEventListener('blur',onBlur);windowTarget?.removeEventListener('focus',onFocus);bar.remove()}
 };
}
