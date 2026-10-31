import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {createPostHealAuthority,POST_HEAL_REGISTRATION as R} from '../dist/world/post-heal-authority.mjs';
import {CanonicalWorld,createWorldHost} from '../dist/world/service.mjs';
import {createWorldDefinition,cellPosition} from '../dist/world/definition.mjs';
import {initialWorldState,syncWorldLocation} from '../dist/world/state.mjs';
import {loadApprovedLatestRuntimeAdapter} from '../dist/compatibility/approved-latest-runtime-adapter.mjs';
const read=dir=>f=>fs.readFileSync(new URL('../dist/data/'+dir+'/'+f,import.meta.url),'utf8');
const adapter=await loadApprovedLatestRuntimeAdapter({historicalOptions:{readText:read('canonical-handoff-v1')},stagedOptions:{readStaging:read('staging-20260927')}});
const recovery=new URL('./fixtures/',import.meta.url);
function testWorld({persist=null}={}){
 // Test-only recovered POST checkpoint; NEVER included in host/runtime implementation.
 const s=JSON.parse(fs.readFileSync(new URL('post-native-memory.json',recovery),'utf8'));
 const d=createWorldDefinition(adapter);s.world=initialWorldState(d);s.position=cellPosition(R.mapId,10,12);syncWorldLocation(s,createWorldHost(d,adapter.storyRuntime));for(const mon of s.party){mon.hp=1;for(const m of mon.moves)m.pp=0;}
 const n={...R,foot:[465,425],phase:'field'};const authority=createPostHealAuthority({readNative:()=>n});const w=new CanonicalWorld({adapter,runtime:s,persist,nativeInteractionAuthority:authority});return{w,n};
}
test('explicit native authority heals far canonical position without changing any position',async()=>{const{w}=testWorld();try{const before=w.snapshot();await assert.rejects(w.interact('heal:POST',{type:'heal',transactionId:'legacy-far'}),/위치/);await w.interactNative('heal:POST',{type:'heal',transactionId:'native-heal'});const after=w.snapshot();assert.deepEqual(after.position,before.position);assert.deepEqual(after.box,before.box);assert.deepEqual(after.progress,before.progress);assert.equal(after.party.length,before.party.length);assert.ok(after.party.every(m=>m.hp>1));await assert.rejects(w.interact('heal:POST',{type:'heal',transactionId:'still-far'}),/위치/);}finally{w.dispose();}});
test('all wrong identities, unsafe feet, phase, unsupported action and forged authority fail closed',async()=>{
 for(const [key,value] of [['sceneId','fake'],['mapId','world:hub:S2'],['revision','old'],['version',0],['imageSHA','0'.repeat(64)],['phase','battle'],['foot',[465,426]],['foot',[465,377]],['foot',[465.1,425]]]){const{w,n}=testWorld();try{const before=w.snapshot();n[key]=value;await assert.rejects(w.interactNative('heal:POST',{type:'heal',transactionId:'denied'}),/NATIVE_HEAL_AUTHORITY_REJECTED/);assert.deepEqual(w.snapshot(),before);}finally{w.dispose();}}
 const{w}=testWorld();try{await assert.rejects(w.interactNative('shop:POST',{type:'heal',transactionId:'shop'}),/NOT_REGISTERED/);await assert.rejects(w.interactNative('heal:POST',{type:'storage-exchange',transactionId:'box'}),/NOT_REGISTERED/);assert.throws(()=>new CanonicalWorld({adapter,nativeInteractionAuthority:{}}),/UNTRUSTED/);}finally{w.dispose();}
});
test('canonical scene cannot be forged by a correct native frame',async()=>{const n={...R,foot:[465,425],phase:'field'},w=new CanonicalWorld({adapter,mode:'test',nativeInteractionAuthority:createPostHealAuthority({readNative:()=>n})});try{const before=w.snapshot();await assert.rejects(w.interactNative('heal:POST',{type:'heal',transactionId:'wrong-map'}),/AUTHORITY_REJECTED/);assert.deepEqual(w.snapshot(),before);}finally{w.dispose();}});
test('persist failure clears native capability but retains canonical pending commit and location',async()=>{let fail=true;const{w}=testWorld({persist:async()=>{if(fail)throw Error('disk-full');}});try{const before=w.snapshot();await assert.rejects(w.interactNative('heal:POST',{type:'heal',transactionId:'failure'}),/disk-full/);assert.equal(w.story.pendingCommit,true);assert.deepEqual(w.snapshot().position,before.position);assert.equal(w.host.nativeCanVisitHub(w.snapshot(),w.definition.points['heal:POST']),undefined);await assert.rejects(w.interactNative('heal:POST',{type:'heal',transactionId:'again'}),/WORLD_BUSY/);fail=false;await w.story.retryCommit();assert.deepEqual(w.snapshot().position,before.position);}finally{w.dispose();}});
