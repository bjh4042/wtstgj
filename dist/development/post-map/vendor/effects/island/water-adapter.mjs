const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),rev=v=>typeof v==='string'&&v.trim().length>0;
export function valid(host,ids,rgb,meta,m){
 if(!m||!meta||!(host instanceof Uint8Array||host instanceof Uint8ClampedArray)||!(ids instanceof Uint32Array)||!(rgb instanceof Uint8Array))return false;
 if(!hex(meta.sourceSHA)||!hex(m.sourceSHA)||meta.sourceSHA!==m.sourceSHA||!rev(meta.revision)||!rev(m.revision)||meta.revision!==m.revision||meta.verified!==true||meta.conflict!==false||meta.alreadyApplied!==false||!Number.isFinite(meta.timeMs)||typeof meta.enabled!=='boolean'||typeof meta.rest!=='boolean')return false;
 if(!Array.isArray(m.size)||m.size.length!==2||m.size[0]!==3072||m.size[1]!==1024||m.ownerPixels!==39369||m.frames!==120||m.periodMs!==6000||m.frameMs!==50||m.clocks!==1||!hex(m.indicesSHA)||!hex(m.rgbSHA))return false;
 if(!Array.isArray(meta.camera)||meta.camera.length!==4)return false;const[x,y,w,h]=meta.camera;if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<1||h<1||x+w>3072||y+h>1024||host.length!==w*h*4||ids.length!==39369||rgb.length!==120*39369*3)return false;
 let prev=-1;for(const id of ids){if(id<=prev||id>=3072*1024)return false;prev=id;}return true;
}
export function compose(host,ids,rgb,meta,m){const r={available:false,waterWritten:0,waterApplications:0};if(!valid(host,ids,rgb,meta,m))return r;r.available=true;if(!meta.enabled||meta.rest)return r;const[cx,cy,w,h]=meta.camera,t=((meta.timeMs%6000)+6000)%6000,phase=Math.floor(t/50),off=phase*ids.length*3;r.waterApplications=1;for(let i=0;i<ids.length;i++){const id=ids[i],x=id%3072-cx,y=Math.floor(id/3072)-cy;if(x<0||y<0||x>=w||y>=h)continue;const d=(y*w+x)*4,k=off+i*3;host[d]=rgb[k];host[d+1]=rgb[k+1];host[d+2]=rgb[k+2];r.waterWritten++;}return r;}
