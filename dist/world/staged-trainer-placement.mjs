import {TILE_IDS as T,tileMetadata} from '../tileset-contract.mjs';

export const STAGED_TRAINER_PLACEMENT='TRAINER_WORLD_20260927_V1';
const requiredColumns=[7,11,17,23];
const occupied=(m,points,x,y,except)=>m.points.some(id=>id!==except&&points[id].x===x&&points[id].y===y);

/** The four one-cell passes are watched from alcoves. Optional trainers sit off the
 * crossing route and are reachable from the wider area. This runs only for the
 * opt-in 104-trainer candidate; the production world keeps its original cells. */
export function applyStagedTrainerPlacement({maps,points,point,story,areaBindings}){
 const collisions=[],placements={};
 for(const m of Object.values(maps).filter(m=>m.kind==='area')){
  const trainers=Object.values(story.trainers).filter(t=>t.kind==='route_general'&&areaBindings[t.areaId]===m.id);
  if(!trainers.length)continue;
  const required=trainers.filter(t=>t.required),optional=trainers.filter(t=>!t.required);
  if(required.length>requiredColumns.length)throw Error('Too many required trainers in '+m.id);
  for(const [i,t] of required.entries()){
   const x=requiredColumns[i],y=11,p=points['trainer:'+t.id];
   if(occupied(m,points,x,y,p.id)||occupied(m,points,x,12,p.id))throw Error('Required trainer crossing occupied: '+m.id+':'+x);
   Object.assign(p,{x,y,facing:'down',label:t.displayName??p.label,placementStatus:STAGED_TRAINER_PLACEMENT,routeRole:'required-crossing'});
   placements[t.id]={mapId:m.id,x,y,required:true,watchedCell:[x,12]};
  }
  if(required.length>2){
   const checkpointId='checkpoint:'+m.areaId;
   m.routeBreak={gate:[14,12],pointId:checkpointId};
   point(m,checkpointId,'route-checkpoint',13,11,{label:'길목 안내 표식 · 주변을 살핀 뒤 계속',message:'길목을 점검했습니다. 다음 탐험 구간으로 진행할 수 있습니다.',placementStatus:STAGED_TRAINER_PLACEMENT});
   point(m,'rest:'+m.areaId,'heal',13,13,{label:'길목 회복 쉼터 · 대결 사이 회복',hubId:'REST:'+m.areaId,placementStatus:STAGED_TRAINER_PLACEMENT});
  }
  // Barrier from the northern edge through the waterline. The only crossings are
  // below the trainers. Keep points and solid objects intact and fail closed.
  for(const x of [...requiredColumns.slice(0,required.length),...required.length>2?[14]:[]])for(let y=1;y<=22;y++){
   if(y===12||y===11&&x!==14)continue;
   if(occupied(m,points,x,y,null)||m.solidObjects.some(o=>x>=o.rect[0]&&x<o.rect[0]+o.rect[2]&&y>=o.rect[1]&&y<o.rect[1]+o.rect[3]))throw Error('Crossing overlaps gameplay: '+m.id+':'+x+','+y);
   if(tileMetadata(m.tiles[y][x]).walkable)collisions.push({mapId:m.id,x,y});
   m.tiles[y][x]=T.BLOCKED;
  }
  for(const [i,t] of optional.entries()){
   const p=points['trainer:'+t.id],cells=[];
   // East-side overlooks and shore paths; no duplicate actors, points, water,
   // or hidden-path walls. Search in a stable order so saves keep cell identity.
   for(const y of [14,16,12,17,10,6,8])for(const x of [26,29,32,35,38,24,27,30,33,36])cells.push([x,y]);
   const cell=cells.find(([x,y])=>x<39&&!occupied(m,points,x,y,p.id)&&tileMetadata(m.tiles[y][x]).walkable&&!m.solidObjects.some(o=>x>=o.rect[0]&&x<o.rect[0]+o.rect[2]&&y>=o.rect[1]&&y<o.rect[1]+o.rect[3]));
   if(!cell)throw Error('No optional trainer site: '+m.id+':'+t.id);
   Object.assign(p,{x:cell[0],y:cell[1],facing:'left',label:t.displayName??p.label,placementStatus:STAGED_TRAINER_PLACEMENT,routeRole:'optional-spur'});
   placements[t.id]={mapId:m.id,x:p.x,y:p.y,required:false};
  }
  for(const t of trainers){const p=points['trainer:'+t.id],a=m.actors.find(a=>a.pointId===p.id);Object.assign(a,{x:p.x,y:p.y,facing:p.facing,fieldAssetId:t.gender==='female'?'human.player-girl.field':'human.player-boy.field'});collisions.push({mapId:m.id,x:p.x,y:p.y})}
 }
 // Gym polish places each subtrainer on its puzzle route. Record and verify
 // those cells here so all 104 ordinary trainers share one placement contract.
 for(const t of Object.values(story.trainers).filter(t=>t.kind==='gym_subtrainer')){
  const p=points['trainer:'+t.id],m=maps[p.mapId];
  if(!m||!tileMetadata(m.tiles[p.y]?.[p.x]).walkable||m.puzzle?.barriers?.some(([x,y,w,h])=>p.x>=x&&p.x<x+w&&p.y>=y&&p.y<y+h))throw Error('Gym trainer on blocked cell: '+t.id);
  p.placementStatus=STAGED_TRAINER_PLACEMENT;
  m.actors.find(a=>a.pointId===p.id).fieldAssetId=t.gender==='female'?'human.player-girl.field':'human.player-boy.field';
  placements[t.id]={mapId:m.id,x:p.x,y:p.y,required:t.required};
 }
 return {collisions,placements};
}
