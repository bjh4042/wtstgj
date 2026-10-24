import geometry from './geometry-data.mjs';
export const CONFIG={world:[1024,1536],nativeHeight:80,comparisonHeight:110,nominalAtlasHeight:192,speed:128,phaseDistance:26,maxSubstep:2,footRadius:[12,6],cycle:['A','IDLE','B','IDLE']};
export function pointInPolygon(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
export function inside(x,y,p){return pointInPolygon(x,y,p);}
const surfaces=Object.fromEntries(geometry.walkSurfaces.map(s=>[s.id,s]));
export function blockedAt(x,y){return (geometry.blockedScenery??[]).some(r=>inside(x,y,r.polygon)||r.polygon.some((a,i)=>{const b=r.polygon[(i+1)%r.polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],len2=dx*dx+dy*dy,t=((x-a[0])*dx+(y-a[1])*dy)/len2;return t>=0&&t<=1&&Math.abs((x-a[0])*dy-(y-a[1])*dx)<1e-9;}));}
export function surfaceAt(x,y){if(blockedAt(x,y))return null;if(surfaces.habitat_branch&&inside(x,y,surfaces.habitat_branch.polygon))return 'upper';if(inside(x,y,surfaces.painted_stair.polygon))return 'stair';if(inside(x,y,surfaces.forest_promenade.polygon))return 'upper';if(inside(x,y,surfaces.shore_corridor.polygon))return 'lower';return null;}
export function stairProgress(x,y){const a=geometry.stairs.upperAnchor,b=geometry.stairs.lowerAnchor,dx=b[0]-a[0],dy=b[1]-a[1];return Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));}
function groundAllowed(x,y){return x>=0&&y>=0&&x<1024&&y<1536&&!!surfaceAt(x,y);}
const FOOT_OFFSETS=[[0,0],...[.5,1].flatMap(radius=>Array.from({length:32},(_,i)=>[radius*12*Math.cos(i*Math.PI/16),radius*6*Math.sin(i*Math.PI/16)]))];
const edgesOf=polygons=>polygons.flatMap(p=>p.map((a,i)=>{const b=p[(i+1)%p.length];return {a,b,minX:Math.min(a[0],b[0]),maxX:Math.max(a[0],b[0]),minY:Math.min(a[1],b[1]),maxY:Math.max(a[1],b[1])};}));
const SURFACE_EDGES=edgesOf(geometry.walkSurfaces.map(s=>s.polygon));
const ALL_EDGES=edgesOf(geometry.walkSurfaces.map(s=>s.polygon).concat((geometry.blockedScenery??[]).map(r=>r.polygon)).concat([[[0,0],[1024,0],[1024,1536],[0,1536]]]));
export function canStand(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&FOOT_OFFSETS.every(([dx,dy])=>groundAllowed(x+dx,y+dy));}
const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
function boundarySplits(x,y,nx,ny,edges){const dx=nx-x,dy=ny-y,l2=dx*dx+dy*dy,ts=[0,1];if(l2<1e-20)return ts;const minX=Math.min(x,nx),maxX=Math.max(x,nx),minY=Math.min(y,ny),maxY=Math.max(y,ny);
 for(const e of edges){if(e.maxX<minX||e.minX>maxX||e.maxY<minY||e.minY>maxY)continue;const ex=e.b[0]-e.a[0],ey=e.b[1]-e.a[1],qx=e.a[0]-x,qy=e.a[1]-y,den=cross(dx,dy,ex,ey);if(Math.abs(den)>1e-12){const t=cross(qx,qy,ex,ey)/den,u=cross(qx,qy,dx,dy)/den;if(t>0&&t<1&&u>=-1e-12&&u<=1+1e-12)ts.push(t);}else if(Math.abs(cross(qx,qy,dx,dy))<1e-10){for(const q of [e.a,e.b]){const t=((q[0]-x)*dx+(q[1]-y)*dy)/l2;if(t>0&&t<1)ts.push(t);}}}
 return ts.sort((a,b)=>a-b).filter((t,i,all)=>i===0||t-all[i-1]>1e-12);
}
function portalTransition(a,b,x,y,nx,ny){if(a===b)return true;if((a==='lower'&&b==='upper')||(a==='upper'&&b==='lower'))return false;if(a==='stair')return b==='upper'?stairProgress(x,y)<geometry.stairs.upperProgressMax:b==='lower'?stairProgress(x,y)>geometry.stairs.lowerProgressMin:false;if(b==='stair')return a==='upper'?stairProgress(nx,ny)<geometry.stairs.upperProgressMax:a==='lower'?stairProgress(nx,ny)>geometry.stairs.lowerProgressMin:false;return false;}
export function transitionAllowed(x,y,nx,ny){if(!canStand(x,y)||!canStand(nx,ny))return false;
 // Exact segment/boundary partitioning for the explicitly declared contact samples.
 // This is not a smaller timestep approximation and not a full analytic ellipse/skeletal solve.
 for(const [ox,oy] of FOOT_OFFSETS){const ax=x+ox,ay=y+oy,bx=nx+ox,by=ny+oy,ts=boundarySplits(ax,ay,bx,by,ALL_EDGES);for(let i=1;i<ts.length;i++){const mid=(ts[i-1]+ts[i])/2;if(!groundAllowed(ax+(bx-ax)*mid,ay+(by-ay)*mid))return false;if(i<ts.length-1&&!groundAllowed(ax+(bx-ax)*ts[i],ay+(by-ay)*ts[i]))return false;}}
 const ts=boundarySplits(x,y,nx,ny,SURFACE_EDGES),samples=[0,...ts.slice(1).map((t,i)=>(t+ts[i])/2),1];let px=x,py=y,previous=surfaceAt(x,y);for(const t of samples.slice(1)){const qx=x+(nx-x)*t,qy=y+(ny-y)*t,next=surfaceAt(qx,qy);if(!portalTransition(previous,next,px,py,qx,qy))return false;px=qx;py=qy;previous=next;}return true;
}
export function initialState(){return {x:geometry.spawn[0],y:geometry.spawn[1],facing:'FRONT',moving:false,gaitDistance:0,totalDistance:0,phase:'IDLE',surface:'upper',elevation:1,height:80,modal:false,lastAction:'별도 연속 보행 회랑 검수',blocked:false};}
export function action(state,key){if(key==='B'){state.modal=false;state.lastAction='닫기';return;}if(key==='A'){state.modal=true;state.moving=false;state.phase='IDLE';state.gaitDistance=0;state.lastAction='회랑 검수 안내 · 건물 진입이나 워프가 아닙니다';}}
export function advance(state,input,dt){const s={...state,lastMotionSegments:[],lastMotionTimeline:[]};if(s.modal||!Number.isFinite(dt)||dt<=0)return s;dt=Math.min(dt,.1);let dx=Number(input?.x)||0,dy=Number(input?.y)||0;if(!Number.isFinite(dx))dx=0;if(!Number.isFinite(dy))dy=0;const len=Math.hypot(dx,dy);if(len){dx/=len;dy/=len;s.facing=Math.abs(dx)>Math.abs(dy)?dx>0?'RIGHT':'LEFT':dy>0?'FRONT':'BACK';}else{s.moving=false;s.phase='IDLE';s.gaitDistance=0;s.blocked=false;return s;}
const wasMoving=s.moving;const distance=CONFIG.speed*dt,n=Math.ceil(distance/CONFIG.maxSubstep);let moved=0;
for(let i=0;i<n;i++){const oldX=s.x,oldY=s.y,vx=dx*distance/n,vy=dy*distance/n;let nx=s.x+vx,ny=s.y+vy;if(transitionAllowed(s.x,s.y,nx,ny)){s.x=nx;s.y=ny;}else if(vx&&transitionAllowed(s.x,s.y,s.x+vx,s.y)){s.x+=vx;}else if(vy&&transitionAllowed(s.x,s.y,s.x,s.y+vy)){s.y+=vy;}const stepMoved=Math.hypot(s.x-oldX,s.y-oldY);if(stepMoved){s.lastMotionSegments.push([[oldX,oldY],[s.x,s.y]]);s.lastMotionTimeline.push({from:[oldX,oldY],to:[s.x,s.y],t0:i/n,t1:(i+1)/n});moved+=stepMoved;}}

s.moving=moved>.000001;s.blocked=!s.moving;if(s.moving){if(!wasMoving)s.gaitDistance=0;s.gaitDistance+=moved;s.totalDistance+=moved;s.phase=CONFIG.cycle[Math.floor(s.gaitDistance/CONFIG.phaseDistance)%4];}else{s.gaitDistance=0;s.phase='IDLE';}s.surface=surfaceAt(s.x,s.y);s.elevation=s.surface==='upper'?1:s.surface==='stair'?1-stairProgress(s.x,s.y):0;return s;}
export function frameKey(s){return s.facing+'.'+(s.moving?s.phase:'IDLE');}
export {geometry,FOOT_OFFSETS};
