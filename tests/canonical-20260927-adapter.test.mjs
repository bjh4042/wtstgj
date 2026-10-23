import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonical20260927Adapter,STAGING_FILES} from '../dist/compatibility/canonical-20260927-adapter.mjs';
import {SpeciesCatalogService} from '../dist/species-catalog-service.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';
import {createBattleRules,captureProbability,compileMove} from '../dist/battle-v3/rules.mjs';
const readStaging=file=>readFileSync(new URL('../dist/data/staging-20260927/'+file,import.meta.url),'utf8');

test('staged handoff creates an isolated catalog, battle and world without activation',async()=>{
 const adapter=await loadCanonical20260927Adapter({readStaging});
 assert.equal(adapter.validation.ready,true,JSON.stringify(adapter.validation.errors));
 assert.equal(adapter.active,false);
 assert.equal(adapter.encounterRuntime.handoffVersion,'20260927');
 assert.equal(adapter.validation.count.trainers,104);
 assert.equal(adapter.validation.count.required,40);
 assert.equal(Object.values(adapter.encounterRuntime.story.trainers).filter(x=>['route_general','gym_subtrainer'].includes(x.kind)).length,104);
 assert.equal(adapter.storyRuntime.trainers.YEJI_FINAL.ai,'AI_4');
 assert.equal(adapter.storyRuntime.trainers.YEJI_FINAL.itemUses,2);
 assert.equal(adapter.storyRuntime.events.POST_SANCTUARY_149_RESOLVED.active,true);
 assert.deepEqual(adapter.storyRuntime.events.POST_SANCTUARY_149_RESOLVED.requiresEvents,['FINAL_CHAMPION']);
 assert.equal(adapter.harinPostRematch.variants.SPECIES_001.party.members[0].level,66);
 const catalog=new SpeciesCatalogService({namespace:'canonical',adapter});
 const rules=createBattleRules(adapter);
 assert.equal(rules.version,'v3.2_2026-09-27');
 assert.equal(rules.moves.MV235.effects[0].status,'sleep');
 assert.equal(rules.moves.MV239.effects[0].fraction,.25);
 const world=new CanonicalWorld({adapter,mode:'test'});
 assert.ok(world.snapshot().position.scene);
 world.dispose();
});

test('tampered staging source fails closed at index gate',async()=>{
 const candidate=await loadCanonical20260927Adapter({readStaging:file=>file===STAGING_FILES.battle?readStaging(file).replace('v3.2_2026-09-27','v3.2_tampered'):readStaging(file)});
 assert.equal(candidate.validation.ready,false);
 assert.ok(candidate.validation.errors.some(x=>x.code==='STAGING_HASH_MISMATCH'&&x.file===STAGING_FILES.battle));
});

test('Geoje Ball requires approved bounded policy and bad_poison remains canonical status',async()=>{
 const adapter=await loadCanonical20260927Adapter({readStaging}),rules=createBattleRules(adapter),catalog=new SpeciesCatalogService({namespace:'canonical',adapter});
 const mon={speciesId:'SPECIES_148',level:70,hp:1,status:'bad_poison'};
 assert.ok(captureProbability(rules,catalog,mon,'geoje_ball')<=.95);
 assert.throws(()=>captureProbability(rules,{...catalog,economyPolicy:null},mon,'geoje_ball'),/policy unavailable/);
 assert.equal(compileMove({id:'MV_TEST',effect:'대상을 맹독 상태로 만듦'}).effects[0].status,'bad_poison');
});
