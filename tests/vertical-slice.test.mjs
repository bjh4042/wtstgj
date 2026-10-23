import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.Image=class{constructor(){this.complete=false;this.naturalWidth=0}};
const {createSlice,moveSlice,walkable,zoneAt,interactAt,serializeSlice}=await import('../dist/vertical-slice.mjs');

test('slice save restores scene and outdoor return position',()=>{
 const restored=createSlice(serializeSlice({...createSlice(),scene:'interior',x:480,y:458,outdoor:{x:720,y:386}}));
 assert.equal(restored.scene,'interior');assert.deepEqual(restored.outdoor,{x:720,y:386});
});
test('outdoor water and buildings collide while road movement succeeds',()=>{
 const s=createSlice();assert.equal(walkable(s,700,470),false);assert.equal(walkable(s,208,180),false);
 s.x=400;s.y=450;assert.equal(moveSlice(s,'up',8),true);assert.equal(s.y,442);
});
test('tall grass is an encounter zone',()=>{const s=createSlice();s.x=752;s.y=96;assert.equal(zoneAt(s),'tall')});
test('interior exit restores outdoor coordinates',()=>{
 const s=createSlice();s.scene='interior';s.outdoor={x:720,y:386};s.x=480;s.y=480;
 assert.equal(interactAt(s).type,'exit');assert.equal(s.scene,'outdoor');assert.deepEqual([s.x,s.y],[720,386]);
});
test('one short D-pad action moves one 32px cell on clear ground',()=>{
 const s=createSlice();s.x=400;s.y=450;assert.equal(moveSlice(s,'left',32),true);assert.deepEqual([s.x,s.y],[368,450]);
});
test('laboratory threshold enters the sample interior and records return landing',()=>{
 const s=createSlice();s.x=720;s.y=358;
 const result=interactAt(s);assert.equal(result.type,'enter');assert.equal(s.scene,'interior');assert.deepEqual(s.outdoor,{x:720,y:376});
});
test('subpixel movement accumulates without rounding or stalling a queued step',()=>{
 const s=createSlice();s.x=400;s.y=320;for(let i=0;i<10;i++)assert.equal(moveSlice(s,'right',1.7),true);
 assert.ok(Math.abs(s.x-417)<1e-9);
});
