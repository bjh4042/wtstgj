import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../dist/data/staging-20260927/',import.meta.url);
const handoff=new URL('../docs/handoff-20260927/reference/',import.meta.url);
const data=name=>JSON.parse(readFileSync(new URL(name,root)));
const original=name=>JSON.parse(readFileSync(new URL(name,handoff)));
const sha=x=>createHash('sha256').update(x).digest('hex');
const battle=data('geoje_battle_collection_master_v3_2.json');
const trainer=data('geoje_trainer_npc_master_v2_2.json');
const stage=data('geoje_stage_master_v2_4.json');
const story=data('geoje_story_flags_master_v3.json');
const encounter=data('geoje_encounter_master_v2_4.json');
const save=data('geoje_save_schema_v3.json');
const character=data('geoje_character_npc_master_v2_1.json');
const latest=original('00_LATEST_CANONICAL_OVERRIDE_20260927.json');

test('handoff bytes and old canonical source are preserved',()=>{
 const manifest=original('00_PACKAGE_MANIFEST_20260927.json');
 for(const row of manifest.files){const b=readFileSync(new URL(row.path,handoff));assert.equal(b.length,row.size_bytes,row.path);assert.equal(sha(b),row.sha256,row.path)}
 assert.equal(battle.meta.source_candidate_sha256,sha(readFileSync(new URL('03_cleanup_candidates/geoje_battle_collection_master_v3_1_final_cleanup_candidate.json',handoff))));
 assert.equal(data('SOURCE_PROVENANCE.json').status,'STAGING_NOT_RUNTIME_ACTIVE');
});
test('staging counts, battle corrections and restricted opponent identity',()=>{
 assert.equal(battle.species.length,151);assert.equal(new Set(battle.species.map(x=>x.chain_id)).size,75);
 assert.equal(battle.move_catalog.length,117);assert.equal(battle.tm_catalog.length,50);
 assert.deepEqual([battle.move_catalog.filter(x=>Number(x.id.slice(2))<200).length,battle.move_catalog.filter(x=>Number(x.id.slice(2))>=200&&Number(x.id.slice(2))<300).length,battle.move_catalog.filter(x=>Number(x.id.slice(2))>=300).length],[55,50,12]);
 assert.equal(trainer.route_trainers.length,84);assert.equal(trainer.gym_subtrainers.length,20);
 assert.equal(trainer.route_trainers.filter(x=>x.required_for_progress).length,28);
 assert.equal(trainer.gym_subtrainers.filter(x=>x.required_for_progress).length,12);
 assert.equal(new Set(trainer.route_trainers.map(x=>x.trainer_id)).size,84);
 assert.equal(new Set(trainer.route_trainers.map(x=>x.display_name)).size,84);
 assert.equal(encounter.areas.length,29);assert.equal(encounter.areas.reduce((n,x)=>n+x.encounter_tables.length,0),46);
 assert.equal(encounter.policyExcludedTables.length,8);
 const moves=new Set(battle.move_catalog.map(x=>x.id)),ex=new Set(Object.keys(latest.moves_latest_patch.EX_player_only));
 assert.equal(battle.species.flatMap(x=>x.level_up_moves??[]).filter(x=>ex.has(x.move_id)).length,0);
 for(const x of [...trainer.route_trainers,...trainer.gym_subtrainers])for(const mon of x.party){assert.ok(![...Array(9).keys()].map(n=>n+1).includes(mon.species_no));assert.ok(mon.species_no<145);for(const m of mon.moves){assert.ok(moves.has(m.move_id));assert.ok(!ex.has(m.move_id))}}
 assert.deepEqual(battle.yeji_final_battle.party.map(x=>[x.preview_species_id,x.level,x.moves.map(m=>m.move_id)]),latest.yeji_final.party.map(x=>[x.id,x.level,x.moves]));
 assert.ok(battle.npc_preview_species.every(x=>!x.main_dex_inclusion&&!x.player_obtainable));
 assert.equal(battle.capture_contract.geoje_ball.probability_cap,0.95);
});
test('approved item, badge, story and Save v3 staging semantics',()=>{
 const items=new Map(battle.items.catalog.map(x=>[x.id,x]));
 for(const x of latest.items_and_economy.consumables){assert.ok(items.has(x.id));if(x.price!=null)assert.equal(items.get(x.id).price,x.price);else assert.equal(items.get(x.id).price,undefined)}
 assert.ok(!items.has('full_potion'));assert.equal(items.get('full_restore').effect.hp_restore,'full');
 assert.deepEqual(battle.gyms.map(x=>x.badge),latest.badges.map(x=>x.name));
 assert.deepEqual(stage.stages.map(x=>x.id),['PROLOGUE',...Array.from({length:9},(_,i)=>`S${i+1}`),'FINAL','POST']);
 assert.equal(character.characters.find(x=>x.npc_id==='NPC_POST_YEJI').battle_id,'YEJI_FINAL');
 const gates=new Map(story.derived_gates.map(x=>[x.id,x.expr]));
 assert.ok(!gates.get('CAN_ASSEMBLE_ONSEOM_COMPASS').includes('dex.caught'));
 assert.ok(gates.get('CAN_CAPTURE_151').includes('YEJI_FINAL_ENDING_DONE'));
 assert.ok(!gates.has('CAN_START_ENHANCED_LEAGUE'));
 for(const id of ['POST_UNLOCKED','ONLINE_FRIEND_BATTLE_UNLOCKED','POST_SANCTUARIES_UNLOCKED','POST_STARTER_RESEARCH_UNLOCKED'])assert.deepEqual(story.flag_catalog.find(x=>x.id===id).set_by,['FINAL_CHAMPION']);
 assert.equal(save.snapshot_schema.schemaVersion,3);
 assert.equal(Object.keys(save.default_snapshot.inventory.tm).length,50);
 assert.ok(Object.values(save.default_snapshot.inventory.tm).every(x=>x===false));
 assert.deepEqual(save.default_snapshot.fieldResearch,{completedResearchQuestIds:[],claimedResearchRewardIds:[]});
 for(const [file] of [['geoje_battle_collection_master_v3_2.json'],['geoje_stage_master_v2_4.json'],['geoje_story_flags_master_v3.json'],['geoje_save_schema_v3.json'],['geoje_character_npc_master_v2_1.json']]){
  const text=readFileSync(new URL(file,root),'utf8');
  for(const stale of ['몽돌배지','해금배지','푸른바다배지','enhanced_post_league','POST_ENHANCED_LEAGUE','NPC_EXP_PREVIEW_EDNA','full_potion','geoje_ball_probability'])assert.ok(!text.includes(stale),file+': '+stale);
 }
});
