import{storyStageUnlocked,storyEventReady,storyTrainerAvailable}from'./availability-readiness.mjs';
import{applyOriginalWalkCounters}from'../world/movement-effects.mjs';
import{markS4DistanceAttempt,acknowledgeS4Distance}from'../development/gohyeon-gameplay/encounter/movement-proof.mjs';
import{waitCargoOfficerBattle}from'./native-cargo-officer-wait.mjs';
import{readS4EncounterGrant,markS4EncounterAttempt}from'../world/native-s4-encounter-authority.mjs';
import{waitS4GameplayBattle}from'./native-s4-gameplay-wait.mjs';
import{waitNativeHarinBattle}from'./native-harin-battle-wait.mjs';
import{canCompleteStoryStage}from'./stage-completion-readiness.mjs';
import {selectWeatherEncounter} from '../encounter/species-weather.mjs';
import {adoptApprovedEconomy} from '../economy/approved-v1.mjs';
import {economyAction,recoverAfterLoss,recoverAtLastHub} from '../economy/actions.mjs';
import {HARIN_POST_V1,resolveHarinPostParty} from '../compatibility/harin-post-rematch-v1.mjs';
import {harinBattleId,harinResultPending,requireHarinInteraction,recordHarinResult} from './harin-rematch.mjs';
import {applyWorldAction} from '../world/state.mjs';
import {candidatePrize} from '../economy/candidate.mjs';
import {stagedTrainerPrize20260927} from '../economy/staged-prize-20260927.mjs';
import {tutorialReady,issueTutorialPermit} from '../economy/tutorial.mjs';
import {createCanonicalCreature,createGameSession,canonicalHp} from '../canonical-session.mjs';
import {startSessionBattle} from '../battle-v3/engine.mjs';
import {startYejiFinalBattle} from '../battle-v3/preview-opponents.mjs';
import {startEnhancedLeagueBattle} from '../battle-v3/enhanced-league.mjs';
import {ENHANCED_LEAGUE_V1,assertEnhancedLeagueReady,enhancedLeagueActive,beginEnhancedLeague,leagueResultPending,finishEnhancedLeagueOpponent,reorderEnhancedLeagueParty} from './enhanced-league.mjs';
import {teachTm,learnPendingMove} from '../battle-v3/save.mjs';
import {createBattleRules} from '../battle-v3/rules.mjs';
import {validateCanonicalStorySave,storyBattleInput,mergeStoryAftermath} from './save.mjs';
import {evaluateStoryExpression,setStoryFlag} from './gates.mjs';
import {StoryEventRunner} from './event-runner.mjs';
import {isPost20260927,SANCTUARIES,postChecklist20260927,relocateRoamer20260927,roamerAt20260927,roamingEligible20260927} from './post-20260927.mjs';
import {storyContractFor,ENCOUNTER_VERSION} from '../encounter/state.mjs';
import {areaAccess,tableAccess,acquisitionAccess} from '../encounter/access.mjs';
import {ENCOUNTER_PROFILES,effectiveChance,checkEncounterStep,afterWildBattle,selectEncounter} from '../encounter/frequency.mjs';
import {issueEncounterPermit} from '../encounter/permit.mjs';
import {grantAcquisition,recordAcquisition,evolveCompanion} from '../encounter/acquisition.mjs';
const clone=x=>structuredClone(x),add=(a,id)=>{if(!a.includes(id))a.push(id)};
/** Per-session progression. Neither species catalog nor legacy/global field state is mutated. */
export class StoryProgressionService {
 #save;#catalog;#adapter;#contract;#persist;#busy=false;#pending=null;#battle=null;#battleResolve=null;#runner;#hooks;#economyHost;#encounterEnvironment;#encounterDiagnostic;
 constructor({runtime,catalog,adapter,persist=null,hooks={},economyHost=null,encounterEnvironment=null,encounterDiagnostic=null}){
  if(!adapter?.validation?.ready||catalog?.namespace!=='canonical')throw Error('Canonical story session required');
  this.#save=validateCanonicalStorySave(adoptApprovedEconomy(validateCanonicalStorySave(runtime,catalog),catalog),catalog);this.#catalog=catalog;this.#adapter=adapter;this.#contract=storyContractFor(runtime,catalog);this.#persist=persist;this.#economyHost=economyHost;this.#encounterEnvironment=encounterEnvironment;this.#encounterDiagnostic=encounterDiagnostic;this.#hooks=hooks;this.#runner=new StoryEventRunner(hooks);
  // Validate every source expression up front, including currently locked gates.
  for(const g of Object.values(this.#contract.gates))this.gate(g.id);
 }
 get catalog(){return this.#catalog}
 get contract(){return this.#contract}
 get busy(){return this.#busy}
 get pendingCommit(){return !!this.#pending}
 get warnings(){return clone(this.#runner.warnings)}
 snapshot(){return clone(this.#save)}
 battleSnapshot(){return this.#battle?.snapshot()??null}
 #idle(){if(this.#busy||this.#pending)throw Error('Story operation or uncommitted transaction in progress')}
 flag(id){if(!this.#contract.flags[id])throw Error('Unknown canonical flag');return this.#save.progress.flags[id]}
 eventCompleted(id){id=this.#contract.aliases[id]??id;if(!this.#contract.events[id])throw Error('Unknown canonical event');return this.#save.progress.completedEvents.includes(id)}
 gate(id,save=this.#save){if(!this.#contract.gates[id])throw Error('Unknown canonical gate');return evaluateStoryExpression(id,save,this.#contract)}
 rewardClaimed(id){if(!this.#contract.rewards[id]&&!this.#contract.geojeGrants[id])throw Error('Unknown canonical reward');return this.#save.progress.rewardClaims.includes(id)||(Array.isArray(this.#save.progress.geojeBallGrantHistory)&&this.#save.progress.geojeBallGrantHistory.includes(id))}
 gymCleared(id){return this.#save.progress.gymClears.includes(id)}
 badgeObtained(id){return this.#save.progress.badges.includes(id)}
 stageUnlocked(id,save=this.#save){return storyStageUnlocked(id,save,this.#contract)}
 #eventReady(id,save=this.#save){return storyEventReady(id,save,this.#contract)}
 eventAvailable(id){id=this.#contract.aliases[id]??id;const e=this.#contract.events[id];return this.#eventReady(id)&&(!e.trainerId||this.trainerAvailable(e.trainerId))}
 trainerAvailable(id,save=this.#save){return storyTrainerAvailable(id,save,this.#contract)}
 resolveTrainerParty(id){
  const t=this.#contract.trainers[id];if(!t)throw Error('Unknown canonical trainer');
  const partyId=t.variantPartyIds?.[this.#save.starterId]??t.partyId,party=this.#contract.parties[partyId];if(!party)throw Error('Missing canonical trainer party');return clone(party);
 }
 context(){const st=this.#contract.stages[this.#save.progress.currentStage];return {...st.context,unlocked:this.stageUnlocked(st.id),gates:Object.fromEntries(Object.keys(this.#contract.gates).map(id=>[id,this.gate(id)]))}}
 postChecklist(){if(!isPost20260927(this.#catalog.encounterContract))throw Error('Staged POST contract required');return postChecklist20260927(this.#save,this.#contract)}
 async #commit(next){
  if(!this.#pending){next.revision=this.#save.revision+1;next.updatedAt=Date.now()}
  const clean=validateCanonicalStorySave(next,this.#catalog);
  this.#pending=clean;
  if(this.#persist)await this.#persist(clone(clean));
  this.#save=clean;this.#pending=null;return this.snapshot();
 }
 async retryCommit(){if(this.#busy||!this.#pending)throw Error('No retryable story commit');this.#busy=true;try{const closing=this.#pending.enhancedLeague?.phase==='completed'&&this.#save.enhancedLeague?.phase!=='completed',s=await this.#commit(clone(this.#pending));if(closing)await this.#runner.cue({op:'dialogue',actorId:'NPC_POST_YEJI',text:ENHANCED_LEAGUE_V1.closingDialogue});return s}finally{this.#busy=false}}
 async #change(fn){this.#idle();this.#busy=true;try{const draft=this.snapshot();fn(draft);return await this.#commit(draft)}finally{this.#busy=false}}
 // Persistent flags must retain source-event provenance; callers cannot manufacture gym victories.
 async economyCommand(request){return this.#change(s=>{
  if(enhancedLeagueActive(s)&&request.type!=='use-item')throw Error('강화 리그 연전 사이에는 소지 회복 아이템만 사용할 수 있습니다.');
  const round=s.economy?.quest?.round,active=s.economy?.quest?.active;
  economyAction(s,this.#catalog,request,this.#economyHost);
  // World distance evidence commits with the original economy transaction.
  // Replayed transaction IDs never reset a trip or append another completion.
  if(s.world&&request.type==='research-accept'&&s.economy.quest.round!==round)applyWorldAction(s,this.#catalog,{type:'survey-start'},this.#economyHost);
  if(s.world&&request.type==='research-report'&&active&&!s.economy.quest.active)applyWorldAction(s,this.#catalog,{type:'survey-end'},this.#economyHost);
 })}
 async worldCommand(request){return this.#change(s=>applyWorldAction(s,this.#catalog,request,this.#economyHost))}
 async setFlag(id,value=true){return this.#change(s=>setStoryFlag(s.progress,this.#contract,id,value))}
 async clearFlag(id){return this.setFlag(id,false)}
 async enterStage(id){return this.#change(s=>{if(enhancedLeagueActive(s)||!this.stageUnlocked(id,s))throw Error('Stage prerequisites not met');s.progress.currentStage=id;this.#leagueCheckpoint(s)})}
 #leagueCheckpoint(s){const p=s.progress;p.leagueRunState=p.flags.MAIN_STORY_CLEAR?'idle':p.leagueWins.length===4?'champion':p.currentStage==='FINAL'||p.leagueWins.length?`elite_${p.leagueWins.length+1}`:'idle'}
 #completeStage(s,id){const p=s.progress;if(!canCompleteStoryStage(s,this.#contract,id))throw Error('Stage completion conditions not met');add(p.completedStages,id)}
 async completeStage(id=this.#save.progress.currentStage){
  if(this.#save.progress.completedStages.includes(id))return this.snapshot();return this.#change(s=>this.#completeStage(s,id));
 }
 #item(s,id,quantity){
  if(!Number.isInteger(quantity))throw Error('Invalid reward quantity');
  if(Object.hasOwn(s.inventory,id)){s.inventory[id]+=quantity;if(s.inventory[id]<0)throw Error('Missing required item');return}
  if(id.startsWith('TM')){if(quantity!==1||!this.#catalog.getTmById(id))throw Error('Invalid TM reward');add(s.ownedTms,id);return}
  s.progress.items[id]=(s.progress.items[id]??0)+quantity;if(s.progress.items[id]<0)throw Error('Missing required item');
 }
 #claim(s,id){
  const r=this.#contract.rewards[id];if(!r)throw Error('Unknown reward transaction');if(s.progress.rewardClaims.includes(id))return;
  if(!r.requires.every(expr=>evaluateStoryExpression(expr,s,this.#contract)))throw Error('Reward requirements unmet');
  for(const [item,n] of Object.entries(r.consume??{}))this.#item(s,item,-n);
  for(const [item,n] of Object.entries(r.grant??{}))this.#item(s,item,n);
  for(const flag of r.set_flags??[])setStoryFlag(s.progress,this.#contract,flag,true);add(s.progress.rewardClaims,id);
 }
 #finishEvent(s,id){
  const p=s.progress;if(p.completedEvents.includes(id))return;
  // Evaluate transaction preconditions BEFORE setting event flags (e.g. !BADGE_01).
  for(const r of Object.values(this.#contract.rewards))if(r.triggerEvent===id)this.#claim(s,r.id);
  // Approved sessions grant only at hidden interactions; raw historical snapshots retain their contract.
  for(const g of Object.values(this.#contract.geojeGrants))if(!s.geojeHidden&&!s.world&&g.triggerEvent===id&&!p.geojeBallGrantHistory.includes(g.id)){this.#item(s,g.itemId,g.quantity);s.geojeBallsGranted+=g.quantity;add(p.geojeBallGrantHistory,g.id)}
  add(p.completedEvents,id);
  if(s.economy&&id==='P03_TUTORIAL')s.economy.tutorial.open=true;
  if(s.economy&&id==='P04_SUSPICIOUS_TRACE')s.economy.tutorial.open=false;
  for(const f of Object.values(this.#contract.flags))if(f.set_by.some(e=>(this.#contract.aliases[e]??e)===id))setStoryFlag(p,this.#contract,f.id,true);
  for(const g of this.#contract.gyms)if(g.eventId===id){add(p.gymClears,g.id);add(p.badges,g.badgeId)}
  if(isPost20260927(this.#catalog.encounterContract)&&id==='FINAL_CHAMPION'){
   this.#completeStage(s,'FINAL');p.currentStage='POST';
  }
  if(isPost20260927(this.#catalog.encounterContract)&&id==='YEJI_FINAL'){
   this.#finishEvent(s,'YEJI_FINAL_ENDING');
   for(const no of [148,149,150])relocateRoamer20260927(s,this.#contract,this.#economyHost?.world,no);
  }
  this.#leagueCheckpoint(s);
 }
 #apply(s,op){
  if(op.op==='starter'){
   if(s.party.length)throw Error('Starter already acquired');const mon=createCanonicalCreature(this.#catalog,s.starterId,5);s.party.push(mon);add(s.dex.seen,s.starterId);add(s.dex.caught,s.starterId);return;
  }
  if(op.op==='seen'){if(!this.#catalog.getSpeciesById(op.speciesId))throw Error('Unknown sighting identity');add(s.dex.seen,op.speciesId);return}
  if(op.op==='flagSet'){setStoryFlag(s.progress,this.#contract,op.flagId,op.value);return}
  if(['itemReward','badgeReward'].includes(op.op)){this.#claim(s,op.rewardId);return}
  if(op.op==='stageComplete'){this.#completeStage(s,op.stageId);return}
  throw Error('Unsupported story mutation');
 }
 async #fight(draft,trainerId,{battleDriver,rng,map,nativeHarinSignal,nativeS4GameplaySignal,nativeCargoOfficerSignal,nativeGym12Signal,nativeGym3Signal,nativeGym5Signal,nativeGym4Signal,nativeStreamRoleSignal,nativeS2Signal,nativeS3Signal,nativePrologueRivalSignal}={}){
  if(!this.trainerAvailable(trainerId,draft))throw Error('Trainer battle unavailable');
  const t=this.#contract.trainers[trainerId],party=this.resolveTrainerParty(trainerId);
  const battleId=draft.economy?`${draft.sessionId}:${++draft.economy.battleSerial}`:null;
  const context=map??{id:'canonical-story-field',biomeId:'GRASSLAND'};
  // The actual field biome is retained; an ID-based gym/league override is explicit metadata.
  const battleMap={...context,...(['gym','elite','champion'].includes(t.kind)?{battleBackgroundId:`battle.biome.${t.kind==='gym'?'GYM':'LEAGUE'}`}:{})};
  const battle=startSessionBattle(createGameSession(storyBattleInput(draft,this.#catalog),this.#catalog),{kind:'trainer',opponents:party.members,partyId:party.id,map:battleMap,rng},{adapter:this.#adapter});this.#battle=battle;
  await this.#runner.cue({op:'cameraCue',cue:'battle-entry',trainerId,npcId:t.npcId});
  try{
   const play=()=>battleDriver?battleDriver(battle):new Promise(resolve=>{this.#battleResolve=resolve;this.#hooks.battleReady?.(battle.snapshot())});
   if(trainerId==='RIVAL_00'&&nativePrologueRivalSignal!==undefined)await waitNativeHarinBattle(play,nativePrologueRivalSignal);else if(trainerId==='RIVAL_03'&&nativeHarinSignal!==undefined)await waitNativeHarinBattle(play,nativeHarinSignal);else if(['ROUTE_S4_01','ROUTE_S4_02','ROUTE_S4_04'].includes(trainerId)&&nativeS4GameplaySignal!==undefined)await waitS4GameplayBattle(play,nativeS4GameplaySignal);else if(['BLACKNET_BOMI_FINAL','BLACKNET_JUNSEOK_FINAL','BLACKNET_HWIGYEONG_FINAL'].includes(trainerId)&&nativeCargoOfficerSignal!==undefined)await waitCargoOfficerBattle(play,nativeCargoOfficerSignal);else if(['GYM_01_SUB_01','GYM_01_SUB_02','NPC_GYM_01_KANGMIN','GYM_02_SUB_01','GYM_02_SUB_02','NPC_GYM_02_YOUNGJIN'].includes(trainerId)&&nativeGym12Signal!==undefined)await waitS4GameplayBattle(play,nativeGym12Signal);else if(['GYM_05_SUB_01','GYM_05_SUB_02','GYM_05_SUB_03','NPC_GYM_05_MYEONGJU'].includes(trainerId)&&nativeGym5Signal!==undefined)await waitS4GameplayBattle(play,nativeGym5Signal);else if(['GYM_04_SUB_01','GYM_04_SUB_02','NPC_GYM_04_JINSEONG'].includes(trainerId)&&nativeGym4Signal!==undefined)await waitS4GameplayBattle(play,nativeGym4Signal);else if(['RIVAL_01','ROUTE_S1_01','ROUTE_S1_07','ROUTE_S1_03','ROUTE_S1_04','ROUTE_S1_06','ROUTE_S1_02','ROUTE_S1_05','ROUTE_S1_08'].includes(trainerId)&&nativeStreamRoleSignal!==undefined)await waitS4GameplayBattle(play,nativeStreamRoleSignal);else if((/^ROUTE_S3_0[1-8]$/.test(trainerId)||trainerId==='RIVAL_02')&&nativeS3Signal!==undefined)await waitS4GameplayBattle(play,nativeS3Signal);else if(['GYM_03_SUB_01','GYM_03_SUB_02','NPC_GYM_03_JEONGUI'].includes(trainerId)&&nativeGym3Signal!==undefined)await waitS4GameplayBattle(play,nativeGym3Signal);else if(/^ROUTE_S2_0[1-8]$/.test(trainerId)&&nativeS2Signal!==undefined)await waitS4GameplayBattle(play,nativeS2Signal);else await play();
   if(battle.snapshot().phase!=='ended')throw Error('Battle driver must finish the real Battle v3 engine');
   const result=battle.snapshot().outcome;Object.assign(draft,mergeStoryAftermath(draft,battle.aftermath(),this.#catalog));
   if(result==='lost')recoverAfterLoss(draft,this.#catalog,this.#economyHost,battleId);
   if(result==='won'){
    if(isPost20260927(this.#catalog.encounterContract)&&!this.#catalog.encounterContract.retainedTrainerRewardIds?.includes(trainerId))stagedTrainerPrize20260927(draft,t,party,battleId,this.#contract,this.#catalog.economyPolicy);
    else candidatePrize(draft,t,party,battleId,result,this.#catalog.economyPolicy??undefined);
    add(draft.progress.defeatedTrainers,trainerId);if(t.kind==='elite')add(draft.progress.leagueWins,trainerId);
    this.#leagueCheckpoint(draft);return true;
   }
   return false;
  }finally{try{this.#hooks.battleFinished?.(battle.snapshot().outcome)}catch(error){this.#runner.warnings.push({op:'battleFinished',message:error.message})}this.#battleResolve=null;this.#battle=null}
 }
 actBattle(action){if(!this.#battle||!this.#battleResolve)throw Error('No interactive story battle');const snapshot=this.#battle.act(action);if(snapshot.phase==='ended')this.#battleResolve();return snapshot}
 async #execute(operations,eventId,options){
  const prologueFieldGuard=options.nativePrologueFieldRejectOnly;if(prologueFieldGuard!==undefined&&(eventId!=='P04_SUSPICIOUS_TRACE'||typeof prologueFieldGuard!=='function'||!(options.nativePrologueFieldSignal instanceof AbortSignal)))throw Error('INVALID_PROLOGUE_FIELD_GUARD');prologueFieldGuard?.();
  const rivalGuard=options.nativePrologueRivalRejectOnly;if(rivalGuard!==undefined&&(eventId!=='RIVAL_00'||typeof rivalGuard!=='function'||!(options.nativePrologueRivalSignal instanceof AbortSignal)))throw Error('INVALID_PROLOGUE_RIVAL_GUARD');rivalGuard?.();
  const freshGuard=options.nativeFreshStartRejectOnly;if(freshGuard!==undefined&&(eventId!=='P00_HOME_START'||typeof freshGuard!=='function'||!(options.nativeFreshStartSignal instanceof AbortSignal)||options.nativeLabRejectOnly!==undefined))throw Error('INVALID_FRESH_START_GUARD');freshGuard?.();const labGuard=options.nativeLabRejectOnly;if(labGuard!==undefined&&(!['P01_ECO_CENTER','P02_FIRST_PARTNER','P03_TUTORIAL'].includes(eventId)||typeof labGuard!=='function'||!(options.nativeLabSignal instanceof AbortSignal)))throw Error('INVALID_LAB_GUARD');labGuard?.();
  const wetlandRoleSelected=eventId==='S1_TRAP_INVESTIGATION'||operations.some(o=>o.op==='trainerBattle'&&['ROUTE_S1_02','ROUTE_S1_05','ROUTE_S1_08'].includes(o.trainerId));const streamRoleSelected=wetlandRoleSelected||eventId==='RIVAL_01'||eventId==='S1_WATER_DECLINE'||operations.some(o=>o.op==='trainerBattle'&&['RIVAL_01','ROUTE_S1_01','ROUTE_S1_07','ROUTE_S1_03','ROUTE_S1_04','ROUTE_S1_06','ROUTE_S1_02','ROUTE_S1_05','ROUTE_S1_08'].includes(o.trainerId)),streamRoleGuard=options.nativeStreamRoleRejectOnly;if(streamRoleGuard!==undefined&&(!streamRoleSelected||typeof streamRoleGuard!=='function'))throw Error('INVALID_STREAM_ROLE_GUARD');streamRoleGuard?.();
  const s3Selected=['S3_ROUTE_TRAINERS','S3_BLACKNET_NAME_REVEAL','RIVAL_02'].includes(eventId)||operations.some(o=>o.op==='trainerBattle'&&(/^ROUTE_S3_0[1-8]$/.test(o.trainerId)||o.trainerId==='RIVAL_02')),s3Guard=options.nativeS3RejectOnly;if(s3Guard!==undefined&&(!s3Selected||typeof s3Guard!=='function'||!(options.nativeS3Signal instanceof AbortSignal)))throw Error('INVALID_S3_AREA_GUARD');s3Guard?.();
  const gym3Selected=eventId==='S3_GYM_STORY'||operations.some(o=>o.op==='trainerBattle'&&['GYM_03_SUB_01','GYM_03_SUB_02','NPC_GYM_03_JEONGUI'].includes(o.trainerId)),gym3Guard=options.nativeGym3RejectOnly;if(gym3Guard!==undefined&&(!gym3Selected||typeof gym3Guard!=='function'||!(options.nativeGym3Signal instanceof AbortSignal)))throw Error('INVALID_GYM3_GUARD');gym3Guard?.();
  const s2Selected=['S2_BIRD_DISTURBANCE','S2_LURE_DISCOVERY','S2_WIND_EVENT_150'].includes(eventId)||operations.some(o=>o.op==='trainerBattle'&&/^ROUTE_S2_0[1-8]$/.test(o.trainerId)),s2Guard=options.nativeS2RejectOnly;if(s2Guard!==undefined&&(!s2Selected||typeof s2Guard!=='function'||!(options.nativeS2Signal instanceof AbortSignal)))throw Error('INVALID_S2_AREA_GUARD');s2Guard?.();
  const gym12Selected=['S1_GYM_STORY','S2_GYM_STORY'].includes(eventId)||operations.some(o=>o.op==='trainerBattle'&&['GYM_01_SUB_01','GYM_01_SUB_02','NPC_GYM_01_KANGMIN','GYM_02_SUB_01','GYM_02_SUB_02','NPC_GYM_02_YOUNGJIN'].includes(o.trainerId)),gym12Guard=options.nativeGym12RejectOnly;if(gym12Guard!==undefined&&(!gym12Selected||typeof gym12Guard!=='function'||!(options.nativeGym12Signal instanceof AbortSignal)))throw Error('INVALID_GYM12_GUARD');gym12Guard?.();
  const gym5Selected=eventId==='S5_GYM_STORY'||operations.some(o=>o.op==='trainerBattle'&&['GYM_05_SUB_01','GYM_05_SUB_02','GYM_05_SUB_03','NPC_GYM_05_MYEONGJU'].includes(o.trainerId)),gym5Guard=options.nativeGym5RejectOnly;if(gym5Guard!==undefined&&(!gym5Selected||typeof gym5Guard!=='function'))throw Error('INVALID_GYM5_GUARD');gym5Guard?.();
  const gym4Selected=eventId==='S4_GYM_STORY'||operations.some(o=>o.op==='trainerBattle'&&['GYM_04_SUB_01','GYM_04_SUB_02','NPC_GYM_04_JINSEONG'].includes(o.trainerId)),gym4Guard=options.nativeGym4RejectOnly;if(gym4Guard!==undefined&&(!gym4Selected||typeof gym4Guard!=='function'))throw Error('INVALID_GYM4_GUARD');gym4Guard?.();
  const s4Guard=(['S4_HISTORY_INVESTIGATION','S4_VILLAIN_NETWORK'].includes(eventId)||operations.some(o=>o.op==='trainerBattle'&&['ROUTE_S4_01','ROUTE_S4_02','ROUTE_S4_04'].includes(o.trainerId)))?options.nativeS4GameplayRejectOnly:undefined;if(s4Guard!==undefined&&typeof s4Guard!=='function')throw Error('INVALID_S4_GAMEPLAY_GUARD');s4Guard?.();
  const cargoZoneGuard=options.nativeCargoZoneRejectOnly;if(cargoZoneGuard!==undefined&&(!['S9_SHIP_ZONE1_COMPLETE_EVENT','S9_SHIP_ZONE2_RESCUE_EVENT'].includes(eventId)||typeof cargoZoneGuard!=='function'))throw Error('INVALID_CARGO_ZONE_GUARD');
  const cargoOfficerGuard=options.nativeCargoOfficerRejectOnly;if(cargoOfficerGuard!==undefined&&(!['BLACKNET_BOMI_FINAL','BLACKNET_JUNSEOK_FINAL','BLACKNET_HWIGYEONG_FINAL'].includes(eventId)||typeof cargoOfficerGuard!=='function'))throw Error('INVALID_CARGO_OFFICER_GUARD');
  const cargoRescueGuard=options.nativeCargoRescueRejectOnly;if(cargoRescueGuard!==undefined&&(!['S9_FINAL_VILLAIN_RAID','RIVAL_S9_ALLY','S9_RELEASE_RESCUED'].includes(eventId)||typeof cargoRescueGuard!=='function'))throw Error('INVALID_CARGO_RESCUE_GUARD');
  this.#idle();this.#busy=true;const draft=this.snapshot();
  try{
   cargoRescueGuard?.();cargoOfficerGuard?.();cargoZoneGuard?.();
   if(eventId==='S5_JUNGLE_DOME_EXPEDITION'&&options.nativeJungleRejectOnly!==undefined){if(typeof options.nativeJungleRejectOnly!=='function')throw Error('INVALID_JUNGLE_GUARD');options.nativeJungleRejectOnly();}
   if(eventId==='RIVAL_03'&&options.nativeHarinRejectOnly!==undefined){if(typeof options.nativeHarinRejectOnly!=='function')throw Error('INVALID_HARIN_GUARD');options.nativeHarinRejectOnly();}
   const result=await this.#runner.run(operations,{apply:op=>this.#apply(draft,op),battle:id=>this.#fight(draft,id,options),guard:s3Guard??gym3Guard??s2Guard??gym12Guard??labGuard??freshGuard??rivalGuard??prologueFieldGuard??((wetlandRoleSelected||eventId==='RIVAL_01')?streamRoleGuard:undefined),signal:s3Guard?options.nativeS3Signal:gym3Guard?options.nativeGym3Signal:s2Guard?options.nativeS2Signal:gym12Guard?options.nativeGym12Signal:labGuard?options.nativeLabSignal:freshGuard?options.nativeFreshStartSignal:rivalGuard?options.nativePrologueRivalSignal:prologueFieldGuard?options.nativePrologueFieldSignal:(wetlandRoleSelected||eventId==='RIVAL_01')&&streamRoleGuard?options.nativeStreamRoleSignal:undefined});
   labGuard?.();freshGuard?.();rivalGuard?.();prologueFieldGuard?.();
   if(eventId==='S5_JUNGLE_DOME_EXPEDITION'&&options.nativeJungleRejectOnly!==undefined)options.nativeJungleRejectOnly();
   if(eventId==='RIVAL_03'&&options.nativeHarinRejectOnly!==undefined)options.nativeHarinRejectOnly();
   cargoRescueGuard?.();cargoOfficerGuard?.();cargoZoneGuard?.();
   s4Guard?.();
   gym12Guard?.();
   gym5Guard?.();
   gym4Guard?.();
   streamRoleGuard?.();s2Guard?.();s3Guard?.();gym3Guard?.();
   if(result.completed&&eventId)this.#finishEvent(draft,eventId);
   await this.#commit(draft);return {completed:result.completed,runtime:this.snapshot()};
  }finally{this.#busy=false}
 }
 async runEvent(id,options={}){
  id=this.#contract.aliases[id]??id;this.#idle();
  if(id==='YEJI_FINAL'&&isPost20260927(this.#catalog.encounterContract))return this.runYejiFinal(options);
  if(this.eventCompleted(id))return {completed:true,alreadyCompleted:true,runtime:this.snapshot()};
  if(!this.eventAvailable(id)){
   // Expected gate feedback stays a rejection: no operations, rewards or save writes.
   const needsRival=id==='P03_TUTORIAL'&&this.#contract.events[id].requiresEvents.includes('RIVAL_00')&&!this.#save.progress.completedEvents.includes('RIVAL_00');
   const message=needsRival?'하린과의 첫 대결에서 승리한 뒤 다시 이야기해 주세요.':'아직 이 이야기를 진행할 수 없어요. 먼저 주변의 이야기와 대결을 진행해 주세요.';
   throw Object.assign(new Error(message),{code:'STORY_EVENT_UNAVAILABLE',eventId:id});
  }
  const e=this.#contract.events[id];
  return this.#execute([...e.operations,...e.trainerId?[{op:'trainerBattle',trainerId:e.trainerId}]:[]],id,options);
 }
 async runTrainer(id,options={}){
  if(id==='YEJI_FINAL'&&isPost20260927(this.#catalog.encounterContract))return this.runYejiFinal(options);
  this.#idle();if(!this.trainerAvailable(id))throw Error('Trainer battle unavailable');const t=this.#contract.trainers[id];
  if(t.eventId)return this.runEvent(t.eventId,options);
  return this.#execute([{op:'actorFace',actorId:t.npcId??id,facing:'down'},{op:'trainerBattle',trainerId:id}],null,options);
 }
 /** Field recovery, not a victory/reward. Never changes flags, levels or trainer parties. */
 async recoverParty(){return this.#change(s=>{if(enhancedLeagueActive(s))throw Error('강화 리그 승리 후에는 자동/센터 회복을 사용할 수 없습니다.');for(const mon of s.party){mon.hp=canonicalHp(this.#catalog,mon.speciesId,mon.level);mon.status=null;delete mon.statusState;for(const m of mon.moves)m.pp=this.#catalog.getMoveById(m.id).pp}})}
 /** Independent final battle; victory, ending, and roamer eligibility commit together. */
 async runYejiFinal(options={}){
  if(!isPost20260927(this.#catalog.encounterContract))throw Error('Staged final contract required');
  this.#idle();if(this.eventCompleted('YEJI_FINAL'))return {completed:true,alreadyCompleted:true,runtime:this.snapshot()};
  if(!this.eventAvailable('YEJI_FINAL')||!this.gate('CAN_BATTLE_YEJI_FINAL'))throw Error('YEJI_FINAL unavailable');
  this.#busy=true;const draft=this.snapshot(),battleId=draft.economy?`${draft.sessionId}:${++draft.economy.battleSerial}`:null;
  try{
   const battle=startYejiFinalBattle(createGameSession(storyBattleInput(draft,this.#catalog),this.#catalog),{adapter:this.#adapter,story:draft,rng:options.rng,map:options.map});this.#battle=battle;
   await this.#runner.cue({op:'inputLock'});await this.#runner.cue({op:'actorFace',actorId:'NPC_POST_YEJI',facing:'down'});await this.#runner.cue({op:'cameraCue',cue:'battle-entry',trainerId:'YEJI_FINAL'});
   if(options.battleDriver)await options.battleDriver(battle);else await new Promise(resolve=>{this.#battleResolve=resolve;this.#hooks.battleReady?.(battle.snapshot())});
   const result=battle.snapshot();if(result.phase!=='ended'||!['won','lost'].includes(result.outcome))throw Error('YEJI_FINAL requires a finished Battle v3 result');
   Object.assign(draft,mergeStoryAftermath(draft,battle.aftermath(),this.#catalog));
   if(result.outcome==='won'){add(draft.progress.defeatedTrainers,'YEJI_FINAL');this.#finishEvent(draft,'YEJI_FINAL')}
   else recoverAfterLoss(draft,this.#catalog,this.#economyHost,battleId);
   await this.#commit(draft);
   if(result.outcome==='won')await this.#runner.cue({op:'cameraCue',cue:'final-credits',eventId:'YEJI_FINAL_ENDING'});
   return {completed:result.outcome==='won',outcome:result.outcome,runtime:this.snapshot()};
  }finally{
   try{if(this.#battle)this.#hooks.battleFinished?.(this.#battle.snapshot().outcome)}catch(error){this.#runner.warnings.push({op:'battleFinished',message:error.message})}
   this.#battle=null;this.#battleResolve=null;await this.#runner.cue({op:'inputUnlock'});this.#busy=false;
  }
 }
 async enhancedLeagueCommand(request){
  assertEnhancedLeagueReady(this.#adapter);
  return this.#change(s=>{
   if(request.type==='begin')return beginEnhancedLeague(s,this.#catalog,this.#economyHost,request.transactionId);
   if(request.type==='reorder')return reorderEnhancedLeagueParty(s,request.instanceIds);
   if(request.type==='abandon')return finishEnhancedLeagueOpponent(s,{attempt:request.attempt,index:request.index,outcome:'abandoned'},this.#catalog,this.#economyHost);
   throw Error('Unknown enhanced league command');
  });
 }
 async runEnhancedLeagueOpponent({attempt,index,...options}={}){
  this.#idle();assertEnhancedLeagueReady(this.#adapter);
  if(!leagueResultPending(this.#save,attempt,index))return {alreadyCommitted:true,runtime:this.snapshot()};
  this.#busy=true;const draft=this.snapshot();
  try{
   const battle=startEnhancedLeagueBattle(draft,this.#catalog,this.#adapter,{attempt,index,rng:options.rng,map:options.map});this.#battle=battle;
   await this.#runner.cue({op:'inputLock'});await this.#runner.cue({op:'cameraCue',cue:'battle-entry',trainerId:ENHANCED_LEAGUE_V1.order[index]});
   if(options.battleDriver)await options.battleDriver(battle);else await new Promise(resolve=>{this.#battleResolve=resolve;this.#hooks.battleReady?.(battle.snapshot())});
   const result=battle.snapshot();if(result.phase!=='ended'||!['won','lost'].includes(result.outcome))throw Error('Enhanced league requires a finished Battle v3 result');
   Object.assign(draft,mergeStoryAftermath(draft,battle.aftermath(),this.#catalog));
   finishEnhancedLeagueOpponent(draft,{attempt,index,outcome:result.outcome},this.#catalog,this.#economyHost);
   await this.#commit(draft);
   if(draft.enhancedLeague.phase==='completed'){try{this.#hooks.battleFinished?.(result.outcome)}catch(error){this.#runner.warnings.push({op:'battleFinished',message:error.message})}this.#battle=null;await this.#runner.cue({op:'dialogue',actorId:'NPC_POST_YEJI',text:ENHANCED_LEAGUE_V1.closingDialogue})}
   return {outcome:result.outcome,runtime:this.snapshot()};
  }finally{
   try{if(this.#battle)this.#hooks.battleFinished?.(this.#battle.snapshot().outcome)}catch(error){this.#runner.warnings.push({op:'battleFinished',message:error.message})}
   this.#battle=null;this.#battleResolve=null;await this.#runner.cue({op:'inputUnlock'});this.#busy=false;
  }
 }
 async teachTm(instanceId,tmId,slot){return this.#change(s=>Object.assign(s,mergeStoryAftermath(s,teachTm(storyBattleInput(s,this.#catalog),this.#catalog,createBattleRules(this.#adapter),instanceId,tmId,slot),this.#catalog)))}
 /** Explicit POST request, separate result receipt; no main-event replay or candidate prize. */
 async runHarinRematch({sequence,...options}={}){
  this.#idle();const party=resolveHarinPostParty(this.#adapter,this.#save.starterId);
  if(!harinResultPending(this.#save,sequence))return {alreadyCommitted:true,runtime:this.snapshot()};
  requireHarinInteraction(this.#save,this.#economyHost);
  this.#busy=true;const draft=this.snapshot(),battleId=harinBattleId(draft,sequence);
  try{
   const bound={...this.#adapter,storyRuntime:{...this.#adapter.storyRuntime,parties:{...this.#adapter.storyRuntime.parties,[party.id]:party}}};
   const battle=startSessionBattle(createGameSession(storyBattleInput(draft,this.#catalog),this.#catalog),{kind:'trainer',partyId:party.id,opponents:party.members,rng:options.rng,map:options.map??{id:HARIN_POST_V1.mapId,biomeId:'COAST'}},{adapter:bound});this.#battle=battle;
   await this.#runner.cue({op:'inputLock'});await this.#runner.cue({op:'actorFace',actorId:HARIN_POST_V1.npcId,facing:'down'});
   await this.#runner.cue({op:'cameraCue',cue:'battle-entry',trainerId:'POST_HARIN_REMATCH',npcId:HARIN_POST_V1.npcId});
   if(options.battleDriver)await options.battleDriver(battle);else await new Promise(resolve=>{this.#battleResolve=resolve;this.#hooks.battleReady?.(battle.snapshot())});
   const result=battle.snapshot();if(result.phase!=='ended'||!['won','lost'].includes(result.outcome))throw Error('Harin rematch requires a finished Battle v3 result');
   Object.assign(draft,mergeStoryAftermath(draft,battle.aftermath(),this.#catalog));
   if(result.outcome==='lost')recoverAtLastHub(draft,this.#catalog,this.#economyHost,battleId,{hubId:draft.economy.lastHub??draft.world.visitedHubs.at(-1)});
   recordHarinResult(draft,sequence,result.outcome,party.id);await this.#commit(draft);
   return {outcome:result.outcome,battleId,runtime:this.snapshot()};
  }finally{
   try{if(this.#battle)this.#hooks.battleFinished?.(this.#battle.snapshot().outcome)}catch(error){this.#runner.warnings.push({op:'battleFinished',message:error.message})}
   this.#battle=null;this.#battleResolve=null;await this.#runner.cue({op:'inputUnlock'});this.#busy=false;
  }
 }
 async learnMove(instanceId,moveId,slot=null){return this.#change(s=>Object.assign(s,mergeStoryAftermath(s,learnPendingMove(storyBattleInput(s,this.#catalog),this.#catalog,instanceId,moveId,slot),this.#catalog)))}
 // STEP 7 opt-in commands share the existing transaction lock, save validator and battle host.
 #encounters(){if(this.#save.encounterVersion!==ENCOUNTER_VERSION)throw Error('Encounter activation required');return this.#catalog.encounterContract}
 encounterContext(method=this.#save.encounter?.method){
  const policyContract=this.#encounters(),tableId=`${this.#save.encounter.areaId}:${method}`;
  if(policyContract.policyExcludedTables?.[tableId]){const state=this.#save.encounter;return {areaId:state.areaId,method,profile:'NONE',baseChance:0,safeStepsRemaining:state.safeStepsRemaining,dryStreak:state.dryStreak,effectiveChance:0,table:null,error:null,policyExcluded:true,reason:'POLICY_NO_RANDOM_ENCOUNTER',policyId:policyContract.policy.policyId,timeModifier:1,weatherModifier:1}}
  const c=this.#encounters(),state=this.#save.encounter,table=c.tables[`${state.areaId}:${method}`]??null,error=table?tableAccess(this.#save,c,table.id):'NO_TABLE',profile=error?'NONE':table.profile;
  return {areaId:state.areaId,method,profile,baseChance:ENCOUNTER_PROFILES[profile],safeStepsRemaining:state.safeStepsRemaining,dryStreak:state.dryStreak,effectiveChance:effectiveChance(profile,state),table:clone(table),error,timeModifier:1,weatherModifier:1};
 }
 async enterArea(areaId,method=null){
  const c=this.#encounters();return this.#change(s=>{const error=areaAccess(s,c,areaId);if(error)throw Error(error);if(method!==null&&!c.tables[`${areaId}:${method}`]&&!c.policyExcludedTables?.[`${areaId}:${method}`])throw Error('UNKNOWN_METHOD');s.encounter.areaId=areaId;s.encounter.method=method});
 }
 async surveyAcquisition(eventId){
  const c=this.#encounters();return this.#change(s=>{const e=c.events[eventId];if(!e?.requirements.includes('story_evening_survey')||areaAccess(s,c,e.areaId)||s.encounter.areaId!==e.areaId)throw Error('Survey unavailable');add(s.encounter.surveys,eventId)});
 }
 #selectRandomEncounter(table,rng){return selectWeatherEncounter(table,rng,{config:this.#encounters().speciesWeatherWeights,environment:this.#encounterEnvironment,onDiagnostic:this.#encounterDiagnostic})}
 async #wild(draft,request,{battleDriver,rng,map,tutorialPermit,nativeS4EncounterSignal}={}){
  const battleId=draft.economy?`${draft.sessionId}:${++draft.economy.battleSerial}`:null;
  const encounterPermit=issueEncounterPermit(draft,this.#catalog,request);
  const battle=startSessionBattle(createGameSession(storyBattleInput(draft,this.#catalog),this.#catalog),{kind:'wild',opponents:[{namespace:'canonical',speciesId:request.speciesId,level:request.level}],encounterPermit,tutorialPermit,map:map??{id:draft.position.scene,biomeId:'GRASSLAND'},rng},{adapter:this.#adapter});this.#battle=battle;
  try{
   await this.#runner.cue({op:'inputLock'});await this.#runner.cue({op:'cameraCue',cue:'battle-entry',kind:'wild'});
   const play=()=>battleDriver?battleDriver(battle):new Promise(resolve=>{this.#battleResolve=resolve;this.#hooks.battleReady?.(battle.snapshot())});if(nativeS4EncounterSignal!==undefined)await waitS4GameplayBattle(play,nativeS4EncounterSignal);else await play();
   if(battle.snapshot().phase!=='ended')throw Error('Battle driver must finish Battle v3');
   const outcome=battle.snapshot().outcome;Object.assign(draft,mergeStoryAftermath(draft,battle.aftermath(),this.#catalog));afterWildBattle(draft.encounter);
   if(outcome==='lost')recoverAfterLoss(draft,this.#catalog,this.#economyHost,battleId);
   return outcome;
  }finally{try{this.#hooks.battleFinished?.(battle.snapshot().outcome)}catch(error){this.#runner.warnings.push({op:'battleFinished',message:error.message})}await this.#runner.cue({op:'inputUnlock'});this.#battleResolve=null;this.#battle=null}
 }
 /** One completed orthogonal tile, produced by the field bridge; not input/button ticks. */
 async encounterStep(movement,options={}){
  const c=this.#encounters();this.#idle();const {from,to,serial,areaId,method,eligible,moved,blocked}=movement??{};
  if(!eligible||!moved||blocked||!from||!to||[from.x,from.y,to.x,to.y].some(n=>!Number.isInteger(n))||Math.abs(from.x-to.x)+Math.abs(from.y-to.y)!==1)return {triggered:false,reason:'NOT_ELIGIBLE_MOVEMENT'};
  return this.#eligibleEncounterStep(movement,options);
 }
 async nativeS4DistanceStep(grant,world){if(world?.story!==this)throw Error('NATIVE_DISTANCE_WRONG_STORY');const p=readS4EncounterGrant(grant,world);if(!p.counterDue||p.distanceCommitted)throw Error('DISTANCE_PROOF_ALREADY_CONSUMED');this.#idle();this.#busy=true;const draft=this.snapshot();try{markS4DistanceAttempt(grant,world);applyOriginalWalkCounters(draft,this.#economyHost.world);await this.#commit(draft);acknowledgeS4Distance(grant,world);return{distanceCommitted:true}}finally{this.#busy=false}}
 async nativeS4EncounterStep(grant,world,options={}){if(world?.story!==this)throw Error('NATIVE_ENCOUNTER_WRONG_STORY');const p=readS4EncounterGrant(grant,world);return this.#eligibleEncounterStep(p,{...options,nativeS4EncounterProof:grant,nativeS4EncounterWorld:world,nativeS4EncounterSignal:p.signal,nativeS4EncounterRejectOnly:()=>readS4EncounterGrant(grant,world)})}
 async #eligibleEncounterStep(movement,options){const c=this.#encounters();this.#idle();const{serial,areaId,method}=movement;
  if(!Number.isSafeInteger(serial)||serial<=this.#save.encounter.movementSerial)return {triggered:false,reason:'DUPLICATE_MOVEMENT'};
  if(areaId!==this.#save.encounter.areaId||method!==this.#save.encounter.method)return {triggered:false,reason:'REGION_MISMATCH'};
  if(c.policyExcludedTables?.[`${areaId}:${method}`])return {triggered:false,eligible:false,reason:'POLICY_NO_RANDOM_ENCOUNTER'};
  const table=c.tables[`${areaId}:${method}`],error=tableAccess(this.#save,c,`${areaId}:${method}`);
  if(error||table.rod||!this.#save.party.some(m=>m.hp>0))return {triggered:false,reason:error??'NOT_WALK_ENCOUNTER'};
  this.#busy=true;const draft=this.snapshot();try{
   options.nativeS4EncounterRejectOnly?.();if(options.nativeS4EncounterProof)markS4EncounterAttempt(options.nativeS4EncounterProof,options.nativeS4EncounterWorld);
   draft.encounter.movementSerial=serial;if(movement.position)draft.position=clone(movement.position);const result=checkEncounterStep(draft.encounter,table.profile,options.rng);
   if(result.triggered){const request=this.#selectRandomEncounter(table,options.rng);result.selection=request;result.outcome=await this.#wild(draft,request,options)}
   options.nativeS4EncounterRejectOnly?.();
   await this.#commit(draft);return result;
  }finally{this.#busy=false}
 }
 async fish(rod,options={}){
  const c=this.#encounters();if(!Object.hasOwn(c.rodMethods,rod))throw Error('Invalid fishing rod');
  return this.#tableBattle(`${this.#save.encounter.areaId}:${c.rodMethods[rod]}`,options);
 }
 async forceEncounter(options={}){
  // Explicit developer/test convenience: gate/authority checks still apply.
  if(!['development','test'].includes(options.mode))throw Error('Developer mode required');
  const c=this.#encounters(),id=`${this.#save.encounter.areaId}:${this.#save.encounter.method}`;if(c.tables[id]?.rod)throw Error('Use explicit fishing action');return this.#tableBattle(id,options);
 }
 async runTutorialCapture(options={}){
  if(!tutorialReady(this.#save)||this.#save.encounter.areaId!=='P_ECO_CENTER_EDGE')throw Error('Designated tutorial capture unavailable');
  return this.#tableBattle('P_ECO_CENTER_EDGE:land_grass',options,true);
 }
 async #tableBattle(tableId,options,tutorial=false){
  const s2FishingGuard=options.nativeS2RejectOnly;if(s2FishingGuard!==undefined&&(!tableId.startsWith('S2_JANGMOK_COAST:')||!this.#encounters().tables[tableId]?.rod||typeof s2FishingGuard!=='function'||!(options.nativeS2Signal instanceof AbortSignal)))throw Error('INVALID_S2_FISHING_GUARD');s2FishingGuard?.();
  const fieldGuard=options.nativePrologueFieldRejectOnly;if(fieldGuard!==undefined&&(!tutorial||tableId!=='P_ECO_CENTER_EDGE:land_grass'||typeof fieldGuard!=='function'||!(options.nativePrologueFieldSignal instanceof AbortSignal)))throw Error('INVALID_PROLOGUE_TUTORIAL_GUARD');fieldGuard?.();
  if(this.#encounters().policyExcludedTables?.[tableId])return {triggered:false,eligible:false,reason:'POLICY_NO_RANDOM_ENCOUNTER'};
  const c=this.#encounters();this.#idle();const error=tableAccess(this.#save,c,tableId);if(error)throw Error(error);
  this.#busy=true;const draft=this.snapshot();try{const table=c.tables[tableId],selection=table.rod||tutorial?selectEncounter(table,options.rng):this.#selectRandomEncounter(table,options.rng),outcome=await this.#wild(draft,selection,{...options,nativeS4EncounterSignal:s2FishingGuard?options.nativeS2Signal:fieldGuard?options.nativePrologueFieldSignal:options.nativeS4EncounterSignal,tutorialPermit:tutorial?issueTutorialPermit(draft,selection):null});fieldGuard?.();s2FishingGuard?.();await this.#commit(draft);return {selection,outcome}}finally{this.#busy=false}
 }
 acquisitionAvailable(id){const c=this.#encounters();return !acquisitionAccess(this.#save,c,id)}
 async acquire(id,options={}){
  const s3AcquireGuard=options.nativeS3RejectOnly;if(s3AcquireGuard!==undefined&&(id!=='TRADE_029_CICADA'||typeof s3AcquireGuard!=='function'||!(options.nativeS3Signal instanceof AbortSignal)))throw Error('INVALID_S3_ACQUISITION_GUARD');s3AcquireGuard?.();
  const s2AcquireGuard=options.nativeS2RejectOnly;if(s2AcquireGuard!==undefined&&(!['MIGRATION_056_CRANE_S2','MIGRATION_058_SWAN_S2','OBSERVE_072_EAGLE','OBSERVE_074_FALCON','OBSERVE_075_OSPREY','OBSERVE_076_HOBBY','OBSERVE_077_KITE'].includes(id)||typeof s2AcquireGuard!=='function'||!(options.nativeS2Signal instanceof AbortSignal)))throw Error('INVALID_S2_ACQUISITION_GUARD');s2AcquireGuard?.();
  const s4Guard=['OBSERVE_086_OWL','RESEARCH_084_OTTER'].includes(id)?options.nativeS4GameplayRejectOnly:undefined;if(s4Guard!==undefined&&typeof s4Guard!=='function')throw Error('INVALID_S4_GAMEPLAY_GUARD');s4Guard?.();
  const c=this.#encounters(),event=c.events[id];this.#idle();
  const staged=isPost20260927(c),sanctuary=staged&&[148,149,150].find(no=>id===`LEGEND_${no}_CAPTURE`),first151=staged&&id==='MYTHIC_151_CAPTURE';
  if(first151&&this.eventCompleted('POST_ONSEOM_GARDEN_FIRST_151'))throw Error('First garden encounter already completed; use approved roaming nodes');
  if(event&&this.#save.encounter.acquisitionCompleted.includes(id)&&event.mode!=='npc_trade')return {alreadyCompleted:true,runtime:this.snapshot()};
  const error=acquisitionAccess(this.#save,c,id);if(error)throw Error(error);
  this.#busy=true;const draft=this.snapshot();try{
   let receipt;
   if(event.mode==='battle_capture'||staged&&event.mode==='battle_resolution'){
    const outcome=await this.#wild(draft,{eventId:id,speciesId:event.speciesId,level:event.level},{...options,nativeS4EncounterSignal:options.nativeS2Signal??options.nativeS4EncounterSignal});
    if(outcome==='captured')receipt={outcome,speciesIds:[event.speciesId]};
    if(sanctuary&&['won','captured'].includes(outcome))this.#finishEvent(draft,SANCTUARIES[sanctuary].event);
    if(first151){this.#finishEvent(draft,'POST_ONSEOM_GARDEN_FIRST_151');if(outcome!=='captured')relocateRoamer20260927(draft,this.#contract,this.#economyHost?.world,151,options.rng)}
   }else receipt=grantAcquisition(draft,this.#catalog,event,options);
   s4Guard?.();s2AcquireGuard?.();s3AcquireGuard?.();
   if(receipt){recordAcquisition(draft,event,receipt);this.#finishEvent(draft,event.storyId)}
   await this.#commit(draft);return {completed:!!receipt,runtime:this.snapshot()};
  }finally{this.#busy=false}
 }
 async assembleCompass(){this.#encounters();if(this.eventCompleted('POST_COMPASS'))return this.snapshot();return this.#change(s=>{if(!this.gate('CAN_ASSEMBLE_ONSEOM_COMPASS',s)||this.#contract.events.POST_COMPASS.requiresEvents.some(id=>!s.progress.completedEvents.includes(id)))throw Error('Compass prerequisites unmet');this.#finishEvent(s,'POST_COMPASS')})}
 roamingAt(mapId,x,y){if(!isPost20260927(this.#catalog.encounterContract))return null;return roamerAt20260927(this.#save,this.#contract,mapId,x,y,this.#economyHost?.world)}
 async runRoamer(no,options={}){
  const c=this.#encounters();if(!isPost20260927(c)||!roamingEligible20260927(this.#save,this.#contract,no))throw Error('Roamer unavailable');
  const pos=this.#save.position,cell={x:Math.floor(pos.x/48),y:Math.floor(pos.y/48)};
  if(this.roamingAt(pos.scene,cell.x,cell.y)!==no)throw Error('No approved roamer at this location');
  this.#idle();this.#busy=true;const draft=this.snapshot();
  try{
   const speciesId=this.#contract.speciesIdsByNumber[no],outcome=await this.#wild(draft,{roamingNo:no,speciesId,level:c.events[no===151?'MYTHIC_151_CAPTURE':`LEGEND_${no}_CAPTURE`]?.level??60},options);
   if(outcome==='captured')delete draft.world.roamingLegends[no];
   else relocateRoamer20260927(draft,this.#contract,this.#economyHost?.world,no,options.rng);
   await this.#commit(draft);return {outcome,runtime:this.snapshot()};
  }finally{this.#busy=false}
 }
 async evolve(instanceId){this.#encounters();return this.#change(s=>evolveCompanion(s,this.#catalog,instanceId))}
}
