import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGridRoute} from '../dist/movement.mjs';
import {REGIONS} from '../dist/regions.mjs';
import {
 FIELD_BUILDINGS,FIELD_REGION_LAYOUTS,FIELD_ROAD_WIDTHS,FIELD_SCALE,
 fieldEnvironmentAt,fieldLayoutFor,fieldPathsFor,fieldPointsFor,fieldWalkable
} from '../dist/field-world.mjs';

const REGION_IDS=['gohyeon','garden','west','bamboo','north','okpo','port','ilun','south','island'];
const SPAWN={x:49.5,y:44};

function roadRectangle([a,b]){
 const ax=a[0]*FIELD_SCALE.x,ay=a[1]*FIELD_SCALE.y,bx=b[0]*FIELD_SCALE.x,by=b[1]*FIELD_SCALE.y,half=FIELD_ROAD_WIDTHS.innerHalf;
 return ax===bx
  ?{left:ax-half,right:ax+half,top:Math.min(ay,by)-half,bottom:Math.max(ay,by)+half}
  :{left:Math.min(ax,bx)-half,right:Math.max(ax,bx)+half,top:ay-half,bottom:ay+half};
}

function buildingRectangle(building){
 return {left:building.x-building.width/2,right:building.x+building.width/2,top:building.y-building.height,bottom:building.y};
}

function overlaps(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}

test('v1 gives all ten regions distinct, immutable terrain compositions and orthogonal side streets',()=>{
 assert.deepEqual(Object.keys(FIELD_REGION_LAYOUTS),REGION_IDS);
 const signatures=new Set();
 for(const id of REGION_IDS){
  const region=REGIONS.find(candidate=>candidate.id===id),layout=fieldLayoutFor(region);
  assert.ok(Object.isFrozen(layout)&&Object.isFrozen(layout.branches)&&Object.isFrozen(layout.zones));
  assert.ok(layout.branches.length>=2,`${id} needs a recognizable side-street silhouette`);
  assert.ok(layout.zones.length>=2,`${id} needs more than a palette swap`);
  for(const [a,b] of layout.branches){
   assert.ok(a[0]===b[0]||a[1]===b[1],`${id} branch ${a} -> ${b} must stay orthogonal`);
   const midpoint={x:(a[0]+b[0])/2,y:(a[1]+b[1])/2};
   assert.equal(fieldWalkable(region,null,midpoint.x,midpoint.y),true,`${id} painted branch must share collision geometry`);
  }
  for(const zone of layout.zones){
   assert.ok(['vegetation','water','sand','cliff','flower'].includes(zone.type));
   assert.ok(zone.width>0&&zone.height>0);
   assert.equal(fieldEnvironmentAt(region,zone.x+.1,zone.y+.1),zone.type);
  }
  signatures.add(JSON.stringify(layout));
 }
 assert.equal(signatures.size,REGION_IDS.length,'no two regions may reuse the same structural layout');
});

test('v1 keeps the saved spawn and every established destination connected in every region',()=>{
 for(const region of REGIONS){
  assert.equal(fieldWalkable(region,null,SPAWN.x,SPAWN.y),true,`${region.id} must accept old saves at the shared spawn`);
  for(const [name,point] of Object.entries(fieldPointsFor(region))){
   assert.ok(buildGridRoute(SPAWN,point,(x,y)=>fieldWalkable(region,null,x,y)),`${region.id}:${name} must remain reachable`);
  }
  for(const branch of fieldLayoutFor(region).branches){
   const endpoint={x:branch[1][0],y:branch[1][1]};
   assert.ok(buildGridRoute(SPAWN,endpoint,(x,y)=>fieldWalkable(region,null,x,y)),`${region.id} branch must join a core road`);
  }
 }
});

test('v1 side streets do not introduce walkable road beneath visible buildings',()=>{
 for(const region of REGIONS)for(const branch of fieldLayoutFor(region).branches){
  const road=roadRectangle(branch);
  for(const [name,building] of Object.entries(FIELD_BUILDINGS)){
   assert.equal(overlaps(road,buildingRectangle(building)),false,`${region.id} branch overlaps ${name}`);
  }
 }
});

test('v1 environmental rectangles stay clear of visible building bodies',()=>{
 for(const region of REGIONS)for(const zone of fieldLayoutFor(region).zones){
  const terrain={left:zone.x*FIELD_SCALE.x,right:(zone.x+zone.width)*FIELD_SCALE.x,top:zone.y*FIELD_SCALE.y,bottom:(zone.y+zone.height)*FIELD_SCALE.y};
  for(const [name,building] of Object.entries(FIELD_BUILDINGS)){
   assert.equal(overlaps(terrain,buildingRectangle(building)),false,`${region.id} ${zone.type} bed overlaps ${name}`);
  }
 }
});

test('v1 inland water beds use the same layout data for surf collision',()=>{
 for(const region of REGIONS){
  const water=fieldLayoutFor(region).zones.find(zone=>zone.type==='water');
  if(!water)continue;
  const point={x:water.x+.5,y:water.y+.5};
  assert.equal(fieldWalkable(region,null,point.x,point.y),false);
  assert.equal(fieldWalkable(region,null,point.x,point.y,{surfing:true}),true);
 }
});
