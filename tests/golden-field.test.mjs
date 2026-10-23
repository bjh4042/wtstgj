import test from 'node:test';
import assert from 'node:assert/strict';
import {GOLDEN_MAP_DATA} from '../dist/golden-map-data.mjs';
import {createGoldenField,moveGolden,goldenWalkable,serializeGolden,toggleGoldenMenu,moveGoldenMenu,interactGolden,closeGoldenUI} from '../dist/golden-field.mjs';

function walk(s,d,frames=30){for(let i=0;i<frames;i++)moveGolden(s,d,1/60)}
test('four directions move continuously and opposite inputs restore the foot position',()=>{
 const s=createGoldenField();const start=serializeGolden(s);
 for(const [a,b] of [['down','up'],['left','right']]){walk(s,a,6);assert.notEqual(s.x+','+s.y,start.x+','+start.y);walk(s,b,6)}
 assert.ok(Math.abs(s.x-start.x)<.001&&Math.abs(s.y-start.y)<.001);
});
test('water and wall collision are swept: large time deltas cannot tunnel',()=>{
 const s=createGoldenField({scene:'outdoor',x:1000,y:540,facing:'right'});walk(s,'right',200);assert.ok(s.x<=1102);
 assert.equal(goldenWalkable(s,1200,500),false);assert.equal(goldenWalkable(s,600,280),false);
});
test('ecocenter enters from the actual door and returns to that door',()=>{
 const s=createGoldenField();walk(s,'up',55);assert.equal(s.scene,'interior');assert.equal(s.doorX,765);
 walk(s,'down',75);assert.equal(s.scene,'outdoor');assert.equal(s.x,765);assert.ok(s.y>=395);
});
test('stairs connect land to wharf and wharf to pier',()=>{
 const s=createGoldenField({scene:'outdoor',x:300,y:610,facing:'down'});
 walk(s,'down',24);assert.ok(s.y>700);walk(s,'right',77);assert.ok(s.x>610);walk(s,'down',45);assert.ok(s.y>880);
});
test('menu pauses movement, moves cursor and routes to real menu action IDs',()=>{
 const s=createGoldenField();toggleGoldenMenu(s);assert.equal(interactGolden(s),'party');walk(s,'down');assert.equal(s.y,448);
 moveGoldenMenu(s,'down');assert.equal(interactGolden(s),'bag');closeGoldenUI(s);walk(s,'down',4);assert.ok(s.y>448);
});
test('NPC dialogue advances and position restores without storing transient UI',()=>{
 const s=createGoldenField({scene:'outdoor',x:211,y:379,facing:'left'});interactGolden(s);assert.ok(s.dialogue.join('').includes('탐험가'));
 const saved=serializeGolden(s),restored=createGoldenField(saved);assert.equal(restored.dialogue.length,0);assert.equal(restored.x,211);assert.equal(restored.y,379);
 closeGoldenUI(s);assert.equal(s.dialogue.length,0);
});
test('door transition locks movement and interaction until the new map is ready',()=>{
 const s=createGoldenField({scene:'outdoor',x:765,y:395,facing:'up'});
 assert.equal(interactGolden(s),'transition');assert.equal(s.scene,'outdoor');
 const start=s.x;walk(s,'left',8);assert.equal(s.x,start);assert.equal(interactGolden(s),null);
 walk(s,'right',26);assert.equal(s.scene,'interior');assert.equal(s.transition,null);assert.equal(s.x,768);assert.equal(s.y,869);
});
test('NPC interactions need a facing direction and NPC feet remain solid',()=>{
 const s=createGoldenField({scene:'outdoor',x:230,y:379,facing:'right'});
 interactGolden(s);assert.ok(!s.dialogue.join('').includes('탐험가:'));closeGoldenUI(s);
 s.facing='left';interactGolden(s);assert.ok(s.dialogue.join('').includes('탐험가:'));
 assert.equal(goldenWalkable(s,150,357),false);assert.equal(goldenWalkable(s,848,775),false);
 const fisher=createGoldenField({scene:'outdoor',x:775,y:800,facing:'right'});interactGolden(fisher);assert.ok(fisher.dialogue.join('').includes('낚시꾼:'));
});
test('collision geometry is independent and idle grass interaction no longer starts a battle',()=>{
 assert.equal(GOLDEN_MAP_DATA.entities.filter(n=>n.map==='outdoor').length,2);
 const s=createGoldenField({scene:'outdoor',x:280,y:200,facing:'left'});assert.notEqual(interactGolden(s),'encounter');
 assert.equal(goldenWalkable(s,560,547),false);assert.equal(goldenWalkable(s,460,145),false);
});
