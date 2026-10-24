/** Coordinate the ordinary menu with the retained shell's real Help/status nodes.
 * The shell and all pinned assets stay unchanged. Only one interactive overlay
 * owns focus; status is relocated, never cleared, cloned or made unclickable. */
export function installOrdinaryOverlays({root,aside,content,isMenuOpen,closeMenu,openMenu}){
 const doc=root.ownerDocument,win=doc.defaultView;
 let disposed=false,suspended=false,lastHelpOpen=false,statusAnchor=null,statusNode=null,lastOwnedFocus=null,repairingFocus=false;
 const helpSemantics=new WeakMap();
 const help=()=>root.querySelector('details.shared-shell-help');
 const helpButton=()=>root.querySelector('[data-shell-control="help"]');
 const helpOpen=()=>!!(help()?.open||help()?.hasAttribute('open'));
 const focus=node=>{if(!disposed&&!suspended&&doc.visibilityState!=='hidden')node?.focus({preventScroll:true})};
 const visible=node=>!node.disabled&&!node.closest('[hidden]')&&(!win.getComputedStyle||!['none','hidden'].includes(win.getComputedStyle(node).display)&&win.getComputedStyle(node).visibility!=='hidden');
 const helpControls=()=>[...(help()?.querySelectorAll('summary,button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')??[])].filter(visible);
 const focusHelp=()=>focus(helpControls().find(n=>n.matches('.shared-shell-help-content button'))??helpControls()[0]);
 function reflectHelpSemantics(open){
  const node=help();if(!node)return;
  if(open){
   if(!helpSemantics.has(node))helpSemantics.set(node,Object.fromEntries(['role','aria-modal','aria-label'].map(key=>[key,node.getAttribute(key)])));
   node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-label','도움말');
  }else if(helpSemantics.has(node)){
   for(const [key,value] of Object.entries(helpSemantics.get(node)))if(value===null)node.removeAttribute(key);else node.setAttribute(key,value);
   helpSemantics.delete(node);
  }
 }
 function closeHelp({restoreFocus=true}={}){
  const node=help();if(node){node.open=false;node.removeAttribute('open')}
  lastHelpOpen=false;reflectHelpSemantics(false);helpButton()?.setAttribute('aria-expanded','false');
  if(restoreFocus)focus(helpButton());
 }
 function syncHelp({focusOpen=false}={}){
  if(disposed)return;const open=helpOpen(),changed=open!==lastHelpOpen;lastHelpOpen=open;
  reflectHelpSemantics(open);helpButton()?.setAttribute('aria-expanded',String(open));
  if(open){if(isMenuOpen())closeMenu();if(changed||focusOpen)focusHelp()}
  else if(changed&&!isMenuOpen())focus(helpButton());
 }
 function syncStatus(){
  if(disposed)return;
  const node=statusNode??root.querySelector('[data-w="status"]');if(!node)return;
  // The fixed shell already measures this header, including the separate 44px
  // nearby row. A status row here is budgeted by that one existing fit owner.
  const header=root.classList.contains('ordinary-world')?root.querySelector('.shared-shell-header.qa-safe-nearby-header'):null;
  const nearby=header?.querySelector(':scope > .qa-safe-nearby-band');
  if(isMenuOpen()||nearby){
   if(!statusAnchor){statusAnchor=doc.createComment('ordinary status return');node.before(statusAnchor);statusNode=node}
   if(isMenuOpen()){if(node.parentElement!==aside)aside.insertBefore(node,content)}
   else if(node.parentElement!==header||node.previousElementSibling!==nearby)nearby.after(node);
  }else if(statusAnchor){
   if(statusAnchor.parentNode)statusAnchor.replaceWith(statusNode);
   statusAnchor=null;statusNode=null;
  }
 }
 function update({opening=false}={}){if(opening)closeHelp({restoreFocus:false});syncStatus()}
 // Keep pointer defaults from focusing the background before click capture runs.
 // Handoff/dock clicks remain native; cancelling their down event also preserves
 // the selected in-overlay control for dock A. No permanent inert/disabled state.
 const owner=()=>helpOpen()?help():isMenuOpen()?aside:null;
 const activeOwner=()=>!disposed&&!suspended&&root.isConnected&&doc.visibilityState!=='hidden'?owner():null;
 function restoreOwnedFocus(node){
  if(repairingFocus)return;
  const current=doc.activeElement;if(node.contains(current)&&visible(current))return;
  const target=node.contains(lastOwnedFocus)&&visible(lastOwnedFocus)?lastOwnedFocus:
   node===aside?aside.querySelector('[data-menu-focus="heading"]')??aside:
   helpControls().find(n=>n.matches('.shared-shell-help-content button'))??helpControls()[0];
  repairingFocus=true;try{focus(target);lastOwnedFocus=target}finally{repairingFocus=false}
 }
 const handoff=target=>root.contains(target)&&(target.closest?.('[data-shell-control="help"],[data-w="menu"],[data-w="cancel"],[data-w="action"]')||target.closest?.('summary')?.parentElement===help());
 function onPointerDown(event){
  const node=activeOwner();if(!node||node.contains(event.target))return;
  event.preventDefault();if(!handoff(event.target))event.stopImmediatePropagation();restoreOwnedFocus(node);
 }
 function onFocusIn(event){
  const node=activeOwner();if(!node||repairingFocus)return;
  if(node.contains(event.target)&&visible(event.target)){lastOwnedFocus=event.target;return}
  event.stopImmediatePropagation();restoreOwnedFocus(node);
 }
 const consume=event=>{event.preventDefault();event.stopImmediatePropagation();return true};
 function activateHelp(){
  if(!helpOpen())return false;
  const controls=helpControls(),active=doc.activeElement,node=controls.includes(active)?active:controls.find(n=>n.matches('.shared-shell-help-content button'))??controls[0];
  node?.click();return true;
 }
 function handleKeydown(event){
  if(!helpOpen())return false;
  const node=help(),controls=helpControls(),active=doc.activeElement,owned=node.contains(active),first=controls[0],last=controls.at(-1);
  if(event.key==='Tab'){
   if(!owned){consume(event);focus(event.shiftKey?last:first)}
   else if(event.shiftKey&&active===first){consume(event);focus(last)}
   else if(!event.shiftKey&&active===last){consume(event);focus(first)}
   return true;
  }
  if(event.isComposing)return true;
  if(['Escape','x','X'].includes(event.key)){consume(event);if(!event.repeat)closeHelp();return true}
  if(['m','M'].includes(event.key)){consume(event);if(!event.repeat){openMenu();if(!isMenuOpen())focusHelp()}return true}
  if(!owned){focusHelp();if(['Enter',' '].includes(event.key))return consume(event)}
  if(active?.matches('input,select,textarea,[contenteditable]:not([contenteditable="false"])'))return true;
  if(event.repeat&&['Enter',' ','z','Z'].includes(event.key))return consume(event);
  if(['z','Z'].includes(event.key)){consume(event);activateHelp();return true}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
   consume(event);const index=controls.indexOf(doc.activeElement),delta=['ArrowUp','ArrowLeft'].includes(event.key)?-1:1;
   focus(controls[(index+delta+controls.length)%controls.length]);return true;
  }
  if(['w','a','s','d'].includes(event.key.toLowerCase()))return consume(event);
  return true; // Stop field commands; native one-shot button/link activation remains native.
 }
 function onClick(event){
  if(disposed||suspended)return;
  const target=event.target,node=help();
  if(!root.contains(target)){if(activeOwner())consume(event);return}
  const toggle=target.closest?.('[data-shell-control="help"]'),summary=target.closest?.('summary');
  if(toggle||node&&summary?.parentElement===node){
   // Capture closes the menu before the shell/native Help toggle. The microtask
   // also reconciles its final state after native summary/button activation.
   if(isMenuOpen())closeMenu();queueMicrotask(()=>syncHelp({focusOpen:true}));return;
  }
  if(node?.contains(target)){queueMicrotask(()=>syncHelp());return}
  if((helpOpen()||isMenuOpen()&&!aside.contains(target))&&!target.closest?.('[data-w="menu"],[data-w="cancel"],[data-w="action"]'))consume(event);
 }
 function onToggle(event){if(event.target===help())syncHelp()}
 const onPageHide=()=>{suspended=true},onResume=()=>{const node=activeOwner();if(node)restoreOwnedFocus(node)},onPageShow=()=>{suspended=false;onResume()};
 doc.addEventListener('click',onClick,true);doc.addEventListener('toggle',onToggle,true);
 doc.addEventListener('pointerdown',onPointerDown,true);doc.addEventListener('mousedown',onPointerDown,true);doc.addEventListener('focusin',onFocusIn,true);doc.addEventListener('visibilitychange',onResume);
 win.addEventListener('pagehide',onPageHide);win.addEventListener('pageshow',onPageShow);
 // The shell may be installed after the menu. Reconcile only the same status
 // node if the shell subsequently moves it; never take over shell measurement.
 const observer=win.MutationObserver?new win.MutationObserver(syncStatus):null;
 observer?.observe(root,{childList:true,subtree:true});
 return {update,handleKeydown,activateHelp,closeHelp,get helpOpen(){return helpOpen()},dispose(){
  if(disposed)return;disposed=true;lastOwnedFocus=null;reflectHelpSemantics(false);if(statusAnchor?.parentNode)statusAnchor.replaceWith(statusNode);statusAnchor=null;statusNode=null;observer?.disconnect();
  doc.removeEventListener('click',onClick,true);doc.removeEventListener('toggle',onToggle,true);
  doc.removeEventListener('pointerdown',onPointerDown,true);doc.removeEventListener('mousedown',onPointerDown,true);doc.removeEventListener('focusin',onFocusIn,true);doc.removeEventListener('visibilitychange',onResume);win.removeEventListener('pagehide',onPageHide);win.removeEventListener('pageshow',onPageShow);
 }};
}
