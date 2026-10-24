import {approvedAtlasStatuses,retryFailedApprovedAtlases,subscribeApprovedAtlases} from '../approved-atlas-runtime.mjs';
import {loadApprovedPlayers} from '../art/approved-player-field.mjs';
import {repaintApprovedIntroAfterRetry,invalidateApprovedIntroRepaints} from '../art/approved-intro.mjs';

/** A failure-only, in-flow recovery control. It never changes game state or saves. */
export function installAtlasRecoveryStatus(doc=document,win=window){
 const box=doc.createElement('div'),label=doc.createElement('span'),button=doc.createElement('button');
 box.id='ordinary-atlas-recovery-status';
 box.hidden=true;
 box.setAttribute('role','status');
 box.setAttribute('aria-live','polite');
 box.style.cssText='box-sizing:border-box;flex:none;max-width:100%;max-height:160px;overflow:auto;padding:10px 12px;margin:8px 0;border:1px solid #397f99;border-radius:10px;background:#f4fbfc;color:#16384a;font:16px/1.5 system-ui,sans-serif;word-break:keep-all;overflow-wrap:break-word';
 label.textContent='인물 이미지를 불러오지 못했거나 잠시 멈췄어요. 연결을 확인하고 다시 시도해 주세요.';
 button.type='button';
 button.textContent='인물 이미지 다시 불러오기';
 button.style.cssText='box-sizing:border-box;min-height:44px;min-width:44px;max-width:100%;margin:6px 0 0 8px;padding:8px 12px;border:1px solid #397f99;border-radius:8px;background:#fff;color:#16384a;font:inherit;line-height:1.5;white-space:normal;overflow-wrap:break-word';
 box.append(label,button);
 let disposed=false,busy=false,pageSuspended=false,generation=0;
 const isActive=token=>!disposed&&!pageSuspended&&token===generation&&doc.visibilityState!=='hidden';
 const hasProblem=()=>approvedAtlasStatuses().some(state=>state.needed!==false&&['failed','paused'].includes(state.status));
 const mount=()=>{
  if(!isActive(generation))return;
  const canonical=doc.getElementById('canonical-world');
  // The canonical root's leading header area is outside .world-play and its canvas.
  const host=[...doc.querySelectorAll('dialog[open]')].at(-1)??canonical?.querySelector(':scope > header')??canonical??doc.body;
  if(host&&box.parentElement!==host)host.prepend(box);
 };
 const update=()=>{
  if(disposed)return;
  const hidden=!isActive(generation)||!hasProblem();
  if(box.hidden!==hidden)box.hidden=hidden;
  if(button.disabled!==busy)button.disabled=busy;
  mount();
 };
 // Keep native Enter/Space activation and Tab navigation. Keyup must still release
 // movement held before focus reached this control; never intercept keyup.
 const guard=event=>event.stopPropagation();
 box.addEventListener('keydown',guard);
 button.onclick=async()=>{
  if(busy||!isActive(generation)||!hasProblem())return;
  const token=++generation;
  busy=true;update();
  try{
   await retryFailedApprovedAtlases();
   if(!isActive(token))return;
   await loadApprovedPlayers();
   if(!isActive(token))return;
   await repaintApprovedIntroAfterRetry({isActive:()=>isActive(token)});
   if(!isActive(token))return;
  }catch{
   // The atlas manager owns failure status. Never turn an image error into a game error.
  }finally{
   if(!disposed&&token===generation){busy=false;update()}
  }
 };
 const unsubscribe=subscribeApprovedAtlases(update);
 // Mount only, not update: inserting or updating the control cannot feed a text-
 // mutation loop. Equality above makes a repeated observer callback a no-op.
 const observer=new win.MutationObserver(mount);
 observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
 function pause(){
  if(disposed)return;
  generation++;busy=false;invalidateApprovedIntroRepaints();update();
 }
 function resume(){
  if(!isActive(generation))return;
  update();
  const token=generation;
  void repaintApprovedIntroAfterRetry({isActive:()=>isActive(token)}).catch(()=>{});
 }
 function visibility(){if(doc.visibilityState==='hidden')pause();else resume()}
 function pagehide(event){
  if(disposed)return;
  if(event.persisted){pageSuspended=true;pause()}
  else dispose();
 }
 function pageshow(){if(disposed)return;pageSuspended=false;resume()}
 function dispose(){
  if(disposed)return;
  disposed=true;generation++;busy=false;invalidateApprovedIntroRepaints();
  unsubscribe();observer.disconnect();
  box.removeEventListener('keydown',guard);button.onclick=null;
  doc.removeEventListener('visibilitychange',visibility);
  win.removeEventListener('pagehide',pagehide);win.removeEventListener('pageshow',pageshow);
  box.remove();
 }
 doc.addEventListener('visibilitychange',visibility);
 win.addEventListener('pagehide',pagehide);win.addEventListener('pageshow',pageshow);
 update();
 return {box,dispose};
}
