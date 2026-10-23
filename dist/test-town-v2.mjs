import {drawFurnishedRoom,onInteriorArtReady} from './interior-art.mjs';
const $=selector=>/** @type {any} */(document.querySelector(selector));
const $$=selector=>/** @type {any[]} */([...document.querySelectorAll(selector)]);

export const TILE=48;
export const VIEW=Object.freeze({width:960,height:540,tilesWide:20,tilesHigh:11.25});
export const MAP=Object.freeze({width:28,height:18,pixelWidth:1344,pixelHeight:864});
export const PLAYER=Object.freeze({width:48,height:72,footX:24,footY:72,collisionWidth:24,collisionHeight:18,speed:174});
export const ASSET_KEYS=Object.freeze(['grass','path','tall-grass','water','flowers','fence','bush','tree','house','ecocenter']);
export const BUILDINGS=Object.freeze([
  {id:'house',x:5,y:4,w:6,h:4,doorX:8.5,doorY:8,interior:'home'},
  {id:'ecocenter',x:15,y:4.5,w:7,h:4.5,doorX:18.5,doorY:9,interior:'lab'}
]);
export const NPCS=Object.freeze([
  {id:'neighbor',name:'마을 주민',x:10.5,y:9.5,gender:'girl',facing:'down',text:'바닷바람이 불어오는 날에는\n풀잎 소리가 더 또렷하게 들려요.'},
  {id:'researcher',name:'생태 연구원',x:19.5,y:11.5,gender:'boy',facing:'left',text:'이 마을은 새 시각 규격을 확인하는 시험 구역이에요.\n길과 건물의 크기를 천천히 살펴봐 주세요.'}
]);
const TREE_POS=Object.freeze([[1,1],[3,1],[9,1],[17,1],[20,2],[22,1],[25,2],[1,5],[3,6],[22,6],[24,6],[1,12],[2,15],[10,12],[15,13],[15,15]]);
const FENCE_POS=Object.freeze([...Array.from({length:5},(_,i)=>[i+5,12]),...Array.from({length:5},(_,i)=>[i+5,14])]);

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function cameraFor(x,y){
  return {x:Math.round(clamp(x-VIEW.width/2,0,MAP.pixelWidth-VIEW.width)),y:Math.round(clamp(y-VIEW.height/2,0,MAP.pixelHeight-VIEW.height))};
}
export function playerBox(x,y){return {left:x-12,right:x+12,top:y-18,bottom:y}}
const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
export function staticBoxes(){
  const boxes=[
    {left:0,top:0,right:MAP.pixelWidth,bottom:TILE},{left:0,top:MAP.pixelHeight-TILE,right:MAP.pixelWidth,bottom:MAP.pixelHeight},
    {left:0,top:0,right:TILE,bottom:MAP.pixelHeight},{left:MAP.pixelWidth-TILE,top:0,right:MAP.pixelWidth,bottom:MAP.pixelHeight},
    {left:21*TILE,top:13*TILE,right:MAP.pixelWidth-TILE,bottom:MAP.pixelHeight-TILE}
  ];
  for(const b of BUILDINGS){
    boxes.push({left:b.x*TILE,top:b.y*TILE,right:b.doorX*TILE-TILE/2,bottom:b.doorY*TILE});
    boxes.push({left:b.doorX*TILE+TILE/2,top:b.y*TILE,right:(b.x+b.w)*TILE,bottom:b.doorY*TILE});
    boxes.push({left:b.doorX*TILE-TILE/2,top:b.y*TILE,right:b.doorX*TILE+TILE/2,bottom:(b.doorY-1)*TILE});
  }
  for(const n of NPCS)boxes.push({left:n.x*TILE-12,top:n.y*TILE-18,right:n.x*TILE+12,bottom:n.y*TILE});
  for(const [x,y] of TREE_POS)boxes.push({left:(x+.35)*TILE,top:(y+1.25)*TILE,right:(x+1.65)*TILE,bottom:(y+2)*TILE});
  for(const [x,y] of FENCE_POS)boxes.push({left:x*TILE,top:(y+.3)*TILE,right:(x+1)*TILE,bottom:(y+.8)*TILE});
  for(let x=1;x<27;x++)boxes.push({left:x*TILE,top:TILE,right:(x+1)*TILE,bottom:2*TILE});
  return boxes;
}
export function canOccupy(x,y,boxes=staticBoxes()){const p=playerBox(x,y);return x>=TILE&&x<=MAP.pixelWidth-TILE&&y>=TILE&&y<=MAP.pixelHeight-TILE&&!boxes.some(b=>overlaps(p,b))}
export function movePoint(point,dx,dy,boxes=staticBoxes()){
  let x=point.x,y=point.y;if(canOccupy(x+dx,y,boxes))x+=dx;if(canOccupy(x,y+dy,boxes))y+=dy;return {x,y};
}
export function doorAt(x,y){return BUILDINGS.find(b=>Math.abs(x-b.doorX*TILE)<=18&&y>=b.doorY*TILE-8&&y<=b.doorY*TILE+22)??null}

const state={scene:'town',gender:'boy',x:14.5*TILE,y:9.5*TILE,facing:'down',walkTime:0,dialogue:null,menu:false,regionUntil:0,restore:null,errors:[]};
const held=new Set(),pendingDirections=new Set();/** @type {HTMLCanvasElement} */let canvas;/** @type {CanvasRenderingContext2D} */let ctx;let last=0,assets={};
const spriteName=(gender,facing,frame)=>`${gender}_${facing}_${frame}.svg`;
export function assetManifest(base='./assets/test-town-v2/'){const out={};for(const key of ASSET_KEYS)out[key]=`${base}${key}.svg`;for(const g of ['boy','girl'])for(const f of ['front','back','left','right'])for(let i=0;i<3;i++)out[spriteName(g,f,i)]=`${base}${spriteName(g,f,i)}`;return out}
function loadAssets(){for(const [key,src] of Object.entries(assetManifest())){const image=new Image();image.src=src;image.onerror=()=>state.errors.push(`asset:${key}`);assets[key]=image}}
const ready=key=>assets[key]?.complete&&assets[key].naturalWidth;
function tile(key,x,y,w=TILE,h=TILE){if(ready(key))ctx.drawImage(assets[key],Math.round(x),Math.round(y),w,h)}
function ground(){
  for(let y=0;y<MAP.height;y++)for(let x=0;x<MAP.width;x++)tile(x>=21&&y>=13?'water':'grass',x*TILE,y*TILE);
  for(let x=4;x<=13;x++)for(let y=9;y<=11;y++)tile('path',x*TILE,y*TILE);
  for(let x=14;x<=23;x++)for(let y=10;y<=12;y++)tile('path',x*TILE,y*TILE);
  for(let x=13;x<=15;x++)for(let y=9;y<=12;y++)tile('path',x*TILE,y*TILE);
  for(let x=7;x<=9;x++)for(let y=8;y<=11;y++)tile('path',x*TILE,y*TILE);
  for(let x=17;x<=19;x++)for(let y=9;y<=12;y++)tile('path',x*TILE,y*TILE);
  for(let x=11;x<=14;x++)for(let y=4;y<=6;y++)tile('tall-grass',x*TILE,y*TILE);
  for(let x=21;x<=23;x++)tile('path',x*TILE,12*TILE);
  for(const [x,y] of [[6,13],[8,13],[3,6],[12,15],[16,14],[23,7]])tile('flowers',x*TILE,y*TILE);
}
function drawActor(gender,x,y,facing,frame){const key=spriteName(gender,{down:'front',up:'back',left:'left',right:'right'}[facing],frame);if(ready(key))ctx.drawImage(assets[key],Math.round(x-24),Math.round(y-72),48,72)}
function depthJobs(){const jobs=FENCE_POS.map(([x,y])=>({y:(y+.8)*TILE,draw:()=>tile('fence',x*TILE,y*TILE)}));for(const [x,y] of TREE_POS)jobs.push({y:(y+2)*TILE,draw:()=>tile('tree',x*TILE,y*TILE,96,96)});jobs.push({y:8*TILE,draw:()=>tile('house',5*TILE,4*TILE,288,192)},{y:9*TILE,draw:()=>tile('ecocenter',15*TILE,4.5*TILE,336,216)});for(const actor of [...NPCS.map(n=>({...n,x:n.x*TILE,y:n.y*TILE,frame:0})),{gender:state.gender,x:state.x,y:state.y,facing:state.facing,frame:state.walkTime?1+Math.floor(state.walkTime*8)%2:0}])jobs.push({y:actor.y,draw:()=>drawActor(actor.gender,actor.x,actor.y,actor.facing,actor.frame)});return jobs.sort((a,b)=>a.y-b.y)}
function renderTown(){const cam=cameraFor(state.x,state.y);ctx.save();ctx.translate(-cam.x,-cam.y);ground();for(const job of depthJobs())job.draw();ctx.restore()}
function renderInterior(){ctx.fillStyle='#10191b';ctx.fillRect(0,0,960,540);ctx.save();ctx.translate(75,0);ctx.scale(3.375,3.375);drawFurnishedRoom(ctx,state.scene);ctx.restore();drawActor(state.gender,480,516,state.facing,state.walkTime?1:0)}
function draw(){ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,960,540);state.scene==='town'?renderTown():renderInterior();publishQa()}
function pages(text,max=62){const words=[...text];const lines=[];let line='';for(const ch of words){if(ch==='\n'||line.length>=20){lines.push(line);line='';if(ch==='\n')continue}line+=ch}if(line)lines.push(line);const result=[];for(let i=0;i<lines.length;i+=3)result.push(lines.slice(i,i+3).join('\n'));return result.length?result:['']}
function openDialogue(name,text){state.dialogue={name,pages:pages(text),page:0};$('#dialogue-name').textContent=name;$('#dialogue-text').textContent=state.dialogue.pages[0];$('#dialogue').hidden=false}
function showRegion(){const node=$('#region');node.textContent='TEST TOWN';node.style.animation='none';void node.offsetWidth;node.style.animation='region 1.8s both'}
function showInteriorLabel(){const node=$('#region');node.textContent='기존 실내 참고 화면 · Z / Enter 또는 A로 나가기';node.style.animation='none';node.style.opacity='1'}
function advance(){if(state.dialogue){if(++state.dialogue.page<state.dialogue.pages.length){$('#dialogue-text').textContent=state.dialogue.pages[state.dialogue.page];return}state.dialogue=null;$('#dialogue').hidden=true;return}if(state.menu){const panel=$('#settings').hidden?$('#menu'):$('#settings'),buttons=[...panel.querySelectorAll('button')].filter(button=>!button.hidden),target=panel.contains(document.activeElement)?document.activeElement:buttons[0];target?.click();return}if(state.scene!=='town'){state.scene='town';state.x=state.restore.x;state.y=state.restore.y;state.facing='down';showRegion();return}const d=doorAt(state.x,state.y);if(d){state.restore={x:d.doorX*TILE,y:d.doorY*TILE+TILE};state.scene=d.interior;state.x=480;state.y=516;state.facing='up';showInteriorLabel();return}const facing={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[state.facing];const n=NPCS.find(n=>Math.hypot(n.x*TILE-(state.x+facing[0]*TILE),n.y*TILE-(state.y+facing[1]*TILE))<42);if(n)openDialogue(n.name,n.text)}
function closeMenu(){state.menu=false;held.clear();$('#menu').hidden=true;$('#settings').hidden=true;canvas.focus()}
function toggleMenu(){if(state.dialogue)return;if(state.menu)return closeMenu();held.clear();state.menu=true;$('#settings').hidden=true;$('#menu').hidden=false;$('#menu button').focus()}
export function consumeDirectionInput(heldInput,pendingInput){let dx=0,dy=0;const active=direction=>heldInput.has(direction)||pendingInput.has(direction);if(active('left'))dx--;if(active('right'))dx++;if(active('up'))dy--;if(active('down'))dy++;const releasedTap=pendingInput.size>0&&![...pendingInput].some(direction=>heldInput.has(direction));pendingInput.clear();if(dx&&dy){dx*=Math.SQRT1_2;dy*=Math.SQRT1_2}return {dx,dy,releasedTap}}
function face(direction){if(state.scene==='town'&&!state.dialogue&&!state.menu)state.facing=direction}
function press(direction,fresh=true){held.add(direction);if(fresh)pendingDirections.add(direction);face(direction)}
function frame(now){let dt=Math.min(.04,(now-last)/1000||0);last=now;if(state.scene==='town'&&!state.dialogue&&!state.menu){const {dx,dy,releasedTap}=consumeDirectionInput(held,pendingDirections);if(dx||dy){if(releasedTap)dt=Math.max(dt,1/60);const p=movePoint(state,dx*PLAYER.speed*dt,dy*PLAYER.speed*dt);state.x=p.x;state.y=p.y;state.walkTime+=dt}else state.walkTime=0}else pendingDirections.clear();draw();requestAnimationFrame(frame)}
const directions={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
function down(e){
 if(state.menu){e.preventDefault();if(e.repeat)return;const panel=$('#settings').hidden?$('#menu'):$('#settings'),buttons=[...panel.querySelectorAll('button')].filter(button=>!button.hidden),index=Math.max(0,buttons.indexOf(document.activeElement));if(directions[e.code])buttons[(index+(['up','left'].includes(directions[e.code])?-1:1)+buttons.length)%buttons.length]?.focus();else if(e.code==='KeyZ'||e.code==='Enter')buttons[index]?.click();else if(e.code==='Escape'||e.code==='KeyX')closeMenu();return}
 if(directions[e.code]){e.preventDefault();press(directions[e.code],!e.repeat);return}if((e.code==='KeyZ'||e.code==='Enter')&&!e.repeat){e.preventDefault();advance()}else if((e.code==='Escape'||e.code==='KeyX')&&!e.repeat){e.preventDefault();state.dialogue?(state.dialogue=null,$('#dialogue').hidden=true):toggleMenu()}else if(e.code==='KeyH'&&!e.repeat){e.preventDefault();openDialogue('도움말','이동: 방향키 / WASD\n결정: Z / Enter\n취소: X / Esc · 도움말: H')}}
function publishQa(){if(!new URLSearchParams(location.search).has('qa'))return;const cam=cameraFor(state.x,state.y),qa={player:{x:+state.x.toFixed(2),y:+state.y.toFixed(2),facing:state.facing,gender:state.gender},camera:cam,tile:TILE,frame:{width:canvas.width,height:canvas.height},building:BUILDINGS.map(({id,x,y,w,h,doorX,doorY})=>({id,x,y,w,h,doorX,doorY})),occupancy:canOccupy(state.x,state.y),scene:state.scene,input:{held:[...held],pending:[...pendingDirections]},ui:{menu:!$('#menu').hidden,settings:!$('#settings').hidden,dialogue:!$('#dialogue').hidden},errors:[...new Set(state.errors)]};document.documentElement.dataset.testTownQa=JSON.stringify(qa)}
export function boot(){canvas=$('#town');ctx=canvas.getContext('2d');loadAssets();onInteriorArtReady(draw);addEventListener('error',e=>{state.errors.push(e.message||'page error');publishQa()});addEventListener('unhandledrejection',e=>{state.errors.push(String(e.reason?.message||e.reason));publishQa()});addEventListener('keydown',down);addEventListener('keyup',e=>directions[e.code]&&held.delete(directions[e.code]));addEventListener('blur',()=>held.clear());$$('[data-dir]').forEach(b=>{const stop=e=>held.delete(b.dataset.dir);b.onpointerdown=e=>{e.preventDefault();press(b.dataset.dir,true);b.setPointerCapture(e.pointerId)};b.onpointerup=stop;b.onpointercancel=stop});$('#touch-a').onclick=advance;$('#touch-b').onclick=()=>state.dialogue?(state.dialogue=null,$('#dialogue').hidden=true):toggleMenu();$('#touch-menu').onclick=toggleMenu;$$('[data-menu-copy]').forEach(b=>b.onclick=()=>{const [name,text]=b.dataset.menuCopy.split('|');closeMenu();openDialogue(name,text)});$('[data-settings]').onclick=()=>{$('#menu').hidden=true;$('#settings').hidden=false;$('#settings [data-gender]').focus()};$$('[data-gender]').forEach(b=>b.onclick=()=>{state.gender=b.dataset.gender;closeMenu()});$$('[data-menu-close]').forEach(b=>b.onclick=closeMenu);$('[data-settings-back]').onclick=()=>{$('#settings').hidden=true;$('#menu').hidden=false};requestAnimationFrame(frame)}
if(typeof document!=='undefined')boot();
