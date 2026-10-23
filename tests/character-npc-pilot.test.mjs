import {ASSET_MANIFEST} from '../dist/asset-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {
  INVESTIGATOR_ATLAS, investigatorAtlasPose, createGoldenField, goldenWalkable,
  interactGolden, closeGoldenUI, moveGolden, serializeGolden, updateGoldenGrass,
  updateGoldenCore, fieldAnimation, configureGoldenQA
} from '../dist/golden-field.mjs';

function pngInfo(relative){
  const bytes=readFileSync(new URL('../dist/'+relative,import.meta.url));
  return {signature:bytes.subarray(1,4).toString(),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
function rgbaPng(relative){
 const bytes=readFileSync(new URL('../dist/'+relative,import.meta.url)),width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert.equal(bytes[24],8);assert.equal(bytes[25],6);assert.equal(bytes[28],0);
 const chunks=[];for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.subarray(offset+4,offset+8).toString();if(type==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));offset+=12+length}
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*4,out=Buffer.alloc(stride*height);let source=0;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c};
 for(let y=0;y<height;y++){const filter=raw[source++];for(let x=0;x<stride;x++){const value=raw[source++],left=x>=4?out[y*stride+x-4]:0,up=y?out[(y-1)*stride+x]:0,corner=y&&x>=4?out[(y-1)*stride+x-4]:0;out[y*stride+x]=(value+(filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,corner)))&255}}
 return {width,height,data:out};
}
function framePixels(image,row,frame){const result=Buffer.alloc(96*120*4);for(let y=0;y<120;y++)image.data.copy(result,y*96*4,((row*120+y)*image.width+frame*96)*4,((row*120+y)*image.width+(frame+1)*96)*4);return result}

test('representative investigator atlas has four directional rows and the approved native anchor',()=>{
  assert.deepEqual(INVESTIGATOR_ATLAS.rows,{down:0,left:1,right:2,up:3});
  assert.deepEqual(INVESTIGATOR_ATLAS.walk,[1,3,2,3]);
  // Historical raster dimensions retired; direction and anchors still tested.
  assert.deepEqual(
    ['down','left','right','up'].map(facing=>investigatorAtlasPose(facing,false,999)),
    [0,1,2,3].map(row=>({row,frame:0,sx:0,sy:row*120,dx:-49,dy:-120}))
  );
  // Old palette/pixel-difference fixture retired; selected originals have hash tests.

});

test('investigator walk cycles A, contact, B, contact and stays inside 96 by 120 cells',()=>{
  // Preserve cadence and source rectangle contract without distributing old pixels.
  for(const [facing,row] of Object.entries(INVESTIGATOR_ATLAS.rows)){
    const poses=[0,26,52,78,104].map(walk=>investigatorAtlasPose(facing,true,walk));
    assert.deepEqual(poses.map(p=>p.frame),[1,3,2,3,1],facing);
    for(const pose of poses){
      assert.equal(pose.row,row);assert.equal(pose.sx,pose.frame*96);assert.equal(pose.sy,row*120);
      assert.ok(pose.sx>=0&&pose.sx+96<=384);assert.ok(pose.sy>=0&&pose.sy+120<=480);
      assert.deepEqual([pose.dx,pose.dy],[-49,-120]);
    }

  }
});

test('real outdoor investigator keeps its collision body and turns toward the player for talk',()=>{
  const s=createGoldenField({scene:'outdoor',x:150,y:455,facing:'up',doorX:765});
  const investigator=s.core.npcs.find(n=>n.id==='npc_left');
  assert.ok(investigator);assert.equal(investigator.map,'outdoor');assert.deepEqual(investigator.body,[-45,-29,90,34]);
  assert.equal(goldenWalkable(s,150,363),false);assert.equal(goldenWalkable(s,245,363),true);
  assert.equal(interactGolden(s),null);assert.equal(investigator.facing,'down');assert.equal(investigator.paused,true);
  assert.deepEqual(investigatorAtlasPose(investigator.facing,investigator.moving,investigator.walk),{row:0,frame:0,sx:0,sy:0,dx:-49,dy:-120});
  closeGoldenUI(s);assert.equal(investigator.facing,'right');assert.equal(investigator.paused,false);
  investigator.movement='PATROL';investigator.waypoints=[[150,363],[246,363]];investigator.waypoint=0;investigator.wait=0;
  s.x=150;s.y=455;s.facing='up';interactGolden(s);closeGoldenUI(s);assert.equal(investigator.movement,'PATROL');
  const before=investigator.x;for(let i=0;i<240;i++)updateGoldenCore(s,1/60);assert.ok(investigator.x>before,'patrol resumes after talk closes');
});

test('grass, map connection, and save-facing behavior remain driven by the existing engine',()=>{
  configureGoldenQA(new URLSearchParams());fieldAnimation.effects=[];fieldAnimation.previousCell='';fieldAnimation.previousWalk=0;
  const grass=createGoldenField({scene:'outdoor',x:287,y:192,facing:'left',doorX:765});grass.moving=true;grass.walk=32;
  updateGoldenGrass(grass);assert.equal(fieldAnimation.effects.at(-1)?.kind,'tallGrass');assert.equal(fieldAnimation.effects.at(-1)?.direction,'left');

  const s=createGoldenField(null,{qa:true,scenario:'connection'});s.x=1247;s.y=800;s.facing='right';
  assert.equal(moveGolden(s,'right',1/60),'connection');assert.deepEqual([s.scene,s.x,s.y,s.facing],['qa_b',289,800,'right']);
  const saved=serializeGolden(s),restored=createGoldenField(saved,{qa:true,scenario:'connection'});
  assert.deepEqual([restored.scene,restored.x,restored.y,restored.facing],['qa_b',289,800,'right']);
});

test('the fishing NPC and indoor researcher retain their existing identities',()=>{
  const entities=createGoldenField().core.npcs;
  const fisher=entities.find(n=>n.id==='npc_fishing'),researcher=entities.find(n=>n.id==='researcher');
  assert.deepEqual({map:fisher?.map,facing:fisher?.facing,body:fisher?.body},{map:'outdoor',facing:'right',body:[-48,-29,92,32]});
  assert.deepEqual({map:researcher?.map,facing:researcher?.facing,action:researcher?.action},{map:'interior',facing:'down',action:'heal'});
  const source=readFileSync(new URL('../dist/golden-field.mjs',import.meta.url),'utf8');
  const map=JSON.parse(readFileSync(new URL('../dist/assets/golden-living-v2/map.json',import.meta.url),'utf8'));
  assert.match(source,/scene==='interior'[\s\S]*drawApprovedNPC\(c,\{id:'researcher'/);
  assert.doesNotMatch(source,/drawApprovedNPC\(c,\{id:'researcher'[^;]*sprite\(c,'field\.objects\.npc_left'/);
  assert.equal(ASSET_MANIFEST['field.objects.npc_left'].legacy.src,'assets/golden-field-v2/objects/npc_left.png');
  assert.equal(map.objects.find(object=>object.id==='npc_fishing')?.src,'objects/npc_fishing.png');
});
