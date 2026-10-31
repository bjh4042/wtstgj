// Bounded visual adapter only. Original immutable source/mask/gain/phase math retained.
import{renderInto,sharedPhase}from'./upper-render.mjs';
export const UPPER_WATER=Object.freeze({sourceSHA:'9309737253c4f43393162ab6b8ba9b316cb4f32ba030c9630e9c8ae01f152357',origin:[3370,1200],size:[964,540],activeBounds:[3370,1526,4334,1578],frameMs:100,frames:24});
export function createUpperWater({source,gain,allowed}){
 const base=new Uint8Array(source),mask=new Uint8Array(allowed),values=new Float64Array(gain),W=964,H=540;
 if(base.length!==W*H*4||mask.length!==W*H||values.length!==W*H||mask.some(v=>v!==0&&v!==1)||values.some(v=>!Number.isFinite(v)||v<0))throw Error('UPPER_INPUT_SHAPE');
 const tile={x:3370,y:1200,w:W,h:H,base,gain:values,allowed:mask},ids=[];for(let i=0;i<values.length;i++)if(values[i]>0)ids.push(i);
 if(ids.length!==13597||ids.some(i=>Math.floor(i/W)<326||Math.floor(i/W)>=378))throw Error('UPPER_SELECTED_SCOPE');
 const cache=new Uint8ClampedArray(W*52*4);let phase=-1,disposed=false;
 return Object.freeze({draw(ctx,origin,timeMs,{enabled=true}={}){
  if(disposed)throw Error('UPPER_DISPOSED');if(!Number.isFinite(timeMs)||timeMs<0||!Array.isArray(origin)||origin.length!==2||!origin.every(Number.isInteger)||ctx.canvas.width!==960||ctx.canvas.height!==540)throw Error('UPPER_FRAME');
  const next=sharedPhase(timeMs),[ox,oy]=origin;if(!enabled||ox>=4334||ox+960<=3370||oy>=1578||oy+540<=1526)return{phase:next,written:0,rendered:false};
  let rendered=false;if(phase!==next){renderInto(tile,next,3370,1526,W,52,cache,true);phase=next;rendered=true}
  const frame=ctx.getImageData(0,0,960,540);let written=0;for(const i of ids){const wx=3370+i%W,wy=1200+Math.floor(i/W),x=wx-ox,y=wy-oy;if(x<0||y<0||x>=960||y>=540)continue;const p=(y*960+x)*4,q=((wy-1526)*W+wx-3370)*4;for(let c=0;c<3;c++)frame.data[p+c]=cache[q+c];written++}
  if(written)ctx.putImageData(frame,0,0);return{phase:next,written,rendered};
 },dispose(){if(disposed)return;disposed=true;base.fill(0);mask.fill(0);values.fill(0);cache.fill(0);ids.length=0}})
}
