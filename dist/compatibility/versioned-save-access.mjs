import {createSaveV3Store,inspectOrdinarySlot} from './save-v3-store.mjs';

// A slot number is not a schema version. Selection is explicit so ordinary
// saves and canonical v3 snapshots never silently replace one another.
export function createVersionedSaveAccess(storage,{ordinaryStore=null}={}){
 const v3=createSaveV3Store(storage);
 function select(slot,{version}={}){
  if(version==='ordinary-v1'){
   const status=inspectOrdinarySlot(storage,slot);
   if(!status.present)return null;
   if(!status.valid)throw Error(status.reason);
   if(!ordinaryStore?.load)throw Error('Ordinary runtime reader required');
   return {version,runtime:ordinaryStore.load(status.slot,{legacyFallback:false}),key:status.key};
  }
  if(version==='canonical-v3'){
   const snapshot=v3.read(slot);
   return snapshot===null?null:{version,snapshot,key:v3.keys(slot).primary};
  }
  throw Error('Explicit save version required: ordinary-v1 or canonical-v3');
 }
 function inspect(slot){
  const ordinary=inspectOrdinarySlot(storage,slot),v3Raw=v3.peek(slot);
  let canonicalV3={present:v3Raw!==null,valid:false};
  if(v3Raw!==null){try{const snapshot=v3.read(slot);canonicalV3={present:true,valid:true,schemaVersion:snapshot.schemaVersion}}catch(error){canonicalV3={present:true,valid:false,reason:error.message}}}
  return {slot:ordinary.slot,ordinary,canonicalV3};
 }
 return Object.freeze({inspect,select,writeV3:(slot,snapshot,options)=>v3.write(slot,snapshot,options),migrateHandoffV2:(slot,options)=>v3.migrate(slot,options),v3});
}
