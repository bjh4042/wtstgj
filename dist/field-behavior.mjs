// @ts-check
import {tileMetadata,behaviorTileId,tileAtWorld,getTileMap,tileMapGeometry,registerTileMap} from './tileset-contract.mjs';
import {GOLDEN_MAP_DATA} from './golden-map-data.mjs';
/** Logic only: graphic tile IDs never determine movement or encounters. */
export const FIELD_BEHAVIOR=Object.freeze(Object.fromEntries(['NORMAL','TALL_GRASS','WATER','WATER_EDGE','SHORE','LEDGE','DOOR','WARP','SIGN','ENCOUNTER','BLOCKED','STAIRS','FOREGROUND'].map(name=>[name,tileMetadata(behaviorTileId(name))])));
/** @typedef {'up'|'down'|'left'|'right'} Facing */
/** @typedef {{id:string,rect:number[],direction:Facing,landing:number}} Ledge */
/** @typedef {{id:string,bounds:number[],solids:{id:string,rect:number[]}[],ledges:Ledge[],connections:Partial<Record<Facing,{map:string,edge:Facing}>>,grass:number[][],name:string}} QAMap */
/** Developer-only geometry. Uses existing art in the existing renderer. */
export const QA_MAPS=/** @type {Record<string,QAMap>} */({
 qa_a:{id:'qa_a',name:'관찰 연습장',bounds:[288,192,960,768],solids:[{id:'qa_wall',rect:[720,288,48,192]}],ledges:[{id:'down_ledge',rect:[384,672,192,48],direction:'down',landing:96}],connections:{right:{map:'qa_b',edge:'left'}},grass:[[864,480,240,144]]},
 qa_b:{id:'qa_b',name:'연결 연습장',bounds:[288,192,960,768],solids:[{id:'qa_wall_b',rect:[576,480,96,96]}],ledges:[],connections:{left:{map:'qa_a',edge:'right'}},grass:[]}
});
export const FIELD_GRID=48;
export const FIELD_MODES=Object.freeze({WALK:'WALK',RUN:'RUN',BIKE:'BIKE',SURF:'SURF',FISH:'FISH',SCRIPTED:'SCRIPTED'});
export const NPC_MOVEMENT=Object.freeze({FACE_FIXED:'FACE_FIXED',LOOK_AROUND:'LOOK_AROUND',WANDER:'WANDER',PATROL:'PATROL'});
/** @param {number} x @param {number} y @param {number[]} r */
export const inRect=(x,y,r)=>x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3];
/** @param {string} scene */
export function mapGeometry(scene){
 const qa=QA_MAPS[scene];if(qa)return {walkable:[qa.bounds],solids:qa.solids};
 return scene==='interior'?GOLDEN_MAP_DATA.interior:GOLDEN_MAP_DATA.outdoor;
}
/** NPC bodies are evaluated independently by field-core. @param {string} scene @param {number} x @param {number} y */
export function terrainWalkable(scene,x,y){
 const tile=tileAtWorld(scene,x,y);if(tile)return tile.walkable;
 const geo=mapGeometry(scene);if(!geo.walkable.some(r=>inRect(x,y,r)))return false;
 return !geo.solids.some(o=>{if(o.id.startsWith('npc_')||(scene==='interior'&&o.id==='2'))return false;const r=o.rect,pad=scene==='outdoor'?15:0;return inRect(x,y,[r[0]-pad,r[1]-(pad?6:0),r[2]+pad*2,r[3]+(pad?10:0)])});
}
/** @param {string} scene @param {number} x @param {number} y */
export function behaviorAt(scene,x,y){
 const tile=tileAtWorld(scene,x,y);if(tile)return {...tile,tileId:tile.id,id:tile.name==='GROUND'?'NORMAL':tile.name};
 const qa=QA_MAPS[scene];
 let id='NORMAL';
 if(qa?.ledges.some(l=>inRect(x,y,l.rect)))id='LEDGE';
 else if(scene==='outdoor'&&inRect(x,y,GOLDEN_MAP_DATA.doors.outside.rect)||scene==='interior'&&inRect(x,y,GOLDEN_MAP_DATA.doors.inside.rect))id='DOOR';
 else if(!terrainWalkable(scene,x,y))id=scene==='outdoor'&&(x>1120||y>650)?'WATER':'BLOCKED';
 else if((qa?.grass??(scene==='outdoor'?GOLDEN_MAP_DATA.grassZones:[])).some(r=>inRect(x,y,r)))id='TALL_GRASS';
 else if(scene==='outdoor'&&y>=648&&y<=744)id='SHORE';
 else if(scene==='outdoor'&&x>=1080&&y>235&&y<585)id='WATER_EDGE';
 else if(qa&&(x<=qa.bounds[0]+3&&qa.connections.left||x>=qa.bounds[0]+qa.bounds[2]-3&&qa.connections.right))id='WARP';
 const sign=scene==='outdoor'&&GOLDEN_MAP_DATA.outdoor.solids.find(o=>o.id.startsWith('sign')&&inRect(x,y,o.rect));if(sign)id='SIGN';
 return {...FIELD_BEHAVIOR[/** @type {keyof typeof FIELD_BEHAVIOR} */(id)],tileId:behaviorTileId(id),id};
}
/** Solid geometry, ledges and explicit bodies block sight; no image alpha involved. @param {string} scene @param {number} x @param {number} y */
export function sightBlocked(scene,x,y){return !terrainWalkable(scene,x,y)||QA_MAPS[scene]?.ledges.some(l=>inRect(x,y,l.rect))===true}

/** Register new logical maps through the existing STEP 2 connection/ledge engine. */
export function registerPlayableTileMap(id,data){const map=registerTileMap(id,data);QA_MAPS[id]=tileMapGeometry(map);return map;}
/** Fishing availability reads terrain metadata, never water-image alpha. */
export function fieldFishingAvailable(scene,x,y,facing){const vectors={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},[dx,dy]=vectors[facing]??[0,1];return behaviorAt(scene,x,y).fishable||behaviorAt(scene,x+dx*FIELD_GRID,y+dy*FIELD_GRID).fishable;}
