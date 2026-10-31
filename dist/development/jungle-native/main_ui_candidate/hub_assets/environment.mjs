import{createScreenLayer}from'./common/screen-lighting.mjs';import{createSceneLighting}from'./common/scene-lighting.mjs';import{createLightingSampler,createFrame}from'./common/day-night.mjs';
export const SOURCE_PINS={OPEN:'0c899b77372336f15cd23d0b1fbffad064ab3ae98858facbcd6653fe8e62fd64',CLOSED:'b12fea120b13e1dead306cdfb89a216d23197f157181dc8c88c0217f3bc8ccba'};
export const CAMERAS={center:[0,180,960,540],hanok:[620,100,960,540],library:[1460,180,960,540],gym:[2696,120,960,540],west:[0,780,960,540],mart:[750,720,960,540],culture:[1400,780,960,540],east:[2180,800,960,540],lower:[750,1252,960,540]};
export function createEnvironment({sources,manifest,indices,transmission}){
 const W=3656,H=1792,frame=createFrame(),sampler=createLightingSampler({night:[.4,.47,.6],schedule:{dawnStart:240,dayStart:540,duskStart:1020,nightStart:1260}}),street=createScreenLayer({manifest,indices,transmission,expectedSourceSHA:SOURCE_PINS.OPEN,expectedSize:[W,H]});
 for(const s of Object.values(sources))if(s.length!==W*H*4)throw Error('source-shape');
 return function render({camera=[0,0,960,540],minutes=720,lightOn=true,state='OPEN',rest=false,ms=0}={}){
 if(!sources[state]||![minutes,ms].every(Number.isFinite))throw Error('frame-contract');
 const[cx,cy,w,h]=camera;if(!camera.every(Number.isInteger)||cx<0||cy<0||cx+w>W||cy+h>H||w<=0||h<=0)throw Error('camera');
 const source=sources[state],out=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)out.set(source.subarray(((cy+y)*W+cx)*4,((cy+y)*W+cx+w)*4),y*w*4);
 if(lightOn){sampler.sample(minutes,frame);const composed=new Uint8ClampedArray(out.length);createSceneLighting({nightTint:[.4,.47,.6],streetLayer:street,frameBytes:out.length})(out,composed,{nightMix:frame.nightMix,camera});return{pixels:composed,stats:{nightMix:frame.nightMix,state,waterPixels:0,rest,ms}};}
 return{pixels:out,stats:{nightMix:0,state,waterPixels:0,rest,ms}};
 };}
