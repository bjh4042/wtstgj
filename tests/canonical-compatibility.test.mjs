import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {freshState,createMonster,validateSave,BY_ID,SPECIES} from '../dist/model.mjs';
import {SPECIES_MAPPING,CANONICAL_IDENTITIES,resolveSpecies,mappingSummary,canonicalIdentity} from '../dist/compatibility/species-identity.mjs';
import {migrateSave,detectSaveFormat,collectSpeciesReferences,requireCurrentRuntime} from '../dist/compatibility/save-migration.mjs';
import {normalizeStatus,MAJOR_STATUSES} from '../dist/compatibility/status-enum.mjs';
import {createSaveSlotStore,SAVE_SLOTS,decodeSlot,SLOT_PREFIX} from '../dist/compatibility/save-slots.mjs';
import {loadCanonicalAdapter,createCanonicalAdapter,SOURCE_FILES,parseCSV,validateFingerprints} from '../dist/compatibility/canonical-adapter.mjs';
import {NPC_ASSET_BINDINGS,npcAssets} from '../dist/compatibility/npc-assets.mjs';
import {ASSET_MANIFEST,speciesAssetId} from '../dist/asset-manifest.mjs';
import {sha256,stableJSON} from '../dist/compatibility/codec.mjs';
const texts=Object.fromEntries(Object.values(SOURCE_FILES).map(f=>[f,readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')]));
const sources=Object.fromEntries(Object.entries(SOURCE_FILES).map(([k,f])=>[k,f.endsWith('.csv')?parseCSV(texts[f]):JSON.parse(texts[f])]));
const adapter=await loadCanonicalAdapter({readText:async f=>texts[f]});
const state=()=>freshState(70,'boy');
function memoryStorage(){const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)}}
function legacy(){const s=state();s.version=1;s.party=[{...createMonster('legacy:1',12),id:1}];s.box=[{...createMonster('legacy:32',35),id:32}];s.seen=[1,32];s.caught=[1,32];s.legendCaught=[];return s}

test('151 mapping coverage has explicit statuses, unique canonical correspondences and preserves active identities',()=>{
 assert.equal(SPECIES_MAPPING.length,151);assert.equal(CANONICAL_IDENTITIES.length,151);
 assert.deepEqual(mappingSummary(),{EXACT:7,RENAMED_ONLY:0,REORDERED:28,STRUCTURE_CHANGED:20,UNRESOLVED:96});
 assert.equal(new Set(SPECIES_MAPPING.filter(x=>x.canonicalId).map(x=>x.canonicalId)).size,55);
 for(let n=1;n<=151;n++){assert.equal(SPECIES_MAPPING[n-1].currentId,n);assert.equal(SPECIES_MAPPING[n-1].currentName,BY_ID[n].name);assert.equal(resolveSpecies(n,'handoff-v3').canonicalId,`SPECIES_${String(n).padStart(3,'0')}`)}
 assert.equal(BY_ID[1].name,'도토람');assert.equal(adapter.byId.SPECIES_001.name,'점삵이');assert.equal(SPECIES.length,151);assert.equal(speciesAssetId(1),'species.1.battle.front');
});
test('unresolved species stay explicit and never fall back to matching numeric IDs or motifs',()=>{
 const missing=SPECIES_MAPPING.find(x=>x.status==='UNRESOLVED');assert.ok(missing);assert.equal(resolveSpecies(missing.currentId,'work-v2').canonicalId,null);
 for(const ref of [999,'legacy:1','1'])assert.equal(resolveSpecies(ref,'work-v2').resolved,false);
 assert.equal(resolveSpecies(1,undefined).resolved,false);assert.equal(resolveSpecies(1,'unknown').resolved,false);
});
test('display name changes cannot alter pinned identity lookup',()=>{
 const row=SPECIES_MAPPING.find(x=>x.status==='REORDERED'),before=resolveSpecies(row.currentId,'work-v2');
 const renamed={...row,currentName:'새 이름',canonicalName:'다른 표시 이름'};
 assert.deepEqual(resolveSpecies(renamed.currentId,'work-v2'),before);assert.equal(canonicalIdentity(before.canonicalId).id,before.canonicalId);
 assert.throws(()=>{SPECIES_MAPPING[0].canonicalId='SPECIES_001'});
});
test('structure changes retain correspondence evidence without authorizing gameplay/evolution replacement',()=>{
 const row=SPECIES_MAPPING.find(x=>x.status==='STRUCTURE_CHANGED');assert.equal(row.evolutionCompatible,false);assert.equal(row.safeIdentity,true);
 const s=state();s.party=[createMonster(row.currentId,10)];const result=migrateSave(s);
 assert.equal(result.runtime.party[0].id,row.currentId);assert.equal(result.speciesReferences[0].canonicalId,row.canonicalId);assert.equal(result.migration.canonicalGameplayReady,false);
});
test('format detection examines structure and distinguishes both version 2 schemas',()=>{
 assert.equal(detectSaveFormat(state()),'WORK_V2');assert.equal(detectSaveFormat(legacy()),'WORK_V1');
 assert.equal(detectSaveFormat(sources.save.default_snapshot),'HANDOFF_V2');
 assert.equal(detectSaveFormat({...sources.save.default_snapshot,schemaVersion:1}),'HANDOFF_V1');
 for(const invalid of [null,[],{version:2},{schemaVersion:2}, {...state(),version:99}])assert.equal(detectSaveFormat(invalid),'UNKNOWN');
});
test('legacy migration preserves party/box values and keeps legacy namespace separate from v3',()=>{
 const input=legacy(),raw=JSON.stringify(input),result=migrateSave(raw);
 assert.equal(JSON.stringify(input),raw);assert.equal(result.runtime.party[0].id,'legacy:1');assert.equal(result.runtime.box[0].id,'legacy:32');
 for(const key of ['level','xp','hp','pp','uid','status'])assert.deepEqual(result.runtime.party[0][key],input.party[0][key]);
 assert.ok(result.speciesReferences.every(x=>x.canonicalId===null));assert.equal(result.migration.canActivate,true);assert.equal(result.originalRaw,raw);
});
test('current party and box identities are preserved even when v3 numbers reorder',()=>{
 const s=state();s.party=[createMonster(4,10),createMonster(145,20)];s.box=[createMonster(144,12)];
 const r=migrateSave(s);assert.deepEqual(r.runtime.party,s.party);assert.deepEqual(r.runtime.box,s.box);
 assert.notEqual(resolveSpecies(4,'work-v2').canonicalNumber,4);assert.equal(r.runtime.party[0].id,4);
});
test('dex and capture records preserve every source reference including unknown extension fields',()=>{
 const s=state();s.seen=SPECIES.map(x=>x.id);s.caught=[1,4,144];s.legendCaught=[145];s.captureRecords=[{speciesNo:144},{speciesNo:999}];s.future={opaque:'keep',record:{species_no:999}};
 const r=migrateSave(s);assert.deepEqual(r.runtime.seen,s.seen);assert.deepEqual(r.runtime.caught,s.caught);assert.deepEqual(r.sourceSnapshot,s);
 assert.ok(r.speciesReferences.some(x=>x.path==='captureRecords.1.speciesNo'&&!x.resolved));assert.ok(r.migration.warnings.some(x=>x.code==='ORIGINAL_FIELDS_PRESERVED'));
});
test('unknown species in an owned party quarantines the save, never substitutes or deletes a creature',()=>{
 const s=state();s.party[0].id=999;const r=migrateSave(s);assert.equal(r.runtime,null);assert.equal(r.sourceSnapshot.party[0].id,999);assert.throws(()=>requireCurrentRuntime(r));
});
test('canonical save references normalize to immutable IDs without activating canonical content',()=>{
 const s=structuredClone(sources.save.default_snapshot);s.creatures.instances.a={speciesNo:1,level:5,status:'toxic'};s.player.partyInstanceIds=['a'];s.dex.caughtSpeciesNos=[1];
 const r=migrateSave(s);assert.equal(r.runtime,null);assert.equal(r.normalized.creatures.instances.a.canonicalSpeciesId,'SPECIES_001');assert.equal(r.normalized.creatures.instances.a.status,'bad_poison');assert.equal(r.sourceSnapshot.creatures.instances.a.status,'toxic');assert.equal(r.speciesReferences.find(x=>x.path==='dex.caughtSpeciesNos.0').canonicalId,'SPECIES_001');
 const foreign=structuredClone(s);foreign.contentVersions.species='unknown';assert.ok(migrateSave(foreign).speciesReferences.every(x=>!x.resolved));
});
test('status aliases merge toxic/bad_poison; legacy slow remains distinct; unknowns are preserved',()=>{
 for(const s of MAJOR_STATUSES)assert.equal(normalizeStatus(s).value,s);
 assert.equal(normalizeStatus('toxic').value,'bad_poison');assert.equal(normalizeStatus('slow').value,'legacy:slow');assert.equal(normalizeStatus('flinch').kind,'volatile');assert.equal(normalizeStatus('new_status').resolved,false);
 const s=state();s.party[0].status='slow';const r=migrateSave(s);assert.equal(r.runtime.party[0].status,'slow');assert.equal(r.normalized.party[0].status,'legacy:slow');
 for(const key of ['manifest','battle','save']){assert.deepEqual(adapter.validation.statusReport.sources[key].missing,[]);assert.deepEqual(adapter.validation.statusReport.sources[key].duplicates,[])}
});
test('original raw bytes are backed up before legacy migration; source keys stay untouched',()=>{
 const storage=memoryStorage(),raw=JSON.stringify(legacy(),null,3);storage.setItem('geoje.monsters.save.v1',raw);storage.setItem('geoje.monsters.name','준호');const store=createSaveSlotStore(storage);
 const r=store.load('SLOT_1');assert.equal(r.profile.playerName,'준호');assert.equal(storage.getItem(r.sourceArchiveKey),raw);assert.equal(storage.getItem('geoje.monsters.save.v1'),raw);assert.equal(r.runtime.party[0].id,'legacy:1');
 assert.equal(store.load('SLOT_2'),null);assert.equal(store.load('SLOT_3'),null);
});
test('SLOT_1 SLOT_2 SLOT_3 have independent player, party, progress, backups and revisions',()=>{
 const storage=memoryStorage(),store=createSaveSlotStore(storage);
 SAVE_SLOTS.forEach((id,i)=>{const s=freshState([70,67,139][i],i===1?'girl':'boy');s.coins=100+i;store.save(id,s,{playerName:'탐험가'+i,field:{x:i}})});
 const before=SAVE_SLOTS.map(id=>store.peek(id));const changed=store.load('SLOT_2');changed.runtime.coins=999;changed.profile.playerName='수정';store.save('SLOT_2',changed.runtime,changed.profile);
 assert.equal(store.peek('SLOT_1'),before[0]);assert.equal(store.peek('SLOT_3'),before[2]);assert.equal(store.load('SLOT_2').runtime.coins,999);assert.equal(store.load('SLOT_2',{backup:true}).runtime.coins,101);assert.equal(store.load('SLOT_1').profile.playerName,'탐험가0');
 assert.throws(()=>store.save('SLOT_4',state()));
});
test('slot load returns detached data and moving party cannot mutate an archived original',()=>{
 const storage=memoryStorage(),store=createSaveSlotStore(storage),s=state();s.party.push(createMonster(145,10));const first=store.save('SLOT_1',s);const original=storage.getItem(first.sourceArchiveKey);const loaded=store.load('SLOT_1');loaded.runtime.party.reverse();assert.equal(store.load('SLOT_1').runtime.party[0].id,70);store.save('SLOT_1',loaded.runtime);assert.equal(storage.getItem(first.sourceArchiveKey),original);assert.equal(store.load('SLOT_1').runtime.party[0].id,145);
});
test('unknown and canonical imports archive original without replacing an existing playable slot',()=>{
 const storage=memoryStorage(),store=createSaveSlotStore(storage);store.save('SLOT_1',state());const before=store.peek('SLOT_1');
 for(const raw of ['not json',JSON.stringify({version:2,unknown:true}),JSON.stringify(sources.save.default_snapshot)]){const result=store.importSave('SLOT_1',raw);assert.equal(result.committed,false);assert.equal(storage.getItem(result.archiveKey),raw);assert.equal(store.peek('SLOT_1'),before)}
});
test('backup failure aborts migration without touching source or target',()=>{
 const storage=memoryStorage(),raw=JSON.stringify(legacy());storage.setItem('geoje.monsters.save.v1',raw);const normal=storage.setItem;storage.setItem=(k,v)=>{if(k.includes('.original.'))throw Error('quota');normal(k,v)};
 const store=createSaveSlotStore(storage);assert.throws(()=>store.load('SLOT_1'),/quota/);assert.equal(store.peek('SLOT_1'),null);assert.equal(storage.getItem('geoje.monsters.save.v1'),raw);
});
test('primary commit failure retains current primary and recovery snapshot',()=>{
 const storage=memoryStorage(),store=createSaveSlotStore(storage);store.save('SLOT_1',state());const before=store.peek('SLOT_1'),set=storage.setItem;
 storage.setItem=(k,v)=>{if(k===store.keys('SLOT_1').primary)throw Error('quota');set(k,v)};
 const next=state();next.coins=500;assert.throws(()=>store.save('SLOT_1',next),/quota/);assert.equal(store.peek('SLOT_1'),before);assert.equal(store.load('SLOT_1').runtime.coins,300);
});
test('checksum corruption recovers LKG and archives corrupt primary without discarding it',()=>{
 const storage=memoryStorage(),store=createSaveSlotStore(storage);store.save('SLOT_1',state());const s=state();s.coins=700;store.save('SLOT_1',s);const key=store.keys('SLOT_1').primary,bad=store.peek('SLOT_1').replace('700','701');storage.setItem(key,bad);
 const result=store.load('SLOT_1');assert.equal(result.runtime.coins,300);assert.equal(result.recovery.source,'lastKnownGood');assert.equal(storage.getItem(SLOT_PREFIX+'original.'+sha256(bad)),bad);
 assert.throws(()=>decodeSlot(store.peek('SLOT_1'),'SLOT_2'));
});
test('stale tab saves cannot overwrite a newer primary',()=>{
 const storage=memoryStorage(),a=createSaveSlotStore(storage),b=createSaveSlotStore(storage);a.save('SLOT_1',state());const old=b.load('SLOT_1');const next=state();next.coins=123;a.save('SLOT_1',next);assert.throws(()=>b.save('SLOT_1',old.runtime),/another tab/);assert.equal(a.load('SLOT_1').runtime.coins,123);
});
test('all canonical masters adapt without activating the existing runtime',()=>{
 assert.equal(adapter.validation.ready,true,JSON.stringify(adapter.validation.errors));assert.deepEqual(adapter.validation.count,{species:151,chains:75,moves:117,tms:50,gyms:8,trainers:55});assert.equal(adapter.active,false);
 assert.equal(Object.keys(adapter.stages).length,12);assert.equal(Object.keys(adapter.encounters).length,29);assert.equal(adapter.fishing.length,70);assert.equal(Object.keys(adapter.story.flags).length,49);assert.equal(Object.keys(adapter.characters).length,18);
 assert.ok(Object.values(adapter.trainers).every(t=>t.party.every(p=>canonicalIdentity(p.id)&&p.moves.every(k=>adapter.moves[k]))));assert.equal(BY_ID[1].name,'도토람');
});
test('canonical18 + protected2 players retain slots; approved2 uniques are field-only',()=>{
 assert.equal(Object.keys(NPC_ASSET_BINDINGS).length,22);assert.equal(adapter.validation.npc.canonicalNpcCount,18);assert.deepEqual(adapter.validation.npc.errors,[]);
 for(const row of Object.values(NPC_ASSET_BINDINGS)){assert.ok(ASSET_MANIFEST[row.fieldAtlas]);if(row.category==='unique_character'){assert.equal(row.gameplayPlacement,'UNASSIGNED');assert.equal(row.portrait,undefined);assert.equal(row.battleIdle,undefined);assert.equal(row.battleThrow,undefined);}else for(const slot of ['portrait','battleIdle','battleThrow'])assert.ok(ASSET_MANIFEST[row[slot]]);}
 assert.equal(npcAssets('NPC_ELITE_02_SIYOON').humanId,'siyun');assert.equal(npcAssets('NPC_CHAMPION_DOCTOR_YOON').humanId,'dr-yun');assert.equal(npcAssets('하린'),null);
});
test('Acquisition authority supersedes species legacy fields and reports their differences',()=>{
 assert.ok(adapter.validation.authorityConflicts.some(x=>x.severity==='HISTORICAL'));assert.equal(adapter.validation.authorityConflicts.filter(x=>x.severity==='CONFLICT').length,0);
 const s=structuredClone(sources);s.species.species[0].first_obtainable_stage='POST';const a=createCanonicalAdapter(s);assert.equal(a.acquisition.SPECIES_001.firstStage,'PROLOGUE');assert.ok(a.validation.authorityConflicts.some(x=>x.speciesId==='SPECIES_001'&&x.other==='POST'));
});
test('conflicting authoritative encounter/fishing data is reported and prevents readiness',()=>{
 const s=structuredClone(sources);s.encounter.species_acquisition_index[0].first_obtainable_stage='S9';s.fishing[0].weight='1';const a=createCanonicalAdapter(s);assert.equal(a.validation.ready,false);assert.ok(a.validation.authorityConflicts.some(x=>x.source==='encounter'));assert.ok(a.validation.authorityConflicts.some(x=>x.source==='fishing'));assert.equal(a.acquisition.SPECIES_001.firstStage,'PROLOGUE');
});
test('three old online checksums are HISTORICAL and excluded from current validation PASS',()=>{
 const integrity=adapter.validation.integrity;assert.deepEqual(integrity.errors,[]);assert.equal(integrity.historical.staleFingerprints.length,3);assert.equal(integrity.historical.includedInPassGate,false);
 const historical=structuredClone(sources.historical);historical.canonical_file_fingerprints['geoje_species_151_v3_final.json'].sha256='obsolete';const i=validateFingerprints(texts,sources.manifest,sources.index,historical);assert.deepEqual(i.errors,[]);assert.equal(i.historical.staleFingerprints.length,4);
 const altered={...texts,'geoje_species_151_v3_final.json':texts['geoje_species_151_v3_final.json']+' '};assert.ok(validateFingerprints(altered,sources.manifest,sources.index,historical).errors.some(x=>x.code==='SOURCE_INTEGRITY'));
});
test('missing canonical fields return safe unavailable records and retain the current game',async()=>{
 const s=structuredClone(sources);delete s.species.species[0].name;delete s.battle.species[0].base_stats;const a=createCanonicalAdapter(s);assert.equal(a.byId.SPECIES_001.name,'점삵이');assert.equal(a.byId.SPECIES_001.stats,null);assert.equal(a.byId.SPECIES_001.available,false);assert.equal(a.validation.ready,false);assert.equal(BY_ID[1].name,'도토람');
 const missing=await loadCanonicalAdapter({readText:async file=>{if(file===SOURCE_FILES.battle)throw Error('missing');return texts[file]}});assert.equal(missing.validation.ready,false);assert.equal(missing.species.length,151);assert.ok(missing.validation.errors.some(x=>x.code==='SOURCE_UNAVAILABLE'));
});
test('invalid move IDs, trainer references and wild starters are detected',()=>{
 const s=structuredClone(sources);s.trainer.route_trainers[0].party[0].moves[0].move_id='TM01';s.trainer.route_trainers[0].area_id='UNKNOWN';s.encounter.areas[0].encounter_tables[0].slots[0].species_no=1;const a=createCanonicalAdapter(s);for(const code of ['UNKNOWN_MOVE_REFERENCE','UNKNOWN_TRAINER_AREA','WILD_STARTER'])assert.ok(a.validation.errors.some(x=>x.code===code));
});
test('CSV import preserves quoted commas/newlines, BOM and rejects malformed records',()=>{
 assert.deepEqual(parseCSV('\uFEFFid,note\r\n1,"a,b"\r\n2,"a\n""b"""\r\n'),[{id:'1',note:'a,b'},{id:'2',note:'a\n"b"'}]);assert.throws(()=>parseCSV('a,b\n1'));assert.throws(()=>parseCSV('a\n"unterminated'));
});
test('browser SHA-256 matches Node crypto for Unicode, boundaries and source files',()=>{
 for(const text of ['', 'abc','거제몬스터🐾',...Array.from({length:70},(_,n)=>'a'.repeat(n)),texts[SOURCE_FILES.battle]])assert.equal(sha256(text),createHash('sha256').update(text).digest('hex'));
 assert.equal(stableJSON({z:1,a:[2,3]}),stableJSON({a:[2,3],z:1}));
});
test('migration preserves current battle statuses and all existing save/load invariants',()=>{
 const s=state();s.party[0].status='poison';s.box=[createMonster(145,20)];const r=migrateSave(s);assert.deepEqual(requireCurrentRuntime(r),validateSave(s));assert.deepEqual(r.runtime.party[0].pp,s.party[0].pp);
});

test('a revised identity source cannot silently reuse pinned canonical IDs even with updated checksum authorities',async()=>{
 const changed=structuredClone(sources.species);changed.species[0].no=2;const text=JSON.stringify(changed),manifest=structuredClone(sources.manifest),index=structuredClone(sources.index),file=SOURCE_FILES.species;
 const hash={sha256:sha256(text),size_bytes:new TextEncoder().encode(text).length};manifest.canonical_file_fingerprints[file]=hash;index.canonical_files[file]=hash;
 const changedTexts={...texts,[file]:text,[SOURCE_FILES.manifest]:JSON.stringify(manifest),[SOURCE_FILES.index]:JSON.stringify(index)};
 const a=await loadCanonicalAdapter({readText:async f=>changedTexts[f]});assert.equal(a.validation.ready,false);assert.ok(a.validation.errors.some(x=>x.code==='IDENTITY_SOURCE_REBIND_REQUIRES_REVIEW'));
});
test('conflicting saved canonical ID and number are flagged without replacing either source value',()=>{
 const s=structuredClone(sources.save.default_snapshot);s.creatures.instances.a={speciesNo:1,speciesId:'SPECIES_002',level:5,status:null};const r=migrateSave(s);
 assert.equal(r.migration.canonicalIdentityComplete,false);assert.ok(r.migration.warnings.some(x=>x.code==='SPECIES_REFERENCE_CONFLICT'));assert.deepEqual(r.sourceSnapshot,s);assert.equal(r.runtime,null);
});
test('foreign flat saves cannot masquerade as the current version 2 species catalog',()=>{
 const s=state();s.contentVersions={species:'unreviewed-v4'};const r=migrateSave(s);assert.equal(r.runtime,null);assert.deepEqual(r.sourceSnapshot,s);
});
