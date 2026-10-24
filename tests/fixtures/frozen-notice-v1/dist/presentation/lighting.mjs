import {normalizeMinutes,TIME_MARKS,timeState} from './time-provider.mjs';
const freeze=o=>Object.freeze(o);
// Geoje-authored display settings; no original ROM values or palettes.
const point=(brightness,tint,opacity,saturation,contrast,shadow)=>freeze({brightness,ambientTint:freeze(tint),tintOpacity:opacity,saturation,contrast,shadowIntensity:shadow});
export const LIGHTING_KEYS=freeze({NIGHT:point(.76,[24,43,79],.24,.80,1.04,.16),DAWN:point(.94,[238,182,134],.12,.94,1,.06),DAY:point(1,[0,0,0],0,1,1,0),EVENING:point(.91,[210,116,88],.18,.93,1.03,.10)});
export const LIGHTING_PROFILES=freeze(Object.fromEntries(Object.entries({COAST:{nightTint:[32,66,112],nightBrightness:.84,reflection:1.25},FOREST:{nightTint:[19,60,53],nightBrightness:.65},URBAN:{nightTint:[39,44,71],nightBrightness:.82,artificialLights:true},RURAL:{nightTint:[31,47,69],nightBrightness:.75},CLIFF:{nightTint:[35,51,90],nightBrightness:.78},INDOOR:{isolated:true},GYM:{isolated:true,artificialLights:true},CAVE:{isolated:true,fixedBrightness:.72}}).map(([id,p])=>[id,freeze({id,...p})])));
// Holds at full day/night; every transition interpolates through shared endpoints, including midnight.
const KEYS=freeze([[0,'NIGHT'],[240,'NIGHT'],[390,'DAWN'],[540,'DAY'],[1020,'DAY'],[1110,'EVENING'],[1260,'NIGHT'],[1440,'NIGHT']].map(freeze));
export function resolveLighting({minutes=720,forcedState=null,profileId='COAST'}={}){
 const profile=LIGHTING_PROFILES[profileId]??LIGHTING_PROFILES.COAST,m=normalizeMinutes(minutes);
 let from,to,rate;
 if(forcedState&&LIGHTING_KEYS[forcedState]){from=to=forcedState;rate=0}else{const index=KEYS.findIndex((k,i)=>i<KEYS.length-1&&m>=k[0]&&m<KEYS[i+1][0]);const a=KEYS[index],b=KEYS[index+1];from=a[1];to=b[1];rate=from===to?0:(m-a[0])/(b[0]-a[0])}
 const value=key=>{const p=LIGHTING_KEYS[key];return key==='NIGHT'?{...p,brightness:profile.nightBrightness??p.brightness,ambientTint:profile.nightTint??p.ambientTint}:p};
 const a=value(from),b=value(to),mix=(x,y)=>x+(y-x)*rate;
 const result={profileId:profile.id,minutes:m,time:forcedState??timeState(m),from,to,interpolation:rate,brightness:mix(a.brightness,b.brightness),ambientTint:a.ambientTint.map((v,i)=>mix(v,b.ambientTint[i])),tintOpacity:mix(a.tintOpacity,b.tintOpacity),saturation:mix(a.saturation,b.saturation),contrast:mix(a.contrast,b.contrast),shadowIntensity:mix(a.shadowIntensity,b.shadowIntensity),waterReflection:profile.reflection??1,artificialLights:!!profile.artificialLights};
 if(profile.isolated)Object.assign(result,{from:'FIXED',to:'FIXED',interpolation:0,brightness:profile.fixedBrightness??1,ambientTint:[0,0,0],tintOpacity:0,saturation:1,contrast:1,shadowIntensity:0});
 return result;
}
export function timeForState(time){return TIME_MARKS[time]??720}
