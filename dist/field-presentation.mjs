// @ts-check
/** Keep native composition, integer CSS sizes and a device-pixel framebuffer.
 * Downsampling is explicit nearest-neighbour, not a browser CSS transform.
 * @param {number} w @param {number} h @param {boolean} coarse @param {number} dpr */
export function fieldPresentation(w,h,coarse,dpr=1){
  const touch=coarse||w<=900||h<=500,landscape=touch&&w>h;
  const availableW=w-(landscape?280:0),availableH=h-(touch&&!landscape?208:0);
  const divisor=[1,2,4,8,16].find(d=>1536/d<=availableW&&1024/d<=availableH)??16;
  const width=1536/divisor,height=1024/divisor,guide=!touch&&h-height>=36?36:0;
  const density=Number.isFinite(dpr)&&dpr>0?dpr:1;
  // Find integer CSS offsets that also land on integer physical pixels.
  let quantum=1;while(quantum<16&&Math.abs(quantum*density-Math.round(quantum*density))>.00001)quantum++;
  const snap=/** @param {number} x */x=>Math.max(0,Math.floor(x/quantum)*quantum);
  return {width,height,backingWidth:Math.round(width*density),backingHeight:Math.round(height*density),divisor,dpr:density,touch,landscape,guide,left:snap((w-width)/2),top:snap((h-height-(touch&&!landscape?208:guide))/2)};
}
