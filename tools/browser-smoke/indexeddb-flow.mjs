import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
export async function indexedDBFlow(context){
 const page=await context.newPage();const probe='http://127.0.0.1:4173/wtstgj/__idb_probe__';await page.route(probe,route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Isolated DEV storage probe</title>'}));await page.goto(probe,{waitUntil:'load'});
 const source=await readFile(new URL('./fixtures/indexeddb-driver.mjs',import.meta.url),'utf8');
 // Only isolated driver code executes here. It never references game state, save slots or user databases.
 const result=await page.evaluate(async source=>{
  const mod=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));const {openDevIndexedDB}=await import(mod);URL.revokeObjectURL(mod);
  const namespace='ci-r5-'+crypto.randomUUID(),key='geoje.isolated-dev.native.v1:'+namespace+':checkpoint';
  const a=await openDevIndexedDB({indexedDB,namespace}),b=await openDevIndexedDB({indexedDB,namespace});const ok=(v,m)=>{if(!v)throw Error(m)};
  try{ok(await a.read(key)===null,'Fresh DB not empty');const race=await Promise.all([a.compareExchange(key,null,'A'),b.compareExchange(key,null,'B')]);ok(race.filter(Boolean).length===1,'CAS winner count');const winner=await a.read(key);ok(['A','B'].includes(winner),'CAS bytes');let calls=0;ok(await b.withCurrentValue(key,'stale',()=>calls++)===false&&calls===0,'Stale publication');ok(await a.withCurrentValue(key,winner,()=>{calls++})===true&&calls===1,'Exact synchronous publication');
   let asyncRejected=false;try{await a.withCurrentValue(key,winner,async()=>{})}catch(e){asyncRejected=e.code==='DEV_IDB_GUARD_FAILED_AFTER_CALLBACK'&&e.cause?.code==='DEV_IDB_ASYNC_PUBLICATION_FORBIDDEN'&&e.callbackInvoked===true&&e.transactionOutcome==='ABORTED'}ok(asyncRejected,'Async guard must reject');ok(await b.read(key)===winner,'Guard changed checkpoint');a.close();let closedRejected=false;try{await a.read(key)}catch(e){closedRejected=e.code==='DEV_IDB_CLOSED'}ok(closedRejected,'Closed read accepted');
   const c=await openDevIndexedDB({indexedDB,namespace});try{ok(await c.read(key)===winner,'Reopen exact bytes')}finally{c.close()}
   return {freshDevNamespace:true,atomicRaceOneWinner:true,staleCallbackSuppressed:true,syncGuardOnce:true,asyncGuardRejected:true,reopenExactBytes:true,closedRejects:true,gameSaveIntegration:false,physicalDiskDurabilityClaim:false};
  }finally{a.close();b.close()}
 },source);
 assert.equal(result.atomicRaceOneWinner,true);await page.close();return result;
}
