/** Exactly one owned RAF. No paint or scheduling after stop/dispose, including stale callbacks. */
export function createLoop({request,cancel,paint,visible=()=>true}) {
 let ready=false,stopped=true,disposed=false,handle=null,epoch=0;
 const allowed=()=>ready&&!stopped&&!disposed&&visible();
 function schedule(){if(allowed()&&handle===null){const token=epoch;handle=request(t=>tick(t,token));}}
 function tick(t,token){if(token!==epoch)return;handle=null;if(!allowed())return;paint(t);if(allowed())schedule();}
 function stop(){stopped=true;epoch++;if(handle!==null)cancel(handle);handle=null;}
 return {setReady(){if(disposed)return;ready=true;schedule();},start(){if(disposed)return;stopped=false;schedule();},stop,dispose(){stop();disposed=true;ready=false;},state(){return {ready,stopped,disposed,scheduled:handle!==null};}};
}
