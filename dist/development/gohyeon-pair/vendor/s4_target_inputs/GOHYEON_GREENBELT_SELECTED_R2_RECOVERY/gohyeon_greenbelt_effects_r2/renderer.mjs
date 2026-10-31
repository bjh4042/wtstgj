import {applyOptical} from './selected-water-adapter.mjs';
import {createFrameLighting} from './frame-lighting.mjs';
export function createRenderer(m,source,layers,light){
 const [W,H]=m.size,ambient=createFrameLighting({nightTint:m.light.tint});
 if(source.length!==W*H*4)throw Error('source shape');
 for(let li=0;li<layers.length;li++){const l=layers[li];if(l.rgb.length!==l.ids.length*m.layers[li].frames*3)throw Error('UV payload');for(let i=0;i<l.ids.length;i++)if(l.ids[i]>=W*H||(i&&l.ids[i]<=l.ids[i-1]))throw Error('UV order')}
 if(light.trans.length!==light.ids.length*3)throw Error('light payload');
 return function frame(camera,t,{enabled=true,water=true,leaf=true,lighting=true,rest=false,nightMix=0,sourceSHA=m.sourceSHA}={}){
 const[cx,cy,w,h]=camera;if(![cx,cy,w,h].every(Number.isInteger)||cx<0||cy<0||cx+w>W||cy+h>H||!Number.isFinite(t))throw Error('camera/time');
 const out=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)out.set(source.subarray(((cy+y)*W+cx)*4,((cy+y)*W+cx+w)*4),y*w*4);
 if(!enabled||rest||sourceSHA!==m.sourceSHA)return out;
 if(water)applyOptical(out,layers[0].ids,layers[0].rgb,{sourceSHA,revision:m.selectedWater.revision,rest:false,enabled:true,conflict:false,timeMs:t,camera},m.selectedWater);
 for(let i=1;i<layers.length;i++){if(i===0&&!water||i===1&&!leaf)continue;const l=layers[i],period=m.layers[i].periodMs,phase=Math.floor((((t%period)+period)%period)/period*64);for(let k=0;k<l.ids.length;k++){const id=l.ids[k],x=id%W-cx,y=Math.floor(id/W)-cy;if(x<0||y<0||x>=w||y>=h)continue;out.set(l.rgb.subarray((phase*l.ids.length+k)*3,(phase*l.ids.length+k)*3+3),(y*w+x)*4)}}
 if(lighting){ambient(out,out,nightMix);for(let k=0;k<light.ids.length;k++){const id=light.ids[k],x=id%W-cx,y=Math.floor(id/W)-cy;if(x<0||y<0||x>=w||y>=h)continue;const d=(y*w+x)*4;for(let c=0;c<3;c++)out[d+c]=Math.round(255-(255-out[d+c])*(1-nightMix*(1-light.trans[k*3+c])));}}
 return out;
 };
}
