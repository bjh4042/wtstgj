import {sampleNightMix,roundEven} from '../nojasan/day-night.mjs';
export const ORIGINAL_JANGSEUNGPO_SCHEDULE=Object.freeze({dawnStart:240,dayStart:540,duskStart:1020,nightStart:1260});
const tint=[.4,.47,.6],W=2804,H=1122;
const applyByteAmbient=(source,output,lut)=>{for(let i=0;i<source.length;i+=4)for(let c=0;c<3;c++)output[i+c]=lut[c*256+source[i+c]]};
const applyOtherAmbient=(source,output,mix)=>{for(let i=0;i<source.length;i+=4)for(let c=0;c<3;c++)output[i+c]=roundEven(source[i+c]*(1+mix*(tint[c]-1)))};
const bytes=x=>x instanceof ArrayBuffer?new Uint8Array(x.slice(0)):ArrayBuffer.isView(x)?new Uint8Array(new Uint8Array(x.buffer,x.byteOffset,x.byteLength)):null;
const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
// Candidate only; no clock, timer, renderer, world, authority, save, movement or ambient cache.
export async function createLightingCandidate({readBytes,pins}){
 const spec=JSON.parse(JSON.stringify(pins)),layers=[];let disposed=false,lastMix=NaN;const ambientLUT=new Uint8Array(768);
 for(const prefix of ['WINDOW_R3','NEW_CENTRAL_LAMP','EXACT_FOUR','REMAINING_TWO','NEW_CORE_EAST','REPAIRED_TWO']){
  const iName=prefix+'_indices.u32',tName=prefix+'_transmission.f64',ib=bytes(await readBytes(iName)),tb=bytes(await readBytes(tName));
  if(!ib||!tb||await sha(ib)!==spec[iName].sha256||await sha(tb)!==spec[tName].sha256)throw Error('LIGHT_INPUT_PIN');
  const iv=new DataView(ib.buffer),tv=new DataView(tb.buffer),ids=new Uint32Array(ib.length/4),tr=new Float64Array(tb.length/8);
  if(ib.length%4||tb.length%8||tr.length!==ids.length*3)throw Error('LIGHT_INPUT_SHAPE');
  for(let i=0;i<ids.length;i++){ids[i]=iv.getUint32(i*4,true);if(ids[i]>=W*H||(i&&ids[i]<=ids[i-1]))throw Error('LIGHT_INDEX');}
  for(let i=0;i<tr.length;i++){tr[i]=tv.getFloat64(i*8,true);if(!Number.isFinite(tr[i])||tr[i]<0||tr[i]>1)throw Error('LIGHT_TRANSMISSION');}
  layers.push({ids,tr});
 }
 return Object.freeze({draw(source,output,{minutes,camera,actorAlpha=null,lamp=true}){
  if(disposed)throw Error('LIGHT_DISPOSED');if(source.length!==960*540*4||output.length!==source.length||source.buffer===output.buffer||!Number.isFinite(minutes)||!Array.isArray(camera)||camera.length!==2||!camera.every(Number.isInteger)||camera[0]<0||camera[1]<0||camera[0]>W-960||camera[1]>H-540||actorAlpha&&actorAlpha.length!==960*540)throw Error('LIGHT_FRAME');
  const mix=sampleNightMix(minutes,ORIGINAL_JANGSEUNGPO_SCHEDULE);output.set(source);if(mix===0)return{nightMix:0,ambientApplications:0,receiverWrites:0};
  if(lastMix!==mix){lastMix=mix;for(let c=0;c<3;c++)for(let v=0;v<256;v++)ambientLUT[c*256+v]=roundEven(v*(1+mix*(tint[c]-1)))}
  if(source instanceof Uint8ClampedArray||source instanceof Uint8Array)applyByteAmbient(source,output,ambientLUT);else applyOtherAmbient(source,output,mix);
  let writes=0;for(const{ids,tr}of layers.slice(0,lamp?6:1))for(let i=0;i<ids.length;i++){
   const x=ids[i]%W-camera[0],y=Math.floor(ids[i]/W)-camera[1];if(x<0||y<0||x>=960||y>=540)continue;const pixel=y*960+x;if(actorAlpha?.[pixel])continue;
   for(let c=0;c<3;c++)output[pixel*4+c]=roundEven(255-(255-output[pixel*4+c])*(1-mix*(1-tr[i*3+c])));writes++;
  }
  return{nightMix:mix,ambientApplications:1,receiverWrites:writes};
 },dispose(){if(disposed)return;disposed=true;ambientLUT.fill(0);lastMix=NaN;for(const layer of layers){layer.ids.fill(0);layer.tr.fill(0)}layers.length=0;}});
}
