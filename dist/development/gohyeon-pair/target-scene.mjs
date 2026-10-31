import {FIXED_REGISTRATION} from './fixed-registration.mjs';
const V={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
// Movement/render adapter only. Assets/registry are already pinned by the integration loader.
// No NPCs, RAF, key listeners, canonical writes, clocks or storage are created here.
export class S4TargetScene {
 constructor({location,registry,safeMask,renderer,sessionEpoch}){
  const row=FIXED_REGISTRATION.find(r=>r.mapId===location?.mapId&&!r.states);
  if(!row||registry.validate(location)||!(safeMask instanceof Uint8Array)||safeMask.length!==row.width*row.height||typeof renderer!=='function'||!Number.isSafeInteger(sessionEpoch)||sessionEpoch<1)throw Error('PINNED_TARGET_INPUTS_REQUIRED');
  this.mapId=row.mapId;this.sessionEpoch=sessionEpoch;this.registry=registry;this.location=structuredClone(location);this.mask=new Uint8Array(safeMask);this.row=row;this.renderer=renderer;this.remainder=0;this.direction=null;this.disposed=false;this.world=null;this.locked=false;
 }
 bindWorld(world){if(this.world&&this.world!==world)throw Error('WORLD_REPLACEMENT_REQUIRES_NEW_OWNER');this.world=world}
 getLocation(){return structuredClone(this.location)}
 readNative(){if(this.disposed)return null;const n=this.location;return {version:1,sceneId:n.sceneId,mapId:n.mapId,revision:n.mapRevision,imageSHA:n.imageSHA,maskSHA:n.maskSHA,foot:[...n.foot],facing:n.facing,phase:'field',sessionEpoch:this.sessionEpoch}}
 stop(){this.remainder=0;this.direction=null}
 frame(dt,dir){if(this.disposed||this.locked||this.world?.inputLocked||this.world?.busy||!Number.isFinite(dt)||dt<0||dt>250){this.stop();return false}if(!Object.hasOwn(V,dir)){this.stop();return false}if(this.direction!==dir)this.remainder=0;this.direction=dir;this.location.facing=dir;this.remainder+=dt*.12;const steps=Math.floor(this.remainder);this.remainder-=steps;let moved=false;for(let i=0;i<steps;i++){const [x,y]=this.location.foot,[dx,dy]=V[dir],nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=this.row.width||ny>=this.row.height||this.mask[ny*this.row.width+nx]!==1){this.remainder=0;break}this.location.foot=[nx,ny];moved=true}return moved}
 draw(ctx,environment){if(this.disposed)throw Error('SCENE_DISPOSED');if(!Number.isFinite(environment?.minutes)||!Number.isFinite(environment?.elapsedMs))throw Error('MAIN_CLOCK_REQUIRED');return this.renderer(ctx,this.getLocation(),environment)}
 proximityHint(){const n=this.location;return this.row.approach?.rows.some(([y,lo,hi])=>n.foot[1]===y&&n.foot[0]>=lo&&n.foot[0]<hi)?'고현으로 돌아가기 · '+(this.row.facing==='left'?'왼쪽':'아래쪽')+'을 보고 조사':''}
 async inspect(execution){if(this.disposed||this.locked||this.world?.inputLocked||this.world?.busy)throw Error('INPUT_LOCKED');if(typeof execution!=='function')throw Error('TRUSTED_EXECUTION_REQUIRED');const n=this.location;if(n.facing!==this.row.facing||!(this.row.approach?this.row.approach.rows.some(([y,lo,hi])=>n.foot[1]===y&&n.foot[0]>=lo&&n.foot[0]<hi):n.foot[0]===this.row.readFoot[0]&&n.foot[1]===this.row.readFoot[1]))return {executed:false,reason:'NO_SELECTED_PORT_IN_REACH'};return execution(this.row.pointId)}
 dispose(){if(this.disposed)return;this.disposed=true;this.stop();this.world=null}
}
