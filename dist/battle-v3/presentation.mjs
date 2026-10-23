import {drawApprovedBattleBackground} from '../art/approved-battle-backgrounds.mjs';
import {loadAsset,peekAsset} from '../asset-runtime.mjs';
import {drawBattleSpecies} from '../presentation/battle-render.mjs';
import {drawBattleVfx} from '../presentation/vfx-render.mjs';
import {presentationAudio} from '../presentation/audio-hooks.mjs';
/** Renderer consumes immutable snapshots/events, never modifies stats or waits for PNG/audio loading. */
export function createBattlePresentation({audio=presentationAudio}={}){
 let cursor=0,queue=[],active=null;
 return {
  consume(snapshot){for(const event of snapshot.events.slice(cursor)){
   if(event.type==='start')for(const id of event.audioIds)audio.emit(id,{channel:'battle',kind:snapshot.kind});
   if(event.type==='move')for(const effect of event.vfx.effects)queue.push({effect,side:event.side});
   if(event.type==='end')queue.push({end:true});
  }cursor=snapshot.events.length},
  draw(c,snapshot,now){
   c.clearRect(0,0,432,240);c.fillStyle='#425966';c.fillRect(0,0,432,240);drawApprovedBattleBackground(c,snapshot.background,432,240);
   // Soft contact shadows sit under actors; no platforms, geometry or mechanics change.
   c.save();c.fillStyle='rgba(15,44,48,.18)';for(const [x,y,rx,ry] of [[320,145,35,7],[115,228,39,8]]){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}c.restore();
   const enemy=snapshot.opponents[snapshot.enemyActive],player=snapshot.party[snapshot.active];
   const front=drawBattleSpecies(c,{namespace:enemy.namespace,speciesId:enemy.speciesId},'front',320,145,{size:110});
   const back=drawBattleSpecies(c,{namespace:'canonical',speciesId:player.speciesId},'back',115,228,{size:125});
   if(c.canvas?.setAttribute)c.canvas.setAttribute('aria-label',[front?.accessibleLabel,back?.accessibleLabel].filter(Boolean).join(' · ')||'생태몬 대결');
   if(!active&&queue.length){const next=queue.shift();if(next.end)audio.emit(null,{channel:'battle-end'});else{active={...next,start:now};audio.emit(active.effect.moveSfxId,{channel:'move',side:active.side})}}
   if(active){const from=active.side==='player'?{x:115,y:180}:{x:320,y:95},to=active.side==='player'?{x:320,y:95}:{x:115,y:180};const done=drawBattleVfx(c,active.effect.family,now-active.start,{...active.effect,from,to});if(done.done)active=null}
   return {front,back,background:snapshot.background.assetId,busy:!!active||queue.length>0};
  },
  get busy(){return !!active||queue.length>0},
  stop(){queue=[];active=null;audio.emit(null,{channel:'battle-end'})}
 };
}
