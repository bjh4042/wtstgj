/** Source-to-runtime ID bindings. No source JSON is imported by the story engine. */
export const STORY_VERSION='canonical-story-v1';
const rows=x=>Array.isArray(x)?x:[];
const index=xs=>Object.fromEntries(xs.map(x=>[x.id,x]));
const GYM_NPCS=['KANGMIN','YOUNGJIN','JEONGUI','JINSEONG','MYEONGJU','JUHYEOK','USANG','DOCTOR_CHAE'].map((id,i)=>`NPC_GYM_0${i+1}_${id}`);
const ELITE_NPCS=['YUNWOO','SIYOON','EUNMI','JUNHO'].map((id,i)=>`NPC_ELITE_0${i+1}_${id}`);
const BLACKNET_NPCS={BLACKNET_BOMI_FINAL:'NPC_BLACKNET_OFFICER_BOMI',BLACKNET_JUNSEOK_FINAL:'NPC_BLACKNET_OFFICER_JUNSEOK',BLACKNET_HWIGYEONG_FINAL:'NPC_BLACKNET_LEADER_HWIGYEONG'};
export function adaptStoryRuntime(s,{speciesId,issue}){
 const stages=rows(s.stage?.stages),flags=rows(s.flags?.flag_catalog),sourceEvents=rows(s.flags?.main_event_catalog),external=rows(s.flags?.external_event_catalog);
 const events=index(external.map(e=>({...e,id:e.event_id,stageId:e.stage,active:false,requiresEvents:[],requiresGates:[],operations:[]})));
 const sequence=rows(s.stage?.stage_sequence),parties={},trainers={},diagnostics=[];
 const aliases=Object.fromEntries(rows(s.flags?.event_aliases).map(e=>[e.encounter_event,e.stage_event]));
 function party(key,data,exceptions=[]){
  const id=`PARTY:${key}`;
  parties[id]={id,members:rows(data).map(p=>{
   const sourceMoveIds=rows(p.moves).map(m=>m.move_id),moveIds=[...new Set(sourceMoveIds)],canonicalId=speciesId(p.species_no,'story.'+key);
   if(moveIds.length!==sourceMoveIds.length)diagnostics.push({code:'DUPLICATE_TRAINER_MOVE',partyId:id,speciesId:canonicalId,sourceMoveIds,normalizedMoveIds:moveIds,policy:'Collapse identical IDs only; no substitute move'});
   return {namespace:'canonical',speciesId:canonicalId,level:p.level,moveIds};
  }),moveLevelExceptions:structuredClone(exceptions)};
  if(!parties[id].members.length||parties[id].members.length>6)issue('STORY_PARTY_SIZE',key);
  return id;
 }
 for(const t of [...rows(s.trainer?.route_trainers),...rows(s.trainer?.gym_subtrainers)])trainers[t.trainer_id]={id:t.trainer_id,kind:t.role,stageId:t.stage,areaId:t.area_id,npcId:null,label:t.trainer_class,...(t.display_name?{displayName:t.display_name}:{}),...(t.gender?{gender:t.gender}:{}),partyId:party(t.trainer_id,t.party),required:!!t.required_for_progress,repeatable:t.rematch===true,ai:t.ai_tier,itemUses:t.item_uses??0,reward:null,eventId:null};
 for(const stage of stages){
  const beats=rows(stage.main_beats);
  for(const [i,beat] of beats.entries()){
   const e=sourceEvents.find(e=>e.event_id===beat.event_id);if(!e)issue('STORY_EVENT_MISSING',beat.event_id);
   events[beat.event_id]={...events[beat.event_id],...e,id:beat.event_id,stageId:stage.id,summary:beat.summary,active:stage.id!=='POST',requiresEvents:i?[beats[i-1].event_id]:[],requiresGates:[],operations:[{op:'dialogue',text:beat.summary}]};
  }
 }
 const gymModels=rows(s.battle?.gyms).map(g=>{
  const npcId=GYM_NPCS[g.no-1],stage=stages.find(x=>x.id===g.stage),eventId=`${g.stage}_GYM_STORY`;
  if(!npcId||stage?.gym?.no!==g.no||stage.gym.badge_id!==g.badge_id||String(stage.gym.types)!==String(g.types)||stage.gym.tm!==g.tm)issue('STORY_GYM_CONFLICT',g.stage);
  trainers[npcId]={id:npcId,npcId,kind:'gym',stageId:g.stage,label:g.leader_name,partyId:party(npcId,g.party),eventId,required:true,repeatable:false,ai:g.ai_tier,itemUses:g.item_uses??0};
  if(events[eventId])events[eventId].trainerId=npcId;
  return {id:npcId,npcId,number:g.no,stageId:g.stage,eventId,badgeId:g.badge_id,types:g.types,tmId:g.tm};
 });
 for(const r of rows(s.battle?.rival?.battles)){
  const variantPartyIds=Object.fromEntries(Object.values(r.variants??{}).map(v=>{const starter=speciesId(v.player_starter_base_no,'rival.starter');return [starter,party(`${r.id}:${starter}`,v.party,r.move_level_exceptions)]}));
  trainers[r.id]={id:r.id,npcId:'NPC_RIVAL_HARIN',kind:'rival',stageId:r.stage,label:'하린',variantPartyIds,eventId:r.id,required:true,repeatable:false};
  if(events[r.id])events[r.id].trainerId=r.id;
 }
 const blacknet=[...rows(s.battle?.blacknet_battles?.officers),...(s.battle?.blacknet_battles?.leader?[s.battle.blacknet_battles.leader]:[])];
 for(const b of blacknet)trainers[b.id]={id:b.id,npcId:BLACKNET_NPCS[b.id],kind:'blacknet',stageId:b.stage,label:b.name,partyId:party(b.id,b.party),eventId:b.id,required:true,repeatable:false,ai:b.ai_tier,itemUses:b.item_uses??0,itemId:b.item??null};
 const elite=rows(s.battle?.league?.elite_four).map(e=>{
  const id=ELITE_NPCS[e.order-1];trainers[id]={id,npcId:id,kind:'elite',order:e.order,stageId:'FINAL',label:e.name,partyId:party(id,e.party),required:true,repeatable:false,eventId:null,ai:e.ai_tier,itemUses:e.item_uses??0};return id;
 });
 const c=s.battle?.league?.champion,championId='NPC_CHAMPION_DOCTOR_YOON';
 if(c){trainers[championId]={id:championId,npcId:championId,kind:'champion',stageId:'FINAL',label:c.name,partyId:party(championId,c.party),required:true,repeatable:false,eventId:'FINAL_CHAMPION',ai:c.ai_tier,itemUses:c.item_uses??0};if(events.FINAL_CHAMPION)events.FINAL_CHAMPION.trainerId=championId}
 // These bindings execute source prose; they do not introduce another stage order.
 const activate=(id,requiresEvents=[],requiresGates=[])=>{
  if(!events[id]){issue('STORY_BINDING_UNKNOWN_EVENT',id);return}
  Object.assign(events[id],{active:true,requiresEvents,requiresGates,operations:[{op:'dialogue',text:events[id].summary??id}],trainerId:trainers[id]?id:null});
 };
 activate('S9_SHIP_ZONE1_COMPLETE_EVENT',['S9_LANTERN_TRACE'],['CAN_ENTER_BLACKNET_SHIP']);
 activate('S9_SHIP_ZONE2_RESCUE_EVENT',['S9_SHIP_ZONE1_COMPLETE_EVENT']);
 if(events.S9_SHIP_ZONE2_RESCUE_EVENT)events.S9_SHIP_ZONE2_RESCUE_EVENT.operations.push({op:'dialogue',text:events.RIVAL_S9_ALLY?.summary??'',actorId:'NPC_RIVAL_HARIN'},{op:'actorFace',actorId:'NPC_RIVAL_HARIN',facing:'up'});
 activate('BLACKNET_BOMI_FINAL',['S9_SHIP_ZONE1_COMPLETE_EVENT']);
 activate('BLACKNET_JUNSEOK_FINAL',['BLACKNET_BOMI_FINAL','S9_SHIP_ZONE2_RESCUE_EVENT']);
 activate('BLACKNET_HWIGYEONG_FINAL',['BLACKNET_JUNSEOK_FINAL'],['CAN_FIGHT_HWIGYEONG']);
 if(events.S9_FINAL_VILLAIN_RAID)events.S9_FINAL_VILLAIN_RAID.requiresEvents.push('BLACKNET_HWIGYEONG_FINAL');
 for(const [id,gate] of Object.entries({S9_HUNGNAM_MEMORIAL_PUZZLE:'CAN_SOLVE_HUNGNAM_MEMORIAL',S9_LANTERN_TRACE:'CAN_TRACE_BLACKNET',FINAL_LEAGUE:'CAN_ENTER_LEAGUE'}))if(events[id])events[id].requiresGates.push(gate);
 if(events.P02_FIRST_PARTNER)events.P02_FIRST_PARTNER.operations.push({op:'starter'});
 if(events.S2_WIND_EVENT_150)events.S2_WIND_EVENT_150.operations.push({op:'cutIn',speciesId:speciesId(150,'sighting'),capture:false,battle:false},{op:'seen',speciesId:speciesId(150,'sighting')});
 if(events.RIVAL_S9_ALLY)events.RIVAL_S9_ALLY.operations.push({op:'actorFace',actorId:'NPC_RIVAL_HARIN',facing:'up'});
 const rewards=rows(s.flags?.reward_transactions).map(r=>({...structuredClone(r),triggerEvent:r.trigger_event}));
 // Stage specifies a starter kit, but no sub-event timing: grant it once at tutorial completion.
 rewards.push({id:'TX_PROLOGUE_STARTER_KIT',triggerEvent:'P03_TUTORIAL',requires:[],grant:Object.fromEntries(rows(stages.find(x=>x.id==='PROLOGUE')?.key_rewards).map(r=>[r.id,r.quantity??1])),set_flags:[],atomic:true});
 const grants=rows(s.flags?.geoje_ball_grants).map(g=>({id:g.grant_id,triggerEvent:aliases[g.trigger_event]??g.trigger_event,itemId:g.item_id,quantity:g.quantity}));
 const stageModels=stages.map((st,i)=>({id:st.id,order:st.order,title:st.title,prerequisites:i?[sequence[i-1]]:[],entryGate:st.id==='PROLOGUE'?null:st.id==='FINAL'?'CAN_ENTER_LEAGUE':st.id==='POST'?'CAN_ENTER_POST':`CAN_ENTER_${st.id}`,eventIds:rows(st.main_beats).map(e=>e.event_id),trainerIds:Object.values(trainers).filter(t=>t.stageId===st.id).map(t=>t.id),requiredTrainerIds:Object.values(trainers).filter(t=>t.stageId===st.id&&t.required&&['route_general','gym_subtrainer'].includes(t.kind)).map(t=>t.id),gymId:gymModels.find(g=>g.stageId===st.id)?.id??null,bossIds:Object.values(trainers).filter(t=>t.stageId===st.id&&['blacknet','champion'].includes(t.kind)).map(t=>t.id),rewardIds:rewards.filter(r=>events[r.triggerEvent]?.stageId===st.id).map(r=>r.id),nextStageId:sequence[i+1]??null,context:{stageId:st.id,encounterActivation:false,fishingActivation:false},completionEnabled:st.id!=='POST'}));
 const characters=new Set(rows(s.character?.characters).map(c=>c.npc_id));
 for(const t of Object.values(trainers))if(t.npcId&&!characters.has(t.npcId))issue('STORY_NPC_REFERENCE',t.id,t.npcId);
 if(sequence.length!==12||stageModels.some((st,i)=>st.id!==sequence[i]))issue('STORY_STAGE_SEQUENCE','stage');
 for(const e of Object.values(events))for(const id of e.requiresEvents??[])if(!events[id])issue('STORY_EVENT_PREREQUISITE',e.id,id);
 return {version:STORY_VERSION,sequence,diagnostics,stages:index(stageModels),events,flags:index(flags),gates:index(rows(s.flags?.derived_gates)),aliases,trainers,parties,gyms:gymModels,elite,championId,rewards:index(rewards),geojeGrants:index(grants),speciesIdsByNumber:Object.fromEntries(Array.from({length:151},(_,i)=>[i+1,speciesId(i+1,'story.dex')])),leagueLossPolicy:'resume-current-checkpoint',deferred:{postEvents:Object.values(events).filter(e=>!e.active).map(e=>e.id),enhancedLeagueNpcId:'NPC_POST_YEJI',rivalRematch:'No POST party in this battle master',championRematch:c?.rematch??null,trainerAIAndItems:'Source metadata retained; engine AI/item expansion deferred'},bindings:{prologueRewardsAt:'P03_TUTORIAL',requiredTrainers:'Required trainers gate stage completion; required gym-sub trainers also gate leader.',leagueLoss:'Resume saved opponent after field recovery; prior wins/rewards are not replayed.'}};
}
