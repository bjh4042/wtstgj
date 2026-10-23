import {LEGACY_VFX_FAMILIES,emitVfxAudio} from './presentation/battle-vfx.mjs';
const TAU=Math.PI*2;

// Presentation metadata only. Accuracy, damage, PP and status remain in model.mjs.
export const MOVE_EFFECTS={
 peck:{visual:'peck',duration:680,contact:.58,audio:['square',[930,1180,1420]]},
 petal:{visual:'petal',duration:820,contact:.68,audio:['triangle',[659,784,988]]},
 leaf:{visual:'leaf',duration:840,contact:.70,audio:['triangle',[760,610,860,720]]},
 fire:{visual:'fire',duration:900,contact:.72,audio:['sawtooth',[150,235,390,680]]},
 heal:{visual:'heal',duration:880,contact:.38,self:true,audio:['sine',[392,494,587]]},
 gust:{visual:'gust',duration:900,contact:.72,audio:['sine',[230,340,510]]},
 tackle:{visual:'tackle',duration:700,contact:.55,lunge:true,audio:['square',[122,82]]},
 water:{visual:'water',duration:900,contact:.73,audio:['sine',[420,530,710,990]]},
 mud:{visual:'mud',duration:880,contact:.70,audio:['square',[145,118,92]]},
 wave:{visual:'wave',duration:940,contact:.70,lunge:true,audio:['sine',[170,112,72]]},
 shell:{visual:'shell',duration:740,contact:.60,lunge:true,audio:['triangle',[246,185]]},
 guard:{visual:'guard',duration:820,contact:.35,self:true,audio:['triangle',[392,587]]},
 crush:{visual:'crush',duration:880,contact:.64,audio:['square',[105,72]]},
 tide:{visual:'tide',duration:920,contact:.74,audio:['sine',[440,330,220]]},
 wing:{visual:'wing',duration:720,contact:.60,audio:['sawtooth',[720,880]]},
 bite:{visual:'bite',duration:700,contact:.58,audio:['square',[174,116]]},
 forest:{visual:'forest',duration:900,contact:.72,audio:['triangle',[262,392,523]]},
 poison:{visual:'poison',duration:980,contact:.70,audio:['sine',[138,164]]},
 mystic:{visual:'mystic',duration:1080,contact:.76,audio:['triangle',[523,659,831,1047]]},
 coral:{visual:'coral',duration:1020,contact:.72,audio:['sine',[131,196,330,784]]},
 struggle:{visual:'struggle',duration:760,contact:.58,lunge:true,audio:['sawtooth',[98,82,110]]}
};
const FALLBACK={visual:'fallback',duration:650,contact:.62,audio:['triangle',[330,220]]};
export const resolveMoveEffect=key=>MOVE_EFFECTS[key]??FALLBACK;
export const effectTarget=key=>resolveMoveEffect(key).self?'self':'opponent';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>1-(1-clamp(t,0,1))**3;
const path=(a,b,t,bow=0)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)-Math.sin(Math.PI*t)*bow});
function line(c,a,b,w,color){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineWidth=w;c.strokeStyle=color;c.stroke()}
function circle(c,p,r,fill,stroke='#17384b',w=2){c.beginPath();c.arc(p.x,p.y,r,0,TAU);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.lineWidth=w;c.strokeStyle=stroke;c.stroke()}}
function poly(c,p,r,n,rotation,fill,stroke='#263b45'){c.beginPath();for(let i=0;i<n;i++){const a=rotation+i*TAU/n,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.fillStyle=fill;c.fill();c.lineWidth=2;c.strokeStyle=stroke;c.stroke()}
function petal(c,p,r,a,color='#ef7cad'){c.save();c.translate(p.x,p.y);c.rotate(a);c.beginPath();c.moveTo(0,-r);c.quadraticCurveTo(r*.8,0,0,r);c.quadraticCurveTo(-r*.8,0,0,-r);c.fillStyle=color;c.fill();c.lineWidth=1.5;c.strokeStyle='#6d3d62';c.stroke();c.restore()}
function leaf(c,p,r,a){c.save();c.translate(p.x,p.y);c.rotate(a);c.beginPath();c.moveTo(-r,0);c.quadraticCurveTo(0,-r*.72,r,0);c.quadraticCurveTo(0,r*.72,-r,0);c.fillStyle='#78bf65';c.fill();c.strokeStyle='#285e46';c.stroke();c.restore()}
function flame(c,p,r,a=0,fill='#ff8a34'){
 c.save();c.translate(p.x,p.y);c.rotate(a);c.beginPath();c.moveTo(-r*.7,r*.45);c.quadraticCurveTo(-r*.45,-r*.22,0,-r*1.15);c.quadraticCurveTo(r*.16,-r*.35,r*.72,-r*.7);c.quadraticCurveTo(r*.52,-r*.08,r*.78,r*.45);c.quadraticCurveTo(0,r*1.05,-r*.7,r*.45);c.closePath();c.fillStyle=fill;c.fill();c.lineWidth=Math.max(1,r*.14);c.strokeStyle='#8c3b2a';c.stroke();c.restore()
}
function star(c,p,r,a=0){c.beginPath();for(let i=0;i<10;i++){const q=a+i*Math.PI/5,rr=i%2?r*.42:r,x=p.x+Math.cos(q)*rr,y=p.y+Math.sin(q)*rr;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.fillStyle='#fff0a5';c.fill();c.strokeStyle='#5b4c78';c.stroke()}
function alpha(c,value,draw){c.save();c.globalAlpha=clamp(value,0,1);draw();c.restore()}
function impact(c,p,s,t,kind){if(!t)return;alpha(c,1-t,()=>{const r=s*(.6+t*1.7);poly(c,p,r,12,t,kind==='water'?'#d8fbff55':kind==='poison'?'#dfbbff55':'#fff2a455',kind==='water'?'#d8fbff':'#fff2a4')})}

function drawEffect(c,cfg,a,b,t,hit,s){
 const travel=ease(t/cfg.contact),contact=clamp((t-cfg.contact)/(1-cfg.contact),0,1),p=path(a,b,travel,s*1.2);
 switch(cfg.visual){
 case 'water':for(let i=0;i<6;i++){const q=clamp(travel-i*.105,0,1),v=path(a,b,q,s*(1.1+i*.1));alpha(c,q?1-contact*.7:0,()=>circle(c,v,s*(.26+(i%3)*.08),'#82ddf066','#e2ffff',2))}if(hit&&contact)for(let i=0;i<7;i++){const q=i*TAU/7;alpha(c,1-contact,()=>circle(c,{x:b.x+Math.cos(q)*s*contact*1.5,y:b.y+Math.sin(q)*s*contact},s*.12,'#b9f6ff','#fff',1))}break;
 case 'leaf':for(let i=0;i<7;i++){const q=clamp(travel-i*.055,0,1),v=path(a,b,q,s*((i%3)-1)*.72),angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.sin(t*12+i)*.9;alpha(c,q?1-contact*.85:0,()=>leaf(c,{x:v.x,y:v.y+(i%2?-.25:.25)*s},s*(.3+(i%2)*.08),angle))}if(hit&&contact)for(let i=0;i<5;i++){const q=i*TAU/5+contact*3;alpha(c,1-contact,()=>leaf(c,{x:b.x+Math.cos(q)*s*contact*1.7,y:b.y+Math.sin(q)*s*contact*1.25},s*.28,q))}break;
 case 'fire':for(let i=0;i<5;i++){const q=clamp(travel-i*.07,0,1),v=path(a,b,q,s*(1.5+i*.15));alpha(c,q?1-contact*.8:0,()=>{flame(c,v,s*(.42+(4-i)*.045),Math.sin(t*15+i)*.18,i<2?'#ffad32':'#f2692d');circle(c,{x:v.x,y:v.y+s*.16},s*.15,'#ffe76a',null)})}for(let i=0;i<7;i++){const q=clamp(travel-i*.045,0,1),v=path(a,b,q,s*((i%3)-1));alpha(c,(q?1:0)*(1-contact),()=>circle(c,{x:v.x+(i-3)*s*.09,y:v.y+Math.sin(t*17+i)*s*.45},s*(.08+(i%2)*.04),i%2?'#ffd45b':'#ff6d32',null))}if(hit&&contact){alpha(c,1-contact,()=>circle(c,b,s*(.6+contact*1.55),'#ff7b2944','#ffd45b',s*.16));for(let i=0;i<6;i++){const q=i*TAU/6-contact*2;alpha(c,1-contact,()=>flame(c,{x:b.x+Math.cos(q)*s*contact*1.5,y:b.y+Math.sin(q)*s*contact*1.2},s*.24,q+Math.PI/2))}}break;
 case 'petal':for(let i=0;i<8;i++){const q=clamp(travel-i*.06,0,1),v=path(a,b,q,s*(i%2?1.5:-.7));alpha(c,q?1-contact:0,()=>petal(c,{x:v.x+(i-3.5)*s*.12,y:v.y},s*.35,t*8+i))}break;
 case 'gust':for(let i=0;i<3;i++){const off=(i-1)*s*.65;c.beginPath();c.moveTo(mix(a.x,b.x,clamp(travel-.45,0,1)),mix(a.y,b.y,clamp(travel-.45,0,1))+off);c.quadraticCurveTo(p.x,p.y+off-s*(i%2?.6:-.6),mix(a.x,b.x,Math.min(1,travel+.12)),mix(a.y,b.y,Math.min(1,travel+.12))+off);c.strokeStyle='#e6fff2';c.lineWidth=s*.18;c.stroke()}if(hit)impact(c,b,s,contact,'gust');break;
 case 'tackle':for(let i=0;i<5;i++){const q=clamp(travel-i*.09,0,1),v=path(a,b,q);line(c,{x:v.x-s*.8,y:v.y+(i-2)*s*.3},v,s*.13,'#e8dca8')}if(hit)impact(c,b,s,contact,'tackle');break;
 case 'mud':for(let i=0;i<3;i++){const q=clamp(travel-i*.11,0,1),v=path(a,b,q,s*(2+i*.5));alpha(c,q?1-contact*.7:0,()=>circle(c,v,s*(.27+i*.05),'#816344','#342f2a',2))}if(hit&&contact)for(let i=0;i<7;i++){const q=i*TAU/7;alpha(c,1-contact,()=>circle(c,{x:b.x+Math.cos(q)*s*contact*1.4,y:b.y+Math.sin(q)*s*contact},s*.18,'#70523c','#392e28',1))}break;
 case 'wave':c.beginPath();c.moveTo(p.x-s*1.3,p.y+s*.7);c.quadraticCurveTo(p.x-s*.6,p.y-s*1.7,p.x,p.y-s*.2);c.quadraticCurveTo(p.x+s*.7,p.y-s*1.3,p.x+s*1.25,p.y+s*.65);c.closePath();c.fillStyle='#3ec4e7bb';c.fill();c.strokeStyle='#d6ffff';c.lineWidth=s*.17;c.stroke();if(hit)impact(c,b,s,contact,'water');break;
 case 'shell':c.beginPath();c.arc(p.x,p.y,s*.75,0,TAU);c.arc(p.x,p.y,s*.48,0,-TAU);c.arc(p.x,p.y,s*.22,0,TAU);c.strokeStyle='#f2c880';c.lineWidth=s*.2;c.stroke();for(let i=0;i<4;i++)line(c,p,{x:p.x+Math.cos(i*TAU/4+t*5)*s,y:p.y+Math.sin(i*TAU/4+t*5)*s},s*.1,'#fff0bd');if(hit)impact(c,b,s,contact,'shell');break;
 case 'guard':alpha(c,1-contact*.35,()=>{poly(c,a,s*1.3,6,-Math.PI/2,'#efb84d55','#ffe7a3');poly(c,a,s*.9,6,-Math.PI/2,'#d88e3033','#fff3bf')});break;
 case 'crush':for(let i=0;i<6;i++){const x=b.x+(i-2.5)*s*.48,y=mix(b.y-s*4,b.y-s*.15,clamp(travel-i*.035,0,1));poly(c,{x,y},s*(.3+(i%2)*.17),4,t+i,'#66727b','#d8e0dc')}if(hit)impact(c,b,s,contact,'crush');break;
 case 'tide':for(let i=0;i<3;i++){const y=p.y+(i-1)*s*.55;c.beginPath();c.moveTo(mix(a.x,b.x,clamp(travel-.55,0,1)),y);c.bezierCurveTo(p.x-s,p.y+(i-1.7)*s,p.x+s*.3,p.y+(i-.2)*s,p.x+s*1.1,y);c.strokeStyle=['#58d7e8','#b7f7ee','#4899d1'][i];c.lineWidth=s*(.24-i*.03);c.stroke()}if(hit)impact(c,b,s,contact,'water');break;
 case 'wing':for(const d of [-1,1]){c.beginPath();c.arc(p.x,p.y,s*(.7+travel*.6),d>0?-.8:2.35,d>0?2.3:5.45);c.strokeStyle=d>0?'#f5fff6':'#80d8cc';c.lineWidth=s*.2;c.stroke()}if(hit)impact(c,b,s,contact,'wing');break;
 case 'bite':for(const d of [-1,1]){c.beginPath();for(let i=0;i<5;i++){const x=b.x+(i-2)*s*.48,y=b.y+d*s*(.9-contact*.62-(i%2)*.28);i?c.lineTo(x,y):c.moveTo(x,y)}c.strokeStyle='#fff4d8';c.lineWidth=s*.25;c.stroke()}if(hit)impact(c,b,s,contact,'bite');break;
 case 'forest':circle(c,p,s*(.45+travel*.5),'#6dcb6b55','#b6ef86',s*.13);for(let i=0;i<6;i++){const q=i*TAU/6+t*5;leaf(c,{x:p.x+Math.cos(q)*s*.9,y:p.y+Math.sin(q)*s*.9},s*.32,q)}if(hit)impact(c,b,s,contact,'forest');break;
 case 'poison':for(let i=0;i<7;i++){const q=clamp(travel-i*.065,0,1),v=path(a,b,q,s*((i%3)-1)*.8);alpha(c,(q?1:0)*(1-contact*.55),()=>circle(c,{x:v.x,y:v.y+Math.sin(t*9+i)*s*.25},s*(.38+(i%3)*.14),'#9658b777','#e4bdff',1.5))}break;
 case 'mystic':circle(c,p,s*.45,'#986bd6aa','#f2d5ff',s*.12);for(let i=0;i<5;i++){const q=t*10+i*TAU/5,r=s*(.7+i*.15);star(c,{x:p.x+Math.cos(q)*r,y:p.y+Math.sin(q)*r},s*.27,q)}if(hit)impact(c,b,s,contact,'mystic');break;
 case 'coral':for(let i=0;i<3;i++){const q=clamp(travel-i*.12,0,1),v=path(a,b,q,s*(i-1));circle(c,v,s*(.55+i*.12),null,['#6fe7ec','#93f6dd','#8abfea'][i],s*.15)}if(contact)for(let i=0;i<5;i++){const x=b.x+(i-2)*s*.33;line(c,{x:b.x,y:b.y+s*.7},{x,y:b.y-s*(.4+Math.abs(i-2)*.35)},s*.17,'#ff8a78')}break;
 case 'heal':for(let i=0;i<9;i++){const y=a.y+s*1.5-(t*s*4+(i%3)*s*.7)%(s*3.2),x=a.x+(i-4)*s*.38+Math.sin(t*8+i)*s*.2;alpha(c,.85,()=>i%2?petal(c,{x,y},s*.27,t*5+i):circle(c,{x,y},s*.15,'#dffff1','#8bdd9e',1))}circle(c,a,s*(.7+t*.9),null,'#c5ffd4',s*.14);break;
 case 'peck':for(let i=0;i<3;i++){const q=clamp(travel-i*.13,0,1),v=path(a,b,q,s*.45);poly(c,v,s*.34,3,Math.atan2(b.y-a.y,b.x-a.x),'#f2c653','#5b4a2f')}if(hit)impact(c,b,s,contact,'peck');break;
 case 'struggle':for(let i=0;i<9;i++){const q=i*TAU/9+(i%2)*.21,r=s*(.45+(i%3)*.25);line(c,{x:p.x+Math.cos(q)*r*.3,y:p.y+Math.sin(q)*r*.3},{x:p.x+Math.cos(q)*r,y:p.y+Math.sin(q)*r},s*.17,'#b9ad92')}if(hit)impact(c,b,s,contact,'struggle');break;
 default:circle(c,p,s*.55,'#ffe47e99','#fff4b7',s*.15);if(hit)impact(c,b,s,contact,'fallback');
 }
}

function anchor(field,node){const f=field.getBoundingClientRect(),r=node.getBoundingClientRect();return{x:r.left-f.left+r.width/2,y:r.top-f.top+r.height*.52}}
export function playMoveAudio(context,cfg,volume=.5,outcome='hit',startDelay=0){
 const nodes=[],v=Number(volume);if(!context||!Number.isFinite(v)||v<=0)return {count:0,stop(){}};
 const [wave,frequencies]=outcome==='miss'?[cfg.audio[0],[...cfg.audio[1].slice(0,2).map(f=>f*.82),142]]:cfg.audio,smooth=['gust','poison','tide','wave'].includes(cfg.visual),physical=['peck','tackle','mud','shell','crush','wing','bite','struggle'].includes(cfg.visual),bubble=cfg.visual==='water',rustle=cfg.visual==='leaf',burn=cfg.visual==='fire';
 const stagger=outcome==='miss'?.1:bubble?.105:burn?.075:rustle?.06:smooth?.12:physical?.065:.09,duration=outcome==='miss'?.11:bubble?.095:burn?.16:rustle?.075:smooth?.19:physical?.065:.12,gainLevel=outcome==='miss'?.035:smooth?.045:bubble?.075:burn?.065:rustle?.055:physical?.11:.075;let count=0;
 try{frequencies.forEach((frequency,i)=>{const delay=startDelay+i*stagger;if(![frequency,delay,duration].every(Number.isFinite)||frequency<=0||delay<0)return;const o=context.createOscillator(),g=context.createGain(),start=context.currentTime+delay,end=start+duration,level=clamp(v,0,1)*gainLevel;o.type=wave;const initial=burn?frequency*.68:rustle?frequency*(i%2?.9:1.12):bubble?frequency*.72:smooth?frequency*.82:frequency;o.frequency.setValueAtTime(initial,start);if(bubble||smooth||burn||rustle)o.frequency.exponentialRampToValueAtTime(Math.max(24,burn?frequency*1.55:rustle?frequency*.76:bubble?frequency*1.34:frequency*1.18),end);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0001,level),start+Math.min(.018,duration*.2));g.gain.exponentialRampToValueAtTime(.0001,end);o.connect(g);g.connect(context.destination);o.start(start);o.stop(end+.01);nodes.push([o,g]);count++})}catch{}
 return {count,stop(){for(const [o,g] of nodes){try{o.stop()}catch{}try{o.disconnect()}catch{}try{g.disconnect()}catch{}}}};
}

export async function playMoveEffect({field,actor,target,key,outcome='hit',reduced=false,audioContext=null,volume=.5,raf=globalThis.requestAnimationFrame,caf=globalThis.cancelAnimationFrame,now=()=>performance.now(),watchdogMs=1450}={}){
 emitVfxAudio(LEGACY_VFX_FAMILIES[key]??'SPECIAL_FLASH',{outcome});
 const cfg=resolveMoveEffect(key),self=cfg.self,targetNode=self?actor:target;if(!field||!actor||!targetNode)return {key,visual:cfg.visual,target:self?'self':'opponent',completed:false};
 let overlay,frameId=0,watchdog,actorAnimation,targetAnimation,sound={stop(){}};let done=false,finish;const completion=new Promise(resolve=>finish=()=>{if(!done){done=true;resolve()}});
 try{
  overlay=field.ownerDocument.createElement('canvas');overlay.className='attack-effect-layer';overlay.setAttribute('aria-hidden','true');field.append(overlay);
  const duration=reduced?Math.min(150,cfg.duration):cfg.duration,stagger=outcome==='miss'?.1:cfg.visual==='water'?.105:cfg.visual==='fire'?.075:cfg.visual==='leaf'?.06:['gust','poison','tide','wave'].includes(cfg.visual)?.12:['peck','tackle','mud','shell','crush','wing','bite','struggle'].includes(cfg.visual)?.065:.09,startDelay=reduced?0:outcome==='miss'?.06:Math.max(0,cfg.duration*cfg.contact/1000-(cfg.audio[1].length-1)*stagger);sound=playMoveAudio(audioContext,cfg,volume,outcome,startDelay);
  if(!reduced&&cfg.lunge&&typeof actor.animate==='function'){const a=anchor(field,actor),b=anchor(field,targetNode),dx=(b.x-a.x)*.18,dy=(b.y-a.y)*.10;try{actorAnimation=actor.animate([{translate:'0 0'},{translate:`${dx}px ${dy}px`,offset:.48},{translate:'0 0'}],{duration:cfg.duration,easing:'ease-out'})}catch{}}
  if(!reduced&&!self&&outcome==='hit'&&typeof targetNode.animate==='function')try{targetAnimation=targetNode.animate([{translate:'0 0',opacity:1},{translate:'8px 0',opacity:.45},{translate:'-6px 0',opacity:1},{translate:'0 0',opacity:1}],{delay:cfg.duration*cfg.contact,duration:220,easing:'ease-out'})}catch{}
  const start=now();watchdog=setTimeout(finish,watchdogMs);
  const draw=time=>{if(done)return;if(!overlay.isConnected||!field.isConnected){finish();return}try{const rect=field.getBoundingClientRect(),dpr=clamp(globalThis.devicePixelRatio||1,1,2),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(overlay.width!==w||overlay.height!==h){overlay.width=w;overlay.height=h}overlay.style.width=rect.width+'px';overlay.style.height=rect.height+'px';const c=overlay.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,rect.width,rect.height);c.lineCap='round';c.lineJoin='round';const a=anchor(field,actor),real=anchor(field,targetNode),dx=real.x-a.x,dy=real.y-a.y,len=Math.hypot(dx,dy)||1,miss=outcome==='miss'&&!self,b=miss?{x:real.x+dx/len*clamp(rect.width*.11,30,80),y:real.y+dy/len*clamp(rect.width*.11,30,80)-clamp(rect.height*.13,20,58)}:real,elapsed=clamp((time-start)/duration,0,1),progress=reduced?1:elapsed;drawEffect(c,cfg,reduced?b:a,b,reduced?Math.min(cfg.contact,.72):progress,outcome==='hit',clamp(rect.width*.027,7,24));if(elapsed>=1)finish();else frameId=raf(draw)}catch{finish()}};
  frameId=raf(draw);await completion;
 }catch{}finally{clearTimeout(watchdog);if(frameId)try{caf(frameId)}catch{}try{actorAnimation?.cancel()}catch{}try{targetAnimation?.cancel()}catch{}sound.stop();try{overlay?.remove()}catch{}}
 return {key,visual:cfg.visual,target:self?'self':'opponent',completed:true};
}
