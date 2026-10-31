/** NEW_LAYER_PROPOSAL only. Recompose exact source pixels; no painting or source mutation. */
export function applyLampForeground({rgba,original,camera,actorFoot,layers,occlusionAlpha}){
 const[cx,cy,w,h]=camera;if(rgba.length!==w*h*4||original.length!==rgba.length||occlusionAlpha.length!==w*h)throw Error('LAMP_LAYER_BUFFER_SHAPE');let pixels=0,active=[];
 for(const l of layers){if(actorFoot[1]>=l.depthGroundY)continue;active.push(l.id);const[a,b,c,d]=l.box,mw=c-a;if(l.mask.length!==mw*(d-b))throw Error('LAMP_MASK_SHAPE');for(let y=b;y<d;y++)for(let x=a;x<c;x++){if(l.mask[(y-b)*mw+x-a]!==1||x<cx||y<cy||x>=cx+w||y>=cy+h)continue;const i=(y-cy)*w+x-cx;for(let k=0;k<4;k++)rgba[i*4+k]=original[i*4+k];occlusionAlpha[i]=0;pixels++;}}
 return {active,pixels,authorship:'NEW_LAYER_PROPOSAL',sourcePixelsModified:false};
}
