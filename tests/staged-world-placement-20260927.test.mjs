import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonical20260927Adapter} from '../dist/compatibility/canonical-20260927-adapter.mjs';
import {createWorldDefinition} from '../dist/world/definition.mjs';
import {validateWorldDefinition} from '../dist/world/reachability.mjs';
import {tileMetadata} from '../dist/tileset-contract.mjs';
import {worldWalkable} from '../dist/world/state.mjs';

const readStaging=async file=>readFileSync(new URL('../dist/data/staging-20260927/'+file,import.meta.url),'utf8');
const readArchive=async file=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+file,import.meta.url),'utf8');
const adapter=await loadCanonical20260927Adapter({readStaging,readArchive});
const world=createWorldDefinition(adapter);
const occupied=(m,x,y)=>m.actors.some(a=>a.x===x&&a.y===y);
function reachable(m,removed=[]){const blocked=new Set(removed.map(c=>c.join(','))),q=[m.spawn],seen=new Set([m.spawn.join(',')]);for(let i=0;i<q.length;i++)for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){const x=q[i][0]+dx,y=q[i][1]+dy,key=x+','+y;if(seen.has(key)||blocked.has(key)||!tileMetadata(m.tiles[y]?.[x]).walkable||occupied(m,x,y))continue;seen.add(key);q.push([x,y])}return seen}

test('staged 104 ordinary trainer sites remain reachable across 56 maps',()=>{
 assert.equal(adapter.validation.ready,true);
 const report=validateWorldDefinition(world,adapter);assert.equal(report.pass,true,JSON.stringify(report.errors));
 assert.equal(report.mapCount,56);assert.equal(Object.keys(world.trainerPlacements).length,104);
 assert.equal(Object.values(world.trainerPlacements).filter(x=>x.required).length,40);
 assert.equal(Object.values(world.trainerPlacements).filter(x=>!x.required).length,64);
 assert.equal(world.points['post:yeji'],undefined);
 assert.equal(world.points['post:yeji-final'].gate,'CAN_BATTLE_YEJI_FINAL');
});

test('every required route sightline is a narrow crossing; optional sites remain reachable',()=>{
 for(const m of Object.values(world.maps).filter(m=>m.kind==='area')){
  const required=m.trainers.map(id=>world.points[id]).filter(p=>p.routeRole==='required-crossing');
  const optional=m.trainers.map(id=>world.points[id]).filter(p=>p.routeRole==='optional-spur');
  if(!required.length){for(const p of optional)assert.ok([...reachable(m)].some(k=>{const [x,y]=k.split(',').map(Number);return Math.abs(x-p.x)+Math.abs(y-p.y)<=1}),p.id);continue}
  const pass=reachable(m);assert.ok(pass.has('36,12'),m.id);
  for(const p of required){assert.equal(p.facing,'down');assert.equal(p.y,11);assert.ok(pass.has(p.x+',12'),p.id);assert.equal(reachable(m,[[p.x,12]]).has('36,12'),false,p.id)}
  for(const p of optional)assert.ok([...pass].some(k=>{const [x,y]=k.split(',').map(Number);return Math.abs(x-p.x)+Math.abs(y-p.y)<=1}),p.id);
  if(required.length>2){const rest=world.points['rest:'+m.areaId],checkpoint=world.points['checkpoint:'+m.areaId];assert.ok(rest&&pass.has('13,13')&&checkpoint&&pass.has('13,12'),m.id);assert.deepEqual(m.routeBreak,{gate:[14,12],pointId:checkpoint.id});const save={world:{interactions:[]}},gate=m.routeBreak.gate;assert.equal(reachable(m,[gate]).has('36,12'),false,m.id);assert.equal(worldWalkable(world,save,m.id,...gate,{actors:false}),false);save.world.interactions.push(checkpoint.id);assert.equal(worldWalkable(world,save,m.id,...gate,{actors:false}),true)}
 }
});

test('staged names and field art are stable; approved roaming nodes are safe and reachable',()=>{
 for(const t of Object.values(adapter.encounterRuntime.story.trainers).filter(t=>t.kind==='route_general')){
  const p=world.points['trainer:'+t.id],a=world.maps[p.mapId].actors.find(a=>a.pointId===p.id);
  assert.equal(p.label,t.displayName,p.id);
  assert.equal(a.fieldAssetId,t.gender==='female'?'human.player-girl.field':'human.player-boy.field',p.id);
 }
 assert.equal(world.roamingNodeApproval,'APPROVED');
 assert.deepEqual(Object.keys(world.roamingNodes),['148','149','150','151']);
 const sites={148:'POST_BLUE_CURRENT_SANCTUARY',149:'POST_DEEP_FOREST_SANCTUARY',150:'POST_SEA_WIND_ALTAR',151:'POST_ONSEOM_GARDEN'};
 for(const [no,slot] of Object.entries(world.roamingNodes)){
  const m=world.maps[slot.mapId];assert.equal(slot.mapId,`world:area:${sites[no]}`);
  assert.equal(m.stageId,'POST');assert.equal(m.kind,'area');
  assert.deepEqual(slot.nodeIds,[1,2,3].map(i=>`roam:${no}:${i}`));
  const before=reachable(m);
  for(const [x,y] of slot.cells){
   assert.ok(tileMetadata(m.tiles[y][x]).walkable,`${no}:${x},${y}`);
   assert.ok(before.has(`${x},${y}`),`${no}:${x},${y}`);
   assert.ok(!occupied(m,x,y));assert.ok(!m.points.some(id=>world.points[id].x===x&&world.points[id].y===y));
   assert.ok(!m.solidObjects.some(o=>x>=o.rect[0]&&x<o.rect[0]+o.rect[2]&&y>=o.rect[1]&&y<o.rect[1]+o.rect[3]));
   assert.notDeepEqual([x,y],m.spawn);
   // Even if occupied by a battle sprite, every exit and fixed interaction remains reachable.
   const after=reachable(m,[[x,y]]);
   for(const id of m.warps){const p=world.points[id];assert.ok(after.has(`${p.x},${p.y}`)||after.has(`${p.x+1},${p.y}`),id)}
   for(const id of m.observationPoints){const p=world.points[id];assert.ok(after.has(`${p.x},${p.y}`)||[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>after.has(`${p.x+dx},${p.y+dy}`)),id)}
  }
 }
});
