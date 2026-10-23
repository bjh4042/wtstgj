import {drawApprovedIntroWorld} from './art/approved-intro.mjs';
const TILE=16;
const WIDTH=15;
const HEIGHT=10;
const SCENES=Object.freeze({
 room:Object.freeze({start:{x:4,y:3},exit:{x:7,y:8},blocked:['2,1','3,1','4,1','2,2','3,2','4,2','10,1','11,1','12,1','10,2','11,2','12,2','1,5','2,5','1,6','2,6','1,7','2,7','11,6','12,6','11,7','12,7']}),
 home:Object.freeze({start:{x:7,y:3},exit:{x:7,y:8},blocked:['1,2','2,2','3,2','4,2','1,3','2,3','3,3','4,3','9,1','10,1','11,1','12,1','13,1','9,2','10,2','11,2','12,2','13,2','10,4','11,4','12,4','10,5','11,5','12,5']}),
 town:Object.freeze({start:{x:3,y:8},exit:{x:7,y:3},blocked:['5,1','6,1','7,1','8,1','9,1','5,2','6,2','7,2','8,2','9,2','5,3','6,3','8,3','9,3','1,5','2,5','3,5','4,5','5,5','10,5','11,5','12,5','13,5','1,6','2,6','3,6','4,6','5,6','10,6','11,6','12,6','13,6','1,7','2,7','3,7','4,7','5,7','10,7','11,7','12,7','13,7']}),
 lab:Object.freeze({start:{x:7,y:8},exit:null,blocked:['1,1','2,1','3,1','4,1','5,1','9,1','10,1','11,1','12,1','13,1','2,3','3,3','4,3','5,3','6,3','7,3','8,3','9,3','10,3','11,3','12,3','2,4','3,4','4,4','5,4','6,4','7,4','8,4','9,4','10,4','11,4','12,4','1,7','2,7','3,7','11,7','12,7','13,7','3,5','11,5']})
});

export function createIntroWorld(scene='room',gender='boy'){
 const spec=SCENES[scene]??SCENES.room;
 return {scene,gender,x:spec.start.x,y:spec.start.y,facing:'down',steps:0};
}

export function moveIntroWorld(world,direction){
 const delta={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[direction];
 if(!delta)return {world,event:null};
 const scene=SCENES[world.scene],next={...world,facing:direction};
 const x=world.x+delta[0],y=world.y+delta[1],key=`${x},${y}`;
 if(world.scene==='home'&&x===7&&y===2&&direction==='up')return {world:{...createIntroWorld('room',world.gender),x:7,y:7,facing:'up'},event:'stairs-up'};
 if(world.scene==='town'&&x===3&&y===7&&direction==='up')return {world:{...createIntroWorld('home',world.gender),x:7,y:7,facing:'up'},event:'home-enter'};
 if(world.scene==='lab'&&x===7&&y===9&&direction==='down')return {world:{...createIntroWorld('town',world.gender),x:7,y:4},event:'lab-exit'};
 if(x<1||x>=WIDTH-1||y<1||y>=HEIGHT-1||scene.blocked.includes(key)){
  if(world.scene==='town'&&direction==='down'&&y>=HEIGHT-1)return {world:next,event:'town-warning'};
  return {world:next,event:'blocked'};
 }
 next.x=x;next.y=y;next.steps=world.steps+1;
 if(world.scene==='room'&&x===scene.exit.x&&y===scene.exit.y)return {world:createIntroWorld('home',world.gender),event:'stairs'};
 if(world.scene==='home'&&x===scene.exit.x&&y===scene.exit.y)return {world:createIntroWorld('town',world.gender),event:'outside'};
 if(world.scene==='town'&&x===scene.exit.x&&y===scene.exit.y)return {world:createIntroWorld('lab',world.gender),event:'lab-enter'};
 return {world:next,event:null};
}

export function inspectIntroWorld(world){
 if(world.scene==='lab'&&world.y<=5&&world.x>=5&&world.x<=9)return 'starters';
 if(world.scene==='room'&&world.x<=4&&world.y<=3)return 'computer';
 if(world.scene==='home'&&world.x>=10&&world.y<=3)return 'family';
 if(world.scene==='town'&&world.y<=3)return 'lab-sign';
 return 'nothing';
}

export const drawIntroWorld=drawApprovedIntroWorld;

export const INTRO_SCENE_LABELS=Object.freeze({room:'내 방',home:'우리 집 1층',town:'고현 마을',lab:'거제 생태 연구소'});
