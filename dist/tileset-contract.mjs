/** TILESET CONTRACT v1. IDs and metadata are save/map data, never inferred from pixels. */
export const TILE_SIZE=32;
/** @type {Array<[string, Record<string, any>]>} */
const definitions=[
 ['GROUND',{walkable:true}],['BLOCKED',{walkable:false,collision:true}],
 ['TALL_GRASS',{walkable:true,tallGrass:true,encounter:true,foreground:true,fieldEffect:'tallGrass'}],
 ['WATER',{walkable:false,collision:true,water:true,fishable:true}],
 ['LEDGE',{walkable:false,collision:true,ledge:'down',transition:'ledgeJump'}],
 ['DOOR',{walkable:true,door:true,interaction:'door',transition:'door'}],
 ['STAIRS',{walkable:true,stairs:true}],['WARP',{walkable:true,warp:true,transition:'warp'}],
 ['FOREGROUND',{walkable:true,foreground:true}],['SHORE',{walkable:true,fieldEffect:'shorelineFoam',fishable:true}],
 ['WATER_EDGE',{walkable:true,waterEdge:true,fishable:true,fieldEffect:'ripple'}],
 ['SIGN',{walkable:false,collision:true,interaction:'sign'}],['ENCOUNTER',{walkable:true,encounter:true}]
];
export const TILE_IDS=Object.freeze(Object.fromEntries(definitions.map(([name],id)=>[name,id])));
export const TILES=Object.freeze(Object.fromEntries(definitions.map(([name,data],id)=>[id,Object.freeze({id,name,collision:false,walkable:true,tallGrass:false,water:false,ledge:null,door:false,stairs:false,warp:false,foreground:false,fishable:false,...data,passable:data.walkable,artSlot:id})])));
export const tileMetadata=id=>TILES[id]??TILES[TILE_IDS.BLOCKED];
export function tileSource(id){return [(tileMetadata(id).artSlot%16)*32,Math.floor(tileMetadata(id).artSlot/16)*32,32,32];}
export const behaviorTileId=id=>TILE_IDS[id==='NORMAL'?'GROUND':id]??TILE_IDS.BLOCKED;
const maps=new Map();
/** Maps store stable logical IDs; links and ledge directions remain explicit gameplay data. */
export function registerTileMap(id,{tiles,origin=[0,0],worldTileSize=48,links={},name=id}){
 if(!tiles.length||!tiles[0].length||!tiles.every(row=>row.length===tiles[0].length&&row.every(n=>Object.hasOwn(TILES,n))))throw Error('Invalid tile map');
 if(!Number.isFinite(worldTileSize)||worldTileSize<=0||origin.length!==2||!origin.every(Number.isFinite))throw Error('Invalid tile coordinates');
 const map=Object.freeze({id,tiles:Object.freeze(tiles.map(row=>Object.freeze([...row]))),origin:Object.freeze([...origin]),worldTileSize,links,name});maps.set(id,map);return map;
}
export const getTileMap=id=>maps.get(id);
export const unregisterTileMap=id=>maps.delete(id);
export function tileAtWorld(id,x,y){const map=maps.get(id);if(!map)return null;return tileMetadata(map.tiles[Math.floor((y-map.origin[1])/map.worldTileSize)]?.[Math.floor((x-map.origin[0])/map.worldTileSize)]);}
export function tileMapGeometry(map){
 const solids=[],ledges=[],grass=[],size=map.worldTileSize;
 map.tiles.forEach((row,y)=>row.forEach((id,x)=>{const t=tileMetadata(id),rect=[map.origin[0]+x*size,map.origin[1]+y*size,size,size];if(t.collision&&!t.ledge)solids.push({id:`tile-${x}-${y}`,rect});if(t.ledge)ledges.push({id:`ledge-${x}-${y}`,rect,direction:t.ledge,landing:size*2});if(t.tallGrass)grass.push(rect)}));
 return {id:map.id,name:map.name,bounds:[...map.origin,map.tiles[0].length*size,map.tiles.length*size],solids,ledges,grass,connections:map.links};
}
export function drawTilePlaceholder(c,id,x,y,size,{grid=true}={}){const t=tileMetadata(id);c.fillStyle=['#77997a','#56626c','#386e50','#447d9b','#98734e','#a7835c','#a4aab0','#836ba3','#4b805b','#c7b88a','#76a6ab','#947953','#547a4c'][t.id];c.fillRect(x,y,size,size);if(grid){c.strokeStyle='#263e4b';c.strokeRect(x,y,size,size);}if(t.foreground){c.fillStyle='#2a5841';c.fillRect(x,y+size*.7,size,size*.3)}}
