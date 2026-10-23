import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonicalAdapter} from '../dist/compatibility/canonical-adapter.mjs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {readCanonicalSource} from '../dist/compatibility/canonical-source-loader.mjs';
import {devRequestId} from '../dist/economy/dev-request-id.mjs';
const source=file=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+file,import.meta.url));
const response=url=>new Response(source(new URL(url).pathname.split('/').at(-1)));
test('DEV transaction IDs work when HTTP preview omits randomUUID; no weak RNG fallback',()=>{
 const httpCrypto={getRandomValues:globalThis.crypto.getRandomValues.bind(globalThis.crypto)};
 const ids=Array.from({length:100},()=>devRequestId(httpCrypto));assert.equal(new Set(ids).size,100);
 assert.ok(ids.every(id=>/^dev-request-[0-9a-f]{32}$/.test(id)));
 assert.equal(devRequestId({randomUUID:()=> 'existing-secure-id'}),'existing-secure-id');
 assert.throws(()=>devRequestId({}),/generator unavailable/);
});
test('historical browser Response.text BOM loss reproduces exactly four integrity failures',async()=>{
 const a=await loadCanonicalAdapter({readText:async f=>new Response(source(f)).text()});
 assert.equal(a.validation.ready,false);
 assert.deepEqual(a.validation.errors.map(e=>[e.code,e.source,e.file]),['manifest','index'].flatMap(s=>['geoje_fishing_master_v1_1.csv','geoje_acquisition_master_v2.csv'].map(f=>['SOURCE_INTEGRITY',s,f])));
});
test('default fetch loader preserves exact CSV source bytes and historical validation',async t=>{
 t.mock.method(globalThis,'fetch',response);
 for(const f of ['geoje_fishing_master_v1_1.csv','geoje_acquisition_master_v2.csv'])assert.deepEqual(Buffer.from(await readCanonicalSource(f)),source(f));
 const a=await loadCanonicalAdapter();assert.equal(a.validation.ready,true);assert.equal(a.encounterRuntime.validation.errors.length,42);
});
test('production browser loader applies approved A and economy; 46 active / 8 excluded; candidate stays off',async t=>{
 t.mock.method(globalThis,'fetch',response);const a=await loadCanonicalRuntimeAdapter();
 assert.equal(a.validation.ready,true);assert.equal(a.species.length,151);
 assert.equal(Object.keys(a.encounterRuntime.tables).length,46);assert.equal(Object.keys(a.encounterRuntime.policyExcludedTables).length,8);
 assert.deepEqual(a.encounterRuntime.validation.errors,[]);assert.equal(a.economyPolicy.id,'ECONOMY_CAPTURE_APPROVED_V1');assert.equal(a.economyPolicy.approvalStatus,'USER_APPROVED');
});
test('byte-preserving fetch still rejects source tampering and HTTP failure',async t=>{
 t.mock.method(globalThis,'fetch',url=>{const f=new URL(url).pathname.split('/').at(-1);return new Response(f==='geoje_acquisition_master_v2.csv'?Buffer.concat([source(f),Buffer.from('\n')]):source(f))});
 await assert.rejects(loadCanonicalRuntimeAdapter(),/source validation failed/);
 globalThis.fetch=async()=>new Response('',{status:404});
 await assert.rejects(readCanonicalSource('missing.json'),/Canonical source unavailable/);
 await assert.rejects(loadCanonicalRuntimeAdapter(),/source validation failed/);
});
test('prologue field bundle separates rival graphics descriptors without changing canonical identity',async()=>{
 const {raw,ordinary,fresh}=await import('./helpers/economy-fixture.mjs');
 const {StoryProgressionService}=await import('../dist/story/progression-service.mjs');
 const {storyFieldEvents}=await import('../dist/story/field-bridge.mjs');
 const s=new StoryProgressionService({runtime:fresh(ordinary),catalog:ordinary,adapter:raw});
 const before=s.snapshot(),bundle=storyFieldEvents(s,'qa_a');
 const trainer=bundle.trainers.find(t=>t.trainerId==='RIVAL_00'),event=bundle.storyEvents.find(e=>e.eventId==='RIVAL_00');
 assert.ok(trainer&&event);assert.notEqual(trainer.id,event.id);
 assert.equal(event.eventId,trainer.trainerId);assert.equal(event.available,false);
 assert.ok(bundle.storyEvents.find(e=>e.eventId==='P00_HOME_START').available);
 assert.deepEqual(s.snapshot(),before);
});
