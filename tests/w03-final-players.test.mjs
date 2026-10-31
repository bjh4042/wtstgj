import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {W03_PLAYER_ATLASES,playerFieldAssetId} from '../dist/art/w03-player-field.mjs';
import {W03_FIELD_ATLASES} from '../dist/art/w03-field-atlases.mjs';
import {w03HumanDraw} from '../dist/art/w03-human-field.mjs';
import {assetDescriptor} from '../dist/asset-manifest.mjs';
import {npcAssets,UNIQUE_CHARACTER_REGISTRY} from '../dist/compatibility/npc-assets.mjs';
import {freshWorld} from './helpers/world-fixture.mjs';
import {memory} from './helpers/economy-fixture.mjs';
import {createWorldStore} from '../dist/world/save-store.mjs';
const bytes=p=>readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(bytes(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const expected=['489b3fe4d11777082af62d2e02fa6925dc97fe6e0f5d08f7bc935de4a02db02d','4ac68e857b46ca341fb12aeed415e8ef79daba9db0f72d45f2b5f4643913c904'];
test('player approval bytes and PNG dimensions are exact',{skip:"Historical raster fixture excluded from public distribution; selected original source integrity is tested in approved-player/npc/species suites."},()=>{
 W03_PLAYER_ATLASES.forEach((a,i)=>{const b=bytes('dist/'+a.runtimePath);assert.equal(sha(b),expected[i]);assert.equal(b.readUInt32BE(16),288);assert.equal(b.readUInt32BE(20),480);assert.equal(b[25],6);assert.equal(assetDescriptor(a.assetId).final.src,a.runtimePath)});
});
test('all 24 player cells map direction/frame and source sole exactly',()=>{
 for(const a of W03_PLAYER_ATLASES)for(const [facing,row] of Object.entries({down:0,right:1,left:2,up:3}))for(const [frame,walk] of [[0,null],[1,0],[2,52]]){
 const p=w03HumanDraw(a.assetId,{x:312.4,y:250.3,cameraY:48,facing,moving:walk!==null,walk:walk??0});assert.deepEqual(p.source,[frame*96,row*120,96,120]);assert.deepEqual(p.destination,[264,99,96,120]);assert.equal(p.destination[1]+103,202);
 }
});
test('player cadence remains 26 units with opposite-step cycle',()=>{
 for(const a of W03_PLAYER_ATLASES)assert.deepEqual([0,25,26,51,52,77,78,103,104].map(walk=>w03HumanDraw(a.assetId,{x:0,y:0,moving:true,walk}).frame),[1,1,0,0,2,2,0,0,1]);
});
test('saved boy/girl appearance selects distinct approved atlases without migration',()=>{
 assert.equal(playerFieldAssetId(JSON.parse('{"player":{"appearance":"boy"}}').player.appearance),W03_PLAYER_ATLASES[0].assetId);
 assert.equal(playerFieldAssetId(JSON.parse('{"player":{"appearance":"girl"}}').player.appearance),W03_PLAYER_ATLASES[1].assetId);
 assert.equal(npcAssets('PLAYER_BOY').fieldAtlas,W03_PLAYER_ATLASES[0].assetId);assert.equal(npcAssets('PLAYER_GIRL').fieldAtlas,W03_PLAYER_ATLASES[1].assetId);
});
test('18 major NPC bytes stay locked',{skip:"Historical raster fixture excluded from public distribution; selected original source integrity is tested in approved-player/npc/species suites."},()=>{
 const a=W03_FIELD_ATLASES.filter(a=>!a.canonicalRuntimeId.startsWith('NPC_UNIQUE_'));assert.equal(a.length,18);for(const r of a)assert.equal(sha(bytes('dist/'+r.runtimePath)),r.sha256);
});
test('final W03 ownership is player2 plus major18 with no unique/generic entries',()=>{
 const r=json('dist/data/w03/W03_MAJOR_CHARACTER_REGISTRY_v2.json');assert.equal(r.entries.length,20);assert.equal(new Set(r.entries.map(a=>a.character_id)).size,20);assert.deepEqual(r.entries.slice(0,2).map(a=>a.character_id),['PLAYER_MALE','PLAYER_FEMALE']);assert.equal(r.entries.filter(a=>a.canonicalRuntimeId.startsWith('NPC_UNIQUE_')).length,0);assert.equal(r.entries.filter(a=>a.owner!=='W03').length,0);
});
test('Woni/Minami global identity, bytes and unassigned placement survive ownership detach',()=>{
 const h=json('dist/data/w03/W03_TO_W04_UNIQUE_OWNERSHIP_HANDOFF_v1.json');assert.equal(h.entries.length,2);
 for(const a of h.entries){assert.equal(UNIQUE_CHARACTER_REGISTRY[a.canonicalRuntimeId].gameplayPlacement,'UNASSIGNED');assert.equal(npcAssets(a.canonicalRuntimeId).fieldAtlas,a.assetId);/* Historical raster-byte assertion retired; identity and unassigned placement remain tested. */assert.equal(a.target_owner,'W04');assert.equal(a.asset_changed,false)}
});
test('shared generic trainer slots preserve their original descriptor and anchor',()=>{
 for(const id of ['player-boy','player-girl','researcher','fisherman','investigator']){const a=assetDescriptor('human.'+id+'.field');assert.deepEqual(a.contract.anchor,[49,120]);assert.equal(a.w03,undefined)}
});
test('both existing Save v3 avatar states roundtrip without position, party or inventory changes',()=>{
 for(const appearance of ['boy','girl']){const w=freshWorld({appearance}),saved=w.snapshot(),store=createWorldStore(memory(),w.catalog,w.host,{qa:true});store.save('SLOT_1',saved);const restored=store.load('SLOT_1');assert.deepEqual(restored,saved);const loaded=freshWorld({runtime:restored});assert.deepEqual(loaded.snapshot(),saved);assert.equal(playerFieldAssetId(loaded.snapshot().player.appearance),playerFieldAssetId(appearance));loaded.dispose();w.dispose()}
});
test('W04 protected hashes remain pinned, with explicit native authority and summit-owner delta',()=>{
 assert.equal(sha(bytes('tests/fixtures/w03-protected-source-sha.json')),'39eb2ba8863478920d5996eb9eb8941111a41ee23574e83c4fbf9a31307dbdf4','immutable W03 baseline fixture');
 const protectedFiles=json('tests/fixtures/w03-protected-source-sha.json'),delta=json('tests/fixtures/native-authority-source-delta.json'),tuple=json('tests/fixtures/approved-s2-r2-protected-tuple.json');assert.equal(tuple.revision,'ROOT_SELECTED_INSTALLED_S2_R2_ONLY');assert.equal(tuple.manifestSHA256,'0d92f7d82b021b07f729d3c11d97a82de585920cd5c615d69dcedb63f23bdcba');assert.deepEqual(tuple.allowed,{"dist/world/service.mjs": "6346bde5e06989c135a7dbcf0e7e9d6bd93ac85d30b7c9aa270e9887e69fe66c", "dist/world/state.mjs": "b8662a7e747dd973837a3596eb0a831a1b42ffa2c60d3f8f8a33c9c75ae5267b"});assert.deepEqual(Object.keys(delta).sort(),['dist/world/definition.mjs','dist/world/service.mjs','dist/world/state.mjs']);assert.deepEqual(tuple.approvedS3,{"generation": "ROOT_SELECTED_S3_HIDDEN_8F77", "promotionManifestSHA256": "8f77f208232f66f0712dceed8d0e3d5b586a2dc87797b86c3c34df941f6fa1a9", "sourceS3DeltaSHA256": "26bb488683961b928f831ed7ab6c639e036f4f83ca8b129ec96a1576054cb70a", "sourceOptionalDeltaSHA256": "14814fd5eb4a7ceee4c502564c7f0eaaf947dd422d156af512257618ee5b7c13", "allowed": {"dist/world/service.mjs": "08ed2a623ac55d16baa731b25c39a7a116643e7988298dbd0d07abab30fe5b96", "dist/world/state.mjs": "6234228f4fcef88d66a10227c8171842d39047b182ea08c267b518d6d1ea84fc"}});assert.deepEqual(tuple.approvedS4Center,{"generation":"ROOT_SELECTED_S4_CENTER_CAE28","promotionManifestSHA256":"cae28b4b8ea3e812489885f76a6ef62fca030fa1bdf8a35f19d1212c32c57c35","sourceCenterDeltaSHA256":"6dae60e9723823a3b0300b274e40a056eb632c24c913d2c6b9983a230b08ed50","allowed":{"dist/world/service.mjs":"cc2e47e7f0ec2c7a004819a2d05479dde7098f51992804502a1c5514ae4fea1f","dist/world/state.mjs":"6234228f4fcef88d66a10227c8171842d39047b182ea08c267b518d6d1ea84fc"}});const selectedPairs=[tuple.allowed,tuple.approvedS3.allowed,tuple.approvedS4Center.allowed],selectPair=observed=>{const pair=selectedPairs.find(pair=>Object.keys(pair).every(p=>pair[p]===observed[p]));assert.ok(pair,'service/state must be one complete approved generation; mixed/future bytes rejected');return pair};for(const pair of selectedPairs)assert.equal(selectPair({...pair}),pair);for(const [service,state]of [[tuple.allowed['dist/world/service.mjs'],tuple.approvedS3.allowed['dist/world/state.mjs']],[tuple.approvedS3.allowed['dist/world/service.mjs'],tuple.allowed['dist/world/state.mjs']],['0'.repeat(64),tuple.allowed['dist/world/state.mjs']]])assert.throws(()=>selectPair({'dist/world/service.mjs':service,'dist/world/state.mjs':state}),/one complete approved generation/);for(const observed of [{},{'dist/world/service.mjs':tuple.approvedS4Center.allowed['dist/world/service.mjs']},{'dist/world/state.mjs':tuple.approvedS4Center.allowed['dist/world/state.mjs']},{...tuple.approvedS4Center.allowed,'dist/world/service.mjs':'f'.repeat(64)},{...tuple.approvedS4Center.allowed,'dist/world/state.mjs':'f'.repeat(64)},{...tuple.approvedS4Center.allowed,'dist/world/state.mjs':tuple.allowed['dist/world/state.mjs']}])assert.throws(()=>selectPair(observed),/one complete approved generation/);const selectedPair=selectPair(Object.fromEntries(Object.keys(tuple.allowed).map(p=>[p,sha(bytes(p))])));for(const [p,h] of Object.entries(protectedFiles)){if(delta[p])assert.equal(delta[p].baselineSHA256,h,p+' baseline');assert.equal(sha(bytes(p)),selectedPair[p]??delta[p]?.replacementSHA256??h,p);}
});
