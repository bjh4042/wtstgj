import {drawApprovedBattleSpecies,approvedSpeciesArt} from '../approved-species.mjs';
import {drawSharedBattleCue} from './shared-battle-sequences.mjs';
export function validateEvolutionPresentation({before,after,confirmed}={}){
 if(confirmed!==true||!before?.instanceId||before.instanceId!==after?.instanceId||before.speciesId===after.speciesId||![before,after].every(m=>/^SPECIES_\d{3}$/.test(m.speciesId)&&(!m.namespace||m.namespace==='canonical')))throw new TypeError('Confirmed same-instance canonical before/after species change required');
 return {before:{instanceId:before.instanceId,speciesId:before.speciesId,namespace:'canonical'},after:{instanceId:after.instanceId,speciesId:after.speciesId,namespace:'canonical'}};
}
/** Visual only, after the host has committed evolution. Never mutates a creature/save. */
export function createEvolutionPresentation({host,onFinish=()=>{},document:doc=host?.ownerDocument??globalThis.document,raf=fn=>requestAnimationFrame(fn),caf=id=>cancelAnimationFrame(id),setTimer=setTimeout,clearTimer=clearTimeout,now=()=>performance.now(),drawSpecies=drawApprovedBattleSpecies,drawEffect=drawSharedBattleCue}={}){
 let active=null,serial=0;
 function settle(run,reason){if(active!==run||run.settled)return;run.settled=true;active=null;try{caf(run.raf)}catch{}try{clearTimer(run.timer)}catch{}try{run.dialog?.close()}catch{}try{run.dialog?.remove()}catch{}try{if(run.focus?.isConnected)run.focus.focus({preventScroll:true})}catch{}const result={reason,presentationOnly:true,instanceId:run.binding.before.instanceId};run.resolve(result);try{onFinish(result)}catch{}}
 function stop(){if(active)settle(active,'skipped')}
 function play(input){
  let binding;try{binding=validateEvolutionPresentation(input)}catch(error){return Promise.reject(error)}
  stop();return new Promise(resolve=>{
   const run={token:++serial,resolve,binding,focus:doc?.activeElement,settled:false,raf:null,timer:null};active=run;
   if(!doc?.createElement||!host?.append){settle(run,'unavailable');return}
   try{
    const dialog=doc.createElement('dialog');run.dialog=dialog;dialog.setAttribute('aria-labelledby','evolution-title-'+run.token);dialog.setAttribute('aria-describedby','evolution-description-'+run.token);dialog.style.cssText='width:min(92vw,620px);max-height:90dvh;box-sizing:border-box;overflow:auto;padding:20px;border:2px solid #6b8a67;border-radius:20px;background:#f8f5e9;color:#173e34;';
    const title=doc.createElement('h2');title.id='evolution-title-'+run.token;title.textContent='새로운 모습으로 성장했어요';title.style.margin='0 0 12px';
    const canvas=doc.createElement('canvas');canvas.style.cssText='display:block;width:100%;height:auto;aspect-ratio:1.5;background:#e6edda;border-radius:12px;';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','확정된 진화 전후 모습');
    const text=doc.createElement('p');text.id='evolution-description-'+run.token;text.setAttribute('role','status');text.setAttribute('aria-live','polite');
    const names=input.names??{},oldName=String(names.before??binding.before.speciesId),newName=String(names.after??binding.after.speciesId);text.textContent=oldName+' → '+newName+' · 진화는 완료되었습니다.';
    const button=doc.createElement('button');button.type='button';button.textContent='연출 건너뛰기';button.style.cssText='min-height:44px;min-width:140px;padding:10px 16px;border:2px solid #426b4d;border-radius:10px;background:#fffdf5;color:#173e34;font:inherit;cursor:pointer;';button.addEventListener('click',()=>settle(run,'skipped'));
    dialog.addEventListener('cancel',event=>{event.preventDefault();settle(run,'skipped')});dialog.addEventListener('close',()=>settle(run,'skipped'));dialog.append(title,canvas,text,button);host.append(dialog);
    if(typeof dialog.showModal!=='function'){settle(run,'unavailable');return}dialog.showModal();button.focus();
    const quiet=!!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches,start=now(),duration=quiet?1200:2400;
    const cue={key:1,kind:'sequence',id:'SEQ_EVOLUTION',mode:'evolve',side:'player',duration:1500,reducedMotion:quiet,actors:{player:binding.before},visibility:{player:1,opponent:0}};
    run.timer=setTimer(()=>settle(run,'timeout'),4000);
    function frame(time){if(active!==run)return;try{
      if(!dialog.isConnected){settle(run,'detached');return}
      const elapsed=Math.max(0,time-start),rect=canvas.getBoundingClientRect(),width=Math.max(220,Math.min(580,rect.width||540)),height=width/1.5,dpr=Math.min(3,Math.max(1,doc.defaultView?.devicePixelRatio??1));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const c=canvas.getContext('2d');if(!c){settle(run,'unavailable');return}c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);c.fillStyle='#e6edda';c.fillRect(0,0,width,height);
      const mon=quiet||elapsed>=1500?binding.after:binding.before,anchor={x:width/2,y:height*.86,size:height*.72};
      if(approvedSpeciesArt(mon,'front'))drawSpecies(c,mon,'front',anchor.x,anchor.y,{size:anchor.size});else{c.fillStyle='#173e34';c.font='16px sans-serif';c.textAlign='center';c.fillText('승인 이미지 준비 중',width/2,height/2)}
      drawEffect(c,cue,quiet?1500:Math.min(elapsed,1500),{width,height,player:anchor,enemy:anchor});canvas.setAttribute('aria-label',(mon===binding.after?newName:oldName)+' · 진화는 이미 완료되었습니다');
      if(elapsed>=duration){settle(run,'completed');return}run.raf=raf(frame);
    }catch{settle(run,'render-unavailable')}}
    run.raf=raf(frame);
   }catch{settle(run,'unavailable')}
  });
 }
 return {play,stop,get busy(){return active!==null}};
}
