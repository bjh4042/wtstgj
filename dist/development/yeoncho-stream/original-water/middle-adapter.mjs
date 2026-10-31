export const REVISION='YEONCHO_MIDDLE_SEMANTIC_WATER_20261027_R1';
export function sharedPhase(worldTimeMs){if(!Number.isFinite(worldTimeMs))throw Error('CLOCK_TIME');return ((Math.floor(worldTimeMs/100)%24)+24)%24;}
export function createMiddleWater({registration,source,gain,water}){
 if(registration.revision!==REVISION||source.length!==960*540*4||gain.length!==960*540||water.length!==960*540)throw Error('MIDDLE_INPUT_SHAPE');
 return {render(host,w,h,camera,time,meta){const out=host.slice(),phase=sharedPhase(time);const no=reason=>({pixels:out,phase,available:false,reason,written:0,changed:0});
 if(meta?.revision!==REVISION||!['open','closed'].includes(meta?.state)||meta.sourceSHA!==registration.sourcePins[meta.state].originalSHA||meta.maskSHA!==registration.files['water_u8.bin'].sha256||meta.overlayRevision!==null)return no('MIDDLE_IDENTITY_GUARD');
 if(host.length!==w*h*4||!camera.every(Number.isInteger)||camera.length!==2)return no('MIDDLE_VIEW_GUARD');
 if(meta.enabled===false)return {pixels:out,phase,available:true,reason:'disabled',written:0,changed:0};if(meta.enabled!==true)return no('MIDDLE_ENABLE_GUARD');
 const t=2*Math.PI*phase/24;let written=0,changed=0,rejectedCorners=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const wx=camera[0]+x,wy=camera[1]+y,lx=wx-1560,ly=wy-2700;if(lx<0||ly<0||lx>=960||ly>=540)continue;const i=ly*960+lx;if(!water[i]||gain[i]===0)continue;const sx=lx+Math.sin(wy/28-t)*gain[i]/Math.sqrt(2),sy=ly+Math.sin(wx/43+t)*gain[i]/Math.sqrt(2),x0=Math.floor(sx),y0=Math.floor(sy);if(x0<0||y0<0||x0+1>=960||y0+1>=540){rejectedCorners++;continue;}const p=y0*960+x0;if(!water[p]||!water[p+1]||!water[p+960]||!water[p+961]){rejectedCorners++;continue;}const u=sx-x0,v=sy-y0,q=(y*w+x)*4;let delta=false;for(let c=0;c<3;c++){const z=Math.round((1-v)*((1-u)*source[p*4+c]+u*source[(p+1)*4+c])+v*((1-u)*source[(p+960)*4+c]+u*source[(p+961)*4+c]));delta ||=out[q+c]!==z;out[q+c]=z;}written++;changed+=Number(delta);}
 return {pixels:out,phase,available:true,reason:'semantic-water-only',written,changed,rejectedCorners,alphaWrites:0};
 }};
}
