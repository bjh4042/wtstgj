import {frontEntranceCue,frontEntranceFrame,isFrontEntrance} from './entrance.mjs';
// Additive baseline presentation successor: selected FRONT-only renderer injection.
import {drawApprovedBattleBackground} from '../art/approved-battle-backgrounds.mjs';
import {createFrontOnlyBattleRenderer} from './front-policy-r2/adapter.mjs';
const drawBattleSpecies=createFrontOnlyBattleRenderer();
import {drawBattleVfx} from '../presentation/vfx-render.mjs';
import {presentationAudio} from '../presentation/audio-hooks.mjs';
import {createSharedBattleSequences,drawSharedBattleCue} from './shared-battle-sequences.mjs';
const cueLabel=cue=>cue?.kind==='trainer'?'대결을 준비합니다.':cue?.kind==='faint'?'생태몬이 지쳤어요.':cue?.kind==='sequence'?({appear:'생태몬이 등장합니다.',recall:'생태몬이 돌아갑니다.',attempt:'포획을 시도합니다…',success:'포획에 성공했어요!',failure:'포획하지 못했어요.',evolve:'생태몬이 새로운 모습으로 변합니다.'}[cue.mode]??''):'';
/** Immutable events drive visuals only. Outcomes, RNG and saves never wait on this queue. */
export function createBattlePresentation({drawSpecies=drawBattleSpecies,audio=presentationAudio,reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false}={}){
 let queue=[],active=null,entranceSuspended=false;
 const shared=createSharedBattleSequences({reducedMotion});
 return {
  consume(snapshot,options={}){const cursor=shared.cursor;for(const event of snapshot.events.slice(cursor))if(!options.restoring&&event.type==='start')for(const id of event.audioIds??[])audio.emit(id,{channel:'battle',kind:snapshot.kind});queue.push(...shared.consume(snapshot,options).map(cue=>frontEntranceCue(entranceSuspended&&isFrontEntrance(cue)?{...cue,reducedMotion:true}:cue)).filter(cue=>{if(!isFrontEntrance(cue)||!cue.reducedMotion)return true;shared.finish(cue);return false}))},
  draw(c,snapshot,now,layout=null){
   const W=layout?.width??432,H=layout?.height??240,enemyAnchor=layout?.enemy??{x:320,y:145,size:110},playerAnchor=layout?.player??{x:115,y:228,size:125},geometry={...layout,width:W,height:H,enemy:enemyAnchor,player:playerAnchor};
   if(!active&&queue.length){active={...queue.shift(),start:now};if(active.kind==='move')audio.emit(active.effect.moveSfxId,{channel:'move',side:active.side});if(active.kind==='end')audio.emit(null,{channel:'battle-end'})}
   const elapsed=active?now-active.start:0,frame=active?shared.frame(active,elapsed):null;
   c.clearRect(0,0,W,H);c.fillStyle='#425966';c.fillRect(0,0,W,H);drawApprovedBattleBackground(c,snapshot.background,W,H,{fit:layout?.backgroundFit??'contain'});
   const entrance=frontEntranceFrame(active,elapsed);
   const enemy=frame?.actors.opponent??snapshot.opponents[snapshot.enemyActive],player=frame?.actors.player??snapshot.party[snapshot.active],opacity={...(frame?.opacity??{player:1,opponent:1})};if(entrance)opacity[entrance.side]=entrance.opacity;
   const dx=side=>entrance?.side===side?entrance.dx:0;
   // Shadows share actor visibility, including recall/faint; no invisible actor footprint.
   for(const [a,alpha] of [[{...enemyAnchor,x:enemyAnchor.x+dx('opponent')},opacity.opponent],[{...playerAnchor,x:playerAnchor.x+dx('player')},opacity.player]])if(alpha>0){c.save();c.globalAlpha=alpha;c.fillStyle='rgba(15,44,48,.18)';c.beginPath();c.ellipse(a.x,a.y,a.size*.3,a.size*.06,0,0,Math.PI*2);c.fill();c.restore()}
   let front;c.save();try{c.globalAlpha=opacity.opponent;front=drawSpecies(c,{namespace:enemy.namespace,speciesId:enemy.speciesId},'front',enemyAnchor.x+dx('opponent'),enemyAnchor.y,{size:enemyAnchor.size})}finally{c.restore()}
   let back;c.save();try{c.globalAlpha=opacity.player;back=drawSpecies(c,{namespace:'canonical',speciesId:player.speciesId},'back',playerAnchor.x+dx('player'),playerAnchor.y,{size:playerAnchor.size})}finally{c.restore()}
   const label=cueLabel(active);
   if(c.canvas?.setAttribute)c.canvas.setAttribute('aria-label',[label,front?.accessibleLabel,back?.accessibleLabel].filter(Boolean).join(' · ')||'생태몬 대결');
   if(active){let done;
    if(active.kind==='move'){const playerTarget={x:playerAnchor.x,y:playerAnchor.y-playerAnchor.size*.4},enemyTarget={x:enemyAnchor.x,y:enemyAnchor.y-enemyAnchor.size*.4},from=active.side==='player'?playerTarget:enemyTarget,to=active.side==='player'?enemyTarget:playerTarget;done=reducedMotion||drawBattleVfx(c,active.effect.family,elapsed,{...active.effect,from,to}).done}
    else done=entrance?entrance.done:drawSharedBattleCue(c,active,elapsed,geometry).done;
    if(done){shared.finish(active);active=null}
   }
   return {front,back,label,background:snapshot.background.assetId,busy:!!active||queue.length>0};
  },
  get busy(){return !!active||queue.length>0},
  suspendEntrance(){entranceSuspended=true;queue=queue.filter(cue=>{if(!isFrontEntrance(cue))return true;shared.finish(cue);return false});if(isFrontEntrance(active)){shared.finish(active);active=null}},
  stop(){queue=[];active=null;shared.stop();audio.emit(null,{channel:'battle-end'})}
 };
}
