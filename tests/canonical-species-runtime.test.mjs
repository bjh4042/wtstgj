import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {deflateSync} from 'node:zlib';
import {loadCanonicalAdapter} from '../dist/compatibility/canonical-adapter.mjs';
import {SpeciesCatalogService} from '../dist/species-catalog-service.mjs';
import {SPECIES,LEGACY_SPECIES,BY_ID,freshState,validateSave,createMonster,calculateDamage} from '../dist/model.mjs';
import {CANONICAL_SPECIES_RECORDS} from '../dist/species-data.mjs';
import {ASSET_MANIFEST,SPECIES_ASSETS,CANONICAL_SPECIES_ASSETS} from '../dist/asset-manifest.mjs';
import {resolveAsset} from '../dist/asset-runtime.mjs';
import {speciesSlot,resolveSpeciesAssets,followerSpeciesReference} from '../dist/species-asset-resolver.mjs';
import {createFieldFollower,updateFieldFollower} from '../dist/field-follower.mjs';
import {drawFieldFollower} from '../dist/follower-render.mjs';
import {followerPose,validateFollowerMetadata} from '../dist/species-asset-contract.mjs';
import {createGoldenField,moveGolden} from '../dist/golden-field.mjs';
import {coreWalkable,tickFieldCore} from '../dist/field-engine-core.mjs';
import {createFieldAnimation} from '../dist/field-animation.mjs';
import {createCanonicalTestGame,createCanonicalCreature,validateCanonicalTestSave,createGameSession,setCanonicalLead} from '../dist/canonical-session.mjs';
import {createSaveSlotStore,encodeSlot,decodeSlot} from '../dist/compatibility/save-slots.mjs';
import {migrateSave,requireCurrentRuntime} from '../dist/compatibility/save-migration.mjs';
import {evaluateCanonicalMigration} from '../dist/compatibility/migration-eligibility.mjs';
import {SPECIES_MAPPING,mappingSummary} from '../dist/compatibility/species-identity.mjs';
import {CANONICAL_CONTENT,LEGACY_CONTENT} from '../dist/compatibility/content-namespaces.mjs';
import {inspectCanonicalSpeciesArt,validateSpeciesPNG,crc32} from '../tools/species-art-gate.mjs';
import {artInventory} from '../tools/art-inventory.mjs';
const adapter=await loadCanonicalAdapter({readText:async f=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
const canonical=new SpeciesCatalogService({namespace:'canonical',adapter}),legacy=new SpeciesCatalogService({namespace:'work-v2'});
const oldState=()=>freshState(70,'boy'),game=(id=canonical.starterIds[0])=>createCanonicalTestGame(canonical,{mode:'test',starterId:id});
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
const options={canonicalCatalog:canonical,legacyCatalog:legacy},storeFor=s=>createSaveSlotStore(s,options);
const four=id=>{const a=CANONICAL_SPECIES_ASSETS[id];return [a.battle.front,a.battle.back,a.ui.icon,a.fieldFollower.atlas]};
function png(w,h,{atlas=false,opaque=false}={}){
 const chunk=(type,data)=>{const length=Buffer.alloc(4),body=Buffer.concat([Buffer.from(type),data]),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(body));return Buffer.concat([length,body,crc])};
 const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;
 const bytes=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++)for(let x=0;x<w;x++){const at=y*(w*4+1)+1+x*4;bytes[at]=110;bytes[at+1]=140;bytes[at+2]=190;bytes[at+3]=opaque||x%(atlas?96:w)>10&&y%(atlas?120:h)>10?255:0}
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(bytes)),chunk('IEND',Buffer.alloc(0))]);
}

test('legacy catalog preserves 151 numeric identities and 18 legacy identities without mutation',()=>{
 assert.equal(legacy.size,169);for(const s of [...SPECIES,...LEGACY_SPECIES]){const record=legacy.getSpeciesById(s.id);assert.equal(record.name,s.name);assert.deepEqual(record.stats,s.stats);assert.deepEqual(record.moves,s.moves)}
 assert.deepEqual(SPECIES.map(s=>s.name),CANONICAL_SPECIES_RECORDS.map(s=>s.name));assert.equal(BY_ID[4].name,'갯망이');assert.equal(BY_ID['legacy:1'].name,'동비');
});
test('canonical catalog has 151 unique IDs and 151 unique display numbers with complete consumer APIs',()=>{
 assert.equal(canonical.size,151);assert.equal(new Set(canonical.records.map(s=>s.id)).size,151);assert.equal(new Set(canonical.records.map(s=>s.number)).size,151);
 for(const s of canonical.records){assert.equal(canonical.getSpeciesById(s.id),canonical.getSpeciesByNumber(s.number));assert.equal(canonical.getDisplayName(s.id),s.name);assert.equal(canonical.getBaseStats(s.id).length,6);assert.ok(canonical.getTypes(s.id).length);assert.equal(canonical.getGrowthData(s.id).curve,'Lv^3');assert.ok(canonical.getMoveset(s.id).every(m=>m.id.startsWith('MV')));assert.ok(canonical.getEvolutionChain(s.id).some(x=>x.id===s.id))}
 assert.equal(new Set(canonical.records.map(s=>s.chainId)).size,75);
});
test('ID lookup requires catalog identity and never guesses names or numeric canonical IDs',()=>{
 assert.throws(()=>new SpeciesCatalogService({}));assert.equal(canonical.getSpeciesById(46),null);assert.equal(canonical.getSpeciesById('갯망이'),null);assert.equal(canonical.getSpeciesById({namespace:'work-v2',speciesId:4}),null);
 assert.equal(canonical.getSpeciesByNumber(46).id,'SPECIES_046');assert.equal(legacy.getSpeciesByNumber(4).name,'갯망이');assert.notEqual(canonical.getSpeciesByNumber(4).name,legacy.getSpeciesByNumber(4).name);
 assert.equal(resolveSpeciesAssets({speciesId:4}),null);assert.equal(followerSpeciesReference({id:'SPECIES_001'}),null);
});
test('display renumbering and renaming do not change canonical party/dex identity or art paths',()=>{
 const changed=structuredClone(adapter);changed.species[0].number=501;changed.species[0].name='표시명 변경';const c=new SpeciesCatalogService({namespace:'canonical',adapter:changed});
 const saved=game();assert.equal(c.getSpeciesByNumber(501).id,'SPECIES_001');assert.equal(c.getSpeciesByNumber(1),null);assert.equal(c.resolveIcon('SPECIES_001'),canonical.resolveIcon('SPECIES_001'));assert.deepEqual(validateCanonicalTestSave(saved,c).dex,saved.dex);assert.equal(validateCanonicalTestSave(saved,c).party[0].speciesId,'SPECIES_001');
});
test('duplicate canonical display numbers and unavailable adapters are rejected',()=>{
 assert.throws(()=>new SpeciesCatalogService({namespace:'canonical'}));const bad=structuredClone(adapter);bad.species[0].number=bad.species[1].number;assert.throws(()=>new SpeciesCatalogService({namespace:'canonical',adapter:bad}),/Duplicate/);
});
test('151 canonical species have 604 unique slots and stable ID paths separate from legacy art',()=>{
 const paths=new Set(),slotIds=new Set();assert.equal(Object.keys(CANONICAL_SPECIES_ASSETS).length,151);
 for(const s of canonical.records)for(const id of four(s.id)){const a=ASSET_MANIFEST[id];assert.equal(a.speciesId,s.id);assert.equal(a.namespace,'canonical');assert.equal(a.legacy,null);assert.ok(a.final.src.startsWith(`assets/final/canonical/${s.id}/`)||a.final.src===`assets/approved-atlases/species/${s.id}.png`);paths.add(a.final.src);slotIds.add(id)}
 assert.equal(slotIds.size,604);assert.equal(paths.size,304);for(const [id,a] of Object.entries(SPECIES_ASSETS)){assert.equal(ASSET_MANIFEST[a.battle.front].final.src,`assets/final/species/${id.padStart(3,'0')}/front.png`);assert.ok(!paths.has(ASSET_MANIFEST[a.fieldFollower.atlas].final.src))}
 assert.notEqual(speciesSlot({namespace:'canonical',speciesId:'SPECIES_046'},'battle.front'),speciesSlot({namespace:'work-v2',speciesId:4},'battle.front'));
});
test('151 canonical follower slots retain 12-frame, anchor, offsets and distinct size metadata',()=>{
 const scales=new Set();for(const s of canonical.records){const a=ASSET_MANIFEST[canonical.resolveFollowerAsset(s.id)];assert.equal(a.contract.columns*a.contract.rowCount,12);assert.equal(a.final.width,288);assert.equal(a.final.height,480);assert.deepEqual(a.contract.rows,['FRONT','RIGHT','LEFT','BACK']);assert.deepEqual(a.contract.frames,['Idle','WalkA','WalkB']);assert.doesNotThrow(()=>validateFollowerMetadata(a.metadata));scales.add(a.metadata.visualScale)}assert.ok(scales.size>=3);
});
test('canonical bootstrap uses all three authoritative starter IDs and requires DEV/TEST mode',()=>{
 assert.deepEqual(canonical.starterIds,['SPECIES_001','SPECIES_004','SPECIES_007']);assert.deepEqual(canonical.starterIds,adapter.starters.ids);
 for(const id of canonical.starterIds){const s=game(id);assert.equal(s.contentNamespace,'canonical-v1');assert.equal(s.contentVersion,CANONICAL_CONTENT.contentVersion);assert.equal(s.party[0].speciesId,id);assert.equal(s.party[0].namespace,'canonical');assert.deepEqual(s.dex,{seen:[id],caught:[id]});assert.equal(s.battleEnabled,false);assert.equal(s.storyEnabled,false)}
 assert.throws(()=>createCanonicalTestGame(canonical,{starterId:'SPECIES_001'}),/DEV\/TEST/);assert.throws(()=>game('SPECIES_002'));assert.throws(()=>game(1));
});
test('starter families 001–009 are prohibited from every canonical random encounter',()=>{
 assert.equal(canonical.starterFamilyIds.length,9);for(const id of canonical.starterFamilyIds)assert.equal(canonical.canRandomEncounter(id),false);
 for(const a of Object.values(adapter.encounters))for(const pool of Object.values(a.methods))for(const row of pool)assert.ok(!canonical.starterFamilyIds.includes(row.id));
 for(const row of adapter.fishing)assert.ok(!canonical.starterFamilyIds.includes(row.id));assert.equal(canonical.canRandomEncounter('SPECIES_010'),true);assert.equal(canonical.canRandomEncounter('SPECIES_151'),false);
});
test('canonical party, box and dex roundtrip through the existing slot API with stable IDs',()=>{
 const store=storeFor(storage()),s=game();s.party.push(createCanonicalCreature(canonical,'SPECIES_046',12));s.box.push(createCanonicalCreature(canonical,'SPECIES_151',50));s.dex.seen.push('SPECIES_046','SPECIES_151');s.dex.caught.push('SPECIES_046','SPECIES_151');store.save('SLOT_2',s);
 const loaded=store.loadSession('SLOT_2');assert.equal(loaded.catalog,canonical);assert.deepEqual(loaded.runtime,s);assert.equal(loaded.runtime.box[0].speciesId,'SPECIES_151');assert.deepEqual(loaded.runtime.dex,s.dex);
});
test('all three slots independently store legacy and canonical namespace/version/player data',()=>{
 const store=storeFor(storage()),a=oldState(),b=game('SPECIES_001'),c=game('SPECIES_007');b.player.name='둘째 슬롯';c.player.name='셋째 슬롯';store.save('SLOT_1',a,{playerName:'기존 탐험가'});store.save('SLOT_2',b);store.save('SLOT_3',c);
 assert.equal(store.load('SLOT_1').contentNamespace,'legacy-work-v2');assert.equal(store.load('SLOT_1').contentVersion,LEGACY_CONTENT.contentVersion);
 assert.equal(store.load('SLOT_2').contentNamespace,'canonical-v1');assert.equal(store.loadSession('SLOT_3').runtime.player.name,'셋째 슬롯');
 const before1=store.peek('SLOT_1'),before3=store.peek('SLOT_3');const swapped=setCanonicalLead(b,canonical,'SPECIES_151');store.save('SLOT_2',swapped);assert.equal(store.peek('SLOT_1'),before1);assert.equal(store.peek('SLOT_3'),before3);
});
test('untagged legacy single save is identified structurally and tagged without replacing species',()=>{
 const mem=storage(),s=oldState(),raw=JSON.stringify(s);mem.setItem('geoje.monsters.save.v2',raw);const store=storeFor(mem),saved=store.load('SLOT_1');assert.equal(saved.contentNamespace,'legacy-work-v2');assert.deepEqual(saved.runtime,s);assert.equal(mem.getItem('geoje.monsters.save.v2'),raw);assert.equal(store.loadSession('SLOT_1').catalog,legacy);
});
test('pre-3B compatibility envelopes acquire namespace on read while archived bytes stay intact',()=>{
 const mem=storage(),store=storeFor(mem),old=migrateSave(oldState());delete old.contentNamespace;delete old.contentVersion;old.generation=1;const raw=encodeSlot(old);mem.setItem(store.keys('SLOT_1').primary,raw);const loaded=store.load('SLOT_1');assert.equal(loaded.contentNamespace,'legacy-work-v2');assert.equal(mem.getItem(store.keys('SLOT_1').primary),raw);
});
test('unresolved references anywhere in a legacy save forbid whole-save conversion without partial mapping',()=>{
 const s=oldState();s.party=[createMonster(145,10)];s.seen=[145];s.caught=[145];s.legendCaught=[];const unresolved=SPECIES_MAPPING.find(r=>r.status==='UNRESOLVED').currentId;s.box=[createMonster(unresolved,5)];s.seen.push(unresolved);s.caught.push(unresolved);
 const before=JSON.stringify(s),result=evaluateCanonicalMigration(s);assert.equal(result.eligible,false);assert.equal(result.automaticConversionAllowed,false);assert.equal(result.partialMigrationAllowed,false);assert.ok(result.blockers.some(x=>x.code==='UNRESOLVED'));assert.equal(JSON.stringify(s),before);
});
test('structure-changed identity cannot auto-upgrade even when 3A marked the identity safe',()=>{
 const row=SPECIES_MAPPING.find(r=>r.status==='STRUCTURE_CHANGED');assert.equal(row.safeIdentity,true);const s=oldState();s.party=[createMonster(145,10)];s.box=[];s.seen=[145,row.currentId];s.caught=[145];s.legendCaught=[];const result=evaluateCanonicalMigration(s);assert.equal(result.eligible,false);assert.ok(result.blockers.some(x=>x.code==='STRUCTURE_CHANGED'));assert.equal(result.automaticConversionAllowed,false);
});
test('all-reference-safe saves become future candidates only and registry counts remain unchanged',()=>{
 const s=oldState(),reordered=SPECIES_MAPPING.find(r=>r.status==='REORDERED').currentId;s.party=[createMonster(145,10),createMonster(reordered,10)];s.seen=[145,reordered];s.caught=[145,reordered];s.legendCaught=[145];const result=evaluateCanonicalMigration(s);assert.equal(result.eligible,true);assert.equal(result.automaticConversionAllowed,false);assert.deepEqual(mappingSummary(),{EXACT:7,RENAMED_ONLY:0,REORDERED:28,STRUCTURE_CHANGED:20,UNRESOLVED:96});assert.equal(s.party[1].id,reordered);
});
test('legacy gameplay and battle placeholders remain playable beside a canonical session',()=>{
 const s=oldState(),before=JSON.stringify(SPECIES);const session=createGameSession(game(),canonical);assert.ok(session);assert.deepEqual(validateSave(s),s);assert.ok(calculateDamage(s.party[0],createMonster(4,5),'bite',()=>.5).damage>0);assert.equal(JSON.stringify(SPECIES),before);assert.equal(BY_ID[1].name,'도토람');assert.equal(legacy.getDisplayName(1),'도토람');
});
test('session catalog selection does not leak shared runtime or mutable catalog state',()=>{
 const store=storeFor(storage());store.save('SLOT_1',oldState());store.save('SLOT_2',game());const a=store.loadSession('SLOT_1'),b=store.loadSession('SLOT_2');b.runtime.party[0].speciesId='SPECIES_004';assert.equal(store.loadSession('SLOT_2').runtime.party[0].speciesId,'SPECIES_001');assert.equal(a.runtime.party[0].id,70);assert.equal(a.catalog.namespace,'work-v2');assert.equal(b.catalog.namespace,'canonical');assert.throws(()=>{b.catalog.records[0].name='changed'});assert.equal(a.catalog.getSpeciesById(1).name,'도토람');
});
test('canonical saves cannot enter the legacy battle/session boundary or silently replace a legacy slot',()=>{
 const store=storeFor(storage());store.save('SLOT_1',oldState());const before=store.peek('SLOT_1');assert.throws(()=>store.save('SLOT_1',game()),/catalog mismatch/);assert.equal(store.peek('SLOT_1'),before);store.save('SLOT_2',game());assert.throws(()=>requireCurrentRuntime(store.load('SLOT_2')));assert.throws(()=>createGameSession(game(),legacy));
});
test('unbootstrapped legacy SLOT_1 and canonical slots cannot be overwritten through the wrong catalog',()=>{
 const mem=storage(),raw=JSON.stringify(oldState());mem.setItem('geoje.monsters.save.v2',raw);const store=storeFor(mem);assert.throws(()=>store.save('SLOT_1',game()),/unmigrated legacy/);store.save('SLOT_2',game());const before=store.peek('SLOT_2'),legacyOnly=createSaveSlotStore(mem);assert.throws(()=>legacyOnly.load('SLOT_2'),/canonical session catalog/);assert.throws(()=>legacyOnly.save('SLOT_2',oldState()),/catalog mismatch/);assert.equal(store.peek('SLOT_2'),before);assert.equal(mem.getItem('geoje.monsters.save.v2'),raw);
});
test('canonical follower changes party slot 1 immediately and resets across catalog changes',()=>{
 const f=createFieldFollower(),p={x:200,y:200,scene:'test',facing:'right'},s=game();updateFieldFollower(f,p,s.party,0);assert.equal(f.speciesId,'SPECIES_001');assert.equal(f.speciesReference.namespace,'canonical');const swapped=setCanonicalLead(s,canonical,'SPECIES_151');updateFieldFollower(f,p,swapped.party,0,{paused:true});assert.equal(f.speciesId,'SPECIES_151');assert.equal(f.reason,'party-slot-1');
 updateFieldFollower(f,p,[{id:4}],0);assert.equal(f.speciesId,4);assert.equal(f.speciesReference.namespace,'work-v2');updateFieldFollower(f,p,[],0);assert.equal(f.visible,false);assert.equal(f.speciesReference,null);
});
test('canonical follower uses existing path history and directional Idle/Walk behavior',()=>{
 const f=createFieldFollower(),p={x:200,y:200,scene:'test',facing:'right'},party=game().party;updateFieldFollower(f,p,party,0);for(let i=0;i<20;i++){p.x+=4;updateFieldFollower(f,p,party,1/60)}assert.equal(f.x,p.x-48);p.facing='down';for(let i=0;i<12;i++){p.y+=4;updateFieldFollower(f,p,party,1/60);assert.equal(f.y,200)}for(let i=0;i<20;i++){p.y+=4;updateFieldFollower(f,p,party,1/60)}assert.equal(f.x,280);assert.equal(f.facing,'down');assert.equal(followerPose(f.facing,f.moving,f.walk).row,0);updateFieldFollower(f,p,party,1/60);assert.equal(followerPose(f.facing,f.moving,f.walk).frame,0);
});
test('canonical follower recovers through the actual field engine warp',()=>{
 const s=createGoldenField(null,{qa:true,scenario:'connection'}),f=createFieldFollower(),party=game().party,opts={canOccupy:(_scene,x,y)=>coreWalkable(s,x,y)};s.x=1247;s.y=800;updateFieldFollower(f,s,party,0,opts);moveGolden(s,'right',1/60);updateFieldFollower(f,s,party,1/60,opts);assert.equal(s.scene,'qa_b');assert.equal(f.scene,'qa_b');assert.ok(coreWalkable(s,f.x,f.y));assert.ok(Math.hypot(f.x-s.x,f.y-s.y)<=48);
});
test('canonical follower recovers through the actual field engine ledge sequence',()=>{
 const s=createGoldenField(null,{qa:true,scenario:'ledge'}),f=createFieldFollower(),a=createFieldAnimation(),party=game().party,opts=()=>({jumping:s.core.sequence?.kind==='ledge',canOccupy:(_scene,x,y)=>coreWalkable(s,x,y)});updateFieldFollower(f,s,party,0,opts());for(let i=0;i<7;i++)moveGolden(s,'down',1/60);updateFieldFollower(f,s,party,1/60,opts());assert.equal(f.visible,false);for(let i=0;i<40;i++){tickFieldCore(s,1/60,a);updateFieldFollower(f,s,party,1/60,opts())}assert.equal(f.visible,true);assert.equal(s.y,744);assert.ok(coreWalkable(s,f.x,f.y));
});
for(const slot of ['battle.front','battle.back','ui.icon','fieldFollower.atlas'])test(`canonical ${slot} falls back for all 151 species even if placeholder decoding fails`,async()=>{
 for(const s of canonical.records){const result=await resolveAsset(canonical.resolveAssetId(s.id,slot),{available:new Set(),loader:async()=>{throw Error('missing')}});assert.equal(result.status,'placeholder');assert.ok(result.width&&result.height)}
});
test('canonical renderer uses canonical atlas metadata and preserves the old numeric drawing API',()=>{
 const calls=[],c={save(){},restore(){},fillRect(...a){calls.push(a)},fillText(){}};const f=createFieldFollower(),p={scene:'test',x:200,y:180,facing:'down'};updateFieldFollower(f,p,game().party,0);assert.equal(drawFieldFollower(c,f),true);assert.ok(calls.length);assert.equal(drawFieldFollower(c,{...f,speciesReference:{namespace:'bad',speciesId:'SPECIES_001'}}),false);assert.equal(drawFieldFollower(c,{speciesId:1,x:50,y:70,visible:true,facing:'up',moving:false,walk:0}),true);
});
test('canonical PNG import gate validates all 4 slots independently of legacy paths',async()=>{
 const root=mkdtempSync(join(tmpdir(),'geoje-canonical-'));
 try{const id='SPECIES_001';for(const key of four(id)){const a=ASSET_MANIFEST[key],file=join(root,a.final.src);mkdirSync(dirname(file),{recursive:true});const b=png(a.final.width,a.final.height,{atlas:a.kind==='follower'});writeFileSync(file,b);assert.equal(validateSpeciesPNG(a,b),true);const result=await resolveAsset(key,{available:new Set([a.final.src]),loader:async()=>({naturalWidth:a.final.width,naturalHeight:a.final.height})});assert.equal(result.status,'final')}
  const report=inspectCanonicalSpeciesArt(root,[id]);assert.equal(report.present.length,4);assert.equal(report.failures.length,0);assert.equal(artInventory(root).paths.length,2);assert.ok(inspectCanonicalSpeciesArt(root,['SPECIES_999']).failures.length);
 }finally{rmSync(root,{recursive:true,force:true})}
});
test('invalid canonical follower PNG falls back without rejecting valid sibling slots',()=>{
 const root=mkdtempSync(join(tmpdir(),'geoje-canonical-invalid-'));
 try{for(const key of four('SPECIES_046')){const a=ASSET_MANIFEST[key],file=join(root,a.final.src);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,png(a.final.width,a.final.height,{atlas:a.kind==='follower',opaque:a.kind==='follower'}))}
  const inventory=artInventory(root);assert.equal(inventory.paths.length,1);assert.equal(inventory.rejected.length,1);assert.ok(inventory.rejected[0].path.endsWith('/follower.png'));
 }finally{rmSync(root,{recursive:true,force:true})}
});
test('canonical save rejects mixed identities, unknown versions and malformed ownership without losing the prior slot',()=>{
 const store=storeFor(storage());store.save('SLOT_2',game());const before=store.peek('SLOT_2');const mutations=[s=>s.party[0].speciesId=1,s=>s.party[0].namespace='work-v2',s=>s.dex.seen.push(1),s=>s.contentVersion='future',s=>s.battleEnabled=true,s=>s.box.push({...s.party[0]}),s=>s.party[0].moves[0].pp=999,s=>s.dex.caught=[]];
 for(const mutate of mutations){const s=game();mutate(s);assert.throws(()=>store.save('SLOT_2',s));assert.equal(store.peek('SLOT_2'),before)}
});
test('canonical original import and checksum recovery retain IDs and per-slot namespace',()=>{
 const mem=storage(),store=storeFor(mem),raw=JSON.stringify(game(),null,2);const imported=store.importSave('SLOT_2',raw);assert.equal(imported.committed,true);assert.equal(mem.getItem(imported.archiveKey),raw);store.save('SLOT_2',setCanonicalLead(game(),canonical,'SPECIES_046'));const key=store.keys('SLOT_2').primary;mem.setItem(key,store.peek('SLOT_2').replace('SPECIES_046','SPECIES_047'));const recovered=store.loadSession('SLOT_2');assert.equal(recovered.runtime.party[0].speciesId,'SPECIES_001');assert.equal(recovered.contentNamespace,'canonical-v1');
});
test('canonical imports into a legacy-only store are protected rather than reinterpreted',()=>{
 const mem=storage(),store=createSaveSlotStore(mem),raw=JSON.stringify(game());const result=store.importSave('SLOT_1',raw);assert.equal(result.committed,false);assert.equal(store.peek('SLOT_1'),null);assert.equal(mem.getItem(result.archiveKey),raw);
});
test('canonical catalog never bypasses the 3A unresolved/structure-changed registry',()=>{
 const before=JSON.stringify(SPECIES_MAPPING);for(const s of canonical.records){canonical.getEvolutionChain(s.id);canonical.resolveFollowerAsset(s.id)}assert.equal(JSON.stringify(SPECIES_MAPPING),before);assert.equal(canonical.records.some(s=>typeof s.id==='number'),false);
});

test('migration candidate checks preserved extension references across import and subsequent saves',()=>{
 const store=storeFor(storage()),s=oldState();s.party=[createMonster(145,10)];s.seen=[145];s.caught=[145];s.legendCaught=[];const unresolved=SPECIES_MAPPING.find(r=>r.status==='UNRESOLVED').currentId;s.captureRecords=[{speciesNo:unresolved}];
 const imported=store.importSave('SLOT_1',JSON.stringify(s));assert.equal(imported.committed,true);assert.equal(imported.prepared.migration.canonicalCandidate.eligible,false);assert.ok(imported.prepared.migration.canonicalCandidate.blockers.some(b=>b.path==='captureRecords.0.speciesNo'));
 store.save('SLOT_1',imported.prepared.runtime);const next=store.load('SLOT_1');assert.equal(next.migration.canonicalCandidate.eligible,false);assert.equal(next.sourceSnapshot.captureRecords[0].speciesNo,unresolved);assert.ok(next.migration.canonicalCandidate.blockers.some(b=>b.preservedSource));
});
