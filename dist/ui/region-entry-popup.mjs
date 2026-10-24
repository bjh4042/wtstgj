/** Display-only map-entry notice. Authored in-game labels, never device location.
 * Reuse the shell's measured location node: fading reserves its full footprint.
 * Updates are edge-triggered by scene ID; ticks/movement do not restart timers.
 */
export const REGION_POPUP_HOLD_MS=3000;
export const REGION_POPUP_FADE_MS=180;
export function createRegionEntryPopup({target=null,document:doc=globalThis.document,window:win=globalThis.window,
 setTimer=(fn,ms)=>win.setTimeout(fn,ms),clearTimer=id=>win.clearTimeout(id),
 reducedMotion=()=>win.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false}={}){
 let node=null,lastKey=null,label='',phase='idle',holdTimer=null,fadeTimer=null,generation=0,disposed=false,suspended=false;
 // The shared shell owns Help. A toggle dismisses immediately, but every
 // later map update must also respect its persistent open state.
 const helpOpen=()=>{const help=node?.closest('.shared-shell-header')?.querySelector('.shared-shell-help');return !!(help?.open||help?.hasAttribute('open'))};
 const active=()=>!disposed&&!suspended&&doc.visibilityState!=='hidden'&&!helpOpen();
 function paint(){
  if(!node)return;
  node.classList.add('eco-region-popup');
  node.dataset.regionState=phase;
  node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');
  node.setAttribute('aria-label','현재 지역');node.setAttribute('aria-hidden',String(phase!=='visible'));
  if(label&&node.textContent!==label)node.textContent=label;
 }
 function cancelTimers(){generation++;if(holdTimer!==null)clearTimer(holdTimer);if(fadeTimer!==null)clearTimer(fadeTimer);holdTimer=fadeTimer=null}
 function dismiss(){cancelTimers();phase='idle';paint()}
 function update({key,label:nextLabel,target:nextTarget=node,fieldVisible=true}={}){
  if(disposed)return false;
  if(nextTarget!==node){if(node){node.dataset.regionState='idle';node.setAttribute('aria-hidden','true')}node=nextTarget;paint()}
  const next=typeof nextLabel==='string'?nextLabel.trim():'';
  // IDs are only comparison keys. A missing authored name fails closed.
  if(typeof key!=='string'||!key||!/[가-힣]/u.test(next)||/^world:/i.test(next)){dismiss();return false}
  const changed=key!==lastKey;lastKey=key;
  if(!active()||!fieldVisible){label=next;dismiss();return false}
  if(!changed){paint();return false}
  dismiss();label=next;phase='visible';paint();
  const token=generation;
  holdTimer=setTimer(()=>{
   if(disposed||token!==generation)return;holdTimer=null;
   if(!active()||reducedMotion()){phase='idle';paint();return}
   phase='fading';paint();
   fadeTimer=setTimer(()=>{if(disposed||token!==generation)return;fadeTimer=null;phase='idle';paint()},REGION_POPUP_FADE_MS);
  },REGION_POPUP_HOLD_MS);
  return true;
 }
 function reset(){lastKey=null;dismiss()}
 function onToggle(event){if(event.target?.classList?.contains('shared-shell-help')&&event.target.open&&event.target.parentElement?.contains(node))dismiss()}
 function onVisibility(){if(doc.visibilityState==='hidden')dismiss()}
 function onPageHide(event){if(event.persisted){suspended=true;dismiss()}else dispose()}
 function onPageShow(){suspended=false} // Never replay a pre-hide notice after Back.
 function dispose(){if(disposed)return;dismiss();disposed=true;doc.removeEventListener('visibilitychange',onVisibility);doc.removeEventListener('toggle',onToggle,true);win.removeEventListener('pagehide',onPageHide);win.removeEventListener('pageshow',onPageShow)}
 doc.addEventListener('visibilitychange',onVisibility);doc.addEventListener('toggle',onToggle,true);win.addEventListener('pagehide',onPageHide);win.addEventListener('pageshow',onPageShow);
 if(target){node=target;paint()}
 return {update,dismiss,reset,dispose};
}
