const validated=new WeakMap();
export function applyWater(host,indices,rgb,phase,meta,m){
 const no=reason=>({available:false,written:0,changed:0,reason});
 const s=m?.scenes?.[meta?.scene];if(!s||!meta||meta.revision!==m.revision||m.scenePeriodMs!==4800||m.uvPeriodMs!==2400)return no('contract');
 if(meta.enabled!==true||meta.conflict!==false||typeof meta.sourceSHA!=='string'||!/^[a-f0-9]{64}$/.test(meta.sourceSHA)||meta.sourceSHA!==s.sourceSHA)return no('guard');
 const cam=meta.camera;if(!Array.isArray(cam)||cam.length!==4)return no('camera');const[cx,cy,w,h]=cam,[W,H]=s.size;
 if(!cam.every(Number.isInteger)||cx<0||cy<0||w<1||h<1||cx+w>W||cy+h>H||host.length!==w*h*4||!Number.isInteger(phase)||phase<0||phase>=96)return no('dimensions');
 if(!(indices instanceof Uint32Array)||!(rgb instanceof Uint8Array)||indices.length!==s.allowedPixels||rgb.length!==48*indices.length*3)return no('payload');
 // Immutable SHA-verified payloads are validated once; no partial writes on invalid indices.
 if(validated.get(indices)!==s){let last=-1;for(const id of indices){if(id<=last||id>=W*H)return no('indices');last=id;}validated.set(indices,s);}
 let written=0,changed=0;const offset=(phase%48)*indices.length*3;
 for(let i=0;i<indices.length;i++){const id=indices[i],x=id%W-cx,y=Math.floor(id/W)-cy;if(x<0||x>=w||y<0||y>=h)continue;const d=(y*w+x)*4,t=offset+i*3;if(host[d]!==rgb[t]||host[d+1]!==rgb[t+1]||host[d+2]!==rgb[t+2])changed++;host[d]=rgb[t];host[d+1]=rgb[t+1];host[d+2]=rgb[t+2];written++;}
 return{available:true,written,changed,reason:null};
}
export const phaseAt=elapsed=>Math.floor(((elapsed%4800)+4800)%4800/50);
