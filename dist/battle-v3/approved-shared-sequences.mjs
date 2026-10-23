/** Isolated presentation only. Caller owns all outcomes, species and gameplay. */
export const IDS=Object.freeze(['SEQ_CAPTURE','SEQ_SUMMON_RECALL','SEQ_EVOLUTION']);
export const DURATIONS=Object.freeze({attempt:1000,success:900,failure:700,appear:800,recall:800,evolve:1500});
const labels={attempt:'포획 시도 중 · 결과 대기',success:'포획 성공 · 외부 확정 결과',failure:'포획 실패 · 외부 확정 결과',appear:'등장',recall:'돌아가기',evolve:'진화 연출 · 외부 확정 결과'};
const clamp=x=>Math.max(0,Math.min(1,x));
const num=x=>Math.round(x*1000)/1000;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function valid(id,mode){if(!IDS.includes(id)||!(id==='SEQ_CAPTURE'?['attempt','success','failure']:id==='SEQ_SUMMON_RECALL'?['appear','recall']:['evolve']).includes(mode))throw new RangeError('Invalid sequence or mode');}
function leaf(x,y,scale=1,angle=0){return `<g transform="translate(${num(x)} ${num(y)}) rotate(${num(angle)}) scale(${num(scale)})" fill="#E0EAC0" stroke="#668D3F" stroke-width="1.5" stroke-linejoin="round"><path d="M-6 6Q-9-5 7-7Q10 6-6 6ZM-5 5L5-5"/></g>`;}
export function renderSequence({id,mode,elapsedMs=0,reducedMotion=false}){
 valid(id,mode);if(!Number.isFinite(elapsedMs))throw new RangeError('Finite elapsedMs required');
 const t=clamp(elapsedMs/DURATIONS[mode]),p=t*t*(3-2*t),active=t>0&&t<1;
 let svg='',actorOpacity=1;
 const label=labels[mode];
 // Quiet mode is static; recall removes the subject once at completion. Text persists separately.
 if(reducedMotion)svg=`<rect x="272" y="58" width="36" height="36" rx="10" fill="#FAF5E9" stroke="#173E34" stroke-width="2"/>${leaf(290,76,1.1)}`;
 else if(active){
  const opacity=num(Math.sin(Math.PI*t)*0.8);
  if(id==='SEQ_CAPTURE'){
   const r=mode==='attempt'?88-26*p:mode==='success'?62-12*p:62+45*p;
   svg=`<g opacity="${opacity}" fill="none" stroke="${mode==='failure'?'#A4753A':'#428769'}" stroke-width="2.5"><ellipse cx="216" cy="181" rx="${num(r)}" ry="${num(r*.24)}"/><path d="M${num(216-r)} 155Q${num(216-r-8)} 70 190 57M${num(216+r)} 155Q${num(216+r+8)} 70 242 57"/></g>`;
   for(let i=0;i<6;i++){const a=i*Math.PI/3+p*.6;svg+=`<g opacity="${opacity}">${leaf(216+Math.cos(a)*r,120+Math.sin(a)*r*.68,.85,a*180/Math.PI)}</g>`;}
   if(mode==='success')svg+=`<path d="M277 83L285 91L301 74" stroke="#173E34" stroke-width="3" fill="none" stroke-linecap="round" opacity="${opacity}"/>`;
   if(mode==='failure')svg+=`<path d="M279 76L297 94M297 76L279 94" stroke="#704E2F" stroke-width="3" opacity="${opacity}"/>`;
  }else if(id==='SEQ_SUMMON_RECALL'){
   actorOpacity=mode==='appear'?p:1-p;
   svg=`<ellipse cx="216" cy="185" rx="${num(28+50*(mode==='appear'?p:1-p))}" ry="15" fill="#C9E4D9" fill-opacity="${num(.25*Math.sin(Math.PI*t))}" stroke="#54989D" stroke-opacity="${opacity}" stroke-width="2"/>`;
   for(let i=0;i<8;i++){const x=170+(i%4)*30,y=mode==='appear'?185-p*(75+i*5):80+p*(75+i*3);svg+=`<g opacity="${opacity}">${leaf(x,y,.65,i*32)}</g>`;}
  }else{
   // Local open wreath, never a full-screen white fill or repeated pulse.
   const r=68+16*Math.sin(Math.PI*t);
   svg=`<ellipse cx="216" cy="121" rx="${num(r)}" ry="${num(r*.85)}" fill="none" stroke="#C79B28" stroke-width="3" stroke-dasharray="10 13" opacity="${opacity}"/>`;
   for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2+p*.3;svg+=`<g opacity="${opacity}">${leaf(216+Math.cos(a)*r,121+Math.sin(a)*r*.85,.85,a*180/Math.PI+45)}</g>`;}
  }
 }
 if(id==='SEQ_SUMMON_RECALL'){if(!reducedMotion)actorOpacity=mode==='appear'?p:1-p;else if(mode==='recall'&&t>=1)actorOpacity=0;}
 return {svg,label,actorOpacity,progress:t,visualComplete:t>=1,labelPersists:true,noMotion:reducedMotion,changesGameplay:false};
}
export function createSequenceController({onComplete=()=>{},onCancel=()=>{}}={}){
 let current=null,serial=0;
 function start(id,mode,{reducedMotion=false}={}){valid(id,mode);cancel('superseded');current={token:++serial,id,mode,elapsedMs:0,reducedMotion,settled:false,cancelled:false};return current.token;}
 function frame(token,elapsedMs){if(!current||token!==current.token||current.cancelled)return null;const out=renderSequence({...current,elapsedMs});current.elapsedMs=elapsedMs;
  if(out.visualComplete&&!current.settled){current.settled=true;onComplete({token,id:current.id,mode:current.mode,presentationOnly:true});}return out;}
 function resolve(token,outcome){if(!current||token!==current.token||current.cancelled||current.id!=='SEQ_CAPTURE'||current.mode!=='attempt')return null;if(!['success','failure'].includes(outcome))throw new RangeError('Explicit success or failure required');current={...current,token:++serial,mode:outcome,elapsedMs:0,settled:false};return current.token;}
 function cancel(reason='cancelled'){if(!current||current.cancelled)return false;current.cancelled=true;if(!current.settled)onCancel({token:current.token,reason,presentationOnly:true});return true;}
 function dismiss(){cancel('dismissed');current=null;}
 return {start,frame,resolve,cancel,dismiss,getState:()=>current?{...current}:null};
}
export function sceneSvg(output,actorData=''){return `<svg xmlns="http://www.w3.org/2000/svg" width="864" height="480" viewBox="0 0 432 240" role="img" aria-label="${esc(output.label)}"><rect width="432" height="240" fill="#F4F0E4"/><path d="M0 192Q100 166 216 188T432 180V240H0Z" fill="#DDE5CB"/><ellipse cx="216" cy="187" rx="64" ry="12" fill="#ADB99A" opacity="${num(.4*output.actorOpacity)}"/>${actorData?`<image href="${actorData}" x="116" y="28" width="200" height="200" opacity="${num(output.actorOpacity)}"/>`:''}${output.svg}</svg>`;}
