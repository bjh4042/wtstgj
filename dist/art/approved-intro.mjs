import {INTRO_ART} from './approved-intro-bindings.mjs';
import {browserImageLoader} from '../asset-runtime.mjs';
import {drawApprovedPlayer,loadApprovedPlayers} from './approved-player-field.mjs';
const labels={canonicalHarin:'하린',canonicalYoon:'윤 박사',researcher:'윤 연구원',boy:'남자아이 탐험가',girl:'여자아이 탐험가'};
export function approvedStandingPortrait(role){
 if(!labels[role])return '<span class="standing-portrait standing-unresolved" aria-hidden="true"></span>';
 return `<span class="standing-portrait standing-${role}" role="img" aria-label="${labels[role]}"></span>`;
}
export function approvedDialoguePortrait(role){const a=INTRO_ART[`${role}_dialogue`];return a?`<img class="approved-dialogue-portrait" src="${a.src}" alt="${labels[role]}">`:'';}
export function approvedMenuArt(){return '<picture><source media="(orientation:portrait)" srcset="./assets/approved-title/mobile.png"><img src="./assets/approved-title/desktop.png" alt="거제 해변의 생태몬"></picture>';}
const images=new Map();const latestWorld=new WeakMap();let activeCanvas=null;let repaintGeneration=0;let ready;
export function loadApprovedIntro(){return Promise.all([loadApprovedPlayers(),ready??=Promise.all([...Object.entries(INTRO_ART).filter(([k])=>!['researcher','boy','girl'].includes(k)&&!k.endsWith('_dialogue')).map(async([k,a])=>{try{images.set(k,await browserImageLoader(a.src))}catch{/* Never substitute unknown artwork. */}})])]);}
function fit(c,key,x,y,w,h){const im=images.get(key),a=INTRO_ART[key];if(!im)return;const [l,t,r,b]=a.bounds,sw=r-l,sh=b-t,s=Math.min(w/sw,h/sh);c.drawImage(im,l,t,sw,sh,x+(w-sw*s)/2,y+h-sh*s,sw*s,sh*s);}
function tiles(c,key,x,y,w,h,size=16){const im=images.get(key);if(!im)return;for(let yy=y;yy<y+h;yy+=size)for(let xx=x;xx<x+w;xx+=size){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.drawImage(im,xx,yy,size,size);c.restore();}}
function building(c,x,y,w,h){fit(c,'wall',x,y+10,w,h-10);fit(c,'roof',x-3,y,w+6,18);fit(c,'window',x+7,y+20,12,12);fit(c,'window',x+w-19,y+20,12,12);fit(c,'door',x+w/2-6,y+h-20,12,20);}
export function drawApprovedIntroWorld(canvas,world){
 const c=canvas?.getContext?.('2d');if(!c||!world)return;latestWorld.set(canvas,world);activeCanvas=canvas;
 c.setTransform(canvas.width/240,0,0,canvas.height/160,0,0);c.clearRect(0,0,240,160);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 c.fillStyle='#e7eee4';c.fillRect(0,0,240,160);
 if(world.scene==='town'){
  tiles(c,'grass',0,0,240,160);tiles(c,'path',100,16,40,128);tiles(c,'path',16,64,208,16);tiles(c,'path',40,128,100,16);
  for(let x=0;x<240;x+=24)for(const y of [-5,137]){fit(c,'tree',x-5,y,30,32);fit(c,'treeTop',x-5,y,30,32);}
  for(const x of [-8,220])for(let y=20;y<135;y+=26){fit(c,'tree',x,y,30,32);fit(c,'treeTop',x,y,30,32);}
  fit(c,'center',78,0,84,64);fit(c,'centerTop',78,0,84,64);fit(c,'door',112,44,16,20);
  building(c,24,81,64,47);building(c,160,81,64,47);
 }else{
  tiles(c,world.scene==='lab'?'floor':'wood',16,16,208,128);
  for(let x=16;x<224;x+=32)fit(c,'wall',x,-3,32,21);
  for(const x of [6,220])for(let y=16;y<144;y+=24)fit(c,'plant',x,y,14,22);
  if(world.scene==='lab'){
   for(const x of [20,61,151,188])fit(c,'shelf',x,13,31,24);
   for(const x of [32,88,160])fit(c,'bench',x,45,48,35);
   for(const x of [22,183])fit(c,'terminal',x,111,32,25);
  }else if(world.scene==='room'){
   fit(c,'desk',32,16,48,32);fit(c,'terminal',40,15,23,25);fit(c,'shelf',160,16,48,32);
   fit(c,'bed',16,80,32,48);fit(c,'plant',179,97,29,31);fit(c,'stairs',108,126,24,18);
  }else{
   fit(c,'desk',16,32,64,32);fit(c,'chair',29,45,25,23);fit(c,'shelf',144,16,64,32);fit(c,'desk',160,65,48,30);fit(c,'stairs',108,16,24,30);
  }
  fit(c,'door',110,130,20,16);
 }
 drawApprovedPlayer(c,{appearance:world.gender,x:world.x*16+8,y:world.y*16+14,visibleHeight:23,facing:world.facing,moving:Number.isInteger(world.walkFrame),walk:(world.walkFrame??world.steps%2)*26});
 const generation=repaintGeneration;loadApprovedIntro().then(()=>{if(generation===repaintGeneration&&canPaintIntro(canvas)&&!canvas.dataset.approvedIntroReady){canvas.dataset.approvedIntroReady='1';drawApprovedIntroWorld(canvas,latestWorld.get(canvas))}});
}

function canPaintIntro(canvas){return !!canvas&&canvas===activeCanvas&&canvas.isConnected&&canvas.ownerDocument?.visibilityState!=='hidden'&&canvas.ownerDocument?.getElementById('opening-world')===canvas&&canvas.closest?.('dialog')?.open!==false}
export function invalidateApprovedIntroRepaints(){repaintGeneration++}
/** Retry repaint only the still-current connected opening scene; no UI/game mutation.
 * @param {{isActive?:()=>boolean}} [options]
 */
export async function repaintApprovedIntroAfterRetry({isActive=()=>true}={}){
 const canvas=activeCanvas,world=canvas&&latestWorld.get(canvas),generation=repaintGeneration;
 if(!world||!canPaintIntro(canvas)||!isActive())return false;
 await loadApprovedIntro();
 if(generation!==repaintGeneration||!isActive()||!canPaintIntro(canvas))return false;
 drawApprovedIntroWorld(canvas,latestWorld.get(canvas));return true;
}
