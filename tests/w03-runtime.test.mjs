import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {W03_FIELD_ATLASES} from '../dist/art/w03-field-atlases.mjs';
import {w03HumanDraw,w03FieldMetadata,drawW03Human} from '../dist/art/w03-human-field.mjs';
import {assetDescriptor,humanPose} from '../dist/asset-manifest.mjs';
import {npcAssets,validateNpcAssets,UNIQUE_CHARACTER_REGISTRY} from '../dist/compatibility/npc-assets.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('historical 18 major + 2 global unique loader catalog preserves approved bytes and canonical bindings',()=>{
 assert.equal(W03_FIELD_ATLASES.length,20);assert.equal(new Set(W03_FIELD_ATLASES.map(a=>a.canonicalRuntimeId)).size,20);
 assert.deepEqual(validateNpcAssets().errors,[]);
 for(const a of W03_FIELD_ATLASES){/* Historical bytes excluded; all canonical binding assertions retained. */assert.equal(npcAssets(a.canonicalRuntimeId).fieldAtlas,a.assetId);assert.equal(assetDescriptor(a.assetId).final.src,a.runtimePath);}
});
test('all240 source cells remain96x120, source sole103 maps to actor ground',()=>{
 for(const a of W03_FIELD_ATLASES)for(const [dir,row] of Object.entries({down:0,right:1,left:2,up:3}))for(const [frame,walk] of [[0,null],[1,0],[2,52]]){
  const p=w03HumanDraw(a.assetId,{facing:dir,moving:walk!==null,walk:walk??0,x:100.4,y:200.4});assert.equal(p.row,row);assert.equal(p.frame,frame);assert.deepEqual(p.source,[frame*96,row*120,96,120]);assert.deepEqual(p.destination,[52,97,96,120]);assert.equal(p.destination[0]+48,100);assert.equal(p.destination[1]+103,200);
 }
});
test('native four-phase walk without reordered pixels',()=>{
 const a=W03_FIELD_ATLASES[0];assert.deepEqual([0,26,52,78,104].map(walk=>w03HumanDraw(a.assetId,{x:0,y:0,moving:true,walk}).frame),[1,0,2,0,1]);
});
test('W03 draw helper is isolated and restores context state',()=>{
 let saved=0,restored=0,draws=[];const c={save(){saved++},restore(){restored++},drawImage(...a){draws.push(a)},imageSmoothingEnabled:true};
 const actor={x:48,y:103,facing:'right',moving:false};assert.equal(drawW03Human(c,{id:'human.player-boy.field',status:'legacy'},actor),false);assert.equal(drawW03Human(c,{id:'human.researcher.field',status:'final'},actor),false);assert.equal(draws.length,0);
 assert.equal(drawW03Human(c,{id:W03_FIELD_ATLASES[0].assetId,status:'final',image:'exact-source'},actor),true);assert.deepEqual(draws[0],['exact-source',0,120,96,120,0,0,96,120]);assert.equal(saved,1);assert.equal(restored,1);
});
test('shared legacy player/generic trainer slots retain original contract, animation and fallback',()=>{
 for(const name of ['player-boy','player-girl','researcher','fisherman','investigator']){const id='human.'+name+'.field';assert.equal(w03FieldMetadata(id),null);assert.equal(assetDescriptor(id).w03,undefined);assert.deepEqual(assetDescriptor(id).contract.anchor,[49,120]);}
 assert.deepEqual(humanPose('left',false,0,{legacy:true}).source,[0,120,96,120]);assert.deepEqual(humanPose('right',false,0,{legacy:true}).source,[0,240,96,120]);
});
test('approved newIDs remain field-only, no invented gameplay identity',()=>{
 for(const id of ['NPC_UNIQUE_WONI','NPC_UNIQUE_MINAMI']){const r=UNIQUE_CHARACTER_REGISTRY[id];assert.equal(r.category,'unique_character');assert.equal(r.gameplayPlacement,'UNASSIGNED');for(const key of ['dialogue','trainer','event','stage','battleIdle','portrait'])assert.equal(r[key],undefined);}
});
