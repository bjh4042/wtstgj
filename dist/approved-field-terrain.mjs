// Original-art presentation adapter. Never reads legacy terrain, masks, or sprite pixels.
import { GOLDEN_MAP_DATA } from './golden-map-data.mjs';
import { APPROVED_TERRAIN_SOURCES } from './approved-terrain-sources.mjs';
import { browserImageLoader } from './asset-runtime.mjs';
export const APPROVED_TERRAIN_SIZE=Object.freeze({width:1536,height:1152,tile:48});
const images=new Map();let loading;
// Presentation extents only. Existing walkable/solid/door data remains authoritative.
// The mainland also covers building/tree foundations, which are not walkable.
const mainland=Object.freeze([0,0,1120,648]);
const lower=GOLDEN_MAP_DATA.outdoor.walkable.filter(r=>r[1]>=618);
const land=[mainland,...lower];
const contains=(x,y,r)=>x>=r[0]&&x<r[0]+r[2]&&y>=r[1]&&y<r[1]+r[3];
export function isApprovedWater(x,y){return x>=0&&y>=0&&x<1536&&y<1152&&!land.some(r=>contains(x,y,r))}
export function approvedMaterialAt(x,y){if(isApprovedWater(x,y))return 'sea';if(y>=709&&contains(x,y,[588,709,80,229])||contains(x,y,[665,776,178,74]))return 'wood';if(GOLDEN_MAP_DATA.grassZones.some(r=>contains(x,y,r)))return 'grass';return 'path'}
export function loadApprovedTerrain(loader=browserImageLoader){return loading??=Promise.all(Object.entries(APPROVED_TERRAIN_SOURCES).map(async([key,src])=>{const im=await loader(src);if((im.naturalWidth||im.width)!==256||(im.naturalHeight||im.height)!==(key==='O_SIGN_WOOD'?512:256))throw Error(`Invalid approved terrain dimensions: ${key}`);images.set(key,im)}))}
export const terrainStats=()=>({source:'W02_SELECTED_ORIGINALS',loaded:images.size,expected:Object.keys(APPROVED_TERRAIN_SOURCES).length,legacyPixels:false,geometry:'presentation-only',actualBrowser:'NOT_TESTED'});
// Build only the outer edge of the union. No internal shoreline across joining walkways.
export function approvedCoastSegments(){const xs=[...new Set([0,1536,...land.flatMap(r=>[r[0],r[0]+r[2]])])].sort((a,b)=>a-b),ys=[...new Set([0,1152,...land.flatMap(r=>[r[1],r[1]+r[3]])])].sort((a,b)=>a-b);const out=[];
 for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){const x=xs[i],y=ys[j],w=xs[i+1]-x,h=ys[j+1]-y;if(isApprovedWater(x+w/2,y+h/2))continue;
 if(isApprovedWater(x+w/2,y-0.1))out.push([x,y,x+w,y,0,-1]);if(isApprovedWater(x+w/2,y+h+0.1))out.push([x,y+h,x+w,y+h,0,1]);if(isApprovedWater(x-0.1,y+h/2))out.push([x,y,x,y+h,-1,0]);if(isApprovedWater(x+w+0.1,y+h/2))out.push([x+w,y,x+w,y+h,1,0]);}return out;}
const coast=approvedCoastSegments();
function rectPath(c,rects){c.beginPath();for(const r of rects)c.rect(...r)}
function tile(c,key,r,alpha=1){const im=images.get(key);if(!im)return;c.save();c.globalAlpha*=alpha;rectPath(c,[r]);c.clip();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';for(let y=Math.floor(r[1]/48)*48;y<r[1]+r[3];y+=48)for(let x=Math.floor(r[0]/48)*48;x<r[0]+r[2];x+=48)c.drawImage(im,0,0,256,256,x,y,48,48);c.restore()}
export function approvedMotion(timeMs=0,reducedMotion=false){const t=reducedMotion?0:Math.max(0,Number(timeMs)||0);const phase=(t%3600)/1200;return {frame:Math.floor(phase),next:(Math.floor(phase)+1)%3,mix:reducedMotion?0:(1-Math.cos((phase%1)*Math.PI))/2,time:t}}
const waterKey=(kind,i)=>i?`${kind}_${i}`:kind;
function drawWood(c,r){tile(c,'G_DECK_WOOD',r);c.save();rectPath(c,[r]);c.clip();c.fillStyle='rgba(66,49,30,0.16)';c.fillRect(r[0],r[1]+r[3]-3,r[2],3);c.restore()}
function drawSoftShallows(c,m){for(const [x,y,x2,y2,nx,ny]of coast){const length=Math.hypot(x2-x,y2-y),tx=(x2-x)/length,ty=(y2-y)/length;
 for(const [width,opacity]of [[25,.055],[18,.08],[11,.12],[5,.16]]){c.save();c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);for(let d=length;d>=0;d-=Math.min(8,d||8)){const wav=2*Math.sin((x+y+d)/23)+Math.sin((x-y+d)/7),offset=Math.max(1,width+wav);c.lineTo(x+tx*d+nx*offset,y+ty*d+ny*offset);if(d===0)break}c.lineTo(x,y);c.clip();const r=[Math.min(x,x2)-28,Math.min(y,y2)-28,Math.abs(x2-x)+56,Math.abs(y2-y)+56];tile(c,waterKey('G_SHALLOW',m.frame),r,opacity*(1-m.mix));tile(c,waterKey('G_SHALLOW',m.next),r,opacity*m.mix);c.restore()}
 }}
function drawGrassRegion(c,r){tile(c,'G_GRASS_SHORT',r);const cols=Math.ceil(r[2]/48),rows=Math.ceil(r[3]/48);c.save();rectPath(c,[r]);c.clip();for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){if(i>0&&i<cols-1&&j>0&&j<rows-1)continue;const n=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].map(([dx,dy])=>i+dx>=0&&j+dy>=0&&i+dx<cols&&j+dy<rows?2:0);const im=images.get('TR_GRASS_PATH_'+approvedNeighborMask(n));if(im)c.drawImage(im,0,0,256,256,r[0]+Math.min(i*48,r[2]-48),r[1]+Math.min(j*48,r[3]-48),48,48)}c.restore()}
/** Caller owns DPR and camera zoom transforms. Coordinates here are native world pixels.
 * cameraY is subtracted exactly once. options affect motion, never logical geometry. */
export function drawApprovedTerrain(c,scene,cameraY=0,timeMs=0,options={}){if(scene!=='outdoor')return false;const m=approvedMotion(timeMs,options.reducedMotion);c.save();c.translate(0,-cameraY);rectPath(c,[[0,0,1536,1152]]);c.clip();
 // Explicit original development fallback while approved assets load, never legacy images.
 c.fillStyle='#388c9d';c.fillRect(0,0,1536,1152);tile(c,waterKey('G_SEA',m.frame),[0,0,1536,1152]);tile(c,waterKey('G_SEA',m.next),[0,0,1536,1152],m.mix);
 // Shallow water and foam follow the exact union contour, not screen-space animation.
 drawSoftShallows(c,m);
 for(const r of land){c.fillStyle='#ceb084';c.fillRect(...r);tile(c,'G_PATH_EARTH',r)}
 // Grass/path ownership is explicit and clipped at unchanged encounter-zone extents.
 for(const r of GOLDEN_MAP_DATA.grassZones)drawGrassRegion(c,r);
 for(const r of [[588,709,80,229],[665,776,178,74]])drawWood(c,r);
 // Rim shading gives visual height without shifting the walkable landing or stair aperture.
 const foam=images.get('FX_FOAM_BASE');if(foam)for(const [x,y,x2,y2,nx,ny]of coast){if(y!==y2||y>=709)continue;c.save();c.globalAlpha*=.25;for(let xx=x;xx<x2;xx+=48){const width=Math.min(48,x2-xx);c.save();rectPath(c,[[xx,y-4,width,16]]);c.clip();c.drawImage(foam,0,0,256,256,xx,y-22,48,48);c.restore()}c.restore()}
 // Sparse wildflowers, original source and fixed world anchors.
 const flower=images.get('O_WILDFLOWER');if(flower)for(const [x,y] of [[398,192],[451,470],[1029,493],[93,581]])c.drawImage(flower,0,0,256,256,x-24,y-24,48,48);
 c.restore();return true;}
/** Reuses approved plant art with proportional source dimensions, not the old 48 frame crops. */
export function drawApprovedGrass(c,patch,frame=0,cameraY=0,options={}){const im=images.get('O_TALL_GRASS_A');if(!im)return false;const r=patch.footRect||[patch.x,patch.y+24,patch.w,patch.h-24];c.save();rectPath(c,[[Math.max(0,patch.x),patch.y-cameraY,Math.min(1536,patch.x+patch.w)-Math.max(0,patch.x),patch.h+5]]);c.clip();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';const bend=options.reducedMotion?0:Math.sin((Number(frame)||0)*Math.PI/2)*2;
 for(let y=r[1]+12;y<r[1]+r[3]+12;y+=22)for(let x=r[0]+12;x<r[0]+r[2]+12;x+=26){const jitter=((x*17+y*13)%7)-3;const size=52;c.drawImage(im,0,0,256,256,x-size/2+bend,y-size/2-cameraY+jitter,size,size)}c.restore();return true;}
/** Code-native original effect geometry, independent of unknown-origin sprite groups. */
export function drawApprovedWaterEffects(c,effects,cameraY=0,options={}){if(options.reducedMotion)return;for(const e of effects){if(!['ripple','splash'].includes(e.kind)||!isApprovedWater(e.x,e.y))continue;const p=Math.max(0,Math.min(1,e.age/480));if(p>=1)continue;c.save();c.globalAlpha*=0.45*(1-p);c.strokeStyle='#e2f7e9';c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y-cameraY,8+24*p,3+8*p,0,0,Math.PI*2);c.stroke();if(e.kind==='splash'){c.beginPath();c.ellipse(e.x,e.y-cameraY-4*(1-p),3+12*p,2+5*p,0,0,Math.PI*2);c.stroke()}c.restore()}}

const grassIds=new Set([2,8,12]);
/** N NE E SE S SW W NW; diagonal bits require both adjacent cardinal bits. */
export function approvedNeighborMask(neighbors,predicate=id=>grassIds.has(id)){const a=neighbors.map(predicate);return (a[0]?1:0)|(a[2]?4:0)|(a[4]?16:0)|(a[6]?64:0)|(a[1]&&a[0]&&a[2]?2:0)|(a[3]&&a[2]&&a[4]?8:0)|(a[5]&&a[4]&&a[6]?32:0)|(a[7]&&a[6]&&a[0]?128:0)}
/** Canonical world's stable TILE_IDS, unchanged map/encounter/collision semantics. */
export function drawApprovedTile(c,tileId,x,y,size=48,timeMs=0,options={}){const grass=grassIds.has(tileId),water=tileId===3||tileId===10,m=approvedMotion(timeMs,options.reducedMotion);let key=grass?'G_GRASS_SHORT':water?(tileId===10?'G_SHALLOW':'G_SEA'):tileId===1||tileId===4||tileId===6?'G_MONGDOL_DRY':'G_PATH_EARTH';if(grass&&options.neighbors)key='TR_GRASS_PATH_'+approvedNeighborMask(options.neighbors);c.save();c.beginPath();c.rect(x,y,size,size);c.clip();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';const draw=(k,alpha=1)=>{const im=images.get(k);if(!im)return false;c.save();c.globalAlpha*=alpha;c.drawImage(im,0,0,256,256,x,y,size,size);c.restore();return true};
 c.fillStyle=grass?'#7e9c58':water?'#479fba':tileId===1?'#747b79':'#cdb389';c.fillRect(x,y,size,size);
 if(water){draw(waterKey(key,m.frame));draw(waterKey(key,m.next),m.mix)}else draw(key);
 // Intentional original geometry for structural tile types, never relabeled source art.
 if(tileId===1||tileId===4){c.fillStyle='#394a4866';c.fillRect(x,y+size*.72,size,size*.28);c.fillStyle='#c1c2a777';c.fillRect(x,y+size*.68,size,size*.06)}
 if(tileId===6){for(let i=0;i<4;i++){c.fillStyle='#5d696188';c.fillRect(x,y+(i+1)*size/4-2,size,2);c.fillStyle='#dde0c766';c.fillRect(x,y+i*size/4,size,2)}}
 if(tileId===9||tileId===10){c.strokeStyle='#ddf1dc99';c.lineWidth=Math.max(1,size/24);c.beginPath();c.moveTo(x,y+size*.7);c.quadraticCurveTo(x+size*.5,y+size*.6,x+size,y+size*.7);c.stroke()}
 if(tileId===2){const im=images.get('O_TALL_GRASS_A');if(im)c.drawImage(im,0,0,256,256,x,y+size*.15,size,size)}
 if(tileId===11){const sign=images.get('O_SIGN_WOOD');if(sign)c.drawImage(sign,0,0,256,512,x+size*.15,y-size*.25,size*.7,size*1.4)}
 if(tileId===5||tileId===7){c.fillStyle='#9e957b';c.fillRect(x+size*.08,y+size*.75,size*.84,size*.12)}
 c.restore();return images.has(key);}
