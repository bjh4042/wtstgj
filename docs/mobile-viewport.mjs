import {installCanonicalMobileControls} from './world/mobile-controls.mjs';
/* Additive viewport repair. No game state, save or input-policy changes. */
export function viewportBox(viewport, fallback={width:960,height:640}) {
 const positive=(n,d)=>Number.isFinite(n)&&n>0?n:d;
 return {width:positive(viewport?.width,fallback.width),height:positive(viewport?.height,fallback.height),left:Math.max(0,viewport?.offsetLeft||0),top:Math.max(0,viewport?.offsetTop||0)};
}
export function installMobileViewport(doc=globalThis.document,win=globalThis.window){
 if(!doc||!win)return()=>{};
 const update=()=>{const v=viewportBox(win.visualViewport,{width:win.innerWidth,height:win.innerHeight});for(const [k,n]of Object.entries(v))doc.documentElement.style.setProperty('--mobile-view-'+k,n+'px');};
 update();win.addEventListener('resize',update);win.visualViewport?.addEventListener('resize',update);win.visualViewport?.addEventListener('scroll',update);
 const controls=doc.querySelector('#modal > .dialog-controls');
 if(controls&&!controls.dataset.mobileRepaired){controls.dataset.mobileRepaired='true';controls.setAttribute('aria-label','터치 방향키와 결정, 돌아가기');for(const [dir,label,target]of [['up','↑','dialog-prev'],['down','↓','dialog-next']]){const b=doc.createElement('button');b.type='button';b.dataset.modalDir=dir;b.textContent=label;b.setAttribute('aria-label',dir==='up'?'이전 항목':'다음 항목');b.onclick=()=>doc.getElementById(target)?.click();controls.prepend(b);}doc.getElementById('dialog-prev')?.setAttribute('data-modal-dir','left');doc.getElementById('dialog-next')?.setAttribute('data-modal-dir','right');}
 return()=>{win.removeEventListener('resize',update);win.visualViewport?.removeEventListener('resize',update);win.visualViewport?.removeEventListener('scroll',update);};
}
if(typeof document!=='undefined'){
 installMobileViewport();
 let root=null,handle=null;
 const sync=()=>{const mapControls=document.querySelector('.opening-map-controls');if(mapControls&&!mapControls.querySelector('[data-opening-b]')){const b=document.createElement('button');b.type='button';b.dataset.openingB='';b.textContent='B';b.setAttribute('aria-label','돌아가기');b.onclick=()=>document.getElementById('dialog-b')?.click();mapControls.append(b);}const next=document.getElementById('canonical-world');if(next===root)return;handle?.destroy();root=next;handle=root?installCanonicalMobileControls(root):null;};
 const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});sync();
 window.addEventListener('pagehide',()=>{observer.disconnect();handle?.destroy();});
}
