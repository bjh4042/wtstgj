// Preview only: no game service, storage, inventory, HP or audio APIs.
export const MAX_PARTY=6;
export const DURATION=5200;
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n)};
export function sample(elapsed,count){
 if(!Number.isInteger(count)||count<0||count>MAX_PARTY)throw Error('시연 인원은 0~6이어야 합니다.');
 const t=clamp(elapsed,0,DURATION);
 const phase=!count||t>=DURATION?'idle':t<900?'placing':t<2800?'sequence':t<3900?'healing':t<4500?'complete':'retrieving';
 const balls=Array.from({length:count},(_,i)=>{
  const placed=ease((t-i*100)/300),removed=ease((t-4500-i*55)/350);
  const onset=900+i*(1900/count),lit=ease((t-onset)/250);
  const shared=t>=2800?Math.sin(clamp((t-2800)/1100)*Math.PI):0;
  return {index:i,alpha:phase==='idle'?0:placed*(1-removed),lift:(1-placed)*12+removed*12,glow:phase==='idle'?0:(t<2800?lit*.55:t<3900?.55+shared*.35:.55)*(1-removed)};
 });
 return {phase,elapsed:t,count,balls,complete:count>0&&t>=3900&&t<4500};
}
export class HealingPreview {
 constructor({onChange=()=>{},onDemoComplete=()=>{}}={}){this.onChange=onChange;this.onDemoComplete=onDemoComplete;this.reset();}
 reset(){this.elapsed=0;this.count=0;this.running=false;this.paused=false;this.lastTimestamp=null;this.notified=false;this.onChange(this.snapshot());}
 start(count){if(this.running||this.paused)return false;if(!Number.isInteger(count)||count<0||count>MAX_PARTY)throw Error('시연 인원은 0~6이어야 합니다.');if(count===0){this.reset();return false;}this.count=count;this.elapsed=0;this.running=true;this.paused=false;this.lastTimestamp=null;this.notified=false;this.onChange(this.snapshot());return true;}
 tick(timestamp){if(!this.running)return this.snapshot();if(!Number.isFinite(timestamp))throw Error('Invalid rAF timestamp');const dt=this.lastTimestamp===null?0:Math.max(0,timestamp-this.lastTimestamp);this.lastTimestamp=timestamp;this.elapsed=Math.min(DURATION,this.elapsed+dt);if(this.elapsed>=3900&&!this.notified){this.notified=true;this.onDemoComplete({count:this.count,previewOnly:true});}if(this.elapsed>=DURATION){this.running=false;this.lastTimestamp=null;}const s=this.snapshot();this.onChange(s);return s;}
 pause(){if(!this.running)return false;this.running=false;this.paused=true;this.lastTimestamp=null;return true;}
 resume(){if(!this.paused)return false;this.paused=false;this.running=true;this.lastTimestamp=null;return true;}
 cancel(){this.reset();}
 snapshot(){return {...sample(this.elapsed,this.count),running:this.running,paused:this.paused};}
}
// Confirmed original sprite only; x/y is the bottom support contact, not sprite center.
export function drawBall(g,image,contract,x,y,height=12,alpha=1){
 if(!image||!contract?.sourceRect)throw Error('확인된 생태볼 아이템 원본이 필요합니다.');
 const [sx,sy,sw,sh]=contract.sourceRect;if(!(sw>0&&sh>0))throw Error('생태볼 원본 프레임 계약이 올바르지 않습니다.');
 const scale=height/sh,w=sw*scale;
 g.save();g.globalAlpha=alpha;g.imageSmoothingEnabled=true;g.drawImage(image,sx,sy,sw,sh,x-w/2,y-height,w,height);g.restore();
}
function star(g,x,y,r,alpha,color='#fffdf1'){
 if(alpha<=0)return;g.save();g.globalAlpha=alpha;g.fillStyle=color;g.beginPath();
 for(const [i,[dx,dy]]of [[0,[0,-r]],[1,[r*.38,-r*.38]],[2,[r,0]],[3,[r*.38,r*.38]],[4,[0,r]],[5,[-r*.38,r*.38]],[6,[-r,0]],[7,[-r*.38,-r*.38]]]){i?g.lineTo(x+dx,y+dy):g.moveTo(x+dx,y+dy)}
 g.closePath();g.fill();g.restore();
}
export function slotAnchor(layout,index){return layout.ballAnchors?.[index]??layout.slots[index];}
export function sparkleState(state,index){
 const active=state.phase==='sequence'||state.phase==='healing'||state.phase==='complete';
 const glow=state.balls[index]?.glow??0;if(!active||!glow)return [0,0];
 const wave=(offset)=>{const t=(state.elapsed+index*137+offset)%1050/1050;return Math.sin(Math.PI*t)**4;};
 const strength=Math.min(1,glow/.55)*.9;return [wave(0)*strength,wave(525)*strength*.85];
}
export function drawHealing(g,state,layout,ballImage,ballContract){
 const height=layout.ballPlacement?.height??12;
 // Individual lower-contact anchors, stable back-to-front depth order. No whole-device clip on sprites.
 const balls=state.balls.filter(b=>b.alpha>0).sort((a,b)=>slotAnchor(layout,a.index)[1]-slotAnchor(layout,b.index)[1]);
 for(const b of balls){const [sx,sy]=slotAnchor(layout,b.index),floorY=sy+(layout.ballPlacement?.shadowOffsetY??.5);
  g.save();g.globalAlpha=b.alpha*.24*(1-b.lift/16);g.fillStyle='#64543d';g.beginPath();g.ellipse(sx,floorY,(layout.ballPlacement?.shadowWidth??8)/2,(layout.ballPlacement?.shadowHeight??2.4)/2,0,0,Math.PI*2);g.fill();g.restore();
  // Light/glints are restricted per occupied slot; sprite upper pixels are not clipped by this region.
  const clip=layout.slotLightBounds?.[b.index]??[sx-11,sy-6,22,12],sparkleClip=layout.slotSparkleBounds?.[b.index]??[sx-11,sy-height-5,22,height+8];
  if(b.glow){g.save();g.beginPath();g.rect(...clip);g.clip();const radius=layout.glowRadius??11,q=g.createRadialGradient(sx,sy,1,sx,sy,radius);q.addColorStop(0,`rgba(225,246,180,${b.glow*.38})`);q.addColorStop(1,'rgba(225,246,180,0)');g.fillStyle=q;g.fillRect(sx-radius,sy-radius,radius*2,radius*2);g.restore();}
  drawBall(g,ballImage,ballContract,sx,sy-b.lift,height,b.alpha);
  const pulses=sparkleState(state,b.index);g.save();g.beginPath();g.rect(...sparkleClip);g.clip();star(g,sx+8,sy-8,3,pulses[0]*b.alpha,'#996316');star(g,sx+8,sy-8,2.05,pulses[0]*b.alpha,'#fffdf1');star(g,sx-8,sy-14,2.6,pulses[1]*b.alpha,'#996316');star(g,sx-8,sy-14,1.8,pulses[1]*b.alpha,'#fffdf1');g.restore();
 }
}
