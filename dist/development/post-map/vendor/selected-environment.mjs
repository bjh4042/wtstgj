// NEW_AUTHORED composition only. All selected effect engines/art are byte-exact.
import {createScreenLayer} from './effects/hub/common/screen-lighting.mjs';
import {createEnvironment as createHubEnvironment} from './effects/hub/environment.mjs';
import {compose as composeWater} from './effects/island/water-adapter.mjs';
import {applyNewWater} from './effects/island/new-water.mjs';
import {drawOpen} from './effects/island/chest.mjs';
import {createSceneLighting} from './effects/island/scene-lighting.mjs';
import {createLightingSampler,createFrame} from './effects/island/day-night.mjs';
import {makePatch,deformPlant,overlay} from './effects/grass/plant.mjs';
const HUB='world:hub:POST',ISLAND='world:area:POST_ISLAND_EXPEDITION';
export const HUB_SHA='29e0513d5d7ed29ba72badb58a4082a0e594853a07ae8e197a6e33e01d6e53f8',ISLAND_SHA='dd9212579f3e90dbc30e6b873d0b76edd15ee9d2663a1267776720bfc200e374';
const cast=(b,T)=>new T(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
export async function loadSelectedInputs({read,decode,canvasFactory}) {
 const bytes=async p=>new Uint8Array(await read(new URL(p,import.meta.url))),json=async p=>JSON.parse(new TextDecoder().decode(await bytes(p))),image=async p=>decode(await bytes(p),new URL(p,import.meta.url));
 const [hubImage,islandImage,hubManifest,hubIds,hubTransmission,oldManifest,oldIds,oldRGB,newManifest,newIds,newRGB,chestImage,cleanImage,plantImage,grassConfig]=await Promise.all([
  image('./post7_open_layers/water_inventory_followup/other5_source/POST-HUB-native3072x1024-v3.png'),image('./post7_open_layers/source/POST-ISLAND-EXPEDITION-native3072x1024-v5.png'),
  json('./effects/hub/LIGHT_MANIFEST.json'),bytes('./effects/hub/light_indices.u32'),bytes('./effects/hub/light_transmission.f64'),
  json('./effects/island/water-contract.json'),bytes('./effects/island/indices.u32'),bytes('./effects/island/water.rgb'),json('./effects/island/NEW_WATER.json'),bytes('./effects/island/new_indices.u32'),bytes('./effects/island/new_water120.rgb'),image('./effects/island/open_generated.png'),image('./effects/grass/cleanplate_generated.png'),image('./effects/grass/plant_generated.png'),json('./effects/grass/CONFIG.json')
 ]);
 if(hubImage.width!==3072||hubImage.height!==1024||islandImage.width!==3072||islandImage.height!==1024||hubManifest.sourceSHA!==HUB_SHA||oldManifest.sourceSHA!==ISLAND_SHA||newManifest.sourceSHA!==ISLAND_SHA||grassConfig.sourceSHA!==ISLAND_SHA)throw Error('SELECTED_EFFECT_SOURCE_IDENTITY_MISMATCH');
 const full=canvasFactory(3072,1024),fc=full.getContext('2d');fc.drawImage(hubImage,0,0);const hubSource=fc.getImageData(0,0,3072,1024).data;
 const small=canvasFactory(100,80),sc=small.getContext('2d');sc.drawImage(islandImage,-920,-270);const original=sc.getImageData(0,0,100,80).data;sc.clearRect(0,0,100,80);sc.drawImage(cleanImage,0,0,100,80);const patch=makePatch(original,sc.getImageData(0,0,100,80).data);sc.clearRect(0,0,100,80);sc.drawImage(plantImage,-10,-8.8,120,96);const sprite=sc.getImageData(0,0,100,80).data;
 const oldIndices=cast(oldIds,Uint32Array),newIndices=cast(newIds,Uint32Array),oldSet=new Set(oldIndices);
 if(newIndices.some(x=>oldSet.has(x)))throw Error('DUPLICATE_WATER_OWNER');
 return {canvasFactory,hubImage,islandImage,hubSource,hubManifest,hubIds:cast(hubIds,Uint32Array),hubTransmission:cast(hubTransmission,Float64Array),oldManifest,oldIndices,oldRGB,newManifest,newIndices,newRGB,chestImage,patch,sprite};
}
// Native actor source crops, depth and placement reused from the original consumer.
export function drawNativeActors(ctx,scene,images,walker,camera){
 if(!walker)return;ctx.save();ctx.translate(-camera[0],-camera[1]);const layers=[];
 if(scene.npc)layers.push({y:scene.npc.foot[1],draw(){const[x0,y0,x1,y1]=scene.npc.sourceCrop,w=80*(x1-x0)/(y1-y0);ctx.imageSmoothingEnabled=true;ctx.drawImage(images.npc,x0,y0,x1-x0,y1-y0,scene.npc.foot[0]-w/2,scene.npc.foot[1]-80,w,80)}});
 layers.push({y:walker.y,draw(){const row={down:0,right:1,left:2,up:3}[walker.facing],col=walker.moving?[1,0,2,0][Math.floor(walker.walk/26)%4]:0;ctx.imageSmoothingEnabled=true;ctx.drawImage(images.player,col*256,row*256,256,256,walker.x-128*5/12,walker.y-216*5/12,256*5/12,256*5/12)}});
 for(const layer of layers.sort((a,b)=>a.y-b.y))layer.draw();ctx.restore();
}
export function createSelectedRenderer(inputs,{ImageDataClass=ImageData}={}) {
 // Renderer-owned scratch buffers: synchronous render calls fully overwrite these.
 const output=new Uint8ClampedArray(960*540*4),ambientOnly=new Uint8ClampedArray(960*540*4);
 const actorMaskCanvas=inputs.canvasFactory(960,540),actorMaskContext=actorMaskCanvas.getContext('2d');
 const hub=createHubEnvironment({source:inputs.hubSource,manifest:inputs.hubManifest,indices:inputs.hubIds,transmission:inputs.hubTransmission}),sampler=createLightingSampler({night:[.4,.47,.6],schedule:{dawnStart:240,dayStart:540,duskStart:1020,nightStart:1260}}),frame=createFrame(),light=createSceneLighting({nightTint:[.4,.47,.6],frameBytes:960*540*4}),hubLight=createSceneLighting({nightTint:[.4,.47,.6],streetLayer:createScreenLayer({manifest:inputs.hubManifest,indices:inputs.hubIds,transmission:inputs.hubTransmission,expectedSourceSHA:HUB_SHA,expectedSize:[3072,1024]}),frameBytes:960*540*4});
 return function render(ctx,{scene,images={},walker=null,save={},camera,ms=0,minutes=720,lightOn=true,waterOn=true,grassOn=true,rest=false,bad=false,actors=true}) {
  if(![HUB,ISLAND].includes(scene.mapId)||!Array.isArray(camera)||camera.length!==4||camera[2]!==960||camera[3]!==540||!camera.every(Number.isInteger)||camera[0]<0||camera[1]<0||camera[0]+960>3072||camera[1]+540>1024||!Number.isFinite(ms)||!Number.isFinite(minutes))throw Error('SELECTED_RENDER_CONTRACT');
  let stats={sourceSHA:scene.mapId===HUB?HUB_SHA:ISLAND_SHA,chestDrawCalls:0,chestStateOwner:'canonical geojeHidden receipt only',contact:'NOT_SELECTED_NOT_INSTALLED',grass:'R2_LIGHT_WIND_ONLY',mainInstalled:false};
  if(scene.mapId===HUB){
   if(!actors||!walker){const out=hub({camera,minutes,lightOn,rest,bad});ctx.putImageData(new ImageDataClass(out.pixels,960,540),0,0);return {...stats,...out.stats,waterApplications:0,newWaterApplications:0}}
   // Existing screen-light describes floor/glass, not an approved actor pointlight.
   // Keep ambient on actors once; conservatively occlude that 2D screen layer at
   // every actual sprite alpha>0 pixel (including antialiased edge pixels).
   actorMaskContext.clearRect(0,0,960,540);drawNativeActors(actorMaskContext,scene,images,walker,camera);const actorAlpha=actorMaskContext.getImageData(0,0,960,540).data;
   const base=hub({camera,rest:true});ctx.putImageData(new ImageDataClass(base.pixels,960,540),0,0);drawNativeActors(ctx,scene,images,walker,camera);
   const composed=ctx.getImageData(0,0,960,540).data;sampler.sample(minutes,frame);const nightMix=lightOn&&!rest?frame.nightMix:0,out=output,lighting=hubLight(composed,out,{nightMix,camera,streetBad:bad});
   light(composed,ambientOnly,{nightMix,camera});let actorPixelsOccluded=0;for(let i=0;i<out.length;i+=4)if(actorAlpha[i+3]>0){out.set(ambientOnly.subarray(i,i+4),i);actorPixelsOccluded++}
   ctx.putImageData(new ImageDataClass(out,960,540),0,0);
   return {...stats,...lighting,nightMix,actorPixelsOccluded,actorScreenPolicy:'ALPHA_GT0_BLOCKS_GROUND_EMISSIVE_SCREEN_AMBIENT_ONCE',waterApplications:0,newWaterApplications:0};
  }
  ctx.clearRect(0,0,960,540);ctx.imageSmoothingEnabled=false;ctx.drawImage(inputs.islandImage,-camera[0],-camera[1]);const pixels=ctx.getImageData(0,0,960,540),sourceSHA=bad?'0'.repeat(64):ISLAND_SHA;
  const old=composeWater(pixels.data,inputs.oldIndices,inputs.oldRGB,{sourceSHA,revision:inputs.oldManifest.revision,verified:true,conflict:false,alreadyApplied:false,timeMs:ms,enabled:waterOn,rest,camera},inputs.oldManifest);
  const fresh=applyNewWater(pixels.data,inputs.newIndices,inputs.newRGB,{sourceSHA,verified:true,conflict:false,timeMs:ms,enabled:waterOn,rest,camera},inputs.newManifest);
  const grassEnabled=grassOn&&!rest&&!bad,grassVisible=camera[0]<1020&&camera[0]+camera[2]>920&&camera[1]<350&&camera[1]+camera[3]>268,drawGrass=grassEnabled&&grassVisible,plant=drawGrass?deformPlant(inputs.sprite,ms,[]):null; // No contact controller or R4 installation.
  if(drawGrass)overlay(pixels.data,inputs.patch,plant,camera);ctx.putImageData(pixels,0,0);
  // One selected open-art draw; never instantiate createChestState or legacy second chest layer.
  if(save.geojeHidden?.receipts?.HIDDEN_GEOJE_11){ctx.save();ctx.imageSmoothingEnabled=true;drawOpen(ctx,inputs.chestImage,{camera});ctx.restore();stats.chestDrawCalls=1}
  if(actors)drawNativeActors(ctx,scene,images,walker,camera);
  const current=ctx.getImageData(0,0,960,540);
  if(drawGrass&&actors&&walker)for(let y=0;y<80;y++)for(let x=0;x<100;x++){
   const wx=x+920,wy=y+268,xx=wx-camera[0],yy=wy-camera[1];if(Math.abs(wx-walker.x)>18||wy<walker.y-10||wy>walker.y+4||xx<0||yy<0||xx>=960||yy>=540)continue;
   const i=(y*100+x)*4,j=(yy*960+xx)*4,alpha=plant[i+3]/255;for(let k=0;k<3;k++)current.data[j+k]=Math.round(current.data[j+k]*(1-alpha)+plant[i+k]*alpha);
  }
  sampler.sample(minutes,frame);const nightMix=lightOn&&!rest?frame.nightMix:0,out=output,lighting=light(current.data,out,{nightMix,camera});ctx.putImageData(new ImageDataClass(out,960,540),0,0);
  return {...stats,waterApplications:old.waterApplications,waterWritten:old.waterWritten,newWaterApplications:fresh.applied?1:0,newWaterWritten:fresh.written,waterReason:fresh.reason,nightMix,lighting,grassEnabled};
 };
}
