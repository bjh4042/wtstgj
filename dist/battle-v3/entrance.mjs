// Pure presentation sampling, driven exclusively by the existing host frame clock.
export const FRONT_ENTRANCE_MS=280;
import{resolveFrontOnlyArt}from'./front-policy-r2/adapter.mjs';
export function isFrontEntrance(cue){if(cue?.kind!=='sequence'||cue.mode!=='appear')return false;const actor=cue.actors?.[cue.side];if(!actor)return false;const namespace=cue.side==='player'?(actor.namespace??'canonical'):actor.namespace;return !!resolveFrontOnlyArt({namespace,speciesId:actor.speciesId},'front')}
export function frontEntranceCue(cue){return isFrontEntrance(cue)?{...cue,duration:cue.reducedMotion?0:FRONT_ENTRANCE_MS}:cue}
export function frontEntranceFrame(cue,elapsedMs){
 if(!isFrontEntrance(cue))return null;
 if(!Number.isFinite(elapsedMs))throw Error('ENTRANCE_CLOCK');
 const t=cue.reducedMotion?1:Math.max(0,Math.min(1,elapsedMs/FRONT_ENTRANCE_MS)),ease=1-(1-t)**3;
 return Object.freeze({side:cue.side,dx:(cue.side==='player'?-24:24)*(1-ease),dy:0,opacity:t,done:t===1,progress:t});
}
