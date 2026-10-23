import {renderSequence,DURATIONS} from './approved-shared-sequences.mjs';
import {APPROVED_TRAINER_PORTRAITS as ART} from './approved-trainer-portraits-data.mjs';
const copy=x=>x?JSON.parse(JSON.stringify(x)):null;
export function resolveTrainerPortrait({trainerId,npcId,playerCharacterId}={},side='opponent'){
 const identity=side==='player'?(['PLAYER_MALE','PLAYER_FEMALE'].includes(playerCharacterId)?playerCharacterId:null):(ART.trainerIds[trainerId]??ART.npcIds[npcId]??null);
 return identity&&ART.portraits[identity]?{identity,...ART.portraits[identity]}:null;
}
/** Expands real cumulative host events, never controls the engine or rewards. One instance per battle. */
export function createSharedBattleSequences({reducedMotion=false,onComplete=()=>{}}={}){
 let cursor=0,initialized=false,stopped=false,serial=0,actors=null,visibility={player:1,opponent:1};const finished=new Set();
 function make(kind,fields={}){return {key:++serial,kind,actors:copy(actors),visibility:{...visibility},reducedMotion,...fields};}
 const sequence=(side,mode,extra={})=>make('sequence',{side,id:mode==='evolve'?'SEQ_EVOLUTION':['attempt','success','failure'].includes(mode)?'SEQ_CAPTURE':'SEQ_SUMMON_RECALL',mode,duration:DURATIONS[mode],...extra});
 return {
 consume(snapshot,options={}){
  if(stopped)return [];const events=snapshot.events??[],meta=options.presentation??snapshot.presentation??options;
  if(!initialized){actors={player:copy(snapshot.party?.[snapshot.active]),opponent:copy(snapshot.opponents?.[snapshot.enemyActive])};initialized=true;
   // Resume/hydrate is explicit. Never replay prior events or synthesize a start.
   if(options.restoring){cursor=events.length;return []}}
  if(events.length<cursor){cursor=events.length;return []} // truncated history must not replay
  const cues=[];
  for(let i=cursor;i<events.length;i++){
   const e=events[i];
   if(e.type==='start'){
    const portraits={player:resolveTrainerPortrait(meta,'player'),opponent:snapshot.kind==='trainer'?resolveTrainerPortrait(meta):null};
    if(portraits.player||portraits.opponent)cues.push(make('trainer',{portraits,duration:reducedMotion?200:700,label:'대표가 등장합니다',event:e}));
    visibility={player:0,opponent:snapshot.kind==='wild'?1:0};
    if(snapshot.kind==='trainer'){cues.push(sequence('opponent','appear'));visibility.opponent=1}
    cues.push(sequence('player','appear'));visibility.player=1;
   }else if(e.type==='move'){
    for(const effect of e.vfx?.effects??[])cues.push(make('move',{effect,side:e.side,duration:effect.timing?.duration??720,event:e}));
   }else if(e.type==='switch'){
    const side=e.side==='player'?'player':'opponent',next=(side==='player'?snapshot.party:snapshot.opponents)?.[e.index];
    if(!next)continue;
    if(actors[side]&&visibility[side])cues.push(sequence(side,'recall'));
    actors[side]=copy(next);visibility[side]=0;cues.push(sequence(side,'appear'));visibility[side]=1;
   }else if(e.type==='faint'){
    const side=e.side==='player'?'player':'opponent';
    if(actors[side]?.instanceId!==e.instanceId)continue;
    cues.push(make('faint',{side,duration:reducedMotion?1:500,label:'생태몬이 지쳤습니다',event:e}));visibility[side]=0;
   }else if(e.type==='capture'&&typeof e.success==='boolean'){
    cues.push(sequence('opponent','attempt',{event:e}));cues.push(sequence('opponent',e.success?'success':'failure',{event:e}));
   }else if(e.type==='evolution'&&e.confirmed===true&&e.before?.speciesId&&e.after?.speciesId&&e.before.instanceId===e.after.instanceId){
    const side=['player','opponent'].find(s=>actors[s]?.instanceId===e.before.instanceId);if(!side)continue;
    actors[side]=copy(e.before);cues.push(sequence(side,'evolve',{event:e}));actors[side]=copy(e.after);
   }else if(e.type==='end')cues.push(make('end',{duration:0,event:e,label:'대결 종료'}));
  }
  cursor=events.length;return cues;
 },
 frame(cue,elapsedMs){return sharedBattleCueFrame(cue,elapsedMs)},
 finish(cue){if(stopped||finished.has(cue.key))return false;finished.add(cue.key);try{onComplete({key:cue.key,kind:cue.kind,presentationOnly:true})}catch{}return true},
 stop(){stopped=true;actors=null;finished.clear()},
 get stopped(){return stopped},get cursor(){return cursor}
 };
}
export function sharedBattleCueFrame(cue,elapsedMs){
 const t=Math.max(0,Math.min(1,elapsedMs/Math.max(1,cue.duration))),opacity={...cue.visibility};let result=null;
 if(cue.kind==='trainer'){opacity.player=0;opacity.opponent=0}
 if(cue.kind==='sequence'){result=renderSequence({id:cue.id,mode:cue.mode,elapsedMs,reducedMotion:cue.reducedMotion});opacity[cue.side]*=result.actorOpacity;
  if(cue.mode==='appear')opacity[cue.side]=result.actorOpacity;
 }
 if(cue.kind==='faint')opacity[cue.side]=cue.reducedMotion?(t>=1?0:1):1-t;
 return {actors:cue.actors,opacity,label:result?.label??cue.label??'',svg:result?.svg??'',done:elapsedMs>=cue.duration,progress:t,kind:cue.kind};
}
const imageCache=new Map();
export function loadTrainerPortrait(portrait){
 if(!portrait||typeof Image==='undefined')return null;
 if(!imageCache.has(portrait.src)){const entry={status:'loading',image:new Image()};entry.image.onload=()=>{entry.status='ready'};entry.image.onerror=()=>{entry.status='failed'};entry.image.src=portrait.src;imageCache.set(portrait.src,entry)}
 return imageCache.get(portrait.src);
}
export function trainerPortraitRect(p,a,layout){const margin=8,bottom=Math.max(margin,Math.min(layout.height-margin,a.y)),maxW=Math.max(1,layout.width*.46-margin),maxH=Math.max(1,Math.min(layout.height*.72,bottom-margin)),scale=Math.min(maxW/p.width,maxH/p.height,a.size*1.65/p.height),w=p.width*scale,h=p.height*scale;return {x:Math.max(margin,Math.min(layout.width-margin-w,a.x-w/2)),y:bottom-h,width:w,height:h};}
function leaf(c,x,y,scale=1,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.fillStyle='#E0EAC0';c.strokeStyle='#668D3F';c.lineWidth=1.5;c.beginPath();c.moveTo(-6,6);c.quadraticCurveTo(-9,-5,7,-7);c.quadraticCurveTo(10,6,-6,6);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(-5,5);c.lineTo(5,-5);c.stroke();c.restore()}
/** Canvas adapter for selected SVG motifs. Caller draws actors/shadows using frame.opacity, then this overlay. */
export function drawSharedBattleCue(c,cue,elapsedMs,layout){
 const frame=sharedBattleCueFrame(cue,elapsedMs);if(cue.kind==='trainer'){
  for(const side of ['player','opponent']){const p=cue.portraits[side],entry=loadTrainerPortrait(p),a=side==='player'?layout.player:layout.enemy;if(entry?.status!=='ready')continue;const r=trainerPortraitRect(p,a,layout);c.save();c.globalAlpha=cue.reducedMotion?1:Math.min(1,elapsedMs/160);c.drawImage(entry.image,r.x,r.y,r.width,r.height);c.restore()}return frame;
 }
 if(cue.kind!=='sequence')return frame;
 const a=cue.side==='player'?layout.player:layout.enemy,scale=a.size/160,t=frame.progress,p=t*t*(3-2*t);
 c.save();c.translate(a.x,a.y-a.size*.41);c.scale(scale,scale);
 if(cue.reducedMotion){c.fillStyle='#FAF5E9';c.strokeStyle='#173E34';c.lineWidth=2;c.beginPath();c.roundRect(56,-63,36,36,10);c.fill();c.stroke();leaf(c,74,-45,1.1);c.restore();return frame}
 if(t<=0||t>=1){c.restore();return frame}c.globalAlpha=Math.sin(Math.PI*t)*.8;
 if(cue.id==='SEQ_CAPTURE'){
  const r=cue.mode==='attempt'?88-26*p:cue.mode==='success'?62-12*p:62+45*p;c.strokeStyle=cue.mode==='failure'?'#A4753A':'#428769';c.lineWidth=2.5;c.beginPath();c.ellipse(0,61,r,r*.24,0,0,Math.PI*2);c.moveTo(-r,35);c.quadraticCurveTo(-r-8,-50,-26,-63);c.moveTo(r,35);c.quadraticCurveTo(r+8,-50,26,-63);c.stroke();
  for(let i=0;i<6;i++){const angle=i*Math.PI/3+p*.6;leaf(c,Math.cos(angle)*r,Math.sin(angle)*r*.68,.85,angle)}
  if(cue.mode!=='attempt'){c.strokeStyle='#173E34';c.lineWidth=3;c.beginPath();if(cue.mode==='success'){c.moveTo(61,-37);c.lineTo(69,-29);c.lineTo(85,-46)}else{c.moveTo(63,-44);c.lineTo(81,-26);c.moveTo(81,-44);c.lineTo(63,-26)}c.stroke()}
 }else if(cue.id==='SEQ_SUMMON_RECALL'){
  c.strokeStyle='#54989D';c.lineWidth=2;c.beginPath();c.ellipse(0,65,28+50*(cue.mode==='appear'?p:1-p),15,0,0,Math.PI*2);c.stroke();
  for(let i=0;i<8;i++)leaf(c,-46+(i%4)*30,cue.mode==='appear'?65-p*(75+i*5):-40+p*(75+i*3),.65,i*32*Math.PI/180);
 }else{const r=68+16*Math.sin(Math.PI*t);c.strokeStyle='#C79B28';c.lineWidth=3;c.setLineDash([10,13]);c.beginPath();c.ellipse(0,1,r,r*.85,0,0,Math.PI*2);c.stroke();c.setLineDash([]);for(let i=0;i<10;i++){const angle=i*Math.PI/5-Math.PI/2+p*.3;leaf(c,Math.cos(angle)*r,1+Math.sin(angle)*r*.85,.85,angle+Math.PI/4)}}
 c.restore();return frame;
}
