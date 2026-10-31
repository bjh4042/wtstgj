import {createCenterController} from './center-controller.mjs';
const labels=Object.freeze({idle:'회복 준비',animating:'회복 연출 중 · 아직 회복 서비스 실행 전입니다.',committing:'회복 처리 결과 확인 중 · 중복 요청은 차단됩니다.',succeeded:'회복 완료 · 실제 파티 HP·PP·상태 반영을 확인했습니다.',cancelled:'회복 취소 · 회복 서비스는 실행되지 않았습니다.',failed:'회복을 확인하지 못했습니다.',rejected:'회복을 시작할 수 없습니다.'});
/** Presentation-only modal. Runtime state/leases belong exclusively to existing
 * CenterController and CanonicalWorld. Host retains its single animation loop. */
export function mountCenterOverlay({container,getWorld,nativeController=null,selectedBinding=null,pointId='heal:POST',visuals,acquirePresentationPause,onMessage=()=>{},onStateChanged=()=>{},transactionIdFactory,ownLifecycle=false,windowTarget=container?.ownerDocument?.defaultView}={}){
 const documentTarget=container?.ownerDocument;
 if(!documentTarget||!windowTarget||typeof acquirePresentationPause!=='function')throw Error('CENTER_OVERLAY_HOST_REQUIRED');
 let shown=false,disposed=false,releasePause=null,priorFocus=null;
 const node=documentTarget.createElement('section');node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-label','생태센터 회복 연출');node.tabIndex=-1;
 node.style.cssText='position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(8,15,14,.94);padding:16px;box-sizing:border-box;color:#f8fbf4;';
 const title=documentTarget.createElement('h2');title.textContent='생태센터 · 회복 연출';title.style.margin='0 0 8px';
 const note=documentTarget.createElement('p');note.textContent='현재 지도와 위치는 그대로 유지됩니다.';note.style.margin='0 0 8px';
 const canvas=documentTarget.createElement('canvas');canvas.width=768;canvas.height=576;canvas.setAttribute('aria-label','승인 원본 의사와 생태볼 회복 연출');canvas.style.cssText='width:min(768px,calc(100vw - 32px));max-height:70vh;object-fit:contain;aspect-ratio:4 / 3;';
 const status=documentTarget.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.style.maxWidth='768px';
 const actions=documentTarget.createElement('div'),cancel=documentTarget.createElement('button'),closeButton=documentTarget.createElement('button');cancel.type=closeButton.type='button';cancel.textContent='취소';closeButton.textContent='닫기';actions.append(cancel,closeButton);node.append(title,note,canvas,status,actions);container.append(node);
 function update(s){if(!shown)return;status.textContent=s.result?.requiresReconciliation?'저장 확인 필요 · 기존 저장 재시도/확인 절차를 이용하세요. 회복 완료로 표시하지 않습니다.':labels[s.state]??s.state;
  if(s.result?.reason)status.textContent+=' ('+s.result.reason+')';cancel.disabled=!s.busy||s.state==='committing';closeButton.textContent=s.state==='committing'?'닫기 · 진행 중인 저장은 계속됩니다':'닫기';node.dataset.centerState=s.state;node.dataset.partyCount=String(s.animation?.count??0);
 }
 const controller=createCenterController({getWorld,pointId,nativeController,selectedBinding,visuals,transactionIdFactory,onStatus:update,onHealed:()=>{if(shown)onMessage('회복 완료 · 실제 서비스 결과 확인');}});
 function close(reason='closed'){
  if(!shown)return {closed:false};shown=false;const outcome=controller.close(reason);node.style.display='none';try{releasePause?.();}finally{releasePause=null;priorFocus?.focus?.();priorFocus=null;}return outcome;
 }
 cancel.onclick=()=>{if(shown){controller.cancel('button');update(controller.snapshot());}};
 closeButton.onclick=()=>close('button');
 function keydown(e){
  if(!shown)return;const key=e.key?.toLowerCase();
  if(key==='tab'){
   e.preventDefault();e.stopImmediatePropagation?.();
   const buttons=[cancel,closeButton].filter(b=>!b.disabled&&!b.hidden&&b.style.display!=='none');
   const focused=documentTarget.activeElement??e.target,index=buttons.indexOf(focused),next=index<0?(e.shiftKey?buttons.length-1:0):(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length;
   (buttons[next]??node).focus?.();return;
  }
  if(key==='enter'||key===' '){
   const button=e.target?.closest?.('button');
   e.stopImmediatePropagation?.();
   // Keep the browser's single native activation for a focused enabled button;
   // only repeated keydowns or off-modal input are prevented.
   if(e.repeat||!button||!node.contains(button)||button.disabled)e.preventDefault();return;
  }
  if(['escape','a','b','z','x','w','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){e.preventDefault();e.stopImmediatePropagation?.();if(e.repeat)return;if(key==='escape'||key==='b')cancel.onclick();}
 }
 const blur=()=>close('blur'),hidden=()=>{if(documentTarget.hidden)close('hidden');},pagehide=()=>close('pagehide');
 windowTarget.addEventListener('keydown',keydown,true);if(ownLifecycle){windowTarget.addEventListener('blur',blur);windowTarget.addEventListener('pagehide',pagehide);documentTarget.addEventListener('visibilitychange',hidden);}
 return {
  open(){if(disposed||shown||controller.busy)return {accepted:false,reason:disposed?'DISPOSED':'BUSY'};shown=true;priorFocus=documentTarget.activeElement;node.style.display='flex';const owner=getWorld(),selection=selectedBinding?.capture(owner),started=controller.start();if(started.accepted)started.completion.then(()=>{if(!disposed&&getWorld()===owner&&(!selectedBinding||selectedBinding.isCurrent(selection,owner))){try{onStateChanged()}catch{}}});if(!started.accepted){close('rejected');onMessage(started.reason);return started;}
   try{const release=acquirePresentationPause();if(typeof release!=='function')throw Error('CENTER_PRESENTATION_RELEASE_REQUIRED');releasePause=release;node.focus?.();update(controller.snapshot());return started;}catch(error){close('pause-failed');throw error;}
  },
  frame(timestamp){if(!shown)return false;controller.tick(timestamp);if(!controller.active){close('session-changed');return false;}controller.draw(canvas.getContext('2d'));return true;},
  close,
  cancel(reason='cancelled'){const r=controller.cancel(reason);update(controller.snapshot());return r;},
  dispose(){if(disposed)return;close('disposed');disposed=true;controller.dispose();windowTarget.removeEventListener('keydown',keydown,true);windowTarget.removeEventListener('blur',blur);windowTarget.removeEventListener('pagehide',pagehide);documentTarget.removeEventListener('visibilitychange',hidden);node.remove();},
  get active(){return shown;},get busy(){return controller.busy;},snapshot:()=>controller.snapshot(),
 };
}
