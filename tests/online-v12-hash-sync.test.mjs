import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildOnlineV12} from '../scripts/sync-handoff-online-20260927.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'dist/data/canonical-handoff-v1');
const read=async name=>JSON.parse(await readFile(path.join(dir,name),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const oldHash='0bf068f2ec0e4752e60439f2a7cac5924aff66fcf65e2d23d96e93b96b2f70a8';

test('Online v1.2 repins final bytes consistently without mutating active v1.1',async()=>{
 const [master,contract,rules,battleBytes]=await Promise.all([
  read('geoje_online_battle_master_v1.json'),
  read('geoje_online_battle_firebase_rules_contract_v1.json'),
  read('database.rules.json'),
  readFile(path.join(root,'dist/data/staging-20260927/geoje_battle_collection_master_v3_2.json'))
 ]);
 const source=JSON.stringify({master,contract,rules});
 const hash=sha(battleBytes);
 const next=buildOnlineV12({master,contract,rules,battleBytes,expectedBattleHash:hash});
 assert.equal(JSON.stringify({master,contract,rules}),source);
 assert.equal(next.master.meta.battle_master_sha256,hash);
 assert.equal(next.master.validation.battle_master_sha256,hash);
 assert.equal(next.master.meta.battle_master_version,'v3.2_2026-09-27');
 assert.equal(next.master.meta.source_of_truth.save,'geoje_save_schema_v3.json');
 assert.equal(next.master.scope.unlock_gate,'CAN_USE_ONLINE_FRIEND_BATTLE');
 assert.deepEqual(next.contract.rules,next.rules);
 assert.match(next.rules.rules.rooms.$roomCode['.validate'],new RegExp(hash));
 assert.match(next.rules.rules.rooms.$roomCode.battleMasterHash['.validate'],new RegExp(hash));
 assert.doesNotMatch(JSON.stringify(next),new RegExp(oldHash));
 assert.equal(next.contract.test_matrix.length,26);
 assert.equal(next.master.validation.firebase_emulator_compile_and_allow_deny_tests,'NOT_EXECUTED_FOR_V1_2');
});

test('Online v1.2 rejects an unconfirmed or changed Battle file',async()=>{
 const [master,contract,rules,battleBytes]=await Promise.all([
  read('geoje_online_battle_master_v1.json'),
  read('geoje_online_battle_firebase_rules_contract_v1.json'),
  read('database.rules.json'),
  readFile(path.join(root,'dist/data/staging-20260927/geoje_battle_collection_master_v3_2.json'))
 ]);
 const args={master,contract,rules,battleBytes};
 assert.throws(()=>buildOnlineV12(args),/Explicit final Battle SHA-256 required/);
 assert.throws(()=>buildOnlineV12({...args,expectedBattleHash:'0'.repeat(64)}),/Battle byte hash changed/);
 const altered=Buffer.from(battleBytes);
 altered[altered.length-1]^=1;
 assert.throws(()=>buildOnlineV12({...args,battleBytes:altered,expectedBattleHash:sha(battleBytes)}),/Battle byte hash changed/);
});
