import {followerSpeciesReference} from './species-asset-resolver.mjs';
export const FOLLOWER_RULES=Object.freeze({gap:48,speed:312,historyLimit:256,blockedRecovery:.5,teleportDistance:144});
const vectors={down:[0,1],right:[1,0],left:[-1,0],up:[0,-1]};
export function createFieldFollower(){return {speciesId:null,x:0,y:0,scene:'',facing:'down',walk:0,moving:false,visible:false,history:[],distance:0,cursor:0,lastPlayer:null,pendingRelocate:false,blocked:0,relocations:0,reason:'empty-party'};}
const direction=(dx,dy)=>Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
function clearSegment(scene,a,b,canOccupy){const distance=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(distance/3));for(let i=0;i<=n;i++)if(!canOccupy(scene,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;return true;}
/** Non-blocking presentation actor. Never appended to NPCs, collision or save data. */
export function relocateFollower(f,p,canOccupy=()=>true,gap=48,reason='relocate'){
 const v=vectors[p.facing]??vectors.down,dirs=[[-v[0],-v[1]],[v[1],-v[0]],[-v[1],v[0]],v];let at=null;
 for(const distance of [gap,gap/2,0]){for(const [dx,dy] of dirs){const candidate={x:p.x+dx*distance,y:p.y+dy*distance};if(clearSegment(p.scene,candidate,p,canOccupy)){at=candidate;break}}if(at)break}
 // A transiently invalid player anchor hides the follower; it cannot stop the engine.
 at??={x:p.x,y:p.y};const length=Math.hypot(p.x-at.x,p.y-at.y);
 Object.assign(f,{x:at.x,y:at.y,scene:p.scene,facing:p.facing??'down',walk:0,moving:false,visible:canOccupy(p.scene,at.x,at.y),history:[{...at,d:0}],distance:length,cursor:0,lastPlayer:{x:p.x,y:p.y,scene:p.scene},pendingRelocate:false,blocked:0,relocations:f.relocations+1,reason});
 if(length)f.history.push({x:p.x,y:p.y,d:length});return f;
}
function appendPlayer(f,p){const previous=f.history.at(-1),distance=Math.hypot(p.x-previous.x,p.y-previous.y);if(distance<1e-5)return;f.distance+=distance;const a=f.history.at(-2);if(a){const ux=previous.x-a.x,uy=previous.y-a.y,vx=p.x-previous.x,vy=p.y-previous.y;if(Math.abs(ux*vy-uy*vx)<1e-7&&ux*vx+uy*vy>0){Object.assign(previous,{x:p.x,y:p.y,d:f.distance});return}}f.history.push({x:p.x,y:p.y,d:f.distance});}
/** Follow arc distance along actual sampled segments; turns never use a diagonal shortcut. */
export function updateFieldFollower(f,p,party,dt,{paused=false,transition=false,jumping=false,canOccupy=()=>true,gap=48,speed=312}={}){
 const reference=followerSpeciesReference(party?.[0]),speciesId=reference?.speciesId??null;
 if(!speciesId){Object.assign(f,{speciesId:null,speciesReference:null,visible:false,moving:false,history:[],lastPlayer:null,pendingRelocate:false,walk:0,reason:'empty-party'});return f}
 const changed=f.speciesId!==speciesId||f.speciesReference?.namespace!==reference.namespace;f.speciesId=speciesId;f.speciesReference=reference;
 if(transition||jumping){f.visible=false;f.moving=false;f.pendingRelocate=true;f.reason=jumping?'ledge':'transition';return f}
 const delta=f.lastPlayer?Math.hypot(p.x-f.lastPlayer.x,p.y-f.lastPlayer.y):0;
 if(changed||!f.lastPlayer||f.scene!==p.scene||f.pendingRelocate||delta>Math.max(FOLLOWER_RULES.teleportDistance,gap*3))return relocateFollower(f,p,canOccupy,gap,changed?'party-slot-1':f.pendingRelocate?'transition-recovery':'warp');
 appendPlayer(f,p);f.lastPlayer={x:p.x,y:p.y,scene:p.scene};f.moving=false;
 if(paused)return f;
 const seconds=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 const target=Math.max(f.history[0].d,f.distance-gap),end=Math.min(target,f.cursor+speed*seconds);let cursor=f.cursor;
 for(let i=1;i<f.history.length&&cursor<end-1e-5;i++){
  const a=f.history[i-1],b=f.history[i];if(b.d<=cursor)continue;
  const nextD=Math.min(end,b.d),ratio=(nextD-a.d)/(b.d-a.d),next={x:a.x+(b.x-a.x)*ratio,y:a.y+(b.y-a.y)*ratio};
  if(!clearSegment(p.scene,f,next,canOccupy)){f.blocked+=seconds;f.reason='path-blocked';if(f.blocked>=FOLLOWER_RULES.blockedRecovery)relocateFollower(f,p,canOccupy,gap,'blocked-recovery');return f}
  const dx=next.x-f.x,dy=next.y-f.y;f.facing=direction(dx,dy);f.walk+=Math.hypot(dx,dy);f.x=next.x;f.y=next.y;cursor=nextD;f.cursor=cursor;f.moving=true;f.visible=true;f.blocked=0;f.reason='following';
 }
 while(f.history.length>2&&f.history[1].d<=f.cursor)f.history.shift();
 if(f.history.length>FOLLOWER_RULES.historyLimit)relocateFollower(f,p,canOccupy,gap,'history-limit');
 if(!f.visible&&canOccupy(p.scene,p.x,p.y))relocateFollower(f,p,canOccupy,gap,'valid-anchor-recovery');
 return f;
}
