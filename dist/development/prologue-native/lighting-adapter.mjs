import{acquireP0Lighting}from'./lighting-lease.mjs';
import{createCoreEastForeground,CORE_EAST_CURRENT as E}from'../s9-transfer/core-east-foreground.mjs';
import{JUNCTION as J}from'./junction-registration.mjs';
import{sampleNightMix}from'../nojasan/day-night.mjs';
import{ORIGINAL_JANGSEUNGPO_SCHEDULE as S}from'../s9-transfer/lighting-current.mjs';
// Fixed-depth rendering commands only: these constants select existing foreground drawing,
// not a player's/NPC's pose, authority, collision or camera. Each actor sorts independently.
const alwaysJunction=Object.freeze([0,J.foregroundDepthY-1]),alwaysEast=Object.freeze([0,E.depthY-1]);
export async function loadP0LightingAdapter({fetcher=fetch,signal,image,visual,canvasFactory=(w,h)=>new OffscreenCanvas(w,h)}){
 let lease=null,east=null,mask=null,alpha=null,output=null,dead=false;const check=()=>{if(dead||signal?.aborted)throw Error('P0_LIGHT_ADAPTER_CANCELLED')};
 const dispose=()=>{if(dead)return;dead=true;const owned=[lease,east,mask];lease=east=mask=null;alpha=output=null;let first;for(let i=0;i<owned.length;i++)try{if(i===2&&owned[i])owned[i].width=owned[i].height=1;else owned[i]?.dispose()}catch(e){first??=e}if(first)throw first};
 try{check();lease=await acquireP0Lighting({fetcher,signal});check();const constructing=[];try{east=createCoreEastForeground({image,canvasFactory:(w,h)=>{const c=canvasFactory(w,h);constructing.push(c);return c}})}catch(e){for(const c of constructing)try{c.width=c.height=1}catch{}throw e}check();
  return Object.freeze({compose(ctx,{camera,actors,minutes=720,lights=true,rest=false}){check();if(ctx.canvas.width!==960||ctx.canvas.height!==540||!Array.isArray(camera)||camera.length!==2||!camera.every(Number.isInteger)||!Number.isFinite(minutes)||!Array.isArray(actors)||actors.some(a=>!Number.isInteger(a.y)||typeof a.draw!=='function'||!Array.isArray(a.bounds)||a.bounds.length!==4||!a.bounds.every(Number.isFinite)||a.bounds[2]<0||a.bounds[3]<0))throw Error('P0_LIGHT_ADAPTER_FRAME');const[offsetX,offsetY]=camera;
   const layers=[{y:J.foregroundDepthY,kind:'foreground',draw:g=>visual.drawForeground(g,{offsetX,offsetY,actorFoot:alwaysJunction})},{y:E.depthY,kind:'foreground',draw:g=>east.draw(g,{offsetX,offsetY,actorFoot:alwaysEast})},...actors.map(a=>({...a,kind:'actor'}))];layers.sort((a,b)=>a.y-b.y);for(const a of layers)a.draw(ctx);
   if(rest||sampleNightMix(minutes,S)===0)return{nightMix:0,ambientApplications:0};
   alpha??=new Uint8Array(518400);output??=new Uint8ClampedArray(2073600);alpha.fill(0);
   const rois=actors.flatMap(a=>{const[x,y,w,h]=a.bounds;if(w===0||h===0)return[];const x0=Math.max(0,Math.floor(x)-1),y0=Math.max(0,Math.floor(y)-1),x1=Math.min(960,Math.ceil(x+w)+1),y1=Math.min(540,Math.ceil(y+h)+1);return x1>x0&&y1>y0?[[x0,y0,x1-x0,y1-y0]]:[]});
   if(rois.length){if(!mask){mask=canvasFactory(960,540);check()}const m=mask.getContext('2d');m.save();try{m.imageSmoothingEnabled=false;m.globalCompositeOperation='source-over';m.clearRect(0,0,960,540);for(const a of layers){m.globalCompositeOperation=a.kind==='actor'?'source-over':'destination-out';a.draw(m)}}finally{m.restore()}
    for(const[x,y,w,h]of rois){const visible=m.getImageData(x,y,w,h).data;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)alpha[(y+yy)*960+x+xx]=visible[(yy*w+xx)*4+3]}
   }const frame=ctx.getImageData(0,0,960,540),stats=lease.draw(frame.data,output,{minutes,camera,actorAlpha:alpha,lamp:lights});frame.data.set(output);ctx.putImageData(frame,0,0);return stats;
  },dispose});
 }catch(e){try{dispose()}catch{}throw e}
}
