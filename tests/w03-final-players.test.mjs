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
test('W04 trainer assignment, movement, collision, save and canonical gameplay source hashes are preserved',()=>{
 const protectedFiles=json('tests/fixtures/w03-protected-source-sha.json');for(const [p,h] of Object.entries(protectedFiles))assert.equal(sha(bytes(p)),h,p);
});
