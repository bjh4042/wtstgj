import {drawFieldFollower} from './follower-render.mjs';
export const SLICE_SAVE_KEY='geoje.monsters.vertical-slice.v1';
export const TILE=32,WIDTH=960,HEIGHT=540;

import {SLICE_ASSET_IDS} from './asset-manifest.mjs';
import {loadAsset} from './asset-runtime.mjs';
const images={};
if(typeof Image!=='undefined')for(const [key,id] of Object.entries(SLICE_ASSET_IDS))loadAsset(id).then(a=>{images[key]=a.image});

const terrain=Array.from({length:17},(_,y)=>Array.from({length:30},(_,x)=>{
 if(x>=23&&x<=26&&y>=2&&y<=4)return'tall';
 if(x>=6&&x<=9&&y>=8&&y<=10)return'tall';
 if(x>=19&&y>=13)return'water';
 if(x>=19&&y===12)return'sand';
 if((x>=3&&x<=25&&y>=6&&y<=7)||(x>=11&&x<=12&&y>=4&&y<=15)||(x>=17&&x<=22&&y>=10&&y<=12))return'dirt';
 return'grass';
}));
const buildings=[
 {kind:'ecocenter',x:128,y:48,doorX:208,label:'생태센터'},
 {kind:'house',x:481,y:48,doorX:560,label:'마을회관'},
 {kind:'laboratory',x:669,y:176,doorX:720,label:'생태 연구소'}
];
const trees=[...Array.from({length:15},(_,i)=>({x:i*64,y:-8})),...Array.from({length:8},(_,i)=>({x:0,y:56+i*64})),{x:884,y:62},{x:884,y:126},{x:884,y:198},{x:812,y:300},{x:434,y:410},{x:498,y:450}];
const bushes=[{x:102,y:171},{x:284,y:170},{x:484,y:166},{x:628,y:166},{x:612,y:292},{x:800,y:291},{x:139,y:410},{x:288,y:410}];
const npcs=[{x:368,y:226,name:'해설가',text:'이 길을 따라가면 생태센터와 연구소를 만날 수 있어요.'},{x:464,y:354,name:'숲지기',text:'짙은 풀숲에서는 야생 생태몬을 만날 수 있어요. 아일볼도 준비해 두세요!'},{x:752,y:418,name:'어부',text:'거제의 숲과 바다는 서로 이어진 생태계예요. 물가에서는 천천히 걸어 주세요.'}];

export function createSlice(saved=null){
 const base={version:1,scene:'outdoor',x:400,y:450,facing:'back',outdoor:{x:400,y:450},steps:0,updatedAt:Date.now()};
 if(!saved||saved.version!==1)return base;
 return {...base,...saved,outdoor:{...base.outdoor,...saved.outdoor}};
}
export function serializeSlice(slice){return {version:1,scene:slice.scene,x:Math.round(slice.x),y:Math.round(slice.y),facing:slice.facing,outdoor:slice.outdoor,steps:slice.steps,updatedAt:Date.now()}}
const rectHit=(x,y,r)=>x+9>r.x&&x-9<r.x+r.w&&y>r.y&&y-16<r.y+r.h;
export function walkable(slice,x,y){
 if(slice.scene==='interior')return x>=272&&x<=688&&y>=154&&y<=492&&!rectHit(x,y,{x:390,y:220,w:180,h:76})&&!rectHit(x,y,{x:286,y:170,w:80,h:54})&&!rectHit(x,y,{x:594,y:170,w:80,h:54});
 if(x<35||x>925||y<52||y>517)return false;
 if(terrain[Math.min(16,Math.floor(y/TILE))]?.[Math.min(29,Math.floor(x/TILE))]==='water')return false;
 for(const b of buildings){if(rectHit(x,y,{x:b.x+8,y:b.y+58,w:b.kind==='house'?112:144,h:102}))return false}
 for(const t of trees){if(rectHit(x,y,{x:t.x+7,y:t.y+33,w:50,h:30}))return false}
 for(const b of bushes){if(rectHit(x,y,{x:b.x+2,y:b.y+13,w:28,h:18}))return false}
 return true;
}
export function moveSlice(slice,direction,distance){
 const dx={left:-1,right:1}[direction]??0,dy={up:-1,down:1}[direction]??0;
 slice.facing={up:'back',down:'front',left:'left',right:'right'}[direction];
 const nx=slice.x+dx*distance,ny=slice.y+dy*distance;
 if(walkable(slice,nx,ny)){slice.x=nx;slice.y=ny;slice.steps+=distance/TILE;return true}return false;
}
export function zoneAt(slice){if(slice.scene!=='outdoor')return'interior';return terrain[Math.floor(slice.y/TILE)]?.[Math.floor(slice.x/TILE)]??'grass'}
export function interactAt(slice){
 if(slice.scene==='interior'&&slice.y>474){slice.scene='outdoor';slice.x=slice.outdoor.x;slice.y=slice.outdoor.y;return{type:'exit'}}
 if(slice.scene==='interior'){
  if(Math.hypot(slice.x-480,slice.y-338)<64)return{type:'dialogue',name:'윤 연구원',text:'관찰 기록은 전투와 포획 뒤에도 자동으로 보존돼요. 출구는 아래쪽입니다.'};
  return{type:'dialogue',name:'연구소 안내',text:'표본대와 선반 사이 통로를 따라 걸어 보세요. 아래쪽 계단으로 나갈 수 있습니다.'};
 }
 for(const n of npcs)if(Math.hypot(slice.x-n.x,slice.y-n.y)<58)return{type:'dialogue',...n};
 for(const b of buildings)if(Math.abs(slice.x-b.doorX)<30&&slice.y>b.y+142&&slice.y<b.y+205){
  slice.outdoor={x:slice.x,y:slice.y+18};slice.scene='interior';slice.x=480;slice.y=458;return{type:'enter',label:b.label};
 }
 if(zoneAt(slice)==='tall')return{type:'grass'};
 return{type:'dialogue',name:'탐험 수첩',text:'사람이나 건물 입구를 바라보고 Z 또는 Enter를 눌러 보세요.'};
}
function tile(ctx,key,x,y){const im=images[key];if(im&&(im.complete&&im.naturalWidth||im.getContext))ctx.drawImage(im,x,y)}
function player(ctx,key,x,y){const im=images[key];if(im&&(im.complete&&im.naturalWidth||im.getContext))ctx.drawImage(im,Math.round(x-16),Math.round(y-44))}
function drawOutdoor(ctx,slice,follower){
 for(let y=0;y<17;y++)for(let x=0;x<30;x++)tile(ctx,terrain[y][x],x*TILE,y*TILE);
 const layers=[...buildings.map(value=>({depth:value.y+160,draw:()=>tile(ctx,value.kind,value.x,value.y)})),...trees.map(value=>({depth:value.y+64,draw:()=>tile(ctx,'tree',value.x,value.y)})),...bushes.map(value=>({depth:value.y+32,draw:()=>tile(ctx,'bush',value.x,value.y)})),...npcs.map(value=>({depth:value.y,draw:()=>player(ctx,'girl_front',value.x,value.y)})),{depth:slice.y,draw:()=>player(ctx,'boy_'+slice.facing,slice.x,slice.y)}];
 if(follower?.visible)layers.push({depth:follower.y,draw:()=>drawFieldFollower(ctx,follower,{unitScale:.4})});
 layers.sort((a,b)=>a.depth-b.depth).forEach(layer=>layer.draw());
 ctx.fillStyle='#263c3b';ctx.font='24px Galmuri11Bold,monospace';ctx.fillText('고현 생태마을',24,516);
}
function drawInterior(ctx,slice,follower){
 ctx.fillStyle='#315b53';ctx.fillRect(0,0,WIDTH,HEIGHT);
 for(let y=128;y<512;y+=32)for(let x=256;x<704;x+=32)tile(ctx,'floor',x,y);
 for(let x=256;x<704;x+=32)tile(ctx,'wall',x,128);
 tile(ctx,'shelf',288,174);tile(ctx,'shelf',608,174);tile(ctx,'table',416,220);tile(ctx,'table',480,220);tile(ctx,'chair',464,292);tile(ctx,'stairs',464,476);
 player(ctx,'girl_front',480,354);if(follower?.y<=slice.y)drawFieldFollower(ctx,follower,{unitScale:.4});player(ctx,'boy_'+slice.facing,slice.x,slice.y);if(follower?.y>slice.y)drawFieldFollower(ctx,follower,{unitScale:.4});
 ctx.fillStyle='#fff9e5';ctx.font='24px Galmuri11Bold,monospace';ctx.fillText('생태 연구소 · 표본실',24,48);
}
export function drawSlice(ctx,slice,follower=null){
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,WIDTH,HEIGHT);slice.scene==='interior'?drawInterior(ctx,slice,follower):drawOutdoor(ctx,slice,follower);ctx.restore();
}
