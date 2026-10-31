/** Proof-only. Frame must be the CURRENT result of the unchanged water/boat compose. */
const re=x=>{const f=Math.floor(x);return x-f===.5?f+(f%2):Math.round(x);};
export function createFrameLighting({nightTint}) {
 if(!Array.isArray(nightTint)||nightTint.length!==3||nightTint.some(x=>!Number.isFinite(x)||x<0||x>1))throw Error('Explicit approved night tint required');
 const tint=Float64Array.from(nightTint),lut=new Uint8ClampedArray(3*256);let cachedMix=NaN;
 return function apply(animatedRGBA,outputRGBA,nightMix){
  if(!(animatedRGBA instanceof Uint8ClampedArray)||!(outputRGBA instanceof Uint8ClampedArray)||animatedRGBA.length!==outputRGBA.length||animatedRGBA.length%4)throw Error('RGBA frame mismatch');
  if(!Number.isFinite(nightMix)||nightMix<0||nightMix>1)throw Error('Invalid nightMix');
  if(animatedRGBA.buffer===outputRGBA.buffer&&animatedRGBA.byteOffset!==outputRGBA.byteOffset)throw Error('Overlapping views forbidden');
  if(nightMix===0){outputRGBA.set(animatedRGBA);return outputRGBA;}
  // Strict Uint8ClampedArray contract above makes all RGB inputs exact 8-bit integers.
  // Rebuild for every distinct exact mix; no clock/mix quantization. Original operation order and tie-to-even unchanged.
  if(cachedMix!==nightMix){const r=1+nightMix*(tint[0]-1),g=1+nightMix*(tint[1]-1),b=1+nightMix*(tint[2]-1);for(let v=0;v<256;v++){lut[v]=re(v*r);lut[256+v]=re(v*g);lut[512+v]=re(v*b)}cachedMix=nightMix;}
  for(let i=0;i<animatedRGBA.length;i+=4){outputRGBA[i]=lut[animatedRGBA[i]];outputRGBA[i+1]=lut[256+animatedRGBA[i+1]];outputRGBA[i+2]=lut[512+animatedRGBA[i+2]];outputRGBA[i+3]=animatedRGBA[i+3];}
  return outputRGBA;
 };
}
/** Single external clock owner; milliseconds and absolute lighting minutes are separate channels.
 * tick receives one monotonic elapsed delta. No internal timers or date sampling.
 * Default real-time rate: one minute per 60,000 ms; demo rate affects ONLY lighting.
 */
export function createClockOwner({absoluteMinutes,elapsedMs=0,lightingMinutesPerMs=1/60000}){
 if(![absoluteMinutes,elapsedMs,lightingMinutesPerMs].every(Number.isFinite)||elapsedMs<0)throw Error('Invalid clock initialization');
 const snapshot={absoluteMinutes,elapsedMs};let rate=lightingMinutesPerMs;
 return Object.freeze({read:()=>snapshot,tick(deltaMs){if(!Number.isFinite(deltaMs)||deltaMs<0)throw Error('Invalid monotonic delta');snapshot.elapsedMs+=deltaMs;snapshot.absoluteMinutes+=deltaMs*rate;return snapshot;},setLightingRate(next){if(!Number.isFinite(next))throw Error('Invalid rate');rate=next;},scrubLighting(next){if(!Number.isFinite(next))throw Error('Invalid minutes');snapshot.absoluteMinutes=next;return snapshot;}});
}
