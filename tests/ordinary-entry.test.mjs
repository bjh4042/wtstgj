import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {createOrdinarySlots} from '../dist/ordinary/slots.mjs';
import {requestLaunch,takeLaunch} from '../dist/ordinary/launch.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';
import {freshState} from '../dist/model.mjs';
const adapter=await loadCanonicalRuntimeAdapter({readText:async f=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
const setup=()=>{const storage=memory();return {storage,api:createOrdinarySlots(storage,adapter)}};
const options={starterId:'SPECIES_004',playerName:'누리',appearance:'girl'};
test('ordinary selected slot bootstrap, saved profile, prologue and reload preserve exact state without regrant',async()=>{
 const {storage,api}=setup(),created=api.newGame(api.stamp('SLOT_2'),options);const s=created.runtime;
 assert.equal(s.player.name,'누리');assert.equal(s.player.appearance,'girl');assert.equal(s.starterId,'SPECIES_004');
 assert.equal(s.economy.money,3000);assert.equal(s.progress.currentStage,'PROLOGUE');assert.equal(s.party.length,0);assert.equal(s.candidatePolicyId,undefined);
 const w=new CanonicalWorld({adapter,runtime:s,persist:v=>api.store.save('SLOT_2',v)});
 // Existing event runner only; no injected party, funds, healing or tutorial skipping.
 for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await w.story.runEvent(id);
 const before=w.snapshot();api.store.save('SLOT_2',before);w.dispose();
 const reloaded=createOrdinarySlots(storage,adapter).read('SLOT_2').runtime;
 assert.deepEqual(reloaded,before);assert.equal(reloaded.inventory.ecology_ball,0);assert.equal(reloaded.progress.items.potion??0,0);assert.equal(reloaded.party.length,1);
 assert.equal(api.store.peek('SLOT_1'),null);assert.equal(api.store.peek('SLOT_3'),null);
 const resumed=new CanonicalWorld({adapter,runtime:reloaded});assert.deepEqual(resumed.snapshot(),before);resumed.dispose();
 const tab=memory();requestLaunch(tab,'SLOT_2','canonical-v1');assert.equal(takeLaunch(tab).slot,'SLOT_2');assert.equal(takeLaunch(tab),null);
});
test('overwrite cancel/confirmation, last-good backup, and stale confirmation preserve other slots',()=>{
 const {storage,api}=setup();api.newGame(api.stamp('SLOT_2'),options);api.newGame(api.stamp('SLOT_3'),options);
 const ticket=api.stamp('SLOT_2'),old=api.store.peek('SLOT_2'),other=api.store.peek('SLOT_3');
 // Cancelling means no commit, including across summary/file inspection.
 api.summarize('SLOT_2');assert.equal(api.store.peek('SLOT_2'),old);
 assert.throws(()=>api.newGame(ticket,options),/확인/);assert.equal(api.store.peek('SLOT_2'),old);
 api.newGame(ticket,{...options,playerName:'바다'},{confirmed:true});assert.equal(storage.getItem(api.store.keys('SLOT_2').lastKnownGood),old);
 assert.throws(()=>api.newGame(ticket,options,{confirmed:true}),/변경/);assert.equal(api.store.peek('SLOT_3'),other);
});
test('existing envelope export/import validates before confirmation; malformed/candidate/unsupported files do not change target',()=>{
 const {api}=setup();api.newGame(api.stamp('SLOT_1'),options);api.newGame(api.stamp('SLOT_2'),options);
 const before=api.store.peek('SLOT_2'),file=api.exportFile('SLOT_1').text,ticket=api.stamp('SLOT_2');
 api.inspectImport(file);assert.equal(api.store.peek('SLOT_2'),before);assert.throws(()=>api.importFile(ticket,file),/확인/);
 for(const raw of ['broken','{"schemaVersion":999}',JSON.stringify({...api.read('SLOT_1').runtime,candidatePolicyId:'ECONOMY_CAPTURE_CANDIDATE_V1'}),file.replace('SHA-256','BAD')])assert.throws(()=>api.importFile(ticket,raw,{confirmed:true}));
 assert.equal(api.store.peek('SLOT_2'),before);api.importFile(ticket,file,{confirmed:true});assert.deepEqual(api.read('SLOT_2').runtime,api.read('SLOT_1').runtime);
});
test('failed replacement write preserves occupied primary; existing import CAS rejects a concurrently replaced primary',()=>{
 const {storage,api}=setup();api.newGame(api.stamp('SLOT_2'),options);const before=api.store.peek('SLOT_2'),set=storage.setItem;
 storage.setItem=(k,v)=>{if(k===api.store.keys('SLOT_2').primary)throw Error('quota');set(k,v)};
 assert.throws(()=>api.newGame(api.stamp('SLOT_2'),options,{confirmed:true}),/quota/);assert.equal(api.store.peek('SLOT_2'),before);
 storage.setItem=set;api.newGame(api.stamp('SLOT_2'),{...options,playerName:'바다'},{confirmed:true});const current=api.store.peek('SLOT_2');
 assert.throws(()=>api.store.importSave('SLOT_2',JSON.stringify(api.read('SLOT_2').runtime),{},{expectedRaw:before}),/another tab/);assert.equal(api.store.peek('SLOT_2'),current);
});
test('legacy namespace routes unchanged; corrupted save remains protected; candidate prefix never becomes an ordinary slot',()=>{
 const {storage,api}=setup(),legacy=freshState(70,'boy');api.store.save('SLOT_3',legacy,{playerName:'이전'});
 assert.equal(api.read('SLOT_3').contentNamespace,'legacy-work-v2');assert.deepEqual(api.read('SLOT_3').runtime.party,legacy.party);
 const key=api.store.keys('SLOT_2').primary;storage.setItem(key,'damaged');assert.ok(api.summarize('SLOT_2').error);assert.throws(()=>api.read('SLOT_2'));assert.equal(storage.getItem(key),'damaged');
 storage.setItem('geoje.dev.world-qa-v1.'+api.store.keys('SLOT_1').primary,api.store.peek('SLOT_3'));assert.equal(api.summarize('SLOT_1').empty,true);
});
