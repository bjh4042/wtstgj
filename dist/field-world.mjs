import {guardLegacyImage} from './asset-runtime.mjs';
import {assetLegacyPath} from './asset-manifest.mjs';
import {drawTownProp} from './prop-art-v12.mjs';
import {cameraFor,screenToWorldNormalized} from './movement.mjs';

// Gameplay retains the original 1200x800 coordinates and collision geometry.
// The 960x640 detail framebuffer and 1.5x following camera preserve fine asset
// pixels while bringing buildings and characters closer to the reference scale.
export const WORLD_SIZE=Object.freeze({width:1200,height:800});
export const FIELD_SCALE=Object.freeze({x:12,y:8});
export const FIELD_FRAMEBUFFER=Object.freeze({width:960,height:640,blitScale:1.25});
export const FIELD_WORLD_PIXEL=1.25;
export const FIELD_CAMERA_ZOOM=1.5;
export const FIELD_ROAD_WIDTHS=Object.freeze({innerHalf:32,outerHalf:38});
// Visible wood deck after the tight pier crop is mapped into the field.
export const FIELD_DOCK_BOUNDS=Object.freeze({left:561,top:592,right:687,bottom:717});

export const FIELD_PATHS=Object.freeze([
 // GBA-style town streets: a small set of broad, square-cornered avenues.
 [[15,44],[60,44]],       // laboratory to central plaza
 [[49.5,33],[49.5,44]],   // ecology center entrance
 [[30,29],[30,44]],       // west cottage entrance
 [[40,44],[40,70]],       // west side of the coastal loop
 [[40,70],[60,70]],       // shore road above the seawall
 [[60,44],[60,70]],       // east side of the coastal loop
 [[52,70],[52,75]],       // straight dock approach
 [[60,48],[86,48]],       // gym and east cottage avenue
 [[86,25],[86,48]],       // east cottage entrance and gym avenue
 [[79,48],[79,63]],       // garden and eastern trail
 [[49.5,44],[49.5,60]]    // nature-scene grass trail
].map(segment=>Object.freeze(segment.map(point=>Object.freeze(point)))));
const NATURE_ONLY_PATH_INDEX=FIELD_PATHS.length-1;

export const FIELD_POINTS=Object.freeze({
 lab:Object.freeze({x:15,y:44,label:'탐험연구소'}),
 heal:Object.freeze({x:49.5,y:33,label:'회복센터'}),
 gym:Object.freeze({x:79,y:48,label:'거제식물원'}),
 grass:Object.freeze({x:48,y:60,label:'동백 풀숲'}),
 shore:Object.freeze({x:48,y:75,label:'해안 산책로'})
});

const ATLAS_URL=new URL(assetLegacyPath('legacy.field.gba-field-props'),import.meta.url).href;
const COASTAL_ATLAS_URL=new URL(assetLegacyPath('legacy.field.coastal-props'),import.meta.url).href;
const PIER_URL=new URL(assetLegacyPath('legacy.field.gba-pier-transparent'),import.meta.url).href;
const PIER_CROP=Object.freeze({sx:539,sy:290,width:459,height:424,dx:528,dy:567,dw:192,dh:177});
const ATLAS={width:1122,height:1402,columns:4,rows:5};
const PROP={
 center:[0,0],lab:[1,0],gym:[2,0],cottage:[3,0],
 market:[0,1],seawall:[1,1],dock:[2,1],boat:[3,1],
 fisher:[0,2],ranger:[1,2],lamp:[2,2],sign:[3,2],
 rocks:[0,3],flowers:[1,3],tree:[2,3],bamboo:[3,3],
 camellia:[0,4],grass:[1,4],wave:[2,4],lighthouse:[3,4]
};
// Updated after asset generation with independent alpha bounds.
const PROP_CROP={
 center:[32,70,247,214],lab:[326,90,214,193],gym:[589,95,238,190],cottage:[886,50,205,237],
 market:[35,378,229,183],seawall:[321,414,219,147],dock:[605,381,205,189],boat:[872,385,219,171],
 fisher:[91,675,149,134],ranger:[370,665,122,144],lamp:[678,622,57,214],sign:[919,627,153,197],
 rocks:[50,913,188,139],flowers:[350,936,163,132],tree:[627,874,157,204],bamboo:[901,879,171,189],
 camellia:[44,1159,214,180],grass:[333,1167,196,177],wave:[605,1210,208,102],lighthouse:[905,1099,167,245]
};
const STYLES={
 forest:{ground:'#8bcf9b',groundAlt:'#75bd89',groundLight:'#b6e2ae',road:'#ded3ad',roadAlt:'#f3e8c2',edge:'#a78b67',sea:'#3d91d0',seaDark:'#2b6eae',seaLight:'#a7e1ee',sand:'#ead278',cliff:'#82654d'},
 bamboo:{ground:'#70b98a',groundAlt:'#58a374',groundLight:'#a1d5a0',road:'#d3c498',roadAlt:'#eee0af',edge:'#8e7253',sea:'#3b8dcc',seaDark:'#286aa7',seaLight:'#a7dfea',sand:'#ddc47d',cliff:'#735b46'},
 harbor:{ground:'#87c59b',groundAlt:'#70ae87',groundLight:'#b8ddb0',road:'#bfc8c3',roadAlt:'#e5e7dc',edge:'#7d8a91',sea:'#398ccd',seaDark:'#286aa7',seaLight:'#a8dfe9',sand:'#d9c78e',cliff:'#68747a'}
};
const INK='#384858';

export const FIELD_BUILDINGS=Object.freeze({
 center:Object.freeze({x:594,y:264,width:192,height:166,door:Object.freeze({x:49.5,y:33})}),
 lab:Object.freeze({x:180,y:352,width:168,height:148,door:Object.freeze({x:15,y:44})}),
 gym:Object.freeze({x:948,y:384,width:184,height:146,door:Object.freeze({x:79,y:48})}),
 westHome:Object.freeze({x:360,y:232,width:160,height:136,door:Object.freeze({x:30,y:29})}),
 eastHome:Object.freeze({x:1032,y:200,width:160,height:136,door:Object.freeze({x:86,y:25})})
});

const terrainCache=new Map();
let propAtlas=null;
let pierImage=null;

function styleName(region){return region?.scene==='bamboo'?'bamboo':region?.scene==='harbor'?'harbor':'forest'}
function isNature(region){return (region?.scene??'world')==='world'}
function pxX(x){return x*FIELD_SCALE.x}
function pxY(y){return y*FIELD_SCALE.y}

const REGION_ART=Object.freeze({
 gohyeon:Object.freeze({accent:'town',detail:'camellia'}),
 garden:Object.freeze({accent:'garden',detail:'flowers'}),
 west:Object.freeze({accent:'stone',detail:'rocks'}),
 bamboo:Object.freeze({accent:'bamboo',detail:'bamboo'}),
 north:Object.freeze({accent:'cliff',detail:'rocks'}),
 okpo:Object.freeze({accent:'dock',detail:'market'}),
 port:Object.freeze({accent:'lighthouse',detail:'boat'}),
 ilun:Object.freeze({accent:'camellia',detail:'camellia'}),
 south:Object.freeze({accent:'sand',detail:'wave'}),
 island:Object.freeze({accent:'island-forest',detail:'camellia'})
});
export function fieldArtProfileFor(region){return REGION_ART[region?.id]??REGION_ART.gohyeon}

function freezeSegments(segments){return Object.freeze(segments.map(segment=>Object.freeze(segment.map(point=>Object.freeze(point)))))}
function freezeZones(zones){return Object.freeze(zones.map(zone=>Object.freeze(zone)))}
function layout(branches,zones){return Object.freeze({branches:freezeSegments(branches),zones:freezeZones(zones)})}

// Small, orthogonal side streets and blocked terrain beds distinguish the ten
// destinations without moving the original town, doors, or travel coordinates.
// Coordinates use the same normalized 1200x800 save space as FIELD_PATHS.
export const FIELD_REGION_LAYOUTS=Object.freeze({
 gohyeon:layout([[[30,44],[30,54]],[[20,54],[30,54]]],[
  {type:'vegetation',x:4,y:7,width:18,height:13,detail:'tree'},
  {type:'flower',x:66,y:54,width:12,height:12,detail:'camellia'}
 ]),
 garden:layout([[[60,56],[72,56]],[[72,56],[72,64]]],[
 {type:'flower',x:5,y:52,width:20,height:15,detail:'flowers'},
  {type:'vegetation',x:90,y:28,width:8,height:12,detail:'tree'}
 ]),
 west:layout([[[25,44],[25,58]],[[15,58],[25,58]]],[
  {type:'cliff',x:3,y:51,width:9,height:17,detail:'rocks'},
  {type:'vegetation',x:65,y:53,width:12,height:14,detail:'grass'}
 ]),
 bamboo:layout([[[60,44],[68,44]],[[68,44],[68,57]]],[
  {type:'vegetation',x:3,y:6,width:19,height:18,detail:'bamboo'},
  {type:'vegetation',x:89,y:49,width:9,height:19,detail:'bamboo'},
  {type:'flower',x:64,y:54,width:10,height:12,detail:'flowers'}
 ]),
 north:layout([[[24,60],[40,60]],[[24,60],[24,67]]],[
  {type:'cliff',x:3,y:49,width:16,height:19,detail:'rocks'},
  {type:'water',x:90,y:28,width:8,height:12,detail:'wave'}
 ]),
 okpo:layout([[[60,56],[70,56]],[[70,56],[70,66]]],[
  {type:'water',x:3,y:51,width:19,height:17,detail:'wave'},
  {type:'sand',x:89,y:51,width:9,height:17,detail:'rocks'}
 ]),
 port:layout([[[60,62],[73,62]],[[73,62],[73,70]]],[
 {type:'sand',x:3,y:50,width:20,height:18,detail:'rocks'},
  {type:'water',x:4,y:6,width:13,height:14,detail:'wave'}
 ]),
 ilun:layout([[[28,60],[40,60]],[[28,52],[28,60]]],[
 {type:'flower',x:3,y:50,width:20,height:18,detail:'camellia'},
  {type:'vegetation',x:89,y:28,width:9,height:12,detail:'tree'}
 ]),
 south:layout([[[60,60],[72,60]],[[72,60],[72,68]]],[
  {type:'sand',x:3,y:49,width:22,height:19,detail:'wave'},
  {type:'cliff',x:88,y:48,width:10,height:20,detail:'rocks'}
 ]),
 island:layout([[[20,60],[40,60]],[[20,51],[20,60]]],[
  {type:'vegetation',x:3,y:48,width:13,height:20,detail:'tree'},
  {type:'flower',x:85,y:50,width:13,height:18,detail:'camellia'},
  {type:'cliff',x:3,y:6,width:13,height:12,detail:'rocks'}
 ])
});

export function fieldLayoutFor(region){return FIELD_REGION_LAYOUTS[region?.id]??FIELD_REGION_LAYOUTS.gohyeon}
const fieldPathCache=new Map();
export function fieldPathsFor(region){
 const cacheKey=`${region?.id??'gohyeon'}:${isNature(region)?'nature':'route'}`;
 if(fieldPathCache.has(cacheKey))return fieldPathCache.get(cacheKey);
 const core=isNature(region)?FIELD_PATHS:FIELD_PATHS.filter((_,index)=>index!==NATURE_ONLY_PATH_INDEX);
 const paths=Object.freeze([...core,...fieldLayoutFor(region).branches]);fieldPathCache.set(cacheKey,paths);return paths;
}

function activePaths(region){return fieldPathsFor(region)}

function parsePosition(stateOrX,xOrY,yOrOptions,maybeOptions){
 if(typeof stateOrX==='number')return {state:null,x:stateOrX,y:xOrY,options:yOrOptions&&typeof yOrOptions==='object'?yOrOptions:{}};
 return {state:stateOrX??null,x:xOrY,y:yOrOptions,options:maybeOptions??{}};
}

function surfEnabled(state,options){
 return Boolean(options?.surfing??state?.surfing??state?.journey?.surfing??state?.journey?.surfMode);
}

function pathRectangle(segment,halfWidth){
 // Collision stays in exact world coordinates. Rendering is quantized later;
 // tying collision edges to the framebuffer lattice would shift old routes.
 const [a,b]=segment,ax=pxX(a[0]),ay=pxY(a[1]),bx=pxX(b[0]),by=pxY(b[1]);
 if(ay===by)return {left:Math.min(ax,bx)-halfWidth,top:ay-halfWidth,right:Math.max(ax,bx)+halfWidth,bottom:ay+halfWidth};
 if(ax===bx)return {left:ax-halfWidth,top:Math.min(ay,by)-halfWidth,right:ax+halfWidth,bottom:Math.max(ay,by)+halfWidth};
 throw new Error('Field paths must be horizontal or vertical');
}

function pathContainsWorld(region,x,y,halfWidth=FIELD_ROAD_WIDTHS.innerHalf){
 return activePaths(region).some(segment=>{
  const rect=pathRectangle(segment,halfWidth);
  return x>=rect.left&&x<rect.right&&y>=rect.top&&y<rect.bottom;
 });
}

function landWalkable(region,x,y){
 const nature=isNature(region);
 return pathContainsWorld(region,pxX(x),pxY(y))||(nature&&x>45&&x<54&&y>54&&y<65);
}

function inWater(x,y){
 // A narrow ramp joins the pre-existing shore path to the open water. The
 // open sea starts on the same horizontal line that the renderer paints.
 return (x>43&&x<56&&y>=73&&y<82)||(x>7&&x<94&&y>=77.5&&y<99);
}

function inDock(x,y){return x>47.5&&x<56.8&&y>=74&&y<89.6}

export function fieldEnvironmentAt(region,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 return fieldLayoutFor(region).zones.find(zone=>x>=zone.x&&x<zone.x+zone.width&&y>=zone.y&&y<zone.y+zone.height)?.type??null;
}

export function fieldWalkable(region,stateOrX,xOrY,yOrOptions,maybeOptions){
 const {state,x,y,options}=parsePosition(stateOrX,xOrY,yOrOptions,maybeOptions);
 if(!Number.isFinite(x)||!Number.isFinite(y))return false;
 return landWalkable(region,x,y)||inDock(x,y)||(surfEnabled(state,options)&&(inWater(x,y)||fieldEnvironmentAt(region,x,y)==='water'));
}

export function fieldZone(region,stateOrX,xOrY,yOrOptions,maybeOptions){
 const {x,y}=parsePosition(stateOrX,xOrY,yOrOptions,maybeOptions);
 if(!Number.isFinite(x)||!Number.isFinite(y))return 'blocked';
 const nature=isNature(region);
 if(inDock(x,y))return 'shore';
 if(y>70&&y<78&&x>38&&x<59)return 'shore';
 if(inWater(x,y))return 'water';
 if(nature&&x>44&&x<55&&y>53&&y<66)return 'grass';
 if(!nature&&x>36&&x<43&&y>53&&y<68)return 'grass';
 if(landWalkable(region,x,y))return 'road';
 return fieldEnvironmentAt(region,x,y)==='water'?'water':'blocked';
}

export const fieldTileAt=fieldZone;
export function fieldEncounterMethod(region,stateOrX,xOrY,yOrOptions,maybeOptions){
 const zone=fieldZone(region,stateOrX,xOrY,yOrOptions,maybeOptions);
 return zone==='water'?'surf':zone==='shore'?'fish':zone==='grass'?'grass':null;
}

export function fieldPointsFor(region){
 const points=Object.fromEntries(Object.entries(FIELD_POINTS).map(([key,value])=>[key,{...value}]));
 if(!isNature(region))points.grass={x:40,y:55,label:'숲 가장자리'};
 return points;
}

export function fieldHotspotAt(region,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 if(Math.hypot(x-FIELD_POINTS.heal.x,y-FIELD_POINTS.heal.y)<6)return 'heal';
 if(Math.hypot(x-FIELD_POINTS.gym.x,y-FIELD_POINTS.gym.y)<7)return 'gym';
 if(Math.hypot(x-FIELD_POINTS.lab.x,y-FIELD_POINTS.lab.y)<7)return 'lab';
 if(y>68)return 'shore';
 if(y>51)return 'grass';
 return 'sign';
}

/** Camera shared by field composition and pointer inversion. */
export function fieldCameraFor(position){
 const camera=cameraFor(position,FIELD_CAMERA_ZOOM);
 return {...camera,x:Math.floor(camera.x/FIELD_WORLD_PIXEL)*FIELD_WORLD_PIXEL,y:Math.floor(camera.y/FIELD_WORLD_PIXEL)*FIELD_WORLD_PIXEL};
}

export function fieldPointerTarget(clientX,clientY,rect,position){
 return screenToWorldNormalized(clientX,clientY,rect,fieldCameraFor(position));
}

function makeSurface(){
 if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(WORLD_SIZE.width,WORLD_SIZE.height);
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=WORLD_SIZE.width;canvas.height=WORLD_SIZE.height;return canvas;
 }
 return null;
}

function hash2(x,y,seed){
 let n=(x*374761393+y*668265263+seed*1442695041)|0;n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967295;
}

function snap(value){return Math.round(value/FIELD_WORLD_PIXEL)*FIELD_WORLD_PIXEL}

function drawGroundTiles(ctx,style,seed){
 ctx.fillStyle=style.ground;ctx.fillRect(0,0,WORLD_SIZE.width,WORLD_SIZE.height);
 const tile=16*FIELD_WORLD_PIXEL;
 for(let y=0;y<624;y+=tile)for(let x=0;x<WORLD_SIZE.width;x+=tile){
  const r=hash2(x/tile,y/tile,seed);
  ctx.fillStyle=r>.58?style.groundLight:style.groundAlt;
  const dx=(3+Math.floor(r*7))*FIELD_WORLD_PIXEL,dy=(2+Math.floor(r*9)%9)*FIELD_WORLD_PIXEL;
  ctx.fillRect(x+dx,y+dy,FIELD_WORLD_PIXEL,FIELD_WORLD_PIXEL);
  if(r>.76)ctx.fillRect(x+dx+FIELD_WORLD_PIXEL*2,y+dy+FIELD_WORLD_PIXEL,FIELD_WORLD_PIXEL,FIELD_WORLD_PIXEL);
 }
}

function drawSeaBase(ctx,style){
 ctx.fillStyle=style.sand;ctx.fillRect(0,591,WORLD_SIZE.width,27);
 ctx.fillStyle=style.sea;ctx.fillRect(0,618,WORLD_SIZE.width,WORLD_SIZE.height-618);
}

function drawRegionZones(ctx,region,style){
 const colors={vegetation:style.groundAlt,flower:style.groundLight,water:style.sea,sand:style.sand,cliff:style.cliff};
 for(const zone of fieldLayoutFor(region).zones){
  const left=snap(pxX(zone.x)),top=snap(pxY(zone.y)),width=snap(pxX(zone.width)),height=snap(pxY(zone.height));
  ctx.fillStyle=colors[zone.type]??style.groundAlt;ctx.fillRect(left,top,width,height);
 }
}

function fillPathUnion(ctx,region,halfWidth,color){
 ctx.fillStyle=color;
 for(const segment of activePaths(region)){
  const rect=pathRectangle(segment,halfWidth);
  ctx.fillRect(rect.left,rect.top,rect.right-rect.left,rect.bottom-rect.top);
 }
}

function drawRoads(ctx,style,region){
 // Paint square rectangular unions so bends and crossings stay perfectly
 // horizontal/vertical. The inner union is also the collision surface.
 const p=FIELD_WORLD_PIXEL,tile=16*p;
 fillPathUnion(ctx,region,FIELD_ROAD_WIDTHS.outerHalf,style.edge);
 fillPathUnion(ctx,region,FIELD_ROAD_WIDTHS.innerHalf,style.road);
 for(let y=0;y<618;y+=tile)for(let x=0;x<WORLD_SIZE.width;x+=tile){
  if(!pathContainsWorld(region,x+tile/2,y+tile/2))continue;
  const r=hash2(x/tile,y/tile,31);
  ctx.fillStyle=style.roadAlt;
  ctx.fillRect(x+(r>.5?4:10)*p,y+(r>.5?6:3)*p,p,p);
  if(styleName(region)==='harbor'&&r>.66){
   ctx.fillRect(x+2*p,y+11*p,4*p,p);ctx.fillRect(x+10*p,y+11*p,4*p,p);
  }
 }
}

function grassPatchRect(region){return isNature(region)?{x:44.5,y:53,width:11,height:13}:{x:35.5,y:52,width:8,height:17}}

function drawGrassPatch(ctx,region,style){
 const rect=grassPatchRect(region);
 const p=FIELD_WORLD_PIXEL,left=snap(pxX(rect.x)),top=snap(pxY(rect.y)),right=snap(pxX(rect.x+rect.width)),bottom=snap(pxY(rect.y+rect.height));
 ctx.fillStyle=style.groundAlt;ctx.fillRect(left,top,right-left,bottom-top);
}

function drawCoastEdge(ctx,style,key){
 const p=FIELD_WORLD_PIXEL,tile=16*p,harbor=key==='harbor';ctx.fillStyle=harbor?'#788898':style.cliff;ctx.fillRect(0,594,WORLD_SIZE.width,24);
 for(let x=0;x<WORLD_SIZE.width;x+=tile){
  if(x>=516&&x<696)continue;
  ctx.fillStyle=INK;ctx.fillRect(x,612,tile,p*2);
  ctx.fillStyle=harbor?'#adb8ba':'#b29369';ctx.fillRect(x+p,597,14*p,p*3);
  ctx.fillStyle=harbor?'#596a72':'#755942';ctx.fillRect(x+p*2,606,12*p,p*2);
  ctx.fillStyle=harbor?'#d7ddda':'#d4b17b';ctx.fillRect(x+p*3,600,4*p,p);ctx.fillRect(x+p*10,603,3*p,p);
 }
 ctx.fillStyle=style.road;ctx.fillRect(516,594,180,24);
}

function paintTerrain(ctx,region){
 const key=styleName(region),style=STYLES[key],seed=[...`${key}:${region?.id??''}`].reduce((n,c)=>n+c.charCodeAt(0),0);
 drawGroundTiles(ctx,style,seed);drawRegionZones(ctx,region,style);drawRoads(ctx,style,region);drawGrassPatch(ctx,region,style);drawSeaBase(ctx,style);drawCoastEdge(ctx,style,key);
}

function terrainFor(region){
 const key=`${styleName(region)}:${isNature(region)?'nature':'route'}:${region?.id??''}`;
 if(terrainCache.has(key))return terrainCache.get(key);
 const surface=makeSurface();if(!surface)return null;const cacheCtx=surface.getContext('2d');cacheCtx.imageSmoothingEnabled=false;paintTerrain(cacheCtx,region);terrainCache.set(key,surface);return surface;
}

function ensureAtlas(){
 if(propAtlas||typeof Image==='undefined')return propAtlas;
 propAtlas=guardLegacyImage(new Image());propAtlas.decoding='async';propAtlas.src=ATLAS_URL;return propAtlas;
}
function atlasReady(){const image=ensureAtlas();return Boolean(image?.complete&&image.naturalWidth)}
function ensurePier(){
 if(pierImage||typeof Image==='undefined')return pierImage;
 pierImage=guardLegacyImage(new Image());pierImage.decoding='async';pierImage.src=PIER_URL;return pierImage;
}
function drawPier(ctx){
 const image=ensurePier(),p=FIELD_WORLD_PIXEL;
 if(image?.complete&&image.naturalWidth){
  const {sx,sy,width,height,dx,dy,dw,dh}=PIER_CROP;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,sx,sy,width,height,dx,dy,dw,dh);ctx.restore();return;
 }
 // Crisp temporary deck for the first frames while the standalone PNG loads.
 pixelRect(ctx,INK,FIELD_DOCK_BOUNDS.left-p,FIELD_DOCK_BOUNDS.top-p,FIELD_DOCK_BOUNDS.right-FIELD_DOCK_BOUNDS.left+p*2,FIELD_DOCK_BOUNDS.bottom-FIELD_DOCK_BOUNDS.top+p);
 pixelRect(ctx,'#a89068',FIELD_DOCK_BOUNDS.left,FIELD_DOCK_BOUNDS.top,FIELD_DOCK_BOUNDS.right-FIELD_DOCK_BOUNDS.left,FIELD_DOCK_BOUNDS.bottom-FIELD_DOCK_BOUNDS.top);
 for(let y=FIELD_DOCK_BOUNDS.top+p*5;y<FIELD_DOCK_BOUNDS.bottom;y+=p*6)pixelRect(ctx,'#786048',FIELD_DOCK_BOUNDS.left,y,FIELD_DOCK_BOUNDS.right-FIELD_DOCK_BOUNDS.left,p);
}
function drawProp(ctx,name,x,y,width,height=width,alpha=1){
 const key=name==='cottage'?'house':name;if(drawTownProp(ctx,key,snap(x-width/2),snap(y-height),width,height))return true;
 const image=ensureAtlas(),crop=PROP_CROP[name];
 if(!atlasReady()||!PROP[name]||!crop)return false;
 const [sx,sy,sourceWidth,sourceHeight]=crop,dx=snap(x-width/2),dy=snap(y-height);
 ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(image,sx,sy,sourceWidth,sourceHeight,dx,dy,width,height);ctx.restore();return true;
}
function pixelRect(ctx,color,x,y,width,height){ctx.fillStyle=color;ctx.fillRect(snap(x),snap(y),snap(width),snap(height))}
function drawPixelFallback(ctx,name,x,y,width,height){
 const left=x-width/2,top=y-height,p=FIELD_WORLD_PIXEL;
 if(['tree','bamboo'].includes(name)){pixelRect(ctx,INK,x-p*2,y-p*8,p*4,p*8);pixelRect(ctx,'#286848',left+p,top+p*2,width-p*2,height-p*8);pixelRect(ctx,'#489860',left,top+p*5,width,height-p*13);pixelRect(ctx,'#78b878',left+p*3,top+p*2,p*5,p*5);return}
 if(['center','lab','gym','cottage','market'].includes(name)){const roof=name==='center'?'#487890':name==='gym'?'#6898a8':'#c86858';pixelRect(ctx,INK,left-p,top+p*6,width+p*2,height-p*5);pixelRect(ctx,roof,left,top,width,p*13);pixelRect(ctx,'#d8e0d8',left+p*3,top+p*14,width-p*6,height-p*15);pixelRect(ctx,INK,x-p*3,y-p*10,p*6,p*10);return}
 pixelRect(ctx,INK,left,top,width,height);pixelRect(ctx,name==='flowers'||name==='camellia'?'#e89878':'#a8b8c0',left+p,top+p,width-p*2,height-p*2);
}
function prop(ctx,name,x,y,width,height=width,alpha=1){if(!drawProp(ctx,name,snap(x),snap(y),width,height,alpha))drawPixelFallback(ctx,name,snap(x),snap(y),width,height)}

function decorClear(region,x,y,radius=24){
 const nx=x/FIELD_SCALE.x,ny=y/FIELD_SCALE.y;
 if(pathContainsWorld(region,x,y,FIELD_ROAD_WIDTHS.outerHalf+radius))return false;
 if(isNature(region)&&nx>42.5&&nx<56.5&&ny>51&&ny<67)return false;
 if(!isNature(region)&&nx>34&&nx<45&&ny>50&&ny<70)return false;
 for(const {x:bx,y:by,width:bw,height:bh} of Object.values(FIELD_BUILDINGS)){
  const top=by-bh;
  if(x>bx-bw/2-radius&&x<bx+bw/2+radius&&y>top-radius&&y<by+radius)return false;
 }
 return y<591;
}

function drawVegetation(ctx,region){
 const key=styleName(region),art=fieldArtProfileFor(region),large=key==='bamboo'?'bamboo':'tree';
 const top=[];
 for(let row=0;row<2;row++)for(let x=28+row*26;x<=1172;x+=52)top.push([x,74+row*48+(Math.floor(x/52)%2)*4]);
 const edges=[];for(let y=150;y<=566;y+=56){edges.push([30,y],[1170,y+((y/56)%2)*6])}
 const groves=[[94,202],[146,202],[92,258],[1090,190],[1138,190],[1092,246],[285,544],[337,544],[865,552],[917,552],[1040,544]];
 const candidates=[...top,...edges,...groves];let placed=0;
 for(const [x,y] of candidates){
  const width=key==='harbor'?50:54,height=key==='harbor'?60:66;
  if(!decorClear(region,x,y,27))continue;
  prop(ctx,large,x,y,width,height);placed++;
  if(placed%4===0)prop(ctx,art.detail==='camellia'?'camellia':'flowers',x+27,y+1,30,24);
 }
}

function drawGrassAtlasPatch(ctx,region){
 if(!atlasReady())return;
 const rect=grassPatchRect(region),left=snap(pxX(rect.x)),top=snap(pxY(rect.y)),right=snap(pxX(rect.x+rect.width)),bottom=snap(pxY(rect.y+rect.height));
 ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
 let row=0;
 for(let y=top+26;y<bottom+26;y+=22,row++)for(let x=left+15+(row%2)*13;x<right+18;x+=26)drawProp(ctx,'grass',x,y,34,30);
 ctx.restore();
}

function drawRegionZoneDetails(ctx,region){
 if(!atlasReady())return;
 const grids={
  tree:[52,64,46,48],bamboo:[50,64,44,48],grass:[36,31,30,24],
  flowers:[38,30,32,25],camellia:[42,33,36,27],rocks:[48,35,42,30],wave:[52,26,64,34]
 };
 for(const zone of fieldLayoutFor(region).zones){
  const left=snap(pxX(zone.x)),top=snap(pxY(zone.y)),right=snap(pxX(zone.x+zone.width)),bottom=snap(pxY(zone.y+zone.height));
  const [width,height,stepX,stepY]=grids[zone.detail]??grids.grass;
  ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
  let row=0;
  for(let y=top+height-3;y<bottom+height/2;y+=stepY,row++)for(let x=left+width/2+(row%2)*stepX/2;x<right+width/2;x+=stepX){
   if(zone.detail==='wave'||decorClear(region,x,y,Math.min(width,height)*.45))drawProp(ctx,zone.detail,x,y,width,height);
  }
  ctx.restore();
 }
}

function drawCenterLabel(ctx,x,y){
 const p=FIELD_WORLD_PIXEL,width=168,height=28,left=snap(x-width/2),top=snap(y-height/2);
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle=INK;ctx.fillRect(left-p,top-p,width+p*2,height+p*2);ctx.fillStyle='#f8f5df';ctx.fillRect(left,top,width,height);
 ctx.strokeStyle='#487890';ctx.lineWidth=p;ctx.strokeRect(left+p,top+p,width-p*2,height-p*2);
 ctx.font="bold 18px 'Malgun Gothic',sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#174f75';ctx.fillText('거제 생태센터',snap(x),snap(y));ctx.restore();
}

function drawFence(ctx,x,y,length,vertical=false){
 const p=FIELD_WORLD_PIXEL,step=24;
 ctx.save();ctx.fillStyle='#5d4936';
 if(vertical){ctx.fillRect(snap(x-p),snap(y),p*2,snap(length));for(let d=0;d<=length;d+=step)ctx.fillRect(snap(x-5),snap(y+d),10,12)}
 else{ctx.fillRect(snap(x),snap(y-p),snap(length),p*2);for(let d=0;d<=length;d+=step)ctx.fillRect(snap(x+d-5),snap(y-6),10,12)}
 ctx.fillStyle='#b88a52';
 if(vertical)for(let d=0;d<=length;d+=step)ctx.fillRect(snap(x-3),snap(y+d+2),p*2,6);
 else for(let d=0;d<=length;d+=step)ctx.fillRect(snap(x+d-3),snap(y-4),p*2,6);
 ctx.restore();
}

function drawLandmarks(ctx,region){
 const key=styleName(region),art=fieldArtProfileFor(region),{center,lab,gym,westHome,eastHome}=FIELD_BUILDINGS;
 // Every destination uses the same compact atlas and lands on its existing
 // interaction coordinate. Buildings are roughly five handheld tiles wide.
 prop(ctx,'center',center.x,center.y,center.width,center.height);drawCenterLabel(ctx,center.x,218);
 prop(ctx,'lab',lab.x,lab.y,lab.width,lab.height);
 prop(ctx,'gym',gym.x,gym.y,gym.width,gym.height);
 prop(ctx,'cottage',westHome.x,westHome.y,westHome.width,westHome.height);
 prop(ctx,'cottage',eastHome.x,eastHome.y,eastHome.width,eastHome.height);
 prop(ctx,'sign',266,350,62,54);prop(ctx,'sign',870,475,58,50);
 prop(ctx,'lamp',430,348,22,62);prop(ctx,'lamp',758,348,22,62);
 prop(ctx,'ranger',858,474,38,57);
 drawFence(ctx,270,278,94);drawFence(ctx,812,282,104);drawFence(ctx,270,502,110);drawFence(ctx,828,506,108);

 const common=[
  [88,480,'rocks',48,36],[1110,514,'rocks',48,36],
  [320,296,'flowers',34,27],[402,300,'flowers',36,28],[786,300,'flowers',36,28],[848,298,'camellia',38,30],
  [370,526,'flowers',38,30],[742,528,'camellia',42,34],[945,546,'flowers',34,27]
 ];
 for(const [x,y,name,width,height] of common)prop(ctx,name,x,y,width,height);
 if(art.accent==='garden')for(const [x,y] of [[250,536],[310,536],[705,540],[775,540],[1000,532]])prop(ctx,'flowers',x,y,42,32);
 if(art.accent==='stone')for(const [x,y] of [[206,540],[440,544],[700,546],[1040,535]])prop(ctx,'rocks',x,y,58,42);
 if(art.accent==='bamboo')for(const [x,y] of [[236,554],[458,548],[725,548],[1004,544]])if(decorClear(region,x,y,25))prop(ctx,'bamboo',x,y,54,63);
 if(art.accent==='camellia'||art.accent==='island-forest')for(const [x,y] of [[210,530],[440,542],[700,542],[1010,530]])prop(ctx,'camellia',x,y,48,38);
 if(art.accent==='island-forest')for(const [x,y] of [[174,250],[1080,276],[220,574],[980,572]])if(decorClear(region,x,y,25))prop(ctx,'tree',x,y,54,66);
 if(art.accent==='dock'||art.accent==='lighthouse')prop(ctx,'market',330,566,118,104);
 if(art.accent==='sand'){
  const style=STYLES[key];pixelRect(ctx,style.sand,76,542,118,38);pixelRect(ctx,style.sand,1000,548,124,34);
 }
}

function drawSeaMotion(ctx,region,time,surfing){
 const p=FIELD_WORLD_PIXEL,frame=Math.floor((Number(time)||0)/320)%2;ctx.save();ctx.beginPath();ctx.rect(0,618,WORLD_SIZE.width,WORLD_SIZE.height-618);ctx.clip();
 if(atlasReady())for(let row=0,y=648;y<WORLD_SIZE.height+28;y+=38,row++)for(let x=-36+((row+frame)%2)*48;x<WORLD_SIZE.width+48;x+=96)drawProp(ctx,'wave',x,y,62,30,.82);
 if(surfing){ctx.fillStyle='#f8f8e8';ctx.fillRect(snap(pxX(49)-18),snap(pxY(84)+15),12,p);ctx.fillRect(snap(pxX(49)+6),snap(pxY(84)+15),12,p)}ctx.restore();
}

function drawHarbor(ctx,region){
 drawPier(ctx);
 const art=fieldArtProfileFor(region);
 for(const x of [82,238,868])prop(ctx,'seawall',x,632,136,48);
 prop(ctx,'boat',770,770,96,76);prop(ctx,'boat',950,792,84,66,.92);
 prop(ctx,'fisher',672,624,38,57);
 if(['cliff','lighthouse','dock'].includes(art.accent))prop(ctx,'lighthouse',1100,776,84,124);
 else prop(ctx,'lighthouse',1110,778,68,100,.9);
 if(art.accent==='cliff')for(const [x,y] of [[60,680],[230,742],[1010,700]])prop(ctx,'rocks',x,y,48,34);
 const p=FIELD_WORLD_PIXEL;pixelRect(ctx,'#786048',681,570,p*2,p*18);pixelRect(ctx,'#f8f8e8',711,573,p,p*20);pixelRect(ctx,'#e89878',708,630,p*3,p*3);
}

/** Draw GBA terrain and props in unchanged world-pixel coordinates. */
export function drawField(ctx,region,time=0,{surfing=false}={}){
 if(!ctx)return;const cached=terrainFor(region);ctx.save();ctx.imageSmoothingEnabled=false;if(cached)ctx.drawImage(cached,0,0);else paintTerrain(ctx,region);drawSeaMotion(ctx,region,time,surfing);drawVegetation(ctx,region);drawGrassAtlasPatch(ctx,region);drawRegionZoneDetails(ctx,region);drawLandmarks(ctx,region);drawHarbor(ctx,region);ctx.restore();
}

export const FIELD_ASSET_URL=ATLAS_URL;
export const FIELD_COASTAL_ASSET_URL=COASTAL_ATLAS_URL;
export const FIELD_PIER_ASSET_URL=PIER_URL;
