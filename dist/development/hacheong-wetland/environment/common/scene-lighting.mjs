import {createFrameLighting} from './frame-lighting.mjs';
export function createSceneLighting({nightTint,windowLayer=null,streetLayer=null,frameBytes=960*540*4}){
 const ambient=createFrameLighting({nightTint}),checkpoint=new Uint8ClampedArray(frameBytes);
 return function apply(animated,output,{nightMix,camera,windowsEnabled=true,streetEnabled=true,windowBad=false,streetBad=false,ambientBad=false}){
  const result={ambientApplications:0,windowApplied:false,streetApplied:false,windowAvailable:!!windowLayer,streetAvailable:!!streetLayer,ambientFailure:false,windowFailure:false,streetFailure:false};
  if(animated.length!==frameBytes||output.length!==frameBytes)throw Error('scene-frame-size');
  try{if(ambientBad)throw Error('injected-ambient');ambient(animated,output,nightMix);result.ambientApplications=nightMix>0?1:0;}catch(e){output.set(animated);result.ambientFailure=true;return result;}
  if(nightMix===0)return result;
  // Preserve already-composited animation/ambient/preceding light on each local failure.
  for(const[key,layer,enabled,bad]of[['window',windowLayer,windowsEnabled,windowBad],['street',streetLayer,streetEnabled,streetBad]]){
   if(!enabled)continue;if(bad){result[key+'Failure']=true;continue;}if(!layer)continue;
   checkpoint.set(output);try{layer.apply(output,{nightMix,camera});result[key+'Applied']=true;}catch(e){output.set(checkpoint);result[key+'Failure']=true;}
  }
  return result;
 };
}
