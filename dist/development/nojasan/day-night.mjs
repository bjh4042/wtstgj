/** Standalone proof utility. No clock, timer, DOM, map state or production imports. */
const finite=(x,name)=>{if(!Number.isFinite(x))throw new TypeError(`${name} must be finite`);return x;};
export const clamp01=x=>Math.max(0,Math.min(1,finite(x,'mix')));
export const smoothstep=x=>{x=clamp01(x);return x*x*(3-2*x);};
export const normalizeMinutes=x=>((finite(x,'minutes')%1440)+1440)%1440;
/** Caller must supply policy; no invented production dawn/dusk times. */
export function createSchedule({dawnStart,dayStart,duskStart,nightStart}) {
 const a=[dawnStart,dayStart,duskStart,nightStart];
 if(a.some(x=>!Number.isFinite(x)||x<0||x>1440)||!(dawnStart<dayStart&&dayStart<=duskStart&&duskStart<nightStart))throw new RangeError('Ordered same-day transition windows required');
 return Object.freeze({dawnStart,dayStart,duskStart,nightStart});
}
/** Stateless: reverse supplied minutes without resetting; frozen minutes freeze output. */
export function sampleNightMix(minutes,schedule) {
 const m=normalizeMinutes(minutes),s=schedule;
 if(m<s.dawnStart||m>=s.nightStart)return 1;
 if(m<s.dayStart)return 1-smoothstep((m-s.dawnStart)/(s.dayStart-s.dawnStart));
 if(m<s.duskStart)return 0;
 return smoothstep((m-s.duskStart)/(s.nightStart-s.duskStart));
}
export function createFrame(){return {nightMix:0,ambientMultiplier:new Float64Array(3),streetlight:0,windowEmission:0,windowSpill:0};}
/** Setup-time validation/copy, reusable output required. Exact selected RGB tint endpoints. */
export function createLightingSampler({day=[1,1,1],night,schedule}) {
 const d=Float64Array.from(day),n=Float64Array.from(night??[]);
 if(d.length!==3||n.length!==3||[...d,...n].some(x=>!Number.isFinite(x)||x<0||x>1))throw new RangeError('RGB multipliers must be three bounded values');
 const policy=schedule?createSchedule(schedule):null;
 const sampleMix=(mix,out)=>{
  const t=clamp01(mix);out.nightMix=t;
  for(let c=0;c<3;c++)out.ambientMultiplier[c]=t===0?d[c]:t===1?n[c]:d[c]+(n[c]-d[c])*t;
  // One common envelope: no independently ticking/flickering light channels.
  out.streetlight=t;out.windowEmission=t;out.windowSpill=t;return out;
 };
 return Object.freeze({sampleMix,sample(minutes,out){if(!policy)throw Error('No approved schedule supplied');return sampleMix(sampleNightMix(minutes,policy),out);}});
}
export const roundEven=x=>{const f=Math.floor(x);return x-f===.5?f+(f%2):Math.round(x);};
/** Matches selected compositors' round-even ambient then screen at t=1.
 * Source byte is always ORIGINAL, never the preceding output (no cumulative tint).
 * Transmission is precomputed/validated [0,1]. This scalar loop primitive allocates nothing.
 */
export function shadeChannel(source,ambientMultiplier,transmission,lightMix) {
 const ambient=roundEven(source*ambientMultiplier);
 return roundEven(255-(255-ambient)*(1-lightMix*(1-transmission)));
}
