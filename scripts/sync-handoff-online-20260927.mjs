import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const active=path.join(root,'dist/data/canonical-handoff-v1');
const staging=path.join(root,'dist/data/staging-20260927');
const oldVersion='v3_2026-09-17';
const oldHash='0bf068f2ec0e4752e60439f2a7cac5924aff66fcf65e2d23d96e93b96b2f70a8';
const oldFiles={master:'geoje_online_battle_master_v1.json',contract:'geoje_online_battle_firebase_rules_contract_v1.json',rules:'database.rules.json'};
const newFiles={master:'geoje_online_battle_master_v1_2.json',contract:'geoje_online_battle_firebase_rules_contract_v1_2.json',rules:'database.rules.json'};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const encoded=value=>JSON.stringify(value,null,2)+'\n';

function replaceLiteral(value,oldValue,newValue){
 if(typeof value==='string')return value.replaceAll(oldValue,newValue);
 if(Array.isArray(value))return value.map(x=>replaceLiteral(x,oldValue,newValue));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceLiteral(v,oldValue,newValue)]));
 return value;
}

export function buildOnlineV12({master,contract,rules,battleBytes,expectedBattleHash}){
 if(!/^[0-9a-f]{64}$/.test(expectedBattleHash??''))throw Error('Explicit final Battle SHA-256 required');
 const actual=sha256(battleBytes);
 if(actual!==expectedBattleHash)throw Error(`Battle byte hash changed: ${actual}`);
 const battle=JSON.parse(battleBytes.toString('utf8'));
 if(battle.meta?.file_name!=='geoje_battle_collection_master_v3_2.json'||battle.meta?.version!=='v3.2_2026-09-27')throw Error('Battle v3.2 identity/version mismatch');
 if(master.meta?.battle_master_version!==oldVersion||master.meta?.battle_master_sha256!==oldHash||master.validation?.battle_master_sha256!==oldHash)throw Error('Unexpected Online v1.1 baseline');
 if(JSON.stringify(contract.rules)!==JSON.stringify(rules))throw Error('Online rules contract and database.rules baseline differ');
 if(!JSON.stringify(rules).includes(oldHash)||!JSON.stringify(rules).includes(oldVersion))throw Error('Missing old battle pin in Firebase rules');

 const version=battle.meta.version;
 const nextMaster=replaceLiteral(replaceLiteral(master,oldVersion,version),oldHash,actual);
 nextMaster.meta.file_name=newFiles.master;
 nextMaster.meta.version='v1.2_2026-09-27';
 nextMaster.meta.status='STAGED__EMULATOR_AND_RUNTIME_QA_PENDING';
 nextMaster.meta.source_of_truth.battle=battle.meta.file_name;
 nextMaster.meta.source_of_truth.story_flags='geoje_story_flags_master_v3.json';
 nextMaster.meta.source_of_truth.save='geoje_save_schema_v3.json';
 nextMaster.meta.source_of_truth.manifest='geoje_final_source_manifest_v2.json';
 nextMaster.meta.cross_validation_revision='v3_2026-09-27_PENDING';
 nextMaster.party_contract.local_preflight=nextMaster.party_contract.local_preflight.map(x=>x.replace('Save v2','Save v3').replace('Battle v3','Battle v3.2'));
 nextMaster.party_contract.battle_clone_initialization.pp=nextMaster.party_contract.battle_clone_initialization.pp.replace('Battle v3','Battle v3.2');
 nextMaster.turn_protocol.phases=nextMaster.turn_protocol.phases.map(x=>({...x,rule:x.rule?.replace('Battle v3','Battle v3.2')}));
 nextMaster.turn_protocol.resolution_order=nextMaster.turn_protocol.resolution_order.map(x=>x.replace('Battle v3','Battle v3.2'));
 nextMaster.end_reasons.result_persistence=nextMaster.end_reasons.result_persistence.replace('Save v2','Save v3');
 nextMaster.threat_model.peer_verified=nextMaster.threat_model.peer_verified.map(x=>x.replace('Battle v3','Battle v3.2'));
 nextMaster.threat_model.not_server_verifiable_v1=nextMaster.threat_model.not_server_verifiable_v1.map(x=>x.replace('Save v2','Save v3'));
 nextMaster.validation.status='STAGED__EMULATOR_26_CASES_AND_RUNTIME_QA_PENDING';
 nextMaster.validation.firebase_emulator_compile_and_allow_deny_tests='NOT_EXECUTED_FOR_V1_2';
 nextMaster.validation.battle_master_version=version;
 nextMaster.validation.battle_master_sha256=actual;

 const nextRules=replaceLiteral(replaceLiteral(rules,oldVersion,version),oldHash,actual);
 const nextContract=replaceLiteral(replaceLiteral(contract,oldVersion,version),oldHash,actual);
 nextContract.meta.file_name=newFiles.contract;
 nextContract.meta.version='v1.2_2026-09-27';
 nextContract.meta.status='STAGED__EMULATOR_26_CASES_PENDING';
 nextContract.non_goals=nextContract.non_goals.map(x=>x.replace('Save v2','Save v3'));
 nextContract.rules=nextRules;
 if(JSON.stringify(nextContract.rules)!==JSON.stringify(nextRules))throw Error('Staged Firebase rules mismatch');
 const serialized=JSON.stringify({nextMaster,nextContract,nextRules});
 if(serialized.includes(oldHash)||serialized.includes(oldVersion))throw Error('Stale battle pin remains in staged Online data');
 return {master:nextMaster,contract:nextContract,rules:nextRules,battleHash:actual,battleVersion:version};
}

export async function syncOnlineV12(expectedBattleHash){
 const battleBytes=await readFile(path.join(staging,'geoje_battle_collection_master_v3_2.json'));
 const [master,contract,rules,index]=await Promise.all([
  ...Object.values(oldFiles).map(async file=>JSON.parse(await readFile(path.join(active,file),'utf8'))),
  readFile(path.join(staging,'STAGING_SHA256_INDEX.json'),'utf8').then(JSON.parse)
 ]);
 const pinned=index.files?.['geoje_battle_collection_master_v3_2.json'];
 if(pinned?.sha256!==expectedBattleHash||pinned?.sizeBytes!==battleBytes.length)throw Error('Staging index does not pin the confirmed final Battle bytes');
 const next=buildOnlineV12({master,contract,rules,battleBytes,expectedBattleHash});
 // Check the source once more before publishing sibling files; active v1.1 is never written.
 if(sha256(await readFile(path.join(staging,'geoje_battle_collection_master_v3_2.json')))!==expectedBattleHash)throw Error('Battle changed during Online generation');
 await mkdir(staging,{recursive:true});
 for(const kind of ['master','contract','rules']){
  const file=path.join(staging,newFiles[kind]);
  const payload=encoded(next[kind]);
  try{const prior=await readFile(file,'utf8');if(prior!==payload)throw Error(`Staged ${kind} already differs; review before overwrite`)}
  catch(error){if(error.code!=='ENOENT')throw error;await writeFile(file,payload,{flag:'wx'})}
 }
 return {battleHash:next.battleHash,battleVersion:next.battleVersion,files:Object.values(newFiles)};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const expected=process.argv[2];
 syncOnlineV12(expected).then(result=>console.log(JSON.stringify(result,null,2)),error=>{console.error(error.message);process.exitCode=1});
}
