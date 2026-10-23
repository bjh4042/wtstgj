import {presentationAudio} from './audio-hooks.mjs';
export const BATTLE_ENTRY_TIMING=Object.freeze({notice:480,fieldEffect:180,transition:180,stripeMs:90});
export const BATTLE_ENTRY_SEQUENCES=Object.freeze({
 WILD:Object.freeze([{stage:'encounter-trigger',duration:0},{stage:'input-lock',duration:0},{stage:'field-effect',duration:180},{stage:'transition',duration:180},{stage:'battle-start',duration:0}].map(Object.freeze)),
 TRAINER:Object.freeze([{stage:'trainer-detect',duration:0},{stage:'notice',duration:480},{stage:'input-lock',duration:0},{stage:'facing',duration:0},{stage:'approach',duration:null,optional:true},{stage:'dialogue',duration:null},{stage:'transition',duration:360},{stage:'battle-start',duration:0}].map(Object.freeze))
});
/** Existing core owns notice/approach/dialogue. This describes its phases without a second controller. */
export function fieldBattleStage(core){const s=core.sequence;if(core.battleReady)return 'battle-start';if(s?.kind==='trainer')return s.phase==='notice'?'notice':s.phase==='approach'?'approach':'dialogue';if(s?.kind==='encounter')return s.elapsed<BATTLE_ENTRY_TIMING.fieldEffect?'field-effect':'transition';return null}
export function transitionFrame(elapsed){return {stage:elapsed<BATTLE_ENTRY_TIMING.fieldEffect?'field-effect':'transition',stripe:Math.floor(Math.max(0,elapsed)/BATTLE_ENTRY_TIMING.stripeMs)%2===0,done:elapsed>=BATTLE_ENTRY_TIMING.fieldEffect+BATTLE_ENTRY_TIMING.transition}}
/** For entries outside FieldCore. The caller already owns the input lock (battle state). Bounded and fail-open. */
export async function playBattleEntry({element=null,coreCompleted=false,reduced=false,sfxId='battle.transition'}={}){
 presentationAudio.emit(sfxId,{channel:'battle-transition'});if(coreCompleted||reduced||!element?.ownerDocument)return {skipped:true};
 let overlay,animation,timer;try{const d=element.ownerDocument,rect=element.getBoundingClientRect();overlay=d.createElement('div');overlay.setAttribute('aria-hidden','true');overlay.style.cssText=`position:fixed;pointer-events:none;z-index:39;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;background:repeating-linear-gradient(#142333 0 8px,transparent 8px 16px)`;d.body.append(overlay);
  if(typeof overlay.animate!=='function')return {skipped:true};animation=overlay.animate([{opacity:0},{opacity:.7,offset:.5},{opacity:1}],{duration:BATTLE_ENTRY_TIMING.fieldEffect+BATTLE_ENTRY_TIMING.transition});await Promise.race([animation.finished,new Promise(resolve=>{timer=setTimeout(resolve,600)})]);
 }catch{}finally{clearTimeout(timer);try{animation?.cancel();overlay?.remove()}catch{}}return {completed:true};
}
