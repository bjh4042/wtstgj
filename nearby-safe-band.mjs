/** QA-only layout repair. The published shell remains the only viewport fit owner. */
export function installNearbySafeBand({document:doc=globalThis.document,window:win=globalThis.window}={}){
 let disposed=false,observer=null;
 function update(){if(disposed)return;const root=doc.getElementById('canonical-world');if(!root?.classList.contains('shared-game-shell'))return;const header=root.querySelector('.shared-shell-header'),choices=root.querySelector('[data-w="choices"]');if(!header||!choices)return;
  if(!header.classList.contains('qa-safe-nearby-header'))header.classList.add('qa-safe-nearby-header');
  if(!choices.classList.contains('qa-safe-nearby-band'))choices.classList.add('qa-safe-nearby-band');
  if(choices.parentElement!==header)header.append(choices);
 }
 observer=new win.MutationObserver(update);observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 const restore=()=>update();win.addEventListener('pageshow',restore);update();
 return{update,dispose(){if(disposed)return;disposed=true;observer.disconnect();win.removeEventListener('pageshow',restore)}};
}
if(typeof document!=='undefined')installNearbySafeBand();
