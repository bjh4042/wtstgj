/** Presentation only. Caller supplies actual water clip. No world/save mutation. */
const V={down:[0,1],right:[1,0],left:[-1,0],up:[0,-1]};
export function surfWakeGeometry({x=0,y=0,actorHeight=80,boardAspect=1741/499,moving=false,facing='down',time=0,reducedMotion=false}={}) {
 const width=actorHeight*1.5,height=width/boardAspect,[dx,dy]=V[facing]??V.down;
 const phase=reducedMotion?0:(time%1400)/1400,trail=moving?actorHeight*(.2+phase*.08):0;
 return {x,y,width,height,dx,dy,trail,phase,tail:[x-dx*(width*.45+trail*.5),y-dy*(height*.45+trail*.5)]};
}
export function drawSurfWake(ctx,options={},layer='rear') {
 const g=surfWakeGeometry(options),h=options.actorHeight??80;ctx.save();
 // Caller must clip this component to currently rendered water geometry.
 ctx.strokeStyle='#c6e8df';ctx.lineWidth=Math.max(.65,h*.008);ctx.lineCap='round';
 if(layer==='front'){
  ctx.globalAlpha*=.27;for(const [start,end] of [[.10*Math.PI,.28*Math.PI],[.72*Math.PI,.90*Math.PI]]){ctx.beginPath();ctx.ellipse(g.x,g.y,g.width*.515,g.height*.48,0,start,end);ctx.stroke()}
 }else if(options.moving){
  ctx.globalAlpha*=options.reducedMotion?.24:.30-g.phase*.07;
  const nx=-g.dy,ny=g.dx,side=h*.22;
  for(const sign of [-1,1]){const sx=g.x-g.dx*g.width*.20+nx*side*sign,sy=g.y-g.dy*g.height*.20+ny*side*.45*sign;ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(g.tail[0]+nx*side*.9*sign,g.tail[1]+ny*side*.5*sign,g.tail[0]-g.dx*g.trail+nx*side*1.4*sign,g.tail[1]-g.dy*g.trail+ny*side*.7*sign);ctx.stroke()}
 }
 ctx.restore();return g;
}
