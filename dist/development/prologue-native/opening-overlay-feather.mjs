import{OPENING_PATCH as R}from'./opening-overlay.mjs';
/** Private per-renderer scratch tiles; original PNG bytes are never edited. */
export function createOpeningOverlay({patch,canvasFactory}){
 let disposed=false;const tiles=[];const dispose=()=>{if(disposed)return;disposed=true;for(const t of tiles){t.c.width=0;t.c.height=0}};
 try{for(const[x0,y0,x1,y1]of R.rois){const w=x1-x0,h=y1-y0,c=canvasFactory(w,h);tiles.push({c,x0,y0,w,h});const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.drawImage(patch,200-x0,40-y0,1000,380);const pixels=ctx.getImageData(0,0,w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const fade=Math.max(0,Math.min(1,x/8,y/8,(w-1-x)/8,(h-1-y)/8));pixels.data[(y*w+x)*4+3]=Math.round(pixels.data[(y*w+x)*4+3]*fade)}ctx.putImageData(pixels,0,0)}}catch(e){dispose();throw e}
 return Object.freeze({draw(ctx,{offsetX=0,offsetY=0,scale=1}={}){if(disposed)return;ctx.save();try{for(const{c,x0,y0,w,h}of tiles)ctx.drawImage(c,(x0-offsetX)*scale,(y0-offsetY)*scale,w*scale,h*scale)}finally{ctx.restore()}},dispose});
}
