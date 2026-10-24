import {TILE_IDS as T,tileMetadata} from '../tileset-contract.mjs';

export const GYM_POLISH_VERSION='GYM_ROUTES_V1';
// Small layouts use existing tiles, interaction receipts and the original exit switch.
// Rectangles are physical barriers, including indoor display water (never Surf routes).
const themeLabels={WATER:'물',ELECTRIC:'전기',GRASS:'풀',NORMAL:'노말',BUG:'벌레',ROCK:'바위',FLYING:'비행',POISON:'독'};
const layouts=[
 {theme:'WATER',barriers:[[9,12,4,5],[17,15,7,3]],tile:T.WATER,
  steps:[[6,14,'유입 수문','동쪽 물길을 돌아 방류 수문을 열어 주세요.'],[20,12,'방류 수문','물길 사이 통로가 열렸습니다. 북쪽으로 가세요.']],
  trainers:[[7,18],[15,13],[26,14]],hint:'서쪽 유입 수문 → 동쪽 방류 수문. 물 위가 아닌 두 물길 사이를 걸어가세요.'},
 {theme:'ELECTRIC',markerColors:['#ed8c87','#f3d370','#87b5e8'],markerGlyphs:['전원','연결','개폐'],barriers:[[9,11,1,5],[9,19,1,4],[17,11,1,2],[17,16,1,7]],tile:T.BLOCKED,
  steps:[[6,14,'빨강 전원','전원이 켜졌습니다. 아래쪽 통로의 노랑 연결기로 가세요.'],[13,20,'노랑 연결기','회로가 이어졌습니다. 오른쪽 파랑 개폐기로 가세요.'],[22,12,'파랑 개폐기','회로가 완성되어 북쪽 문이 열렸습니다.']],
  trainers:[[6,20],[13,14],[23,18]],hint:'빨강 → 노랑 → 파랑 순서입니다. 칸막이 끝의 빈 통로로 돌아가세요.'},
 {theme:'GRASS',barriers:[[9,13,5,3],[18,17,5,3]],tile:T.BLOCKED,
  steps:[[6,13,'그늘 잎 관찰','그늘 잎을 기록했습니다. 오른쪽 햇빛 잎 표식으로 가세요.'],[24,14,'햇빛 잎 관찰','두 식생을 관찰했습니다. 북쪽 관장 통로가 열렸습니다.']],
  trainers:[[7,18],[16,13],[26,18]],hint:'식생 구획 바깥길로 그늘 잎 → 햇빛 잎을 관찰하세요. 막다른 길에서는 되돌아올 수 있어요.'},
 {theme:'NORMAL',barriers:[[10,15,2,2],[19,17,5,1]],tile:T.BLOCKED,
  steps:[[8,13,'방문 안내 확인','안내: 대기석을 지나 북쪽 접수 표식에서 방문을 확인하세요.'],[21,12,'방문 확인','방문 확인이 끝났습니다. 북쪽 문으로 가세요.']],
  trainers:[[7,18],[15,14],[26,15]],hint:'안내판을 읽고 북쪽 접수 표식을 확인하면 됩니다. 대기석 사이 길을 이용하세요.'},
 {theme:'BUG',barriers:[[8,12,2,7],[14,16,2,7],[20,12,2,5]],tile:T.BLOCKED,
  steps:[[12,13,'꽃가루 관찰','꽃가루를 기록했습니다. 밭 둘레를 돌아 오른쪽 잎 뒷면도 살펴보세요.'],[24,18,'잎 뒷면 관찰','곤충 관찰이 끝났습니다. 위쪽 길에서 관장을 만날 수 있어요.']],
  trainers:[[6,20],[12,18],[24,13]],hint:'꽃가루 → 잎 뒷면을 관찰하세요. 밭고랑 양끝의 갈림길은 모두 돌아 나올 수 있어요.'},
 {theme:'ROCK',barriers:[[8,13,3,3],[14,18,4,3],[22,13,3,4]],tile:T.BLOCKED,
  steps:[[12,17,'몽돌 통로 레버','첫 통로를 확인했습니다. 바위 사이를 돌아 북쪽 레버를 확인하세요.'],[19,12,'북쪽 통로 레버','관장 통로가 열렸습니다. 바위를 밀거나 부술 필요는 없어요.']],
  trainers:[[6,18],[16,14],[26,18]],hint:'몽돌 통로 → 북쪽 통로 레버. 바위 사이의 넓은 틈으로 이동하세요.'},
 {theme:'FLYING',barriers:[[8,12,3,5],[15,17,5,2],[25,12,2,8]],tile:T.BLOCKED,
  steps:[[12,14,'서쪽 풍향 표식','서쪽 바람을 확인했습니다. 남쪽 우회로를 지나 동쪽 풍향도 확인하세요.'],[23,20,'동쪽 풍향 표식','바람 통로가 열렸습니다. 북쪽 관장에게 가세요.']],
  trainers:[[6,20],[17,14],[22,12]],hint:'서쪽 → 동쪽 풍향 표식을 확인하세요. 난간 안 통로만 걸을 수 있고 떨어지지는 않아요.'},
 {theme:'POISON',barriers:[[10,11,1,6],[18,17,1,6],[25,11,1,5]],tile:T.BLOCKED,
  steps:[[7,14,'입구 검사','입구 검사를 마쳤습니다. 아래 통로를 돌아 중앙 검사를 받으세요.'],[14,20,'중앙 검사','중앙 검사를 마쳤습니다. 오른쪽 출구 검사를 확인하세요.'],[22,13,'출구 검사','검사가 끝나 북쪽 관장 통로가 열렸습니다.']],
  trainers:[[6,20],[14,13],[23,19]],hint:'입구 → 중앙 → 출구 검사 순서입니다. 격리벽을 돌아 표식으로 이동하세요. 바닥 피해는 없습니다.'}
];
const covers=(r,x,y)=>x>=r[0]&&x<r[0]+r[2]&&y>=r[1]&&y<r[1]+r[3];
export const gymBarrierAt=(m,x,y)=>m.puzzle?.barriers?.some(r=>covers(r,x,y))??false;

export function applyGymPolish({maps,points,point,story}){
 const collisions=[];
 for(const [index,layout] of layouts.entries()){
  const number=index+1,m=maps['world:gym:'+number],oldActors=m.actors.map(a=>({...a}));
  const before=m.tiles.map(row=>[...row]);
  m.layoutVersion=GYM_POLISH_VERSION;
  m.puzzle.theme=layout.theme;m.puzzle.barriers=layout.barriers;
  m.puzzle.steps=layout.steps.map((_,i)=>i===layout.steps.length-1?m.puzzle.switchPoint:`puzzle:${number}:step:${i+1}`);
  for(const rect of layout.barriers)for(let y=rect[1];y<rect[1]+rect[3];y++)for(let x=rect[0];x<rect[0]+rect[2];x++)m.tiles[y][x]=layout.tile;
  for(const [i,[x,y,label,message]] of layout.steps.entries()){
   const id=m.puzzle.steps[i],data={label,message,markerColor:layout.markerColors?.[i],markerGlyph:layout.markerGlyphs?.[i],puzzleId:m.puzzle.id,requiresInteractions:m.puzzle.steps.slice(0,i),completesPuzzle:i===layout.steps.length-1};
   if(points[id])Object.assign(points[id],{x,y,...data});else point(m,id,'puzzle',x,y,data);
  }
  point(m,'gym-guide:'+number,'landmark',4,19,{label:themeLabels[layout.theme]+' 체육관 안내',message:layout.hint});
  const subs=m.actors.filter(a=>story.trainers[a.trainerId]?.kind==='gym_subtrainer');
  for(const [i,a] of subs.entries()){
   const [x,y]=layout.trainers[i];Object.assign(a,{x,y});Object.assign(points[a.pointId],{x,y});
  }
  // Include only new obstructions; old-invalid saves are not silently repaired.
  for(let y=1;y<m.height-1;y++)for(let x=1;x<m.width-1;x++){
   const nowBlocked=gymBarrierAt(m,x,y)||m.actors.some(a=>a.x===x&&a.y===y);
   if(nowBlocked&&tileMetadata(before[y][x]).walkable&&!oldActors.some(a=>a.x===x&&a.y===y))collisions.push({mapId:m.id,x,y});
  }
 }
 return collisions;
}
