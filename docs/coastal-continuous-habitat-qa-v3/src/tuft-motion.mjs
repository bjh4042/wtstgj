export const SETTLE_SECONDS=.44;
export function insidePolygon(x,y,p){if(![x,y].every(Number.isFinite))return false;let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function createGrassState(){return {time:0,lastSerial:-1,impulses:{},contact:false,paused:false,reducedMotion:false,acceptedImpulseEvents:0,soundEvents:0};}
export function setPresentationMode(state,{paused=state.paused,reducedMotion=state.reducedMotion}={}){state.paused=!!paused;state.reducedMotion=!!reducedMotion;if(state.paused||state.reducedMotion)state.impulses={};}
export function updateContact(state,foot,contract){state.contact=insidePolygon(foot.x,foot.y,contract.footprint);return state.contact;}
// Input is an accepted presentation footstep supplied by the movement owner.
// This module neither commits movement nor calls RNG/story/save/encounter code.
export function acceptFootstep(state,event,contract){
 if(!Number.isSafeInteger(event.serial)||event.serial<=state.lastSerial)return [];
 state.lastSerial=event.serial; // consume even a suppressed event, so resume cannot replay it.
 if(state.paused||state.reducedMotion||event.accepted!==true||event.blocked||event.teleport||event.distance<=0||!Number.isFinite(event.distance))return [];
 const impulseTime=event.time??state.time;if(!Number.isFinite(impulseTime)||impulseTime<0||impulseTime>state.time+1e-9)return [];
 const {foot,direction}=event;if(!foot||!direction||![foot.x,foot.y,direction.x,direction.y].every(Number.isFinite))return [];
 if(!updateContact(state,foot,contract)||Math.hypot(direction.x,direction.y)<1e-9)return [];
 const nearby=contract.instances.map(t=>({t,d:Math.hypot(t.root[0]-foot.x,(t.root[1]-foot.y)*.8)})).filter(a=>a.d<=contract.impulseRadiusLogical).sort((a,b)=>a.d-b.d).slice(0,contract.maxNearbyImpulsedTufts);
 for(const {t,d} of nearby){let sign=Math.abs(direction.x)>.25?Math.sign(direction.x):Math.sign(t.root[0]-foot.x);if(!sign)sign=t.id.charCodeAt(t.id.length-1)%2?1:-1;const old=state.impulses[t.id]?.pulses??[];state.impulses[t.id]={pulses:[...old.filter(p=>state.time-p.start<SETTLE_SECONDS),{start:impulseTime,amplitude:sign*contract.maxTipDisplacementLogical*(.6+.4*(1-d/contract.impulseRadiusLogical))}].slice(-8)};}
 if(nearby.length)state.acceptedImpulseEvents++;return nearby.map(a=>a.t.id);
}
export function tickGrass(state,dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid grass delta');if(state.paused)return;state.time+=Math.min(dt,.1);for(const [id,v]of Object.entries(state.impulses)){v.pulses=v.pulses.filter(p=>state.time-p.start<SETTLE_SECONDS);if(!v.pulses.length)delete state.impulses[id];}}
export function tipOffset(state,id){const p=state.impulses[id];if(!p||state.paused||state.reducedMotion)return 0;let value=0;for(const pulse of p.pulses){const u=(state.time-pulse.start)/SETTLE_SECONDS;if(u>0&&u<1)value+=pulse.amplitude*Math.sin(Math.PI*u);}return Math.max(-3.2,Math.min(3.2,value));}
export function rootTransform(instance,tip){const h=instance.height;return {root:[...instance.root],shear:-tip/h};}
export function depthSide(instance,foot,occupied){return occupied&&instance.root[1]>=foot.y?'front':'back';}
