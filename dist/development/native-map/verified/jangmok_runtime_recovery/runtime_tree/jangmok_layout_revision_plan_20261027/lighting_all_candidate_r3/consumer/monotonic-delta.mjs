// rAF timestamp origin is authoritative; do not seed with performance.now().
export function createMonotonicDelta({capMs=60}={}){
 if(!Number.isFinite(capMs)||capMs<=0)throw Error('Invalid delta cap');
 let last=null;
 return now=>{
  if(!Number.isFinite(now))throw Error('Invalid frame timestamp');
  if(last===null){last=now;return 0;}
  if(now<last)throw Error('Non-monotonic rAF timestamp');
  const dt=Math.min(capMs,now-last);
  last=now;
  return dt;
 };
}
