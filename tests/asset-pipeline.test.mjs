import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ASSET_MANIFEST,HUMAN_ROSTER,HUMAN_FIELD_CONTRACT,humanPose,FIELD_ASSET_IDS} from '../dist/asset-manifest.mjs';
import {W03_SOURCE_CONTRACT} from '../dist/art/w03-human-field.mjs';
import {resolveAsset,configureAssets,assetMarkup,validateFinalImage} from '../dist/asset-runtime.mjs';
import {TILE_IDS,TILES,tileSource,tileAtWorld} from '../dist/tileset-contract.mjs';
import {registerPlayableTileMap,terrainWalkable,behaviorAt} from '../dist/field-behavior.mjs';
import {createGoldenField,moveGolden,serializeGolden} from '../dist/golden-field.mjs';
import {recordFieldMovement,finishFieldBattle,trainerSees} from '../dist/field-engine-core.mjs';
import {createMonster,captureChance,freshState,validateSave,STARTERS} from '../dist/model.mjs';
const good=(w,h)=>({naturalWidth:w,naturalHeight:h});

test('20 named humans and all 453 species slots have unique immutable replacement paths',()=>{
 assert.equal(HUMAN_ROSTER.length,20);assert.equal(new Set(HUMAN_ROSTER.map(p=>p.id)).size,20);
 const paths=new Set();for(const person of HUMAN_ROSTER){const asset=ASSET_MANIFEST[`human.${person.id}.field`];if(asset.w03){assert.equal(asset.contract,W03_SOURCE_CONTRACT);assert.match(asset.final.src,/^assets\/final\/humans\/w03\/[^/]+\.png$/);assert.deepEqual(asset.contract.anchor,[48,103]);}else{assert.equal(asset.contract,HUMAN_FIELD_CONTRACT);assert.match(asset.final.src,/\/field\.png$/);}assert.ok(!paths.has(asset.final.src));paths.add(asset.final.src)}
 for(let id=1;id<=151;id++)for(const slot of ['front','back','icon']){const a=ASSET_MANIFEST[`species.${id}.${slot}`];assert.equal(a.final.width,slot==='icon'?32:256);assert.ok(!paths.has(a.final.src));paths.add(a.final.src)}
 for(const id of FIELD_ASSET_IDS)assert.ok(ASSET_MANIFEST[id].legacy);
});
test('12-frame contract maps cardinal directions and walk contacts to one sole anchor',()=>{
 const c=HUMAN_FIELD_CONTRACT;assert.deepEqual(c.rows,['FRONT','RIGHT','LEFT','BACK']);assert.equal(c.columns*c.rows.length,12);
 for(const [row,facing] of ['down','right','left','up'].entries())for(const [walk,frame] of [[0,1],[26,0],[52,2],[78,0]]){const p=humanPose(facing,true,walk);assert.equal(p.row,row);assert.equal(p.frame,frame);assert.deepEqual(p.anchor,[49,120]);assert.ok(p.source[0]+96<=288);assert.ok(p.source[1]+120<=480)}
 assert.deepEqual(humanPose('up',false).source,[0,360,96,120]);
});
test('correct final PNG wins; wrong dimensions and corrupt art fall back without throwing',async()=>{
 const id='human.player-boy.field',a=ASSET_MANIFEST[id],calls=[];
 const final=await resolveAsset(id,{loader:async src=>{calls.push(src);return good(288,480)}});assert.equal(final.status,'final');assert.equal(calls.length,1);
 const bad=await resolveAsset(id,{loader:async src=>src===a.final.src?good(384,480):good(384,480)});assert.equal(bad.status,'legacy');
 const corrupt=await resolveAsset('human.yeji.field',{loader:async src=>{if(!src.startsWith('data:'))throw Error('corrupt');return good(288,480)}});assert.equal(corrupt.status,'placeholder');
 assert.throws(()=>validateFinalImage(a,good(96,120)),/dimensions/);
});
test('all missing images including fallback decode failure resolve to drawable placeholders',async()=>{
 for(const id of ['human.yeji.field','species.151.back','field.objects.lighthouse','tileset.field.v1','battle.coast','field.ui.menu-frame','unknown.id']){const a=await resolveAsset(id,{loader:async()=>{throw Error('offline')}});assert.equal(a.status,'placeholder');assert.ok(a.image.width>0);assert.ok(a.image.height>0)}
});
test('inventory avoids missing final requests and forced mode skips every external image',async()=>{
 const calls=[];const a=await resolveAsset('species.1.icon',{available:new Set(),loader:async src=>{calls.push(src);return good(1402,1122)}});assert.equal(a.status,'legacy');assert.ok(calls.every(src=>!src.includes('/final/')));
 const p=await resolveAsset('species.1.icon',{placeholder:true,loader:async src=>{assert.match(src,/^data:/);return good(32,32)}});assert.equal(p.status,'placeholder');
});
test('stable 32px tile IDs own gameplay flags independently from image slots',()=>{
 assert.deepEqual(Object.keys(TILES).map(Number),Array.from({length:13},(_,i)=>i));
 for(const t of Object.values(TILES)){assert.equal(typeof t.walkable,'boolean');assert.equal(t.passable,t.walkable);assert.deepEqual(tileSource(t.id).slice(2),[32,32]);}
 assert.equal(TILES[TILE_IDS.TALL_GRASS].foreground,true);assert.equal(TILES[TILE_IDS.WATER].fishable,true);assert.equal(TILES[TILE_IDS.STAIRS].walkable,true);assert.equal(TILES[TILE_IDS.DOOR].door,true);assert.equal(TILES[TILE_IDS.WARP].warp,true);
});
test('a new logical tile map participates in existing collision, encounters, sight and edge warp',()=>{
 const tiles=Array.from({length:16},()=>Array(20).fill(TILE_IDS.GROUND));tiles[5][5]=TILE_IDS.BLOCKED;tiles[8][8]=TILE_IDS.TALL_GRASS;tiles[10][10]=TILE_IDS.WATER;
 registerPlayableTileMap('pipeline_a',{tiles,origin:[288,192],worldTileSize:48,links:{right:{map:'pipeline_b',edge:'left'}}});
 registerPlayableTileMap('pipeline_b',{tiles:Array.from({length:16},()=>Array(20).fill(0)),origin:[288,192],worldTileSize:48});
 assert.equal(terrainWalkable('pipeline_a',552,456),false);assert.equal(tileAtWorld('pipeline_a',792,696).water,true);
 const s=createGoldenField();s.scene='pipeline_a';s.x=696;s.y=600;s.core.encounterGrace=0;
 assert.equal(behaviorAt(s.scene,s.x,s.y).tileId,TILE_IDS.TALL_GRASS);assert.equal(recordFieldMovement(s,48,()=>0),true);finishFieldBattle(s,'run');
 s.x=1247;s.y=800;assert.equal(moveGolden(s,'right',1/60),'connection');assert.equal(s.scene,'pipeline_b');
});
test('all 151 species remain usable in battle stats, capture probability and save/party/dex without art',async()=>{
 configureAssets({placeholder:true});
 for(let id=1;id<=151;id++){const mon=createMonster(id,10);assert.ok(mon.hp>0);const chance=captureChance(mon);assert.ok(chance>0&&chance<=1);const a=await resolveAsset(`species.${id}.front`,{placeholder:true,loader:async()=>{throw Error('all art absent')}});assert.equal(a.status,'placeholder');const state=freshState(STARTERS[0],'boy');if(id!==STARTERS[0])state.party.push(mon);state.seen.push(id);state.caught.push(id);assert.ok(validateSave(state).party.some(m=>m.id===id));assert.match(assetMarkup(`species.${id}.icon`),/data-asset-id/)}
 configureAssets({placeholder:false});
});
test('gameplay modules contain no literal PNG paths; assets are resolved by ID',()=>{
 for(const file of ['app.js','golden-field.mjs','species-art.mjs','trainer-sprites.mjs','battle-sprites.mjs','field-engine-core.mjs','field-behavior.mjs','vertical-slice.mjs','field-world.mjs'])assert.doesNotMatch(readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),/assets\/[^'"`\n]+\.png/);
});

test('fishing remains available from gameplay water metadata when all art is absent',async()=>{
 const {fieldFishingAvailable}=await import('../dist/field-behavior.mjs');configureAssets({placeholder:true});assert.equal(fieldFishingAvailable('outdoor',1090,500,'right'),true);assert.equal(fieldFishingAvailable('interior',700,700,'up'),false);configureAssets({placeholder:false});
});
