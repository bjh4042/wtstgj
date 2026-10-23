import test from 'node:test';
import assert from 'node:assert/strict';
import {INTERIOR_CROPS} from '../dist/interior-art.mjs';
import {createIntroWorld,moveIntroWorld} from '../dist/intro-scene.mjs';

test('all 16 original interior props have valid, non-overlapping atlas crops',()=>{
 const values=Object.values(INTERIOR_CROPS);assert.equal(values.length,16);
 for(const [x,y,w,h] of values){assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1254&&y+h<=1254)}
 for(let a=0;a<values.length;a++)for(let b=a+1;b<values.length;b++){
  const [x,y,w,h]=values[a],[xx,yy,ww,hh]=values[b];assert.ok(x+w<=xx||xx+ww<=x||y+h<=yy||yy+hh<=y);
 }
});
test('bed, plant, cabinet, and laboratory NPC footprints stop movement',()=>{
 for(const [scene,x,y,direction] of [['room',2,4,'down'],['room',11,8,'up'],['home',10,3,'up'],['lab',3,6,'up'],['lab',11,6,'up']]){
  const world={...createIntroWorld(scene),x,y};const next=moveIntroWorld(world,direction);
  assert.equal(next.event,'blocked');assert.equal(next.world.x,x);assert.equal(next.world.y,y);
 }
});
