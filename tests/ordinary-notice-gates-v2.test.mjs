import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {loadCanonical20260927Adapter} from '../dist/compatibility/canonical-20260927-adapter.mjs';
import {mergeApprovedGameplayRelease} from '../dist/compatibility/approved-latest-runtime-adapter.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';
import {StoryProgressionService} from '../dist/story/progression-service.mjs';
import {StoryProgressionService as FrozenService} from './fixtures/frozen-notice-v1/dist/story/progression-service.mjs';
import {createCanonicalCreature} from '../dist/canonical-session.mjs';
import {playBattle} from './helpers/story-fixture.mjs';
const read=dir=>f=>readFileSync(new URL('../dist/data/'+dir+'/'+f,import.meta.url),'utf8');
const historical=await loadCanonicalRuntimeAdapter({readText:read('canonical-handoff-v1')});
const staged=await loadCanonical20260927Adapter({readStaging:read('staging-20260927')});
const adapters={historical,latest:mergeApprovedGameplayRelease(historical,staged)};
for(const [name,adapter] of Object.entries(adapters)){
 test(`${name}: every initially unavailable event stays rejected with identical snapshot and no writes`,async()=>{
  const w=new CanonicalWorld({adapter,mode:'test'}),catalog=w.catalog,runtime=w.snapshot();w.dispose();
  let writes=0;const options={runtime,catalog,adapter,persist:()=>writes++},current=new StoryProgressionService(options),frozen=new FrozenService(options);
  const before=current.snapshot();let rejected=0;
  for(const id of Object.keys(current.contract.events)){
   assert.equal(current.eventAvailable(id),frozen.eventAvailable(id),id);
   if(current.eventAvailable(id))continue;
   await assert.rejects(()=>frozen.runEvent(id));
   await assert.rejects(()=>current.runEvent(id),error=>{
    // YEJI_FINAL is routed to its independent final-battle handler before this gate.
    if(id==='YEJI_FINAL')return true;
    assert.equal(error.code,'STORY_EVENT_UNAVAILABLE');assert.equal(error.eventId,current.contract.aliases[id]??id);
    assert.match(error.message,/[가-힣]/);assert.doesNotMatch(error.message,/Story event unavailable/);return true;
   });
   assert.deepEqual(current.snapshot(),before,id);assert.deepEqual(current.snapshot(),frozen.snapshot(),id);
   assert.equal(current.busy,false);assert.equal(current.pendingCommit,false);rejected++;
  }
  assert.ok(rejected>100);assert.equal(writes,0);
 });
 test(`${name}: P03 names Harin prerequisite and keeps all gates, rewards, flags and saves unchanged`,async()=>{
  let writes=0;const w=new CanonicalWorld({adapter,mode:'test',persist:()=>writes++,hooks:{dialogue:async()=>{}}});
  try{
   for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await w.story.runEvent(id);
   const before=w.snapshot(),count=writes;
   await assert.rejects(()=>w.story.runEvent('P03_TUTORIAL'),{message:'하린과의 첫 대결에서 승리한 뒤 다시 이야기해 주세요.',code:'STORY_EVENT_UNAVAILABLE',eventId:'P03_TUTORIAL'});
   assert.deepEqual(w.snapshot(),before);assert.equal(writes,count);assert.equal(w.story.pendingCommit,false);
  }finally{w.dispose()}
 });
 test(`${name}: actual Harin victory unlocks P03 once without bypassing prerequisites`,async()=>{
  const w=new CanonicalWorld({adapter,mode:'test',hooks:{dialogue:async()=>{}}});
  for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await w.story.runEvent(id);
  const runtime=w.snapshot(),catalog=w.catalog;w.dispose();
  // Test-only high-level starter isolates rules and repeatability; never bundled into game source.
  runtime.party=[createCanonicalCreature(catalog,runtime.starterId,100)];
  let writes=0;const s=new StoryProgressionService({runtime,catalog,adapter,persist:()=>writes++,hooks:{dialogue:async()=>{}}});
  await assert.rejects(()=>s.runEvent('P03_TUTORIAL'),{code:'STORY_EVENT_UNAVAILABLE'});
  await s.runTrainer('RIVAL_00',{rng:()=>.4,battleDriver:playBattle,map:{id:'test',biomeId:'COAST'}});
  assert.equal(s.eventCompleted('RIVAL_00'),true);assert.equal(s.eventAvailable('P03_TUTORIAL'),true);
  const count=writes;await s.runEvent('P03_TUTORIAL');assert.equal(s.eventCompleted('P03_TUTORIAL'),true);assert.equal(writes,count+1);
  const after=s.snapshot();assert.equal((await s.runEvent('P03_TUTORIAL')).alreadyCompleted,true);assert.deepEqual(s.snapshot(),after);assert.equal(writes,count+1);
 });
 test(`${name}: unrelated unknown-event programmer errors retain original semantics`,async()=>{
  const w=new CanonicalWorld({adapter,mode:'test'});try{await assert.rejects(()=>w.story.runEvent('UNKNOWN'),error=>error.message==='Unknown canonical event'&&error.code===undefined)}finally{w.dispose()}
 });
}
