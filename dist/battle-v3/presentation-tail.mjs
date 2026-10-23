/** UI-only terminal lifetime. No callback invokes battle actions, saves, RNG or rewards. */
export function createPresentationTail({onFinish=()=>{},onTimeout=()=>{},maxDurationMs=8000}={}){
 if(!Number.isFinite(maxDurationMs)||maxDurationMs<0)throw Error('Finite presentation timeout required');
 let serial=0,current=null;
 const valid=t=>current&&current.token===t;
 return {
  begin(){current={token:++serial,outcome:null,deadline:null};return serial},
  settle(token,outcome,now){if(!valid(token)||current.outcome!==null)return false;if(!Number.isFinite(now)||!['won','lost','fled','captured'].includes(outcome))throw Error('Authoritative battle outcome and time required');current.outcome=outcome;current.deadline=now+maxDurationMs;return true},
  tick(now,{busy=false}={}){if(!current||current.outcome===null)return false;if(!Number.isFinite(now))throw Error('Finite presentation time required');const timedOut=now>=current.deadline;if(busy&&!timedOut)return false;const done=current;current=null;if(timedOut&&busy){try{onTimeout({token:done.token,outcome:done.outcome})}catch{}}onFinish(done.outcome,{token:done.token,timedOut:timedOut&&busy});return true},
  cancel(token=current?.token){if(!valid(token))return false;current=null;return true},
  get pending(){return current?.outcome!==null&&current!==null},
  get token(){return current?.token??null}
 };
}
