export const WORLD_SIZE={width:1200,height:800};
export const WALK_SEQUENCE=[0,1,0,2];
export const FACING_ROWS={down:0,up:1,left:2,right:3};
const DIRECTIONS=new Set(Object.keys(FACING_ROWS));

export function createDirectionInput(){return {pressed:new Map(),order:0}}

export function pressDirection(input,sourceId,direction){
 if(!DIRECTIONS.has(direction))throw Error('Unknown direction');
 const current=input.pressed.get(sourceId);
 if(current?.direction===direction)return activeDirection(input);
 input.pressed.set(sourceId,{direction,order:++input.order});
 return direction;
}

export function releaseDirection(input,sourceId){input.pressed.delete(sourceId);return activeDirection(input)}
export function clearDirections(input){input.pressed.clear()}
export function activeDirection(input){
 let latest=null;
 for(const value of input.pressed.values())if(!latest||value.order>latest.order)latest=value;
 return latest?.direction??null;
}

export function cameraFor(pos,zoom=1.65,viewport=WORLD_SIZE,world=WORLD_SIZE){
 const visibleWidth=viewport.width/zoom,visibleHeight=viewport.height/zoom;
 const playerX=pos.x*12,playerY=pos.y*8;
 return {
  x:Math.max(0,Math.min(world.width-visibleWidth,playerX-visibleWidth/2)),
  y:Math.max(0,Math.min(world.height-visibleHeight,playerY-visibleHeight/2)),
  zoom
 };
}

export function screenToWorldNormalized(clientX,clientY,rect,camera,viewport=WORLD_SIZE){
 const canvasX=(clientX-rect.left)/rect.width*viewport.width;
 const canvasY=(clientY-rect.top)/rect.height*viewport.height;
 return {x:(camera.x+canvasX/camera.zoom)/12,y:(camera.y+canvasY/camera.zoom)/8};
}

export function stepCardinal(pos,direction,budgetPx,canWalk){
 const delta={up:[0,-budgetPx/8],down:[0,budgetPx/8],left:[-budgetPx/12,0],right:[budgetPx/12,0]}[direction];
 if(!delta||budgetPx<=0)return {pos:{...pos},distancePx:0,normalizedDistance:0,moved:false,facing:direction};
 const next={x:pos.x+delta[0],y:pos.y+delta[1]};
 if(!canWalk(next.x,next.y))return {pos:{...pos},distancePx:0,normalizedDistance:0,moved:false,facing:direction,blocked:true};
 return {pos:next,distancePx:budgetPx,normalizedDistance:Math.hypot(delta[0],delta[1]),moved:true,facing:direction,blocked:false};
}

export function advanceRoute(pos,route,budgetPx,canWalk){
 let current={...pos},remaining=Math.max(0,budgetPx),distancePx=0,normalizedDistance=0,facing=null,blocked=false;
 while(route.length&&remaining>0){
  const target=route[0],dx=target.x-current.x,dy=target.y-current.y;
  if(Math.abs(dx)<1e-9&&Math.abs(dy)<1e-9){route.shift();continue}
  const horizontal=Math.abs(dx)>1e-9;
  if(horizontal&&Math.abs(dy)>1e-9)throw Error('Route segment must be cardinal');
  const direction=horizontal?(dx<0?'left':'right'):(dy<0?'up':'down');
  const distanceToTarget=Math.abs(horizontal?dx*12:dy*8);
  const step=Math.min(remaining,distanceToTarget);
  const result=stepCardinal(current,direction,step,canWalk);
  facing=direction;
  if(!result.moved){blocked=true;route.length=0;break}
  current=result.pos;distancePx+=result.distancePx;normalizedDistance+=result.normalizedDistance;remaining-=result.distancePx;
  if(step>=distanceToTarget-1e-9){current={x:target.x,y:target.y};route.shift()}
 }
 return {pos:current,distancePx,normalizedDistance,moved:distancePx>0,facing,blocked};
}

function cardinalBridge(from,to,canWalk){
 const xy={x:to.x,y:from.y},yx={x:from.x,y:to.y};
 if(canWalk(xy.x,xy.y)&&canWalk(to.x,to.y))return [xy,to].filter((p,i,a)=>i===0||p.x!==a[i-1].x||p.y!==a[i-1].y);
 if(canWalk(yx.x,yx.y)&&canWalk(to.x,to.y))return [yx,to].filter((p,i,a)=>i===0||p.x!==a[i-1].x||p.y!==a[i-1].y);
 return null;
}

export function buildGridRoute(start,target,canWalk){
 const startCell={x:Math.round(start.x),y:Math.round(start.y)},endCell={x:Math.round(target.x),y:Math.round(target.y)};
 if(!canWalk(endCell.x,endCell.y))return null;
 const prefix=cardinalBridge(start,startCell,canWalk);
 if(!prefix)return null;
 const queue=[startCell],seen=new Set([`${startCell.x},${startCell.y}`]),parent=new Map();
 let found=false;
 for(let index=0;index<queue.length;index++){
  const cell=queue[index];
  if(cell.x===endCell.x&&cell.y===endCell.y){found=true;break}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const next={x:cell.x+dx,y:cell.y+dy},key=`${next.x},${next.y}`;
   if(!seen.has(key)&&canWalk(next.x,next.y)){seen.add(key);parent.set(key,cell);queue.push(next)}
  }
 }
 if(!found)return null;
 const cells=[];
 for(let cell=endCell;cell.x!==startCell.x||cell.y!==startCell.y;){cells.unshift(cell);cell=parent.get(`${cell.x},${cell.y}`);if(!cell)return null}
 const route=[...prefix,...cells];
 return route.filter((point,index)=>index===0||point.x!==route[index-1].x||point.y!==route[index-1].y);
}

export function walkFrame(distancePx){return WALK_SEQUENCE[Math.floor(Math.max(0,distancePx)/7)%WALK_SEQUENCE.length]}
