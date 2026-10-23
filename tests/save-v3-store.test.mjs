import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSaveV3Store,saveV3Keys,validateSaveV3,escapeSaveV3Softlock} from '../dist/compatibility/save-v3-store.mjs';
import {encodeSlot} from '../dist/compatibility/save-slots.mjs';
import {createVersionedSaveAccess} from '../dist/compatibility/versioned-save-access.mjs';

const schema=JSON.parse(readFileSync(new URL('../docs/handoff-20260927/reference/02_pre_sync_canonical_inputs/geoje_save_schema_v2.json',import.meta.url)));
const sample=()=>structuredClone(schema.default_snapshot);
function memory(){const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}}

test('three v3 slots migrate independently and retain original v2 bytes',()=>{
 const storage=memory(),store=createSaveV3Store(storage);
 for(const slot of [1,2,3]){
  const old=sample();old.profile.slotId=slot;old.inventory.tm.TM04=1;
  old.world.claimedOneTimeItemIds=['TM09'];
  const raw=JSON.stringify(old);storage.setItem(saveV3Keys(slot).sourceV2,raw);
  const {snapshot}=store.migrate(slot);
  assert.equal(storage.getItem(saveV3Keys(slot).sourceV2),raw);
  assert.equal(snapshot.inventory.tm.TM04,true);
  assert.equal(snapshot.inventory.tm.TM09,true);
  assert.equal(snapshot.inventory.tm.TM10,false);
  assert.equal(store.read(slot).integrity.snapshotGeneration,1);
 }
 assert.equal(storage.map.size,6);
});

test('validated previous primary alone becomes lastKnownGood; corrupt input leaves both untouched',()=>{
 const storage=memory(),store=createSaveV3Store(storage),raw=JSON.stringify(sample());
 const first=store.migrate(1,{sourceRaw:raw}).snapshot,keys=saveV3Keys(1),initial=storage.getItem(keys.primary);
 const edited=structuredClone(first);edited.player.money=17;
 store.write(1,edited,{expectedRaw:initial});
 assert.equal(store.read(1,{backup:true}).player.money,0);
 const good=storage.getItem(keys.primary),backup=storage.getItem(keys.lastKnownGood);
 const invalid=structuredClone(store.read(1));invalid.inventory.tm.TM01=1;
 assert.throws(()=>store.write(1,invalid),/TM ownership/);
 assert.equal(storage.getItem(keys.primary),good);assert.equal(storage.getItem(keys.lastKnownGood),backup);
 storage.setItem(keys.primary,JSON.stringify({broken:true}));
 assert.throws(()=>store.read(1),/Missing save checksum/);
 const valid=store.read(1,{backup:true});store.write(1,valid);
 assert.equal(storage.getItem(keys.lastKnownGood),backup);
 assert.equal(store.read(1).player.money,0);
});

test('failed v2 validation does not replace existing v3 slot or v2 source',()=>{
 const storage=memory(),store=createSaveV3Store(storage),valid=JSON.stringify(sample());
 store.migrate(2,{sourceRaw:valid});const primary=storage.getItem(saveV3Keys(2).primary);
 const bad=sample();bad.inventory.tm.TM01=-2;
 assert.throws(()=>store.migrate(2,{sourceRaw:JSON.stringify(bad)}),/TM ownership/);
 assert.equal(storage.getItem(saveV3Keys(2).primary),primary);
 assert.equal(storage.getItem(saveV3Keys(2).lastKnownGood),null);
});

test('ordinary compatibility envelope cannot be mistaken for handoff Save v2',()=>{
 const storage=memory(),store=createSaveV3Store(storage);
 const ordinary=JSON.stringify({data:{format:'GEOJE_COMPATIBILITY_SAVE',compatibilityVersion:1,profile:{slotId:'SLOT_1'},runtime:{version:2,party:[],box:[],items:{balls:2},coins:10}},checksumAlgorithm:'SHA-256',checksum:'example'});
 storage.setItem('geoje.monsters.slots.v1.SLOT_1.primary',ordinary);
 assert.throws(()=>store.migrate(1,{sourceRaw:ordinary}),/Expected canonical Save v2/);
 assert.equal(storage.getItem('geoje.monsters.slots.v1.SLOT_1.primary'),ordinary);
 assert.equal(store.peek(1),null);
});

test('three ordinary slots coexist read-only with v3 and never manufacture migration progress',()=>{
 const storage=memory(),store=createSaveV3Store(storage);
 for(const n of [1,2,3]){
  const name=`SLOT_${n}`,key=`geoje.monsters.slots.v1.${name}.primary`;
  const raw=encodeSlot({format:'GEOJE_COMPATIBILITY_SAVE',compatibilityVersion:1,profile:{slotId:name},runtime:{format:'GEOJE_CANONICAL_STORY_V1_SAVE',party:[{speciesId:'SPECIES_001',moves:[{id:'MV001',pp:20}]}],ownedTms:['TM01'],progress:{flags:{POST_UNLOCKED:true}}}});
  storage.setItem(key,raw);
  assert.deepEqual(store.inspectOrdinary(n),{slot:name,key,present:true,valid:true,migrationEligible:false,format:'GEOJE_CANONICAL_STORY_V1_SAVE',reason:'No authoritative ordinary runtime to Save v3 semantic mapping'});
  assert.throws(()=>store.migrateOrdinary(n),e=>e.code==='ORDINARY_SAVE_V3_MAPPING_UNAVAILABLE');
  assert.equal(storage.getItem(key),raw);assert.equal(store.peek(n),null);
 }
});

test('corrupt v3 primary is archived before recovery; archive failure keeps primary and backup',()=>{
 const storage=memory(),store=createSaveV3Store(storage),first=store.migrate(1,{sourceRaw:JSON.stringify(sample())}).snapshot,keys=saveV3Keys(1);
 const good=storage.getItem(keys.primary),edited=structuredClone(first);edited.player.money=7;
 store.write(1,edited);assert.equal(storage.getItem(keys.lastKnownGood),good);
 const corrupt='{"broken":true}';storage.setItem(keys.primary,corrupt);
 const recovered=store.read(1,{backup:true});store.write(1,recovered);
 assert.ok([...storage.map.entries()].some(([key,value])=>key.startsWith('geojeMonster.save.v3.invalidOriginal.')&&value===corrupt));
 assert.equal(storage.getItem(keys.lastKnownGood),good);
 const failed={...storage,setItem(key,value){if(key.startsWith('geojeMonster.save.v3.invalidOriginal.'))throw Error('archive full');storage.setItem(key,value)}};
 storage.setItem(keys.primary,'{"stillBroken":true}');
 assert.throws(()=>createSaveV3Store(failed).write(1,recovered),/archive full/);
 assert.equal(storage.getItem(keys.primary),'{"stillBroken":true}');assert.equal(storage.getItem(keys.lastKnownGood),good);
});

test('autosave backup failure leaves the previous primary unchanged',()=>{
 const storage=memory(),store=createSaveV3Store(storage),first=store.migrate(1,{sourceRaw:JSON.stringify(sample())}).snapshot;
 const keys=saveV3Keys(1),primary=storage.getItem(keys.primary);
 const failing={...storage,setItem(key,value){if(key===keys.lastKnownGood)throw Error('storage full');storage.setItem(key,value)}};
 const autosave=createSaveV3Store(failing),edited=structuredClone(first);edited.player.money=20;
 assert.throws(()=>autosave.autosave(1,edited),/storage full/);
 assert.equal(storage.getItem(keys.primary),primary);
 assert.equal(storage.getItem(keys.lastKnownGood),null);
});

test('softlock escape requires safe location and changes location only',()=>{
 const storage=memory(),store=createSaveV3Store(storage);
 const snapshot=store.migrate(3,{sourceRaw:JSON.stringify(sample())}).snapshot;
 snapshot.player.money=35;snapshot.inventory.items.potion=2;snapshot.progress.flags.BADGE_01=true;
 const point={safe:true,mapId:'ECO_CENTER',position:{x:4,y:7,facing:'left'}};
 for(const blocked of [{battle:true},{cutscene:true},{modal:true}])assert.throws(()=>escapeSaveV3Softlock(snapshot,{safePoint:point,...blocked}),/unavailable/);
 assert.throws(()=>escapeSaveV3Softlock(snapshot,{safePoint:{...point,safe:false}}),/Verified safe point/);
 const recovered=escapeSaveV3Softlock(snapshot,{safePoint:point});
 assert.equal(recovered.progress.currentMapId,'ECO_CENTER');assert.deepEqual(recovered.progress.position,point.position);
 assert.equal(recovered.player.money,35);assert.deepEqual(recovered.inventory,snapshot.inventory);
 assert.deepEqual(recovered.progress.flags,snapshot.progress.flags);
 validateSaveV3(recovered);
});

test('v3 validation rejects No.151 event before ending, including unmarked event path',()=>{
 const storage=memory(),store=createSaveV3Store(storage),base=store.migrate(1,{sourceRaw:JSON.stringify(sample())}).snapshot;
 const bad=structuredClone(base);bad.progress.completedEvents.push('POST_ONSEOM_GARDEN_FIRST_151');
 assert.throws(()=>store.write(1,bad),/No151 access requires Yeji final ending/);
 bad.progress.completedEvents.pop();bad.progress.flags.NO_151_AVAILABLE=true;
 assert.throws(()=>store.write(1,bad),/No151 access requires Yeji final ending/);
 assert.ok(!store.read(1).progress.completedEvents.includes('POST_ONSEOM_GARDEN_FIRST_151'));
});

test('explicit version selection keeps ordinary and canonical v3 snapshots isolated in each slot',()=>{
 const storage=memory(),ordinaryReads=[],access=createVersionedSaveAccess(storage,{ordinaryStore:{load(slot){ordinaryReads.push(slot);return {source:'ordinary',slot}}}});
 for(const n of [1,2,3]){
  const slot=`SLOT_${n}`,oldKey=`geoje.monsters.slots.v1.${slot}.primary`,oldRaw=encodeSlot({format:'GEOJE_COMPATIBILITY_SAVE',compatibilityVersion:1,profile:{slotId:slot},runtime:{version:2,party:[]}});
  storage.setItem(oldKey,oldRaw);
  assert.throws(()=>access.select(n),/Explicit save version/);
  assert.deepEqual(access.select(n,{version:'ordinary-v1'}).runtime,{source:'ordinary',slot});
  access.migrateHandoffV2(n,{sourceRaw:JSON.stringify(sample())});
  assert.equal(access.select(n,{version:'canonical-v3'}).snapshot.schemaVersion,3);
  assert.equal(access.inspect(n).ordinary.valid,true);
  assert.equal(access.inspect(n).canonicalV3.valid,true);
  assert.equal(storage.getItem(oldKey),oldRaw);
 }
 assert.deepEqual(ordinaryReads,['SLOT_1','SLOT_2','SLOT_3']);
});
