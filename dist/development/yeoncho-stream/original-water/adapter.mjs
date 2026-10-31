import {renderInto,sharedPhase} from './upper-render.mjs';
import {createMiddleWater,REVISION as MR} from './middle-adapter.mjs';
export {sharedPhase,createMiddleWater};
export const REVISION='YEONCHO_MAPWIDE_CD_ADDITIONAL_20261027_R1';
export function renderCD(host,w,h,camera,time,bank,meta){
 const out=host.slice(),phase=sharedPhase(time),r=bank.registration;const no=reason=>({pixels:out,phase,available:false,reason,written:0,changed:0,rejectedCorners:0});
 if(r.revision!==REVISION||meta.revision!==REVISION||!['open','closed'].includes(meta.state)||meta.sourceSHA!==r.sourcePins[meta.state]||meta.maskSHA!==r.inputs['cd_water_u8.bin'].sha256||meta.overlayRevision!==null)return no('CD_ONLY_IDENTITY_HOLD');
 const [ox,oy,ex,ey]=r.cdWorldLTRB,W=ex-ox,H=ey-oy;if(host.length!==w*h*4||camera.length!==2||!camera.every(Number.isInteger)||bank.source.length!==W*H*4||bank.water.length!==W*H||bank.gain.length!==W*H)return no('CD_SHAPE_HOLD');
 if(meta.enabled===false)return {...no('disabled'),available:true};if(meta.enabled!==true)return no('CD_ENABLE_HOLD');
 const t=2*Math.PI*phase/24;let written=0,changed=0,rejectedCorners=0;const{source,water,gain}=bank;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const wx=camera[0]+x,wy=camera[1]+y,lx=wx-ox,ly=wy-oy;if(lx<0||ly<0||lx>=W||ly>=H)continue;const i=ly*W+lx;if(!water[i]||gain[i]<=0)continue;const sx=lx+Math.sin(wy/28-t)*gain[i]/Math.sqrt(2),sy=ly+Math.sin(wx/43+t)*gain[i]/Math.sqrt(2),a=Math.floor(sx),b=Math.floor(sy);if(a<0||b<0||a+1>=W||b+1>=H){rejectedCorners++;continue;}const p=b*W+a;if(!water[p]||!water[p+1]||!water[p+W]||!water[p+W+1]){rejectedCorners++;continue;}const u=sx-a,v=sy-b,q=(y*w+x)*4;let d=false;for(let c=0;c<3;c++){const z=Math.round((1-v)*((1-u)*source[p*4+c]+u*source[(p+1)*4+c])+v*((1-u)*source[(p+W)*4+c]+u*source[(p+W+1)*4+c]));d ||=out[q+c]!==z;out[q+c]=z;}written++;changed+=Number(d);}
 return {pixels:out,phase,available:true,reason:'CD semantic only',written,changed,rejectedCorners};
}
export function compose(host,state,view,time,bank,invalid='',enabled=true){const r=bank.registration,[x,y,w,h]=r.views[view],phase=sharedPhase(time);let out=host.slice();const stats={};
 if(enabled){
 if(view==='U'&&bank.verified.U&&invalid!=='U'){renderInto(bank.upper[state],phase,x,y,w,h,out,true);stats.U='retained';}
 if(bank.verified.M&&invalid!=='M'){const m=bank.middle,rr=m.registration,z=m.adapter.render(out,w,h,[x,y],time,{revision:MR,state,sourceSHA:r.sourcePins[state],maskSHA:rr.files['water_u8.bin'].sha256,overlayRevision:null,enabled:true});out=z.pixels;stats.M=z.changed;}
 if(bank.verified.L&&invalid!=='L'){const f=bank.lower[phase];let n=0;for(let ly=0;ly<620;ly++)for(let lx=0;lx<330;lx++){const q=(ly*330+lx)*4,a=f[q+3],xx=lx+1800-x,yy=ly+3280-y;if(!a||xx<0||yy<0||xx>=w||yy>=h)continue;const d=(yy*w+xx)*4;for(let c=0;c<3;c++)out[d+c]=Math.round((f[q+c]*a+out[d+c]*(255-a))/255);n++;}stats.L=n;}
 if(bank.verified.CD){const z=renderCD(out,w,h,[x,y],time,bank.cd,{revision:invalid==='CD'?'INVALID':REVISION,state,sourceSHA:r.sourcePins[state],maskSHA:r.inputs['cd_water_u8.bin'].sha256,overlayRevision:null,enabled:true});out=z.pixels;stats.CD={available:z.available,written:z.written,changed:z.changed,rejectedCorners:z.rejectedCorners};}
 }
 let changed=0;for(let i=0;i<out.length;i+=4)changed+=Number(out[i]!==host[i]||out[i+1]!==host[i+1]||out[i+2]!==host[i+2]);return {pixels:out,phase,changed,stats,available:enabled?!invalid:true};}
