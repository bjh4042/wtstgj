import {resolveTileAnimation} from './presentation/tile-animation.mjs';
// @ts-check
import {GRASS_PATCHES} from './field-grass-data.mjs';
/** One clock advanced by the existing game rAF; effects are visual-only. */
export const FIELD_ANIMATION=Object.freeze({water:{frames:3,frameMs:320},shoreline:{frames:3,frameMs:240},flower:{frames:1,frameMs:1200},tallGrass:{frames:4,frameMs:90},door:{openMs:120,approachMs:140,fadeMs:160,totalMs:560},ripple:{frames:3,frameMs:120},exclamation:{duration:480},question:{duration:480},ledgeJump:{duration:440},landingDust:{duration:300},encounterFlash:{duration:360}});
/** @param {number} [time] */
export function createFieldAnimation(time=0){return {time,freeze:false,qaFrame:0,qaGrassFrame:0,qaGrassId:"",previousWalk:0,previousCell:'',effects:/** @type {{kind:string,x:number,y:number,age:number,direction:string,duration?:number}[]} */([])}}
/** @param {ReturnType<typeof createFieldAnimation>} a @param {number} dt @param {boolean} paused */
export function tickFieldAnimation(a,dt,paused=false){if(a.freeze||paused)return;a.time+=Math.min(Math.max(dt,0),.05)*1000;for(const e of a.effects)e.age+=Math.min(Math.max(dt,0),.05)*1000;a.effects=a.effects.filter(e=>e.age<(e.duration??420))}
/** @param {ReturnType<typeof createFieldAnimation>} a */
export function environmentFrames(a,options={}){return {water:a.freeze?a.qaFrame%3:resolveTileAnimation('SEA_ANIM_01',a.time,options).index,shore:a.freeze?a.qaFrame%3:resolveTileAnimation('FOAM_ANIM_01',a.time,options).index,flower:0}}

/** @param {number} x @param {number} y */
export function grassAt(x,y){return GRASS_PATCHES.find(p=>{const [a,b,w,h]=p.footRect;return x>=a&&x<a+w&&y>=b&&y<b+h})}
/** @param {ReturnType<typeof createFieldAnimation>} a @param {{x:number,y:number,walk:number,moving:boolean,facing:string,scene:string}} s */
export function updateGrassInteraction(a,s){
 const patch=s.scene==='outdoor'?grassAt(s.x,s.y):null;
 const cell=patch?`${Math.floor(s.x/48)},${Math.floor(s.y/48)}`:'';
 if(!a.freeze&&s.moving&&patch&&(cell!==a.previousCell||Math.abs(s.walk-a.previousWalk)>=32)){
  a.effects=a.effects.filter(e=>!(e.kind==='tallGrass'&&e.x===patch.x&&e.y===patch.y));
  a.effects.push({kind:'tallGrass',x:patch.x,y:patch.y,age:0,direction:s.facing});a.previousWalk=s.walk;
 }
 a.previousCell=cell;
}

/** Public visual effect hook. It never changes position, terrain or save data.
 * @param {ReturnType<typeof createFieldAnimation>} a @param {'ripple'|'splash'|'exclamation'|'question'|'ledgeJump'|'landingDust'|'encounterFlash'|'shorelineFoam'|'door'} kind @param {number} x @param {number} y */
export function emitFieldEffect(a,kind,x,y){if(a.freeze||a.effects.some(e=>e.kind===kind&&e.age<240))return;a.effects.push({kind,x:Math.round(x),y:Math.round(y),age:0,direction:'',duration:kind==='exclamation'||kind==='question'?480:kind==='landingDust'?300:420})}
/** @typedef {ReturnType<typeof createFieldAnimation>} FieldAnimation */
