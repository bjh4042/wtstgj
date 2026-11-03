const status=document.querySelector('#status');
if(import.meta.env?.DEV!==true){status.textContent='개발 모드에서만 사용할 수 있는 이동 검수 화면입니다.';}
else{
 const {prepareNativeWalk}=await import('./session.mjs');
 const canvas=document.querySelector('#view'),ctx=canvas.getContext('2d'),map=document.querySelector('#map'),reset=document.querySelector('#reset'),keys=new Map(),pointers=new Map();
 const keyId=e=>e.code||e.key.toLowerCase();
 const keyDir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
 let current=null,pending=null,generation=0,raf=null,last=0,stopped=false,contextLost=false,lastText='';
 const clear=()=>{keys.clear();pointers.clear();};
 const active=()=>!stopped&&!contextLost&&document.visibilityState!=='hidden';
 function say(text){if(text!==lastText){lastText=text;status.textContent=text;}}
 function pause(){clear();current?.suspend();if(raf!==null)cancelAnimationFrame(raf);raf=null;last=0;}
 function resume(){if(!active()||!current)return;current.resume();last=0;if(raf===null)raf=requestAnimationFrame(frame);}
 function frame(now){raf=null;if(!active()||!current)return;try{current.tick([...keys.values(),...pointers.values()],last?Math.max(0,now-last):0);last=now;const result=current.draw(ctx);say(`${current.map} 이동 검수 · 발 위치 ${result.state.foot.join(', ')} · 게임 저장 변경 없음`);raf=requestAnimationFrame(frame);}catch(e){pause();say('검수 중단: '+e.message);}}
 async function choose(){const token=++generation;pending?.abort();pause();current?.dispose();current=null;reset.disabled=true;const abort=new AbortController();pending=abort;ctx.clearRect(0,0,1280,720);say(`${map.value} 원본 자료 준비 중…`);try{const next=await prepareNativeWalk({map:map.value,signal:abort.signal});if(token!==generation||stopped){next.dispose();return;}current=next;canvas.focus();reset.disabled=false;pending=null;if(active())resume();else current.suspend();}catch(e){if(token===generation){pending=null;say(abort.signal.aborted?'맵 준비를 취소했습니다.':('맵 준비 실패: '+e.message));}}}
 map.addEventListener('change',choose);document.querySelector('#reload').addEventListener('click',choose);reset.addEventListener('click',()=>{if(current){clear();current.reset();canvas.focus();if(active()){current.draw(ctx);resume();}}});
 addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;const dir=keyDir[e.key]??keyDir[e.key.toLowerCase()];if(dir){e.preventDefault();if(active()&&current)keys.set(keyId(e),dir);}else if(e.key==='Escape')clear();});
 addEventListener('keyup',e=>{const dir=keyDir[e.key]??keyDir[e.key.toLowerCase()];if(dir){e.preventDefault();keys.delete(keyId(e));}});addEventListener('blur',clear);
 for(const b of document.querySelectorAll('[data-dir]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(!active()||!current)return;b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.dir);});for(const name of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>pointers.delete(e.pointerId));}
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')pause();else resume();});
 canvas.addEventListener('contextlost',e=>{e.preventDefault();contextLost=true;pause();say('화면 복구 대기 중…');});canvas.addEventListener('contextrestored',()=>{contextLost=false;resume();});
 addEventListener('pagehide',()=>{stopped=true;generation++;pending?.abort();pending=null;pause();current?.dispose();current=null;});addEventListener('pageshow',e=>{if(e.persisted){stopped=false;choose();}});
 await choose();
}
