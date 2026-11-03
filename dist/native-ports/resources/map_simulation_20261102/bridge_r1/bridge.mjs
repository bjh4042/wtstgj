// NEW_NATIVE_PRESENTATION: two explicit canonical port anchors only. No free walking/save writer.
export const BRIDGE_SCOPE='NEW_NATIVE_PRESENTATION_S7_S8_PORT_ANCHORS_R1';
const PORTS=Object.freeze({
 'route:S7:S8':Object.freeze({source:'world:hub:S7',target:'world:hub:S8',read:[4030,770],landing:[2310,1470],facing:'right'}),
 'route:S7:S8:return':Object.freeze({source:'world:hub:S8',target:'world:hub:S7',read:[2436,1470],landing:[4000,770],facing:'left'})
});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=v=>structuredClone(v);
// Dependency seam for isolated tests; production assembly must use native-providers.mjs genuine brands.
export function createS7S8Bridge({world,prepareNative,validateNative,stage,publish,fallback}){
 for(const f of[prepareNative,validateNative,stage,publish,fallback])if(typeof f!=='function')throw Error('BRIDGE_CAPABILITY');
 if(!world?.definition||typeof world.snapshot!=='function'||typeof world.interact!=='function')throw Error('BRIDGE_WORLD');
 let dead=false,op=null,sequence=0,memoryPose=null,blocked=false;const diagnostics=[];
 const note=e=>{if(diagnostics.length===20)diagnostics.shift();diagnostics.push(String(e?.message??e))};
 const fallbackSafe=reason=>{memoryPose=null;try{fallback({reason,snapshot:world.snapshot()})}catch(e){note(e)}};
 function admission(id){const row=PORTS[id],s=world.snapshot(),d=world.definition,p=d.points?.[id],reverse=d.points?.[p?.reverseId];
  if(!row||d.version!=='CANONICAL_WORLD_V1'||d.grid!==48||s.contentNamespace!=='canonical-v1'||s.world?.mapId!==s.position?.scene||!p||p.kind!=='warp'||p.mapId!==row.source||p.targetMapId!==row.target||reverse?.targetMapId!==row.source||reverse?.reverseId!==id||!Array.isArray(reverse.target)||!Array.isArray(p.target))return null;
  const anchor={scene:row.source,x:reverse.target[0]*48+24,y:reverse.target[1]*48+24};
  if(s.position.scene!==anchor.scene||s.position.x!==anchor.x||s.position.y!==anchor.y||Math.abs(reverse.target[0]-p.x)+Math.abs(reverse.target[1]-p.y)>1)return null;
  if(!world.host?.validLanding?.(s.position,s)||world.busy||world.inputLocked)return null;
  return {id,row,snapshot:s,point:copy(p),anchor,target:{scene:row.target,x:p.target[0]*48+24,y:p.target[1]*48+24}};
 }
 function stillSame(a){const s=world.snapshot();return s.sessionId===a.snapshot.sessionId&&s.revision===a.snapshot.revision&&same(s.position,a.snapshot.position)&&same(world.definition.points[a.id],a.point)}
 function cancel(){if(!op||op.phase!=='prepare')return false;const old=op;op=null;old.cancelled=true;old.abort.abort();old.reject(Error('BRIDGE_PREPARE_CANCELLED'));return true}
 function dispose(){if(dead)return;dead=true;cancel();memoryPose=null}
 async function transfer(id){if(dead)throw Error('BRIDGE_DISPOSED');if(op||blocked||world.story?.pendingCommit)throw Error('BRIDGE_CANONICAL_BUSY_OR_RECONCILE_REQUIRED');const a=admission(id);if(!a){fallbackSafe('UNMAPPED_OR_LOCKED_SOURCE_ANCHOR');return{status:'GENERIC_FALLBACK',commands:0}}
  let reject;const cancelled=new Promise((_,r)=>reject=r);cancelled.catch(()=>{});const job={id:++sequence,phase:'prepare',abort:new AbortController(),reject,cancelled:false};op=job;let bundle=null,frame=null;
  const own=()=>!dead&&!job.cancelled&&op===job;const check=()=>{if(!own())throw Error('BRIDGE_PREPARE_CANCELLED')};
  const prepared=Promise.resolve().then(()=>{check();return prepareNative({source:a.row.source,target:a.row.target,signal:job.abort.signal})}).then(v=>{if(!own()){try{v.dispose()}catch(e){note(e)}throw Error('BRIDGE_PREPARE_CANCELLED')}bundle=v;return v});
  try{await Promise.race([prepared,cancelled]);check();if(!validateNative(bundle,a.row)||!bundle.source.safe(...a.row.read)||!bundle.target.safe(...a.row.landing))throw Error('BRIDGE_NATIVE_PIN_OR_LANDING');
   const staged=Promise.resolve().then(()=>{check();return stage({bundle,targetMap:a.row.target,nativeFoot:[...a.row.landing],facing:a.row.facing,signal:job.abort.signal})}).then(f=>{if(!own()){try{f?.dispose?.()}catch(e){note(e)}throw Error('BRIDGE_PREPARE_CANCELLED')}return f});frame=await Promise.race([staged,cancelled]);check();
   if(!stillSame(a)||!admission(id))throw Error('BRIDGE_STALE_CANONICAL_ANCHOR');
   // Commit boundary: cancellation may no longer imply zero canonical writes. Original service owns gates/persistence.
   job.phase='canonical-commit';await world.interact(id);const s=world.snapshot();
   if(s.position.scene!==a.target.scene||s.position.x!==a.target.x||s.position.y!==a.target.y||s.world?.mapId!==a.target.scene)throw Error('BRIDGE_CANONICAL_DESTINATION_MISMATCH');
   if(dead){fallbackSafe('DISPOSED_AFTER_CANONICAL_COMMIT');return{status:'CANONICAL_COMMITTED_GENERIC_FALLBACK',commands:1}}
   job.phase='publish';const committedStillCurrent=()=>{const now=world.snapshot();return !world.busy&&!world.story?.pendingCommit&&now.sessionId===s.sessionId&&now.revision===s.revision&&same(now.position,s.position)};try{if(!committedStillCurrent())throw Error('BRIDGE_STALE_COMMITTED_SNAPSHOT');await publish(frame,{canonicalSnapshot:copy(s),nativeFoot:[...a.row.landing],mapId:a.row.target});if(!committedStillCurrent()){fallbackSafe('CANONICAL_CHANGED_DURING_PUBLISH');return{status:'CANONICAL_COMMITTED_GENERIC_FALLBACK',commands:1}}if(dead){fallbackSafe('DISPOSED_AFTER_PUBLISH');return{status:'CANONICAL_COMMITTED_GENERIC_FALLBACK',commands:1}}memoryPose=Object.freeze({namespace:'NEW_NATIVE_PRESENTATION',schemaVersion:1,sessionId:s.sessionId,canonicalRevision:s.revision,canonicalPosition:Object.freeze(copy(s.position)),pointId:id,mapId:a.row.target,foot:Object.freeze([...a.row.landing]),facing:a.row.facing,persisted:false});return{status:'CANONICAL_COMMITTED_NATIVE_PUBLISHED',commands:1}}catch(e){note(e);fallbackSafe('PUBLISH_FAILED_AFTER_CANONICAL_COMMIT');return{status:'CANONICAL_COMMITTED_GENERIC_FALLBACK',commands:1}}
  }catch(e){if(job.phase==='canonical-commit'){blocked=true;fallbackSafe(world.story?.pendingCommit?'CANONICAL_PERSIST_PENDING':'CANONICAL_COMMAND_FAILED_OR_PARTIALLY_COMMITTED');}if(job.cancelled)return{status:'PREPARE_CANCELLED',commands:0};throw e}
  finally{try{frame?.dispose?.()}catch(e){note(e)}try{bundle?.dispose()}catch(e){note(e)}for(const e of bundle?.cleanupErrors??[])note(e);if(op===job)op=null}
 }
 // Explicit observation after caller uses ORIGINAL retry/reload UI. Never retries a warp itself.
 function reconcile(){if(dead||op||world.busy||world.story?.pendingCommit)return{ready:false};blocked=false;fallbackSafe('CANONICAL_STATE_RECONCILED_GENERIC');return{ready:true,snapshot:world.snapshot()}}
 return Object.freeze({transfer,cancel,dispose,reconcile,canTransfer:id=>!dead&&!op&&!blocked&&!world.story?.pendingCommit&&!!admission(id),get memoryPose(){if(memoryPose){const s=world.snapshot();if(dead||world.busy||world.story?.pendingCommit||s.sessionId!==memoryPose.sessionId||s.revision!==memoryPose.canonicalRevision||!same(s.position,memoryPose.canonicalPosition))memoryPose=null}return memoryPose},get status(){return Object.freeze({scope:BRIDGE_SCOPE,disposed:dead,phase:op?.phase??'idle',blocked,storageWrites:0,freeWalk:false})},get diagnostics(){return Object.freeze([...diagnostics])}});
}
