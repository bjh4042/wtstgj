// Native IndexedDB API adapter. Explicit isolated DEV namespace; never auto-activated.
const DB_PREFIX='geoje.isolated-dev.indexeddb.v1.',STORE='checkpoints',LIMIT=4194304;
function error(code,cause,details={}){const e=Error(code);e.code=code;if(cause)e.cause=cause;Object.assign(e,details);return e}
const textBytes=value=>new TextEncoder().encode(value).byteLength;
export function openDevIndexedDB({indexedDB,namespace,signal}={}){
 if(!indexedDB||typeof indexedDB.open!=='function'||typeof namespace!=='string'||!/^[-A-Za-z0-9_]{1,64}$/.test(namespace))return Promise.reject(error('DEV_IDB_CONFIGURATION'));
 const name=DB_PREFIX+namespace;
 return new Promise((resolve,reject)=>{
  let request,settled=false;const abortOpen=()=>finish(error('DEV_IDB_OPEN_CANCELLED'));
  function finish(problem,driver){if(settled)return;settled=true;signal?.removeEventListener('abort',abortOpen);problem?reject(problem):resolve(driver)}
  if(signal?.aborted){finish(error('DEV_IDB_OPEN_CANCELLED'));return}signal?.addEventListener('abort',abortOpen,{once:true});
  try{request=indexedDB.open(name,1)}catch(e){finish(error('DEV_IDB_OPEN_FAILED',e));return}
  request.onblocked=()=>finish(error('DEV_IDB_OPEN_BLOCKED'));
  request.onerror=()=>finish(error('DEV_IDB_OPEN_FAILED',request.error));
  request.onupgradeneeded=event=>{
   if(settled||event.oldVersion!==0){request.transaction.abort();if(!settled)finish(error('DEV_IDB_UPGRADE_NOT_ALLOWED'));return}
   try{request.result.createObjectStore(STORE)}catch(e){request.transaction.abort();finish(error('DEV_IDB_INITIAL_SCHEMA_FAILED',e))}
  };
  request.onsuccess=()=>{
   const db=request.result;if(settled){db.close();return}
   try{
    if(db.version!==1||db.objectStoreNames.length!==1||!db.objectStoreNames.contains(STORE))throw error('DEV_IDB_SCHEMA_MISMATCH');
    const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
    if(store.keyPath!==null||store.autoIncrement||store.indexNames.length!==0)throw error('DEV_IDB_SCHEMA_MISMATCH');
    finish(null,createDriver(db,namespace));
   }catch(e){db.close();finish(error('DEV_IDB_SCHEMA_MISMATCH',e))}
  };
 });
}
function createDriver(db,namespace){
 let closed=false,closedReason=null,guardExecuting=false;const active=new Set(),keyPrefix='geoje.isolated-dev.native.v1:'+namespace+':';
 function keyCheck(key){if(typeof key!=='string'||!key.startsWith(keyPrefix)||!/^[-A-Za-z0-9_]{1,64}$/.test(key.slice(keyPrefix.length)))throw error('DEV_IDB_KEY_NAMESPACE')}
 function rawCheck(raw,nullable=false){if(nullable&&raw===null)return;if(typeof raw!=='string'||textBytes(raw)>LIMIT)throw error('DEV_IDB_VALUE_SIZE_OR_TYPE')}
 function close(reason='EXPLICIT_CLOSE'){if(closed)return;closed=true;closedReason=reason;for(const tx of active)try{tx.abort()}catch{}db.close()}
 db.onversionchange=()=>close('VERSION_CHANGED');
 db.onclose=()=>{closed=true;closedReason??='UNEXPECTED_CLOSE'};
 function operation(kind,key,expected,publishOrNext){
  keyCheck(key);if(kind!=='read')rawCheck(expected,true);if(kind==='cas')rawCheck(publishOrNext);if(kind==='guard'&&typeof publishOrNext!=='function')throw error('DEV_IDB_SYNC_PUBLISH_REQUIRED');
  if(closed)return Promise.reject(error('DEV_IDB_CLOSED',null,{closedReason}));
  if(guardExecuting)return Promise.reject(error('DEV_IDB_REENTRANT_OPERATION'));
  return new Promise((resolve,reject)=>{
   let tx,result=null,cause=null,callbackInvoked=false,callbackReturned=false;
   const detail=outcome=>({operation:kind,transactionOutcome:outcome,callbackInvoked,callbackReturned,publication:callbackInvoked?'CALLBACK_INVOKED':'NOT_INVOKED',closedReason});
   try{tx=db.transaction(STORE,kind==='cas'?'readwrite':'readonly')}catch(e){reject(error('DEV_IDB_TRANSACTION_START_FAILED',e,detail('NOT_STARTED')));return}
   active.add(tx);
   tx.oncomplete=()=>{active.delete(tx);resolve(result)};
   tx.onerror=event=>{cause??=event.target?.error??tx.error};
   tx.onabort=()=>{active.delete(tx);reject(error(callbackInvoked?'DEV_IDB_GUARD_FAILED_AFTER_CALLBACK':'DEV_IDB_TRANSACTION_ABORTED',cause??tx.error,detail('ABORTED')))};
   const abort=e=>{cause=e;try{tx.abort()}catch{/* close() may already have queued the abort event. Settle only on that event. */}};
   let request;try{request=tx.objectStore(STORE).openCursor(key)}catch(e){abort(e);return}
   request.onerror=()=>{cause=request.error};
   request.onsuccess=()=>{
    try{
     const cursor=request.result,raw=cursor===null?null:cursor.value;if(cursor!==null)rawCheck(raw);
     if(kind==='read'){result=raw;return}
     if(raw!==expected){result=false;return}
     if(kind==='cas'){const write=tx.objectStore(STORE).put(publishOrNext,key);write.onerror=()=>{cause=write.error};result=true;return}
     guardExecuting=true;callbackInvoked=true;
     try{const returned=publishOrNext();callbackReturned=true;if(returned&&(typeof returned==='object'||typeof returned==='function')){try{Promise.prototype.then.call(returned,()=>{},()=>{})}catch{/* Not a native Promise: never execute an arbitrary thenable to observe it. */}}if(returned&&typeof returned.then==='function')throw error('DEV_IDB_ASYNC_PUBLICATION_FORBIDDEN');result=true}
     finally{guardExecuting=false}
    }catch(e){abort(e)}
   };
  });
 }
 return Object.freeze({read:key=>operation('read',key),compareExchange:(key,expected,next)=>operation('cas',key,expected,next),withCurrentValue:(key,expected,publish)=>operation('guard',key,expected,publish),close,status:()=>Object.freeze({closed,closedReason,activeTransactions:active.size}),contract:Object.freeze({databaseName:db.name,version:1,namespace,isolatedDev:true,compareExchangeSettlesOn:'transaction.complete',guardReturn:'Promise<boolean>',publicationCallback:'synchronous in readonly cursor success',postCallbackAbort:'reject with callbackInvoked and transactionOutcome',realStorageActivatedByDefault:false})});
}
