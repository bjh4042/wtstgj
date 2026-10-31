// Original selected CD/M/L renderer math is imported byte-exact; only viewport dispatch is new.
import{renderCD}from'./original-water/adapter.mjs';import{createMiddleWater,REVISION as MR}from'./original-water/middle-adapter.mjs';
export function createSelectedStreamWater({registration,middleRegistration,cdSource,cdWater,cdGain,middleSource,middleWater,middleGain,lower}){
 let middle=createMiddleWater({registration:middleRegistration,source:middleSource,water:middleWater,gain:middleGain}),bank={registration,source:cdSource,water:cdWater,gain:cdGain};let disposed=false;const frames=[...lower];
 const intersects=(o,b)=>o[0]<b[2]&&o[0]+960>b[0]&&o[1]<b[3]&&o[1]+540>b[1];
 return Object.freeze({draw(ctx,origin,timeMs){if(disposed)throw Error('STREAM_WATER_DISPOSED');if(!Number.isFinite(timeMs)||timeMs<0)throw Error('CLOCK_TIME');const phase=Math.floor(timeMs/100)%24;
  if(intersects(origin,[1800,3280,2130,3900]))ctx.drawImage(frames[phase],1800-origin[0],3280-origin[1]);
  const m=intersects(origin,[1560,2700,2520,3240]),cd=intersects(origin,registration.cdWorldLTRB);if(!m&&!cd)return;
  const frame=ctx.getImageData(0,0,960,540);let out=frame.data;
  if(m){const result=middle.render(out,960,540,origin,timeMs,{revision:MR,state:'open',sourceSHA:registration.sourcePins.open,maskSHA:middleRegistration.files['water_u8.bin'].sha256,overlayRevision:null,enabled:true});if(!result.available)throw Error('STREAM_MIDDLE_WATER_HOLD');out=result.pixels}
  if(cd){const result=renderCD(out,960,540,origin,timeMs,bank,{revision:registration.revision,state:'open',sourceSHA:registration.sourcePins.open,maskSHA:registration.inputs['cd_water_u8.bin'].sha256,overlayRevision:null,enabled:true});if(!result.available)throw Error('STREAM_CD_WATER_HOLD');out=result.pixels}
  frame.data.set(out);ctx.putImageData(frame,0,0)
 },dispose(){disposed=true;middle=null;bank=null;frames.length=0}})
}
