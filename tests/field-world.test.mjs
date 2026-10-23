import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {buildGridRoute} from '../dist/movement.mjs';
import {
 FIELD_ASSET_URL,FIELD_BUILDINGS,FIELD_CAMERA_ZOOM,FIELD_COASTAL_ASSET_URL,FIELD_DOCK_BOUNDS,FIELD_FRAMEBUFFER,FIELD_PATHS,FIELD_PIER_ASSET_URL,FIELD_POINTS,FIELD_ROAD_WIDTHS,FIELD_WORLD_PIXEL,
 fieldArtProfileFor,fieldCameraFor,fieldEncounterMethod,fieldHotspotAt,fieldPointerTarget,fieldPointsFor,fieldWalkable,fieldZone
} from '../dist/field-world.mjs';

const world={id:'gohyeon',scene:'world'};
const harbor={id:'port',scene:'harbor'};

test('field streets are axis-aligned rectangles connecting every landmark',()=>{
 assert.ok(FIELD_PATHS.length>=10);
 assert.deepEqual(FIELD_PATHS[0],[[15,44],[60,44]]);
 assert.deepEqual(FIELD_PATHS.at(-1),[[49.5,44],[49.5,60]]);
 assert.deepEqual(FIELD_ROAD_WIDTHS,{innerHalf:32,outerHalf:38});
 for(const [a,b] of FIELD_PATHS)assert.ok(a[0]===b[0]||a[1]===b[1],`${a} → ${b} must be orthogonal`);
 assert.deepEqual(FIELD_PATHS[1],[[49.5,33],[49.5,44]]);
 assert.deepEqual(FIELD_POINTS.heal,{x:49.5,y:33,label:'회복센터'});
 assert.deepEqual(FIELD_POINTS.shore,{x:48,y:75,label:'해안 산책로'});
 for(const point of Object.values(FIELD_POINTS))assert.equal(fieldWalkable(world,null,point.x,point.y),true);
});

test('field point and hotspot helpers preserve current interaction behavior',()=>{
 assert.deepEqual(fieldPointsFor(world).grass,{x:48,y:60,label:'동백 풀숲'});
 assert.deepEqual(fieldPointsFor(harbor).grass,{x:40,y:55,label:'숲 가장자리'});
 assert.equal(fieldHotspotAt(world,49.5,33),'heal');
 assert.equal(fieldHotspotAt(world,79,48),'gym');
 assert.equal(fieldHotspotAt(world,15,44),'lab');
 assert.equal(fieldHotspotAt(world,48,75),'shore');
 assert.equal(fieldHotspotAt(world,48,60),'grass');
 assert.equal(fieldHotspotAt(world,50,44),'sign');
});

test('nature-only grass spur is excluded from other scene road networks',()=>{
 assert.equal(fieldWalkable(world,null,49.5,52),true);
 assert.equal(fieldWalkable(harbor,null,49.5,52),false);
 assert.equal(fieldWalkable(harbor,null,40,55),true);
 assert.equal(fieldZone(world,null,48,60),'grass');
 assert.equal(fieldZone(harbor,null,40,55),'grass');
});

test('road collision uses broad square rectangles at straight segments and corners',()=>{
 // Main avenue is 64 world pixels wide: y=40..47 normalized.
 assert.equal(fieldWalkable(world,null,25,40),true);
 assert.equal(fieldWalkable(world,null,25,39.9),false);
 // The southwest L joint is filled as a square union without a rounded gap.
 assert.equal(fieldWalkable(world,null,38.2,67.2),true);
 assert.equal(fieldWalkable(world,null,36.5,66),false);
 // Roads never need diagonal geometry to join these entrances.
 for(const [x,y] of [[30,29],[86,25],[86,43],[79,48],[79,63],[52,70],[48,75]])assert.equal(fieldWalkable(world,null,x,y),true);
});

test('visible shore road stays above the seawall and uses one straight dock approach',()=>{
 assert.deepEqual(FIELD_PATHS[4],[[40,70],[60,70]]);
 assert.deepEqual(FIELD_PATHS[6],[[52,70],[52,75]]);
 assert.equal(fieldWalkable(world,null,45,70),true);
 assert.equal(fieldWalkable(world,null,52,73),true);
 assert.equal(fieldWalkable(world,null,45,74),false,'cliff beside the dock is not an invisible road');
 assert.equal(fieldWalkable(world,null,52,75),true);
});

test('surfing extends walking only into the painted sea channel',()=>{
 assert.equal(fieldWalkable(world,null,40,84),false);
 assert.equal(fieldWalkable(world,{journey:{surfing:true}},40,84),true);
 assert.equal(fieldWalkable(world,40,84,{surfing:true}),true);
 assert.equal(fieldWalkable(world,{journey:{surfing:true}},3,84),false);
 assert.equal(fieldZone(world,null,40,84),'water');
 assert.equal(fieldEncounterMethod(world,null,40,84),'surf');
 assert.equal(fieldEncounterMethod(world,null,48,60),'grass');
 assert.equal(fieldEncounterMethod(world,null,48,75),'fish');
});

test('dock is dry-foot reachable while neighboring sea remains surf-only',()=>{
 assert.equal(fieldWalkable(world,null,52,75),true);
 assert.equal(fieldWalkable(world,null,52,85),true);
 assert.equal(fieldZone(world,null,52,85),'shore');
 assert.equal(fieldWalkable(world,null,40,85),false);
 assert.equal(fieldZone(world,null,40,85),'water');
 assert.equal(fieldWalkable(world,40,85,{surfing:true}),true);
 assert.deepEqual(FIELD_DOCK_BOUNDS,{left:561,top:592,right:687,bottom:717});
 for(const [x,y] of [[48,74],[56.7,74],[48,89.5],[56.7,89.5]]){
  assert.equal(fieldWalkable(world,null,x,y),true);
  assert.ok(x*12>=FIELD_DOCK_BOUNDS.left&&x*12<=FIELD_DOCK_BOUNDS.right);
  assert.ok(y*8>=FIELD_DOCK_BOUNDS.top&&y*8<=FIELD_DOCK_BOUNDS.bottom);
 }
});

test('generated RGBA prop atlas is bundled beside the renderer',{skip:"Historical raster fixture excluded from public distribution; selected original source integrity is tested in approved-player/npc/species suites."},()=>{
 assert.equal(FIELD_ASSET_URL.startsWith('file:'),true);
 assert.equal(existsSync(fileURLToPath(FIELD_ASSET_URL)),true);
 assert.match(fileURLToPath(FIELD_ASSET_URL),/gba-field-props\.png$/);
 assert.equal(existsSync(fileURLToPath(FIELD_COASTAL_ASSET_URL)),true);
 assert.match(fileURLToPath(FIELD_COASTAL_ASSET_URL),/coastal-props\.png$/);
 assert.equal(existsSync(fileURLToPath(FIELD_PIER_ASSET_URL)),true);
 assert.match(fileURLToPath(FIELD_PIER_ASSET_URL),/gba-pier-transparent\.png$/);
});

test('detail framebuffer preserves the world and pointer scale at 960x640',()=>{
 assert.deepEqual(FIELD_FRAMEBUFFER,{width:960,height:640,blitScale:1.25});
 assert.equal(FIELD_WORLD_PIXEL,1.25);
 assert.equal(FIELD_CAMERA_ZOOM,1.5);
 const camera=fieldCameraFor({x:50,y:50});
 assert.equal(camera.zoom,1.5);
 assert.equal(camera.x%FIELD_WORLD_PIXEL,0);
 assert.equal(camera.y%FIELD_WORLD_PIXEL,0);
 assert.deepEqual(fieldCameraFor({x:0,y:0}),{x:0,y:0,zoom:1.5});
 const edge=fieldCameraFor({x:100,y:100});assert.equal(edge.x,400);assert.ok(edge.y>=265&&edge.y<=267);assert.equal(edge.zoom,1.5);
});

test('compact buildings remain aligned to their existing interaction doors',()=>{
 assert.deepEqual(FIELD_BUILDINGS.center,{x:594,y:264,width:192,height:166,door:{x:49.5,y:33}});
 assert.deepEqual(FIELD_BUILDINGS.lab.door,{x:FIELD_POINTS.lab.x,y:FIELD_POINTS.lab.y});
 assert.deepEqual(FIELD_BUILDINGS.gym.door,{x:FIELD_POINTS.gym.x,y:FIELD_POINTS.gym.y});
 assert.equal(FIELD_BUILDINGS.westHome.width<=200,true);
 assert.equal(FIELD_BUILDINGS.eastHome.width<=200,true);
 for(const building of Object.values(FIELD_BUILDINGS))assert.equal(fieldWalkable(world,null,building.door.x,building.door.y),true);
 const boxes=Object.entries(FIELD_BUILDINGS).map(([name,{x,y,width,height}])=>({name,left:x-width/2,right:x+width/2,top:y-height,bottom:y}));
 for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++){
  const first=boxes[a],second=boxes[b],overlaps=first.left<second.right&&first.right>second.left&&first.top<second.bottom&&first.bottom>second.top;
  assert.equal(overlaps,false,`${first.name} and ${second.name} must not overlap`);
 }
});

test('every Geoje region has a deliberate original field accent',()=>{
 const expected={gohyeon:'town',garden:'garden',west:'stone',bamboo:'bamboo',north:'cliff',okpo:'dock',port:'lighthouse',ilun:'camellia',south:'sand',island:'island-forest'};
 for(const [id,accent] of Object.entries(expected))assert.equal(fieldArtProfileFor({id}).accent,accent);
 assert.equal(fieldArtProfileFor({id:'unknown'}).accent,'town');
});

test('field pointer inversion uses the same quantized camera as rendering',()=>{
 const position={x:50,y:50},rect={left:20,top:10,width:600,height:400};
 const target=fieldPointerTarget(320,210,rect,position),camera=fieldCameraFor(position);
 assert.equal(target.x,(camera.x+600/camera.zoom)/12);
 assert.equal(target.y,(camera.y+400/camera.zoom)/8);
 assert.ok(Math.abs(target.x-position.x)<=FIELD_WORLD_PIXEL/12);
 assert.ok(Math.abs(target.y-position.y)<=FIELD_WORLD_PIXEL/8);
});

test('every moving field landmark remains reachable from the scenic player start',()=>{
 const start={x:49.5,y:44};
 for(const [name,point] of Object.entries({...FIELD_POINTS,dock:{x:52,y:85}})){
  const route=buildGridRoute(start,point,(x,y)=>fieldWalkable(world,null,x,y));
  assert.ok(route,`${name} must remain connected to the orthogonal road network`);
 }
 assert.equal(fieldWalkable(world,null,49.5,22),false,'the former center door is intentionally blocked and old saves reset at load');
 const harborGrass=fieldPointsFor(harbor).grass;
 assert.ok(buildGridRoute(start,harborGrass,(x,y)=>fieldWalkable(harbor,null,x,y)));
});
