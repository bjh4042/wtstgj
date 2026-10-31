// NEW current-art foreground registration candidate only; no movement/collision changes.
export const CORE_EAST_CURRENT=Object.freeze({emitter:[1178,613],base:[1178,646],depthY:646,roi:[1165,589,1191,650],polygon:[[1178,590],[1182,598],[1189,604],[1186,609],[1184,621],[1181,625],[1181,637],[1185,643],[1183,648],[1169,648],[1166,644],[1173,638],[1174,625],[1171,621],[1169,608],[1166,605],[1173,598]]});
export function createCoreEastForeground({image,canvasFactory}){
 const r=CORE_EAST_CURRENT,[x,y,x1,y1]=r.roi,w=x1-x,h=y1-y,c=canvasFactory(w,h),g=c.getContext('2d'),m=canvasFactory(w,h),q=m.getContext('2d');
 q.beginPath();r.polygon.forEach(([px,py],i)=>i?q.lineTo(px-x,py-y):q.moveTo(px-x,py-y));q.closePath();q.fill();const membership=q.getImageData(0,0,w,h).data;
 g.drawImage(image,-x,-y);const p=g.getImageData(0,0,w,h);let retained=0,rejected=0;
 for(let i=0;i<w*h;i++){const at=i*4,R=p.data[at],G=p.data[at+1],B=p.data[at+2],wx=x+i%w,wy=y+Math.floor(i/w);const navy=B>R*.85&&B>G*.8&&R<140&&G<155;const glass=wx>=1172&&wx<=1184&&wy>=608&&wy<=620&&R>G&&G>B;const yes=membership[at+3]>=128&&(navy||glass);if(yes){p.data[at+3]=255;retained++}else{p.data[at+3]=0;rejected++}}
 g.putImageData(p,0,0);m.width=0;m.height=0;let disposed=false;return Object.freeze({diagnostics:()=>({retained,rejected,bounds:[x,y,x1,y1],sourceRGBModified:0}),draw(ctx,{offsetX=0,offsetY=0,actorFoot}={}){if(disposed||!Array.isArray(actorFoot)||actorFoot[1]>=r.depthY)return;ctx.drawImage(c,x-offsetX,y-offsetY)},dispose(){if(disposed)return;disposed=true;c.width=0;c.height=0}})
}
