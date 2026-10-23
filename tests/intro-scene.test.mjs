import test from 'node:test';
import assert from 'node:assert/strict';

import {
 createIntroWorld,
 inspectIntroWorld,
 moveIntroWorld
} from '../dist/intro-scene.mjs';

const DIRECTIONS=['up','down','left','right'];

function routeToEvent(start,event){
 const queue=[{world:start,path:[]}],seen=new Set([`${start.scene}:${start.x},${start.y}`]);
 for(const item of queue){
  for(const direction of DIRECTIONS){
   const moved=moveIntroWorld(item.world,direction),path=[...item.path,direction];
   if(moved.event===event)return {world:moved.world,path};
   if(moved.event&&moved.event!=='blocked')continue;
   const key=`${moved.world.scene}:${moved.world.x},${moved.world.y}`;
   if(!seen.has(key)){seen.add(key);queue.push({world:moved.world,path})}
  }
 }
 return null;
}

test('the playable opening has reachable room, home, town, and lab transitions',()=>{
 const room=routeToEvent(createIntroWorld('room','girl'),'stairs');
 assert.ok(room?.path.length>0);assert.equal(room.world.scene,'home');assert.equal(room.world.gender,'girl');
 const home=routeToEvent(room.world,'outside');
 assert.ok(home?.path.length>0);assert.equal(home.world.scene,'town');assert.equal(home.world.gender,'girl');
 const town=routeToEvent(home.world,'lab-enter');
 assert.ok(town?.path.length>0);assert.equal(town.world.scene,'lab');assert.equal(town.world.gender,'girl');
});

test('all four directions update facing and blocked movement keeps position stable',()=>{
 for(const direction of DIRECTIONS){
  const world=createIntroWorld('room','boy'),moved=moveIntroWorld(world,direction);
  assert.equal(moved.world.facing,direction);
  assert.deepEqual(world,{scene:'room',gender:'boy',x:4,y:3,facing:'down',steps:0},'movement leaves the previous frame immutable');
 }
 const edge={...createIntroWorld('room','boy'),x:1,y:1};
 const blocked=moveIntroWorld(edge,'left');
 assert.equal(blocked.event,'blocked');assert.equal(blocked.world.x,1);assert.equal(blocked.world.y,1);assert.equal(blocked.world.facing,'left');
});

test('the lab starter capsules can be reached and inspected from the entrance',()=>{
 let world=createIntroWorld('lab','boy');
 for(const direction of ['up','up','up'])world=moveIntroWorld(world,direction).world;
 assert.equal(inspectIntroWorld(world),'starters');
 assert.equal(inspectIntroWorld(createIntroWorld('lab','boy')),'nothing');
});

test('the visible north lab door is the only town entrance trigger',()=>{
 let road={...createIntroWorld('town','boy'),x:7},result;
 for(const direction of ['up','up','up','up','up'])result=moveIntroWorld(road,direction),road=result.world;
 assert.equal(result.event,'lab-enter');assert.equal(road.scene,'lab');
 const besideDoor={...createIntroWorld('town','boy'),x:6,y:4};
 const wall=moveIntroWorld(besideDoor,'up');
 assert.equal(wall.event,'blocked');assert.equal(wall.world.scene,'town');assert.equal(wall.world.x,6);assert.equal(wall.world.y,4);
});

test('stairs and home door have matching return destinations',()=>{
 const down=routeToEvent(createIntroWorld('room'),'stairs');
 const upstairs=moveIntroWorld(down.world,'up');assert.equal(upstairs.event,'stairs-up');assert.equal(upstairs.world.y,7);
 const outside=routeToEvent(down.world,'outside');assert.equal(outside.world.x,3);assert.equal(outside.world.y,8);
 const inside=moveIntroWorld(outside.world,'up');assert.equal(inside.event,'home-enter');assert.equal(inside.world.y,7);
 const lab=routeToEvent(outside.world,'lab-enter');const returnTown=moveIntroWorld(lab.world,'down');assert.equal(returnTown.event,'lab-exit');assert.equal(returnTown.world.x,7);assert.equal(returnTown.world.y,4);
});
