import {createLightingSampler,createFrame} from './day-night.mjs';
import {createFrameLighting} from './frame-lighting.mjs';
import {drawScene} from './scene.mjs';
// Exact existing selected POST native sampler policy; caller owns time.
export const SHARED_POST_AMBIENT=Object.freeze({night:[.4,.47,.6],schedule:{dawnStart:240,dayStart:540,duskStart:1020,nightStart:1260}});
export function createNojasanRenderer({ImageDataClass=globalThis.ImageData}={}){
 const sampler=createLightingSampler(SHARED_POST_AMBIENT),frame=createFrame(),ambient=createFrameLighting({nightTint:SHARED_POST_AMBIENT.night});let output=null;
 return (ctx,{scene,images,camera=[0,0],minutes})=>{
  if(!Number.isFinite(minutes))throw Error('EXTERNAL_HOST_CLOCK_REQUIRED');
  const stats=drawScene(ctx,{scene,images,camera}); // redraw ORIGINAL map+actors, never prior tinted output
  const pixels=ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);output??=new Uint8ClampedArray(pixels.data.length);if(output.length!==pixels.data.length)output=new Uint8ClampedArray(pixels.data.length);
  sampler.sample(minutes,frame);ambient(pixels.data,output,frame.nightMix);ctx.putImageData(new ImageDataClass(output,ctx.canvas.width,ctx.canvas.height),0,0);
  return {...stats,minutes,nightMix:frame.nightMix,ambientApplications:frame.nightMix>0?1:0,ambientScope:'composited background + player + Yeji exactly once',addedLights:0};
 };
}
