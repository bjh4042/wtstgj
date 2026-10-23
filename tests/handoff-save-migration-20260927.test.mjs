import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {migrateHandoffSaveV2ToV3} from '../dist/compatibility/handoff-save-v2-to-v3.mjs';
const schema=JSON.parse(readFileSync(new URL('../docs/handoff-20260927/reference/02_pre_sync_canonical_inputs/geoje_save_schema_v2.json',import.meta.url)));
const sample=()=>structuredClone(schema.default_snapshot);
test('v2 input retained, TM quantity becomes boolean and old item ID migrates',()=>{
 const v2=sample();v2.inventory.tm={TM01:2,TM02:{owned:true},TM03:0};v2.inventory.items.full_potion=2;
 const {candidate:v3}=migrateHandoffSaveV2ToV3(v2);
 assert.equal(v2.schemaVersion,2);assert.equal(v2.inventory.items.full_potion,2);
 assert.equal(v3.schemaVersion,3);assert.equal(v3.inventory.tm.TM01,true);assert.equal(v3.inventory.tm.TM02,true);assert.equal(v3.inventory.tm.TM03,false);
 assert.equal(v3.inventory.items.full_restore,2);assert.ok(!Object.hasOwn(v3.inventory.items,'full_potion'));
});
test('champion unlocks POST conservatively, old enhanced league and ending do not forge Yeji victory',()=>{
 const v2=sample();v2.progress.flags={MAIN_STORY_CLEAR:true,POST_ENHANCED_LEAGUE_YEJI_DONE:true};
 v2.progress.completedEvents=['FINAL_CHAMPION','FINAL_ENDING_RECORD','POST_ENHANCED_LEAGUE_YEJI'];
 v2.world.visitedMapIds=['world:hub:FINAL'];v2.world.defeatedTrainerIds=['ROUTE_S1_01','ROUTE_S1_01'];
 const {candidate:v3}=migrateHandoffSaveV2ToV3(v2);
 assert.equal(v3.progress.flags.POST_UNLOCKED,true);assert.equal(v3.progress.flags.ONLINE_FRIEND_BATTLE_UNLOCKED,true);
 assert.ok(!v3.progress.flags.YEJI_FINAL_DONE);assert.ok(!v3.progress.flags.YEJI_FINAL_ENDING_DONE);
 assert.ok(!v3.progress.completedEvents.includes('FINAL_ENDING_RECORD'));
 assert.ok(!v3.progress.flags.POST_ENHANCED_LEAGUE_YEJI_DONE);
 assert.deepEqual(v3.world.defeatedTrainerIds,['ROUTE_S1_01']);
 assert.ok(v3.world.discoveredLocationIds.includes('world:hub:FINAL'));
});
test('invalid and ambiguous migration inputs fail without touching original',()=>{
 const bad=sample();bad.inventory.tm.TM01=-1;
 assert.throws(()=>migrateHandoffSaveV2ToV3(bad),/TM ownership/);assert.equal(bad.schemaVersion,2);
 const both=sample();both.inventory.items={full_potion:3,full_restore:4};
 assert.throws(()=>migrateHandoffSaveV2ToV3(both),/Conflicting/);
});
test('old v2 cannot forge Yeji finale or No.151 through completed event IDs',()=>{
 const v2=sample();v2.progress.completedEvents.push('YEJI_FINAL','YEJI_FINAL_ENDING','POST_ONSEOM_GARDEN_FIRST_151','NO_151_FIRST_ENCOUNTER');
 v2.progress.flags.YEJI_FINAL_DONE=true;v2.progress.flags.YEJI_FINAL_ENDING_DONE=true;v2.progress.flags.NO_151_AVAILABLE=true;
 const original=structuredClone(v2),{candidate:v3,warnings}=migrateHandoffSaveV2ToV3(v2);
 assert.deepEqual(v2,original);
 for(const id of ['YEJI_FINAL','YEJI_FINAL_ENDING','POST_ONSEOM_GARDEN_FIRST_151','NO_151_FIRST_ENCOUNTER'])assert.ok(!v3.progress.completedEvents.includes(id));
 for(const id of ['YEJI_FINAL_DONE','YEJI_FINAL_ENDING_DONE','NO_151_AVAILABLE'])assert.ok(!v3.progress.flags[id]);
 assert.ok(warnings.some(x=>x.includes('YEJI_FINAL')));
});
