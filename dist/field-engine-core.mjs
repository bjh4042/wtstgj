import {BATTLE_ENTRY_TIMING} from './presentation/battle-transition.mjs';
import {encounterMovementHandler} from './encounter/field-hook.mjs';
import {coreSpatial} from './world/core-spatial.mjs';
// @ts-check
import {GOLDEN_MAP_DATA} from './golden-map-data.mjs';
import {FIELD_GRID,FIELD_MODES,NPC_MOVEMENT,QA_MAPS,inRect,terrainWalkable,behaviorAt,sightBlocked} from './field-behavior.mjs';
import {emitFieldEffect} from './field-animation.mjs';
/** @typedef {import('./field-behavior.mjs').Facing} Facing */
/** @typedef {{id:string,map:string,x:number,y:number,homeX:number,homeY:number,facing:Facing,homeFacing:Facing,movement:string,wait:number,target:null|{x:number,y:number},waypoints:number[][],waypoint:number,range:number,walk:number,moving:boolean,paused:boolean,trainer:boolean,sightRange:number,defeated:boolean,sightCooldown:number,battleId:string,dialogue:string,afterDialogue:string,action:string,body:number[],sprite:string}} FieldNPC */
/** @typedef {{kind:string,elapsed:number,duration:number,phase:string,npcId?:string,fromX?:number,fromY?:number,toX?:number,toY?:number}} Sequence */
/** @typedef {{kind:'wild'|'trainer',trainerId?:string,battleId?:string}} BattleRequest */
/** @typedef {{mode:string,lock:string|null,sequence:Sequence|null,npcs:FieldNPC[],defeated:string[],dialogueNPC:string|null,steps:number,stepDistance:number,encounterChecks:number,encounterGrace:number,lastCheckedStep:number,pendingBattle:BattleRequest|null,battleReady:boolean,returnPoint:null|{scene:string,x:number,y:number,facing:Facing},jumpOffset:number,area:null|{name:string,age:number},warnings:string[],qa:boolean,scenario:string,seed:number}} FieldCore */
/** @typedef {{x:number,y:number,scene:string,facing:Facing,walk:number,moving:boolean,menu:number|null,dialogue:string[],dialogueIndex:number,transition:any,core:FieldCore}} CorePlayer */
export const CORE_TIMING=Object.freeze({notice:BATTLE_ENTRY_TIMING.notice,encounter:BATTLE_ENTRY_TIMING.fieldEffect+BATTLE_ENTRY_TIMING.transition,ledge:440,area:2200,npcPause:1600,npcSpeed:96});
/** @param {any} data @returns {FieldNPC} */
function npc(data){return {id:data.id,map:data.map,x:data.x,y:data.y,homeX:data.x,homeY:data.y,facing:data.facing??'down',homeFacing:data.facing??'down',movement:data.movement??NPC_MOVEMENT.FACE_FIXED,wait:1000,target:null,waypoints:data.waypoints??[],waypoint:0,range:data.range??96,walk:0,moving:false,paused:false,trainer:false,sightRange:5,defeated:false,sightCooldown:0,battleId:'qa_trainer',dialogue:data.dialogue??'함께 숲과 바다를 살펴봐요.',afterDialogue:'좋은 탐험이었어요. 다시 만나 반가워요!',action:data.action??'',body:data.body??[-30,-24,60,28],sprite:data.sprite??'native',...data}}
/** @param {any} saved @param {{qa?:boolean,scenario?:string,movement?:string}} options @returns {FieldCore} */
export function createFieldCore(saved=null,options={}){
 const defeated=Array.isArray(saved?.defeatedTrainers)?saved.defeatedTrainers.filter(x=>typeof x==='string'&&x.length<100):[];
 const npcs=GOLDEN_MAP_DATA.entities.map(n=>npc({id:n.id,map:n.map,x:n.position[0],y:n.position[1],facing:n.facing,dialogue:n.dialogue,action:n.action,body:n.id==='npc_left'?[-45,-29,90,34]:n.id==='npc_fishing'?[-48,-29,92,32]:[-30,-24,60,24]}));
 if(options.qa){const trainer=['trainer','blocked'].includes(options.scenario??'');npcs.push(npc({id:'qa_observer',map:'qa_a',x:trainer?648:528,y:trainer?384:480,facing:options.scenario==='blocked'?'right':trainer?'down':'right',movement:trainer?'FACE_FIXED':Object.values(NPC_MOVEMENT).some(m=>m===options.movement)?options.movement:'PATROL',trainer,sightRange:6,battleId:'qa_observer',sprite:'player-atlas',waypoints:[[528,480],[624,480]],dialogue:'연습 대결을 시작해 볼까요?',body:[-22,-16,44,24]}))}
 for(const n of npcs)n.defeated=defeated.includes(n.id);
 return {mode:FIELD_MODES.WALK,lock:null,sequence:null,npcs,defeated,dialogueNPC:null,steps:0,stepDistance:0,encounterChecks:0,encounterGrace:2,lastCheckedStep:0,pendingBattle:null,battleReady:false,returnPoint:null,jumpOffset:0,area:null,warnings:[],qa:!!options.qa,scenario:options.scenario??'',seed:1701};
}
/** @param {FieldCore} core */
function random(core){core.seed=(Math.imul(core.seed,1664525)+1013904223)>>>0;return core.seed/4294967296}
/** @param {CorePlayer} s @param {string} reason */
export function lockField(s,reason){s.core.lock=reason;s.core.mode=FIELD_MODES.SCRIPTED;s.moving=false}
/** @param {CorePlayer} s */
export function unlockField(s){s.core.lock=null;s.core.mode=FIELD_MODES.WALK;s.core.sequence=null;s.core.jumpOffset=0;s.moving=false}
/** @param {CorePlayer} s */
export const fieldInputLocked=s=>s.core.mode===FIELD_MODES.SCRIPTED||!!s.transition;
/** @param {CorePlayer} s @param {number} x @param {number} y @param {string} [ignore] */
export function coreWalkable(s,x,y,ignore=''){
 if(!(coreSpatial(s)?.walkable(s.scene,x,y)??terrainWalkable(s.scene,x,y)))return false;
 if(QA_MAPS[s.scene]?.ledges.some(l=>inRect(x,y,l.rect)))return false;
 return !s.core.npcs.some(n=>n.id!==ignore&&n.map===s.scene&&inRect(x,y,[n.x+n.body[0],n.y+n.body[1],n.body[2],n.body[3]]));
}
/** @param {number} dx @param {number} dy @returns {Facing} */
export function faceToward(dx,dy){return Math.abs(dx)>Math.abs(dy)?dx>=0?'right':'left':dy>=0?'down':'up'}
/** @param {Facing} d */
export const vector=d=>({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]})[d];
/** @param {CorePlayer} s @param {FieldNPC} n */
export function startNPCDialogue(s,n){s.core.dialogueNPC=n.id;n.paused=true;n.moving=false;n.target=null;n.facing=faceToward(s.x-n.x,s.y-n.y);s.facing=faceToward(n.x-s.x,n.y-s.y);lockField(s,'dialogue');return n.defeated?n.afterDialogue:n.dialogue}
/** @param {CorePlayer} s */
export function endNPCDialogue(s){const n=s.core.npcs.find(n=>n.id===s.core.dialogueNPC);if(n){n.paused=s.core.sequence?.kind==='trainer';n.wait=CORE_TIMING.npcPause;if(n.movement==='FACE_FIXED')n.facing=n.homeFacing} s.core.dialogueNPC=null;if(s.core.sequence?.kind==='trainer'&&s.core.sequence.phase==='dialogue'){beginEncounter(s,{kind:'trainer',trainerId:n?.id,battleId:n?.battleId});return}if(s.core.lock==='dialogue')unlockField(s)}
/** Grid line-of-sight plus sampled solid ray. @param {CorePlayer} s @param {FieldNPC} n */
export function trainerSees(s,n){
 if(n.sightCooldown>0||!n.trainer||n.defeated||n.map!==s.scene||n.paused)return false;
 const gx=Math.floor(s.x/FIELD_GRID),gy=Math.floor(s.y/FIELD_GRID),nx=Math.floor(n.x/FIELD_GRID),ny=Math.floor(n.y/FIELD_GRID),[dx,dy]=vector(n.facing);
 const distance=(gx-nx)*dx+(gy-ny)*dy;if(distance<1||distance>n.sightRange||(dx?gy!==ny:gx!==nx))return false;
 const blocked=(x,y)=>coreSpatial(s)?.sightBlocked(s.scene,x,y)??sightBlocked(s.scene,x,y);
 for(let i=1;i<=distance;i++){const x=(nx+dx*i)*FIELD_GRID+24,y=(ny+dy*i)*FIELD_GRID+24;if(blocked(x,y))return false;if(s.core.npcs.some(o=>o!==n&&o.map===s.scene&&Math.floor(o.x/48)===nx+dx*i&&Math.floor(o.y/48)===ny+dy*i))return false}
 // Also test the actual foot-anchor ray, avoiding thin non-grid wall tunnelling.
 const length=Math.hypot(s.x-n.x,s.y-n.y);for(let p=12;p<length-12;p+=6)if(blocked(n.x+(s.x-n.x)*p/length,n.y+(s.y-n.y)*p/length))return false;
 return true;
}
/** @param {CorePlayer} s @param {BattleRequest} request */
export function beginEncounter(s,request){
 if(s.core.pendingBattle||s.core.lock==='battle')return false;
 s.core.returnPoint={scene:s.scene,x:s.x,y:s.y,facing:s.facing};s.core.pendingBattle=request;s.core.battleReady=false;
 lockField(s,'encounter');s.core.sequence={kind:'encounter',phase:'flash',elapsed:0,duration:CORE_TIMING.encounter};return true;
}
/** Checks only completed movement distance steps; never on idle/interact/timer. @param {CorePlayer} s @param {number} distance @param {()=>number} [rng] */
export function recordFieldMovement(s,distance,rng=Math.random){
 if(distance<=0||fieldInputLocked(s)||s.menu!==null||s.dialogue.length)return false;
 const handler=encounterMovementHandler(s);if(handler)return handler(distance);
 s.core.stepDistance+=distance;
 if(s.core.stepDistance+1e-6<FIELD_GRID)return false;
 s.core.stepDistance=Math.max(0,s.core.stepDistance-FIELD_GRID);s.core.steps++;
 if(s.core.lastCheckedStep===s.core.steps)return false;s.core.lastCheckedStep=s.core.steps;
 if(s.core.encounterGrace>0){s.core.encounterGrace--;return false}
 const behavior=behaviorAt(s.scene,s.x,s.y);if(!('encounter' in behavior)||!behavior.encounter)return false;
 s.core.encounterChecks++;if(rng()>=.17)return false;return beginEncounter(s,{kind:'wild'});
}
/** Restores the existing field/camera and appends optional trainer data only. @param {CorePlayer} s @param {string} result */
export function finishFieldBattle(s,result){
 const request=s.core.pendingBattle;
 if(result==='win'&&request?.kind==='trainer'&&request.trainerId){if(!s.core.defeated.includes(request.trainerId))s.core.defeated.push(request.trainerId);const n=s.core.npcs.find(n=>n.id===request.trainerId);if(n)n.defeated=true}
 if(s.core.returnPoint)Object.assign(s,s.core.returnPoint);
 for(const n of s.core.npcs){n.paused=false;n.wait=CORE_TIMING.npcPause;n.sightCooldown=3000}
 s.core.pendingBattle=null;s.core.battleReady=false;s.core.returnPoint=null;s.core.encounterGrace=3;s.core.stepDistance=0;s.core.dialogueNPC=null;unlockField(s);
}
/** @param {CorePlayer} s @param {number} x @param {number} y @param {FieldNPC} n */
function npcCanMove(s,x,y,n){return coreWalkable(s,x,y,n.id)&&Math.hypot(x-s.x,y-s.y)>=FIELD_GRID-1}
/** @param {CorePlayer} s @param {FieldNPC} n @param {number} dt */
export function moveNPC(s,n,dt){
 if(!n.target)return true;const dx=n.target.x-n.x,dy=n.target.y-n.y;if(Math.abs(dx)+Math.abs(dy)<.1){n.target=null;n.moving=false;return true}
 n.facing=faceToward(dx,dy);const [vx,vy]=vector(n.facing),distance=Math.min(Math.abs(vx?dx:dy),CORE_TIMING.npcSpeed*dt);
 for(let p=0;p<distance;){const step=Math.min(3,distance-p),x=n.x+vx*step,y=n.y+vy*step;if(!npcCanMove(s,x,y,n)){n.target=null;n.moving=false;return false}n.x=x;n.y=y;n.walk+=step;p+=step;n.moving=true}return true;
}
/** @param {CorePlayer} s @param {FieldNPC} n @param {number} dt */
function updateNPC(s,n,dt){
 if(n.paused||n.map!==s.scene)return;n.moving=false;
 if(n.target){moveNPC(s,n,dt);if(!n.target)n.wait=CORE_TIMING.npcPause;return}
 n.wait-=dt*1000;if(n.wait>0||n.movement==='FACE_FIXED')return;n.wait=CORE_TIMING.npcPause+Math.floor(random(s.core)*1000);
 const dirs=/** @type {Facing[]} */(['down','left','right','up']);
 if(n.movement==='LOOK_AROUND'){n.facing=dirs[Math.floor(random(s.core)*4)];return}
 if(n.movement==='PATROL'&&n.waypoints.length){n.waypoint=(n.waypoint+1)%n.waypoints.length;const [x,y]=n.waypoints[n.waypoint];n.target={x,y};return}
 if(n.movement==='WANDER'){n.facing=dirs[Math.floor(random(s.core)*4)];const [dx,dy]=vector(n.facing),x=n.x+dx*48,y=n.y+dy*48;if(Math.abs(x-n.homeX)<=n.range&&Math.abs(y-n.homeY)<=n.range&&npcCanMove(s,x,y,n))n.target={x,y}}
}
/** @param {CorePlayer} s @param {Facing} direction @param {number} nextX @param {number} nextY */
export function tryLedge(s,direction,nextX,nextY){
 const ledge=QA_MAPS[s.scene]?.ledges.find(l=>l.direction===direction&&direction==='down'&&nextX>=l.rect[0]+15&&nextX<=l.rect[0]+l.rect[2]-15&&s.y<=l.rect[1]-24&&nextY>=l.rect[1]-24);
 if(!ledge)return false;const toY=ledge.rect[1]+ledge.rect[3]+24;
 for(let y=s.y;y<=toY;y+=3){if(!terrainWalkable(s.scene,s.x,y))return false;if(s.core.npcs.some(n=>n.map===s.scene&&inRect(s.x,y,[n.x+n.body[0],n.y+n.body[1],n.body[2],n.body[3]])))return false}
 lockField(s,'ledge');s.core.sequence={kind:'ledge',phase:'jump',elapsed:0,duration:CORE_TIMING.ledge,fromX:s.x,fromY:s.y,toX:s.x,toY};return true;
}
/** @param {CorePlayer} s @param {Facing} direction @param {number} nextX @param {number} nextY */
export function tryMapConnection(s,direction,nextX,nextY){
 const map=QA_MAPS[s.scene],link=map?.connections[direction];if(!map||!link)return false;
 const [x,y,w,h]=map.bounds,cross=direction==='right'?nextX>x+w:direction==='left'?nextX<x:direction==='up'?nextY<y:nextY>y+h;if(!cross)return false;
 const dest=QA_MAPS[link.map],[tx,ty,tw,th]=dest.bounds;
 const nx=link.edge==='left'?tx+1:link.edge==='right'?tx+tw-1:tx+(s.x-x),ny=link.edge==='up'?ty+1:link.edge==='down'?ty+th-1:ty+(s.y-y);
 const original=s.scene;s.scene=link.map;if(!coreWalkable(s,nx,ny)){s.scene=original;warn(s,'MAP_CONNECTION_BLOCKED:'+original);return false}
 s.x=Math.round(nx);s.y=Math.round(ny);s.facing=direction;s.core.stepDistance=0;s.core.area={name:dest.name,age:0};s.core.encounterGrace=2;return true;
}
/** @param {CorePlayer} s @param {string} message */
function warn(s,message){if(!s.core.warnings.includes(message)){s.core.warnings.push(message);console.warn(message)}}
/** Shared rAF update. @param {CorePlayer} s @param {number} dt @param {import('./field-animation.mjs').FieldAnimation} animation @param {boolean} [paused] */
export function tickFieldCore(s,dt,animation,paused=false){
 if(paused)return;dt=Math.min(.05,Math.max(0,dt));const core=s.core;
 if(core.area){core.area.age+=dt*1000;if(core.area.age>=CORE_TIMING.area)core.area=null}
 const seq=core.sequence;
 if(seq){
  if(seq.elapsed===0&&seq.kind==='encounter')emitFieldEffect(animation,'encounterFlash',s.x,s.y);
  if(seq.elapsed===0&&seq.kind==='ledge')emitFieldEffect(animation,'ledgeJump',s.x,s.y);
  seq.elapsed+=dt*1000;
  if(seq.kind==='ledge'){const p=Math.min(1,seq.elapsed/seq.duration);s.x=Math.round(seq.fromX+(seq.toX-seq.fromX)*p);s.y=Math.round(seq.fromY+(seq.toY-seq.fromY)*p);core.jumpOffset=Math.round(Math.sin(Math.PI*p)*36);if(p===1){emitFieldEffect(animation,'landingDust',s.x,s.y);core.stepDistance=0;unlockField(s)}return}
  if(seq.kind==='encounter'){if(seq.elapsed>=seq.duration&&seq.phase!=='battle'){core.battleReady=true;core.lock='battle';seq.phase='battle'}return}
  if(seq.kind==='trainer'){
   const n=core.npcs.find(n=>n.id===seq.npcId);if(!n){unlockField(s);return}
   if(seq.phase==='notice'&&seq.elapsed>=CORE_TIMING.notice){seq.phase='approach';s.facing=faceToward(n.x-s.x,n.y-s.y);n.target={x:s.x,y:s.y};const [dx,dy]=vector(n.facing);n.target.x-=dx*48;n.target.y-=dy*48}
   if(seq.phase==='approach'){if(!moveNPC(s,n,dt)){warn(s,'TRAINER_APPROACH_BLOCKED:'+n.id);n.paused=false;n.wait=5000;n.sightCooldown=5000;core.encounterGrace=3;unlockField(s);return}if(!n.target){seq.phase='dialogue';startNPCDialogue(s,n);s.dialogue=[n.dialogue];s.dialogueIndex=0;core.sequence=seq}}
   return;
  }
 }
 if(fieldInputLocked(s)||s.menu!==null||s.dialogue.length)return;
 for(const n of core.npcs){n.sightCooldown=Math.max(0,n.sightCooldown-dt*1000);updateNPC(s,n,dt);if(trainerSees(s,n)){n.paused=true;n.target=null;n.moving=false;lockField(s,'trainer');core.sequence={kind:'trainer',phase:'notice',elapsed:0,duration:CORE_TIMING.notice,npcId:n.id};emitFieldEffect(animation,'exclamation',n.x,n.y-128);return}}
}
