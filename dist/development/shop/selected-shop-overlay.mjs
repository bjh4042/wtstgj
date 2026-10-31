import {isShopInteriorPurchaseBinding} from '../shop-interior/purchase-binding.mjs';
import {isJangmokPurchaseBinding} from '../../world/jangmok-service-bindings.mjs';
import {createSelectedShopController} from './post-shop-controller.mjs';
import {isGohyeonPurchaseBinding} from '../../world/gohyeon-purchase-binding.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/** UI only: source actions own all prices, limits, transactions and persistence. */
export function mountSelectedShopOverlay({container,getWorld,nativeController,acquirePresentationPause,transactionIdFactory=()=>`post-shop-${crypto.randomUUID()}`,onMessage=()=>{},onStateChanged=()=>{},windowTarget=container?.ownerDocument?.defaultView}={}){
 const doc=container?.ownerDocument;if(!doc||!windowTarget||typeof getWorld!=='function'||!nativeController?.readNative||typeof acquirePresentationPause!=='function')throw Error('SHOP_OVERLAY_HOST_REQUIRED');
 if(!(isGohyeonPurchaseBinding(nativeController)||isJangmokPurchaseBinding(nativeController)||isShopInteriorPurchaseBinding(nativeController)))throw Error('SELECTED_PURCHASE_BINDING_REQUIRED');let releaseVisual=null;const unlock=()=>{releaseVisual?.();releaseVisual=null;};const lock=()=>{if(!releaseVisual)releaseVisual=nativeController.acquireVisualLock();};let selection=null;
 let shown=false,disposed=false,uiBusy=false,menu=null,displayedQuote=null,owner=null,releasePause=null,priorFocus=null;
 const controller=createSelectedShopController({getWorld,selectedBinding:nativeController});
 const node=doc.createElement('section');node.className='world-modal native-shop-modal';node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-label','생태 상점 구매');node.tabIndex=-1;node.style.cssText='position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;background:rgba(8,15,14,.94);padding:16px;box-sizing:border-box;';
 const panel=doc.createElement('section');panel.style.cssText='width:min(560px,100%);max-height:90vh;overflow:auto;padding:20px;background:#193029;color:#f8fbf4;border:2px solid #a7b792;border-radius:8px;';
 const title=doc.createElement('h2');title.textContent='생태 상점';const balance=doc.createElement('p'),product=doc.createElement('select');product.setAttribute('aria-label','상품');product.style.maxWidth='100%';
 const quantity=doc.createElement('input');quantity.type='number';quantity.min='1';quantity.max='9999';quantity.step='1';quantity.value='1';quantity.setAttribute('aria-label','구매 수량');
 const quote=doc.createElement('p'),pocket=doc.createElement('p'),status=doc.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const confirm=doc.createElement('button'),retry=doc.createElement('button'),cancel=doc.createElement('button');for(const b of[confirm,retry,cancel])b.type='button';confirm.textContent='구매 확인';retry.textContent='저장 재시도';cancel.textContent='닫기';retry.hidden=true;
 panel.append(title,balance,product,quantity,quote,pocket,status,confirm,retry,cancel);node.append(panel);container.append(node);
 const live=()=>shown&&!disposed&&getWorld()===owner&&nativeController.isCurrent(selection,owner);
 function setControls(){const pending=!!owner?.story.pendingCommit;product.disabled=quantity.disabled=uiBusy||pending;confirm.disabled=uiBusy||pending||!displayedQuote;retry.hidden=!controller.canRetry;retry.disabled=uiBusy||!controller.canRetry;cancel.textContent=uiBusy?'닫기 · 진행 중인 처리는 계속됩니다':'닫기';}
 function refreshQuote(){
  displayedQuote=null;const w=getWorld(),s=w.snapshot(),item=w.catalog.itemContract[product.value];balance.textContent='잔액: '+String(s.economy?.money??'사용 불가');
  if(item){const owned=(item.pocket==='items'?s.progress.items:s.inventory)[item.id]??0;pocket.textContent=`가방: ${item.pocket==='items'?'아이템':'볼'} · 보유 ${owned} / 9999`;}else pocket.textContent='';
  try{displayedQuote=controller.quote(product.value,Number(quantity.value));quote.textContent=`단가 ${displayedQuote.unitPrice} × ${displayedQuote.quantity} = 총액 ${displayedQuote.cost} · 재고: ${displayedQuote.stockPolicy==='UNLIMITED_APPROVED'?'승인 무제한':displayedQuote.stockPolicy}`;}catch(error){quote.textContent=error.message;}
  setControls();
 }
 function refreshMenu(){unlock();const selected=product.value;menu=controller.open();product.replaceChildren();for(const item of menu.items){const o=doc.createElement('option');o.value=item.id;o.textContent=item.label+(item.enabled?'':' · '+(item.reason??'사용 불가'));o.disabled=!item.enabled;product.append(o);}const id=menu.items.find(i=>i.id===selected&&i.enabled)?.id??menu.items.find(i=>i.enabled)?.id;product.value=id??'';refreshQuote();if(shown)lock();}
 async function execute(retrying=false){
  if(!live()||uiBusy)return false;
  if(!retrying){let fresh;try{fresh=controller.quote(product.value,Number(quantity.value));}catch(error){status.textContent=error.message;refreshQuote();return false;}if(!same(fresh,displayedQuote)){status.textContent='견적이 변경되었습니다. 새 총액을 확인한 뒤 다시 선택하세요.';refreshQuote();return false;}}
  uiBusy=true;status.textContent=retrying?'기존 구매 저장 재시도 중 · 다시 구매하지 않습니다.':'구매 처리 결과 확인 중';setControls();unlock();
  try{const result=retrying?await controller.retryCommit():await controller.buy({token:menu.token,itemId:product.value,quantity:Number(quantity.value),transactionId:transactionIdFactory()});if(!live())return false;uiBusy=false;status.textContent=result.purchased?'구매 완료 · 잔액과 가방 반영을 확인했습니다.':'이미 처리된 거래입니다. 추가 구매·차감은 하지 않았습니다.';try{onMessage(status.textContent)}catch{}refreshMenu();return true;}
  catch(error){if(!live())return false;uiBusy=false;status.textContent=owner.story.pendingCommit?'저장 확인 필요 · 같은 구매의 저장 재시도만 가능합니다.':'구매하지 못했습니다. '+error.message;if(!owner.story.pendingCommit)refreshMenu();else setControls();return false;}
  finally{uiBusy=false;if(!disposed&&getWorld()===owner&&nativeController.isCurrent(selection,owner)){try{onStateChanged()}catch{}}if(live()){lock();setControls();}}
 }
 confirm.onclick=()=>execute(false);retry.onclick=()=>execute(true);product.onchange=quantity.oninput=()=>{if(live()&&!uiBusy)refreshQuote();};
 function close(reason='closed'){if(!shown)return {closed:false};shown=false;const result=controller.close();node.style.display='none';unlock();try{releasePause?.();}finally{releasePause=null;priorFocus?.focus?.();priorFocus=null;}return {closed:true,reason,...result};}
 cancel.onclick=()=>close('button');
 function keydown(e){if(!shown)return;const key=e.key?.toLowerCase();if(key==='tab'){e.preventDefault();e.stopImmediatePropagation?.();const buttons=[product,quantity,confirm,retry,cancel].filter(b=>!b.disabled&&!b.hidden),i=buttons.indexOf(doc.activeElement??e.target),j=i<0?(e.shiftKey?buttons.length-1:0):(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length;buttons[j]?.focus?.();return;}
  if(key==='escape'||key==='b'&&!['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)){e.preventDefault();e.stopImmediatePropagation?.();if(!e.repeat)close(key);return;}
  if(node.contains(e.target)){e.stopImmediatePropagation?.();if((key==='enter'||key===' ')&&e.repeat)e.preventDefault();return;}
  if(['enter',' ','arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','z','x'].includes(key)){e.preventDefault();e.stopImmediatePropagation?.();}
 }
 windowTarget.addEventListener('keydown',keydown,true);
 return {
  open(){if(disposed||shown||uiBusy||controller.pending)return {accepted:false,reason:'SHOP_BUSY'};const w=getWorld();if(w?.busy||w?.inputLocked||!nativeController.canPurchase())return {accepted:false,reason:'SHOP_NATIVE_LOCATION_REQUIRED'};owner=w;selection=nativeController.capture(w);try{refreshMenu();const release=acquirePresentationPause();if(typeof release!=='function')throw Error('SHOP_PRESENTATION_RELEASE_REQUIRED');releasePause=release;priorFocus=doc.activeElement;shown=true;node.style.display='flex';status.textContent='상품과 수량을 확인하세요. 현재 지도와 위치는 유지됩니다.';nativeController.stop?.();lock();product.focus?.();return {accepted:true};}catch(error){controller.close();releasePause?.();releasePause=null;return {accepted:false,reason:error.message};}},
  frame(){if(shown&&(getWorld()!==owner||!nativeController.isCurrent(selection,owner)))close('native-session-changed');},
  close,
  dispose(){if(disposed)return;close('disposed');disposed=true;controller.dispose();windowTarget.removeEventListener('keydown',keydown,true);node.remove();},
  get active(){return shown;},get busy(){return uiBusy||controller.pending;},
 };
}
