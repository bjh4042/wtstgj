// Reconstructed renderer. One immutable source lookup, shared world phase, reusable output.
export function renderInto(tile,phase,worldX,worldY,width,height,out,effect=true){
 const {base,gain,allowed,x,y,w,h}=tile;
 if(!Number.isInteger(phase)||phase<0||phase>=24||out.length!==width*height*4)throw Error('RENDER_SHAPE_OR_PHASE');
 if(worldX<x||worldY<y||worldX+width>x+w||worldY+height>y+h)throw Error('RENDER_OUTSIDE_SOURCE');
 const t=2*Math.PI*phase/24;
 for(let oy=0;oy<height;oy++)for(let ox=0;ox<width;ox++){
  const wx=worldX+ox,wy=worldY+oy,lx=wx-x,ly=wy-y,i=ly*w+lx,o=(oy*width+ox)*4;
  out[o]=base[i*4];out[o+1]=base[i*4+1];out[o+2]=base[i*4+2];out[o+3]=base[i*4+3];
  if(!effect||gain[i]===0)continue;
  const sx=lx+Math.sin(wy/28-t)*gain[i]/Math.sqrt(2),sy=ly+Math.sin(wx/43+t)*gain[i]/Math.sqrt(2),x0=Math.floor(sx),y0=Math.floor(sy);
  if(x0<0||y0<0||x0+1>=w||y0+1>=h)continue;
  const p=y0*w+x0;
  if(!allowed[p]||!allowed[p+1]||!allowed[p+w]||!allowed[p+w+1])continue;
  const u=sx-x0,v=sy-y0;
  for(let c=0;c<3;c++)out[o+c]=Math.round((1-v)*((1-u)*base[p*4+c]+u*base[(p+1)*4+c])+v*((1-u)*base[(p+w)*4+c]+u*base[(p+w+1)*4+c]));
 }
 return out;
}
export function sharedPhase(worldTimeMs){
 if(!Number.isFinite(worldTimeMs))throw Error('CLOCK_TIME');
 return ((Math.floor(worldTimeMs/100)%24)+24)%24;
}
