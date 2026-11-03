import {createMotionIntegrator,MOTION} from './motion.mjs';
export {MOTION};
const DIRS=Object.freeze({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]});
export function createNativeWalkState({safe,foot,facing='down'}){
 if(typeof safe!=='function'||!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isSafeInteger)||!Object.hasOwn(DIRS,facing)||!safe(...foot))throw Error('NATIVE_WALK_SPAWN');
 const spawn=Object.freeze([...foot]),motion=createMotionIntegrator();let at=[...foot],look=facing,elapsed=0,moving=false,suspended=false,dead=false;
 const state=()=>Object.freeze({scope:'NATIVE_WALK_PREVIEW_ONLY',foot:Object.freeze([...at]),facing:look,elapsedMs:elapsed,moving,suspended,disposed:dead,persisted:false,gameAuthority:false});
 const check=()=>{if(dead)throw Error('NATIVE_WALK_DISPOSED');};
 return Object.freeze({
  tick(directions,deltaMs){check();if(!Array.isArray(directions)||directions.some(d=>!Object.hasOwn(DIRS,d))||!Number.isFinite(deltaMs)||deltaMs<0)throw Error('NATIVE_WALK_INPUT');if(suspended)return state();
   const result=motion.advance(directions,deltaMs,dir=>{look=dir;const [dx,dy]=DIRS[dir],next=[at[0]+dx,at[1]+dy];if(!safe(...next))return false;at=next;return true;});
   moving=result.moved>0;elapsed+=result.deltaMs;return state();
  },
  reset(){check();if(!safe(...spawn))throw Error('NATIVE_WALK_SPAWN_INVALIDATED');at=[...spawn];look=facing;elapsed=0;moving=false;motion.reset();return state();},
  suspend(){if(dead)return;suspended=true;moving=false;motion.reset();},resume(){check();suspended=false;motion.reset();},
  dispose(){if(dead)return;dead=true;suspended=true;moving=false;motion.reset();},get state(){return state();}
 });
}
