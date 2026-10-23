import {lockField,unlockField,moveNPC,beginEncounter,tickFieldCore,finishFieldBattle,coreWalkable} from '../field-engine-core.mjs';
import {createFieldAnimation} from '../field-animation.mjs';
import {createFieldEventBundle} from '../presentation/field-events.mjs';
import {npcAssets} from '../compatibility/npc-assets.mjs';
/** Optional sidecar for existing maps. No tile arrays or legacy actors are edited. */
export function storyFieldEvents(service,mapId,bindings={}){
 const p=service.snapshot().progress,stage=service.contract.stages[p.currentStage];
 return createFieldEventBundle(mapId,{
  trainers:stage.trainerIds.map(id=>{const t=service.contract.trainers[id];return {id,trainerId:id,partyId:service.resolveTrainerParty(id).id,npcId:t.npcId,areaId:t.areaId??null,assets:t.npcId?npcAssets(t.npcId):null,placement:bindings.trainers?.[id]??null,available:service.trainerAvailable(id)}}),
  // A rival can be both an event and a trainer. Qualify the graphics descriptor,
  // keeping its canonical eventId unchanged for progression, rewards and saves.
  storyEvents:Object.values(service.contract.events).filter(e=>e.stageId===stage.id&&e.active).map(e=>({id:`story:${e.id}`,eventId:e.id,placement:bindings.events?.[e.id]??null,available:service.eventAvailable(e.id)})),
  encounterRegions:[{id:`context:${stage.id}`,stageId:stage.id,active:false}]
 });
}
/** Reuses field collision, actor locomotion, encounter transition and return-point recovery. */
export function createStoryFieldHooks(field,{dialogue=()=>{},cutIn=()=>{},cameraCue=()=>{},warp=null,nextFrame=async()=>{}}={}){
 const animation=createFieldAnimation();let ownedLock=false;
 return {
  inputLock(){if(field.core.lock&&field.core.lock!=='canonical-story')throw Error('Field already locked');lockField(field,'canonical-story');ownedLock=true},
  inputUnlock(){if(ownedLock){unlockField(field);ownedLock=false}},
  dialogue,cutIn,
  actorFace({actorId,facing}){const actor=actorId==='PLAYER'?field:field.core.npcs.find(n=>n.id===actorId||n.canonicalNpcId===actorId);if(actor&&['up','down','left','right'].includes(facing))actor.facing=facing},
  async actorMove({actorId,x,y}){
   const actor=field.core.npcs.find(n=>n.id===actorId||n.canonicalNpcId===actorId);if(!actor)return;
   if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid actor destination');actor.target={x,y};
   try{for(let frame=0;actor.target&&frame<600;frame++){if(!moveNPC(field,actor,1/60))break;await nextFrame()}}finally{actor.target=null;actor.moving=false}
  },
  async warp(op){
   if(!warp)throw Error('No map warp binding; existing position retained');
   const target=await warp(op);if(!target||typeof target.scene!=='string'||!Number.isFinite(target.x)||!Number.isFinite(target.y)||!coreWalkable({...field,scene:target.scene},target.x,target.y))throw Error('Invalid story warp destination');
   Object.assign(field,{scene:target.scene,x:target.x,y:target.y,facing:target.facing??field.facing});
  },
  async cameraCue(op){
   if(op.cue==='battle-entry'){
    if(!beginEncounter(field,{kind:op.kind??'trainer',trainerId:op.trainerId,battleId:op.trainerId}))throw Error('Battle transition unavailable');
    for(let frame=0;!field.core.battleReady&&frame<120;frame++){tickFieldCore(field,1/60,animation,false);await nextFrame()}
   }
   await cameraCue(op);
  },
  battleFinished(outcome){finishFieldBattle(field,outcome==='won'?'win':'lose')}
 };
}
