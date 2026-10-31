import {createScreenLayer} from './screen-lighting.mjs';
import {createSceneLighting} from './scene-lighting.mjs';
import {createLightingSampler,createFrame} from './day-night.mjs';
export async function loadMapLighting(baseURL,expectedSize,expectedSourceSHA){
 try{
  const manifest=await fetch(new URL('MANIFEST.json',baseURL)).then(r=>{if(!r.ok)throw Error('manifest');return r.json()});
  const sha=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
  async function get(name,pin){const r=await fetch(new URL(name,baseURL));if(!r.ok)throw Error('payload');const b=await r.arrayBuffer();if(await sha(b)!==pin)throw Error('payload-pin');return b}
  const layer=createScreenLayer({manifest,indices:new Uint32Array(await get('indices.u32',manifest.indicesSHA)),transmission:new Float64Array(await get('transmission.f64',manifest.transmissionSHA)),expectedSize,expectedSourceSHA});
  const sampler=createLightingSampler({night:[.4,.47,.6],schedule:{dawnStart:240,dayStart:540,duskStart:1020,nightStart:1260}}),frame=createFrame(),cache=new Map();
  return {apply(animated,{camera,minutes,enabled=true,bad=false}){sampler.sample(minutes,frame);const bytes=camera[2]*camera[3]*4;if(!cache.has(bytes))cache.set(bytes,{output:new Uint8ClampedArray(bytes),compose:createSceneLighting({nightTint:[.4,.47,.6],streetLayer:layer,frameBytes:bytes})});const item=cache.get(bytes);const stats=item.compose(animated,item.output,{nightMix:frame.nightMix,camera,streetEnabled:enabled,streetBad:bad});return {output:item.output,stats:{...stats,nightMix:frame.nightMix,minutes}}}};
 }catch(e){return {apply(animated){return {output:animated,stats:{lightingUnavailable:true,reason:String(e.message)}}}}}
}
