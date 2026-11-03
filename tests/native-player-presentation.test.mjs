import test from 'node:test';
import assert from 'node:assert/strict';
import {describeSelectedPlayer} from '../dist/native-ports/player-visibility.mjs';
import {describeVisiblePlayer} from '../dist/native-ports/resources/map_simulation_20261102/user_feedback_r1/viewport.mjs';
import {createNativePortResourceCache} from '../dist/native-ports/resource-cache.mjs';

test('boy description preserves the approved visibility calculation',()=>{
 for(const facing of ['down','left','up','right'])for(const foot of [[0,0],[1279,719],[640,360]]){
  const input={foot,camera:[0,0,1280,720],facing,now:0};
  assert.deepEqual(describeSelectedPlayer({appearance:'boy',...input}),describeVisiblePlayer(input));
 }
});
test('girl boundary clamping changes only visual offset and keeps 80px height',()=>{
 for(const facing of ['down','left','up','right'])for(const foot of [[0,0],[1279,0],[0,719],[1279,719],[640,360]]){
  const v=describeSelectedPlayer({appearance:'girl',foot,camera:[0,0,1280,720],facing});
  assert(v.visibleInside);assert.deepEqual(v.physicalFoot,foot);assert.equal(v.bounds[3]-v.bounds[1],80);
  assert(Object.isFrozen(v));assert(Object.isFrozen(v.physicalFoot));assert(Object.isFrozen(v.bounds));
 }
});
test('unknown avatar cannot enter native presentation or its cache',()=>{
 for(const appearance of ['female','unknown',null]){
  assert.throws(()=>describeSelectedPlayer({appearance,foot:[1,1],camera:[0,0,1280,720],facing:'down'}));
  assert.throws(()=>createNativePortResourceCache({appearance}),/APPEARANCE/);
 }
});
test('owner-local caches retain immutable selected appearances before preparation',()=>{
 const boy=createNativePortResourceCache(),girl=createNativePortResourceCache({appearance:'girl'});
 assert.equal(boy.diagnostics.appearance,'boy');assert.equal(girl.diagnostics.appearance,'girl');
 assert.equal(boy.diagnostics.preparations,0);assert.equal(girl.diagnostics.preparations,0);
 boy.dispose();girl.dispose();boy.dispose();girl.dispose();assert(boy.diagnostics.disposed);assert(girl.diagnostics.disposed);
});
test('disposed cache rejects preparation without requesting original assets',async()=>{
 const cache=createNativePortResourceCache({appearance:'girl'});cache.dispose();
 await assert.rejects(cache.acquire({source:'world:hub:S7',target:'world:hub:S8'}),/DISPOSED/);
 assert.equal(cache.diagnostics.preparations,0);
});
test('fixed-pair cache rejects a same-map request before preparation',async()=>{
 const cache=createNativePortResourceCache({appearance:'girl'});
 await assert.rejects(cache.acquire({source:'world:hub:S7',target:'world:hub:S7'}),/FIXED_PAIR/);
 assert.equal(cache.diagnostics.preparations,0);cache.dispose();
});
