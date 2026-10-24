import {TILE_IDS as T} from '../tileset-contract.mjs';
import {HIDDEN_PLACEMENT_V1 as policy} from './hidden-placement-v1.mjs';
/** Small optional paths in existing maps. No source table, required event, or facility ID changes. */
export function applyApprovedPlacement({maps,points,point}){
 const newCollisions=[];
 for(const p of Object.values(points))if(['shop','heal','research'].includes(p.kind))p.placementStatus='APPROVED_GAMEPLAY_PLACEMENT_V1';
 // Access is independent of whether the sanctuary's fixed encounter was already captured.
 points['area-entry:POST_DEEP_FOREST_SANCTUARY'].gate=policy.source149AccessExpression;
 for(const slot of policy.slots){
  const m=maps[slot.mapId],surf=['HIDDEN_GEOJE_07','HIDDEN_GEOJE_08'].includes(slot.slotId),final=slot.stage==='FINAL';
  const paint=(x,y,t)=>{
   if(m.points.some(id=>points[id].x===x&&points[id].y===y)||m.solidObjects.some(o=>x>=o.rect[0]&&x<o.rect[0]+o.rect[2]&&y>=o.rect[1]&&y<o.rect[1]+o.rect[3])||m.encounterZones.some(z=>!z.policyExcluded&&x>=z.rect[0]&&x<z.rect[0]+z.rect[2]&&y>=z.rect[1]&&y<z.rect[1]+z.rect[3]))throw Error('Hidden path would replace existing gameplay: '+slot.slotId);
   if(t===T.BLOCKED&&m.tiles[y][x]!==T.BLOCKED)newCollisions.push({mapId:m.id,x,y});
   m.tiles[y][x]=t;
  };
  if(surf){for(const x of [29,30,31])paint(x,21,T.GROUND)}
  else {
   const x=final?14:15,y=final?19:2;
   for(let dx=-1;dx<=8;dx++)paint(x+dx,y-1,T.BLOCKED);
   for(let dx=1;dx<=8;dx++)paint(x+dx,y+1,T.BLOCKED);
   paint(x-1,y,T.BLOCKED);paint(x-1,y+1,T.BLOCKED);paint(x+8,y,T.BLOCKED);
  }
  const clue=point(m,slot.slotId+':clue',slot.slotId==='HIDDEN_GEOJE_04'?'hidden-hint-npc':'hidden-clue',...(surf?[29,18]:final?[14,21]:slot.slotId==='HIDDEN_GEOJE_04'?[13,4]:[15,4]),{
   label:slot.slotId==='HIDDEN_GEOJE_04'?'녹지 탐험가':'작은 방향 표식',
   message:surf?'바다 건너 낮은 암반에 작은 보관함이 보인다.':slot.slotId==='HIDDEN_GEOJE_04'?'탐험가: 저쪽 샛길 끝에 비밀 보관함이 있어요. 직접 찾아보세요.':slot.slotId==='HIDDEN_GEOJE_11'?'서로 다른 두 표식을 조사하면 샛길 끝의 보관함이 열린다.':'표식의 화살표가 좁은 샛길 안쪽을 가리킨다.',placementStatus:'APPROVED_GAMEPLAY_PLACEMENT_V1'});
  if(clue.kind==='hidden-hint-npc'){m.actors.push({id:'actor:'+clue.id,pointId:clue.id,npcId:null,trainerId:null,eventId:null,x:clue.x,y:clue.y,facing:'right',fieldAssetId:'human.researcher.field'});newCollisions.push({mapId:m.id,x:clue.x,y:clue.y});}
  if(slot.slotId==='HIDDEN_GEOJE_06')point(m,slot.slotId+':sign','hidden-clue',18,2,{label:'작은 방향 표식',message:'표식이 샛길 끝 보관함을 가리킨다.'});
  for(const [i,id] of (slot.requiredMarkers??[]).entries())point(m,id,'hidden-marker',14+i*10,16,{label:['잎 표식','바람 표식'][i],slotId:slot.slotId,message:'표식 하나를 조사했습니다. 서로 다른 두 표식이 필요합니다.'});
  point(m,slot.slotId,'hidden-geoje',...slot.cell,{slotId:slot.slotId,onceFlag:slot.onceFlag,gate:slot.accessGate,label:'작은 보관함 · 조사',quantity:1,hidden:true,placementStatus:'APPROVED_GAMEPLAY_PLACEMENT_V1'});
 }
 return newCollisions;
}
