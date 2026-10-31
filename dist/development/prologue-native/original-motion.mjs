const HEX=/^[a-f0-9]{64}$/;
export function validateLayer(layer,sourceSHA){
 if(!layer||layer.verified!==true||!(layer.ids instanceof Uint32Array)||!(layer.rgb instanceof Uint8Array))return false;
 const m=layer.manifest;if(m.sourceSHA!==sourceSHA||!HEX.test(sourceSHA)||!Number.isInteger(m.pixels)||m.pixels!==layer.ids.length||![48,96].includes(m.frames)||layer.rgb.length!==m.pixels*m.frames*3||m.frameMs!==50||m.periodMs!==m.frames*50)return false;
 let prev=-1;for(const id of layer.ids){if(id<=prev||id>=2804*1122)return false;prev=id;}return true;
}
export function applyMotion(host,layers,meta){
 const no=reason=>({available:false,reason,writes:0});
 if(!(host instanceof Uint8ClampedArray)||!HEX.test(meta?.sourceSHA||'')||meta.sourceSHA!==meta.expectedSourceSHA||meta.verified!==true||meta.alreadyApplied!==false||!Number.isFinite(meta.timeMs)||!Array.isArray(meta.camera)||meta.camera.length!==4)return no('global-invalid');
 const [cx,cy,w,h]=meta.camera;if(![cx,cy,w,h].every(Number.isInteger)||cx<0||cy<0||w<1||h<1||cx+w>2804||cy+h>1122||host.length!==w*h*4)return no('camera-invalid');
 const r={available:true,writes:0,layers:{},oneClock:true};
 if(meta.rest===true)return r;
 for(const key of ['sw','central','boats']){
  const layer=layers[key],enabled=key==='boats'?meta.boatsEnabled:meta.waterEnabled;
  if(enabled!==true||meta.failedLayer===key||!validateLayer(layer,meta.sourceSHA)){r.layers[key]={applied:false};continue;}
  const m=layer.manifest,phase=((Math.floor(meta.timeMs/50)%m.frames)+m.frames)%m.frames;let writes=0;
  for(let i=0;i<layer.ids.length;i++){const id=layer.ids[i],x=id%2804-cx,y=Math.floor(id/2804)-cy;if(x<0||x>=w||y<0||y>=h)continue;const dst=(y*w+x)*4,src=(phase*m.pixels+i)*3;host[dst]=layer.rgb[src];host[dst+1]=layer.rgb[src+1];host[dst+2]=layer.rgb[src+2];writes++;}
  r.layers[key]={applied:true,phase,writes};r.writes+=writes;
 }
 return r;
}
