import test from 'node:test';
import assert from 'node:assert/strict';
import {activeDirection,advanceRoute,buildGridRoute,cameraFor,clearDirections,createDirectionInput,pressDirection,releaseDirection,screenToWorldNormalized,stepCardinal,walkFrame} from '../dist/movement.mjs';

test('camera centers in the map and clamps at all edges',()=>{
 const center=cameraFor({x:50,y:50});
 assert.deepEqual(center,{x:600-600/1.65,y:400-400/1.65,zoom:1.65});
 assert.equal(cameraFor({x:0,y:0}).x,0);
 assert.equal(cameraFor({x:100,y:100}).x,1200-1200/1.65);
 assert.equal(cameraFor({x:100,y:100}).y,800-800/1.65);
});

test('screen inverse transform returns the player under a centered camera',()=>{
 const pos={x:50,y:50},camera=cameraFor(pos),rect={left:20,top:10,width:600,height:400};
 assert.deepEqual(screenToWorldNormalized(320,210,rect,camera),pos);
});

test('latest held source wins, repeats keep priority, and release resumes prior source',()=>{
 const input=createDirectionInput();
 pressDirection(input,'keyboard:ArrowUp','up');
 pressDirection(input,'pointer:4','left');
 pressDirection(input,'keyboard:ArrowUp','up');
 assert.equal(activeDirection(input),'left');
 assert.equal(releaseDirection(input,'pointer:4'),'up');
 clearDirections(input);
 assert.equal(activeDirection(input),null);
});

test('blocked cardinal input changes facing without movement',()=>{
 const result=stepCardinal({x:4,y:5},'up',5,()=>false);
 assert.deepEqual(result.pos,{x:4,y:5});
 assert.equal(result.facing,'up');
 assert.equal(result.distancePx,0);
});

test('route uses exact pixel budget and preserves cardinal segments from fractional start',()=>{
 const route=buildGridRoute({x:1.25,y:1.5},{x:3,y:2},()=>true);
 assert.deepEqual(route.slice(0,2),[{x:1,y:1.5},{x:1,y:2}]);
 const result=advanceRoute({x:1.25,y:1.5},route,3,()=>true);
 assert.deepEqual(result.pos,{x:1,y:1.5});
 assert.equal(result.distancePx,3);
 assert.equal(result.facing,'left');
});

test('walk cycle is idle, left stride, idle, right stride every seven pixels',()=>{
 assert.deepEqual([0,7,14,21,28].map(walkFrame),[0,1,0,2,0]);
});
