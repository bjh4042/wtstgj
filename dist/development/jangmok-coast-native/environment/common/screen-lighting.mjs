// Sparse native-world screen layer. No source pixels or animation payloads are replaced.
const re=x=>{const f=Math.floor(x);return x-f===.5?f+f%2:Math.round(x);};
export function createScreenLayer({manifest,indices,transmission,expectedSourceSHA,expectedSize}){
 const size=manifest.sourceSize??[manifest.width,manifest.height];
 if(manifest.approval!=='ROOT_REQUESTED_CANDIDATE'||manifest.sourceSHA!==expectedSourceSHA||size[0]!==expectedSize[0]||size[1]!==expectedSize[1])throw Error('lighting-source-or-authority');
 if(!(indices instanceof Uint32Array)||!(transmission instanceof Float64Array)||indices.length!==manifest.count||transmission.length!==indices.length*3)throw Error('lighting-payload-shape');
 for(let i=0;i<indices.length;i++){if(indices[i]>=size[0]*size[1]||(i&&indices[i]<=indices[i-1]))throw Error('lighting-index-order');for(let c=0;c<3;c++)if(!Number.isFinite(transmission[i*3+c])||transmission[i*3+c]<0||transmission[i*3+c]>1)throw Error('lighting-transmission-range');}
 return Object.freeze({apply(host,{nightMix,camera}){
  const [cx,cy,w,h]=camera;if(!(host instanceof Uint8ClampedArray)||host.length!==w*h*4||![cx,cy,w,h].every(Number.isInteger)||cx<0||cy<0||cx+w>size[0]||cy+h>size[1]||!Number.isFinite(nightMix)||nightMix<0||nightMix>1)throw Error('lighting-frame-shape');
  if(nightMix===0)return;
  for(let i=0;i<indices.length;i++){const x=indices[i]%size[0]-cx,y=Math.floor(indices[i]/size[0])-cy;if(x<0||y<0||x>=w||y>=h)continue;const p=(y*w+x)*4;for(let c=0;c<3;c++)host[p+c]=re(255-(255-host[p+c])*(1-nightMix*(1-transmission[i*3+c])));}
 }});
}
