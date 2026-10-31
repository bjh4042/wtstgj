import {applyRefraction} from '../gohyeon_outdoor_lighting_r1/upstream/Gohyeon_Expanded4294_River_CalmRefraction_Selected_R1/consumer/adapter.mjs';
import {createFrameLighting} from '../jisepo_daynight_consumer/frame-lighting.mjs';
const ambient=createFrameLighting({nightTint:[.4,.47,.6]});
export function compose(host,assets,meta){
 const no=reason=>({available:false,reason});if(!(host instanceof Uint8ClampedArray)||!meta||!['OPEN','CLOSED'].includes(meta.state)||meta.sourceSHA!==assets.waterManifest?.sources?.[meta.state]?.sha256||meta.verified!==true||meta.alreadyApplied!==false||!Number.isFinite(meta.timeMs)||!Number.isFinite(meta.nightMix)||meta.nightMix<0||meta.nightMix>1||!Array.isArray(meta.camera)||meta.camera.length!==4)return no('global-invalid');
 const [x,y,w,h]=meta.camera;if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<1||h<1||x+w>4294||y+h>2400||host.length!==w*h*4)return no('camera-invalid');
 const water=applyRefraction(host,assets.waterIds,assets.waterRGB,{...meta,revision:assets.waterManifest.revision,enabled:meta.waterEnabled&&!meta.waterBad,conflict:false,rest:meta.rest===true},assets.waterManifest);
 ambient(host,host,meta.nightMix);let light={writes:0},lightFailure=false;
 if(meta.lightsEnabled&&!meta.lightBad){const before=host.slice();try{light=assets.light.apply(host,meta);}catch(e){host.set(before);lightFailure=true;}}
 return{available:true,water,light,lightFailure,ambientApplications:meta.nightMix>0?1:0,sourceState:meta.state};
}
