import test from 'node:test';
import assert from 'node:assert/strict';
import {freshWorld,interact,walk} from './helpers/world-fixture.mjs';
import {createCanonicalCreature} from '../dist/canonical-session.mjs';
import {createWorldStore} from '../dist/world/save-store.mjs';
import {memory} from './helpers/economy-fixture.mjs';

// Explicit unit-test party fixture, NOT the browser/normal-growth QA save.
async function fixture(candidate=false){
 const w=freshWorld({candidate});
 for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await interact(w,'event:'+id);
 await walk(w,'heal:PROLOGUE');
 const s=w.snapshot(),ids=['SPECIES_049','SPECIES_053','SPECIES_054','SPECIES_056','SPECIES_058'];
 for(const id of ids)s.party.push(createCanonicalCreature(w.catalog,id,5));
 s.box.push(createCanonicalCreature(w.catalog,'SPECIES_064',15));
 s.box[0].hp=9;s.box[0].moves[0].pp=2;
 for(const mon of [...s.party,...s.box])for(const key of ['seen','caught'])if(!s.dex[key].includes(mon.speciesId))s.dex[key].push(mon.speciesId);
 const next=freshWorld({candidate,runtime:s});w.dispose();
 return next;
}
const request=w=>({type:'storage-exchange',partyInstanceId:w.snapshot().party[0].instanceId,boxInstanceId:w.snapshot().box[0].instanceId});

test('world center storage exchanges exact instances without healing, generating, or deleting species',async()=>{
 const w=await fixture(),before=w.snapshot();await w.interact('heal:PROLOGUE',request(w));const after=w.snapshot();
 assert.deepEqual(after.party[0],before.box[0]);assert.deepEqual(after.box[0],before.party[0]);
 assert.equal(after.party.length,6);assert.equal(after.box.length,1);
 for(const key of ['dex','progress','inventory','economy','world'])assert.deepEqual(after[key],before[key]);
});
test('stale or double-click exchange cannot swap back or duplicate instances',async()=>{
 const w=await fixture(),r=request(w);await w.interact('heal:PROLOGUE',r);const s=w.snapshot();
 await assert.rejects(()=>w.interact('heal:PROLOGUE',r),/다시 선택/);assert.deepEqual(w.snapshot(),s);
});
test('unknown and reversed container IDs rejected without mutation',async()=>{
 const w=await fixture(),r=request(w),s=w.snapshot();
 for(const bad of [{...r,boxInstanceId:'missing'},{...r,partyInstanceId:null},{...r,boxInstanceId:r.partyInstanceId},{...r,partyInstanceId:r.boxInstanceId,boxInstanceId:r.partyInstanceId}])await assert.rejects(()=>w.interact('heal:PROLOGUE',bad),/다시 선택/);
 assert.deepEqual(w.snapshot(),s);
});
test('storage requires physical center proximity, not shop or arbitrary world point',async()=>{
 const w=await fixture(),r=request(w);await walk(w,'shop:PROLOGUE');
 await assert.rejects(()=>w.interact('heal:PROLOGUE',r),/위치/);
 await assert.rejects(()=>w.story.worldCommand({...r,pointId:'shop:PROLOGUE'}),/생태센터/);
});
test('storage save failure keeps original party and retry applies precisely once',async()=>{
 const w=await fixture(),before=w.snapshot();let fail=true;
 const v=freshWorld({runtime:before,persist:()=>{if(fail)throw Error('disk-full')}}),r=request(v);
 await assert.rejects(()=>v.interact('heal:PROLOGUE',r),/disk-full/);assert.deepEqual(v.snapshot(),before);
 await assert.rejects(()=>v.interact('heal:PROLOGUE',r),/WORLD_BUSY/);
 fail=false;await v.story.retryCommit();v.syncField();assert.deepEqual(v.snapshot().party[0],before.box[0]);
 await assert.rejects(()=>v.interact('heal:PROLOGUE',r),/다시 선택/);
});
test('storage ordinary session does not enable economy/capture candidate',async()=>{
 const w=await fixture();await w.interact('heal:PROLOGUE',request(w));
 assert.equal(w.snapshot().candidatePolicyId,undefined);assert.equal(w.snapshot().economy.money,null);
});
test('storage candidate swap keeps three slots isolated and reload preserves captured instance',async()=>{
 const w=await fixture(true),before=w.snapshot(),mem=memory(),store=createWorldStore(mem,w.catalog,w.host,{qa:true});
 for(const slot of ['SLOT_1','SLOT_2','SLOT_3'])store.save(slot,before);
 await w.interact('heal:PROLOGUE',request(w));store.save('SLOT_3',w.snapshot());
 assert.deepEqual(store.load('SLOT_3').party[0],before.box[0]);
 for(const slot of ['SLOT_1','SLOT_2'])assert.deepEqual(store.load(slot).party,before.party);
});
test('world busy exchange is blocked throughout battle/input transaction ownership',async()=>{
 const w=await fixture(),before=w.snapshot();w.pending=true;
 await assert.rejects(()=>w.interact('heal:PROLOGUE',request(w)),/WORLD_BUSY/);assert.deepEqual(w.snapshot(),before);w.pending=false;
});
