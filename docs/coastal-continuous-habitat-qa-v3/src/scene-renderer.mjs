import contract from './asset-contract.mjs';
import {S} from './camera-core.mjs';
import grassContract from './grass-contract.mjs';
import {createGrassState} from './tuft-motion.mjs';
import {createTuftRenderer} from './tuft-renderer.mjs';
export async function createSceneRenderer({loadImage,assetURL,includeReference=false}){
 const sliceImages=await Promise.all(contract.slices.map(s=>loadImage(assetURL(s.file))));
 const atlas=await loadImage(assetURL('player-atlas.png'));const masters={};for(const m of grassContract.masters)masters[m.id]=await loadImage(assetURL(m.file));const grassRenderer=createTuftRenderer({contract:grassContract,masters,atlas});const neutral=createGrassState();let reference=null;
 async function ensureReference(){if(!reference)reference=await loadImage(assetURL('assembly-reference.png'));return reference;}
 if(includeReference)await ensureReference();
 function renderNative(ctx,state,{mode=state.drawMode,visibleNativeRect,actorVisible=state.actorVisible}={}){
  if(mode==='reference'){if(!reference)throw Error('Reference not loaded');ctx.drawImage(reference,0,0);}
  else if(mode==='slices'){
   for(let i=0;i<contract.slices.length;i++){const s=contract.slices[i];const [x,y,w,h]=s.nativeCoreRect;const [dx,dy]=s.nativeDestination;
    if(visibleNativeRect){const [vx,vy,vw,vh]=visibleNativeRect;if(dx+w<=vx||dx>=vx+vw||dy+h<=vy||dy>=vy+vh)continue;}
    ctx.drawImage(sliceImages[i],x,y,w,h,dx,dy,w,h);
   }
  }else throw Error('Unknown render mode');
  if(actorVisible)grassRenderer.render(ctx,state.actor,state.grass??neutral);else for(const t of grassContract.instances)grassRenderer.drawTuft(ctx,t,state.grass??neutral);
 }
 return {renderNative,ensureReference,get referenceLoaded(){return !!reference;}};
}
