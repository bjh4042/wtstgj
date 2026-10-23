import test from 'node:test';
import assert from 'node:assert/strict';
import {createFieldAnimation,tickFieldAnimation,environmentFrames,updateGrassInteraction,grassAt} from '../dist/field-animation.mjs';
import {createGoldenField,goldenWalkable} from '../dist/golden-field.mjs';
test('one clock synchronizes water; frozen QA and paused clock do not drift',()=>{
 const a=createFieldAnimation(); for(let i=0;i<20;i++)tickFieldAnimation(a,.016); assert.equal(environmentFrames(a).water,1);
 a.freeze=true;a.qaFrame=2;const t=a.time;tickFieldAnimation(a,4);assert.equal(a.time,t);assert.equal(environmentFrames(a).shore,2);
 a.freeze=false;tickFieldAnimation(a,4,true);assert.equal(a.time,t);
});
test('grass reacts locally to entry and distance, then expires; stopped actor does not walk',()=>{
 const a=createFieldAnimation(),s={scene:'outdoor',x:300,y:320,walk:0,moving:true,facing:'up'};
 assert.ok(grassAt(s.x,s.y));updateGrassInteraction(a,s);assert.equal(a.effects.length,1);
 const fx=a.effects[0];updateGrassInteraction(a,s);assert.equal(a.effects[0],fx);
 s.walk=32;updateGrassInteraction(a,s);assert.notEqual(a.effects[0],fx);
 for(let i=0;i<10;i++)tickFieldAnimation(a,.05);assert.equal(a.effects.length,0);
 s.moving=false;updateGrassInteraction(a,s);assert.equal(a.effects.length,0);
 const field=createGoldenField();assert.equal(goldenWalkable(field,300,320),true);
});
test('restored T pier has a solid end and no invisible platform to the right',()=>{
 const s=createGoldenField();assert.ok(goldenWalkable(s,625,925));assert.equal(goldenWalkable(s,750,925),false);assert.equal(goldenWalkable(s,625,975),false);assert.ok(goldenWalkable(s,750,810));
});
