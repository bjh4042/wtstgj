// Dependency-injected clock only. Does not replace Date, performance or globals.
export function popupTimers(){
 let now=0,serial=0;const pending=new Map(),all=new Map();
 const setTimer=(fn,ms)=>{const id=++serial;const task={fn,at:now+ms};pending.set(id,task);all.set(id,task);return id};
 const clearTimer=id=>pending.delete(id);
 function advance(ms){const end=now+ms;for(;;){const next=[...pending].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;const[id,task]=next;pending.delete(id);now=task.at;task.fn()}now=end}
 return {setTimer,clearTimer,advance,pending,all,get now(){return now}};
}
