import {createCanonicalCreature} from '../canonical-session.mjs';
import {validateCanonicalBattleSave} from './save.mjs';
import {createBattleRules,battleStats,calculateDamage,stageMultiplier,typeMultiplier,captureProbability,earnedExperience} from './rules.mjs';
import {resolveBattleBackground} from '../presentation/battle-background.mjs';
import {battleDisplayFor} from '../presentation/battle-render.mjs';
import {createMoveVfxCatalog,resolveMoveVfx} from '../presentation/battle-vfx.mjs';
import {consumeEncounterPermit} from '../encounter/permit.mjs';
import {CANDIDATE_ID,itemUseResult,transaction} from '../economy/contract.mjs';
import {consumeTutorialPermit,needsTutorialRefill,refillTutorial,tutorialChance} from '../economy/tutorial.mjs';
import {sha256,stableJSON} from '../compatibility/codec.mjs';
import {consumePreviewOpponents} from './preview-opponents.mjs';
import {chooseEnemyMove} from './ai-20260927.mjs';
const clone=value=>structuredClone(value);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const STRUGGLE=Object.freeze({id:'SYSTEM_STRUGGLE',name:'버티기',category:'physical',type:'normal',neutral:true,power:50,accuracy:null,target:'opponent',effects:[{kind:'recoil',fraction:.25,chance:1,target:'self'}]});
const statusState=()=>({sleepTurns:0,freezeTurns:0,toxicTurns:1});
/** Engine selection is explicit and session-local. No global active catalog or legacy mutation. */
export function startSessionBattle(session,options,{adapter,legacyStart}={}){
 if(session?.contentNamespace==='legacy-work-v2'&&session.catalog?.namespace==='work-v2'){
  if(typeof legacyStart!=='function')throw Error('Legacy engine callback required');
  return legacyStart(options);
 }
 if(session?.contentNamespace!=='canonical-v1'||session.catalog?.namespace!=='canonical')throw Error('Battle session/catalog mismatch');
 return new CanonicalBattle({...options,session,adapter});
}
export class CanonicalBattle {
 #catalog; #rules; #rng; #runtime; #enemy; #active=0; #enemyActive=0; #phase='turn'; #outcome=null; #turn=0; #kind;
 #stages=new Map(); #participants=new Set(); #awarded=new Set(); #events=[]; #vfx; #background; #captureFailures=0; #map;
 #tutorial=false; #preview=null;
 #latestAI=false; #aiTier='AI_1'; #aiItemId=null; #aiItemUses=0; #aiItemsSpent=0; #aiHeals=new Map(); #aiLastHeal=false; #aiSleptSpecies=new Set();
 constructor({session,adapter,opponents,kind='wild',map={id:'outdoor'},rng=Math.random,partyId=null,encounterPermit=null,tutorialPermit=null,previewPermit=null}){
  if(session?.contentNamespace!=='canonical-v1'||session.catalog?.namespace!=='canonical')throw Error('Battle v3 only accepts canonical sessions');
  this.#catalog=session.catalog;this.#rules=createBattleRules(adapter);this.#runtime=validateCanonicalBattleSave(session.runtime,this.#catalog);this.#rng=rng;
  if(this.#catalog.economyPolicy?.id===CANDIDATE_ID&&this.#runtime.economy?.policyId!==CANDIDATE_ID)throw Error('Candidate battle requires marked candidate save');
  this.#tutorial=consumeTutorialPermit(tutorialPermit,this.#runtime,opponents,kind);
  if(!['wild','trainer'].includes(kind)||!Array.isArray(opponents)||opponents.length<1||opponents.length>(kind==='wild'?1:6))throw Error('1v1 singles party contract');
  const authorized=encounterPermit?consumeEncounterPermit(encounterPermit,session,opponents,kind):false;
  if(kind==='wild'&&this.#runtime.encounterVersion&&!authorized)throw Error('Activated encounter sessions require a validated encounter capability');
  const contracted=partyId?adapter.storyRuntime?.parties[partyId]:null;
  if(partyId&&(!contracted||kind!=='trainer'||contracted.members.length!==opponents.length||contracted.members.some((m,i)=>m.namespace!==opponents[i].namespace||m.speciesId!==opponents[i].speciesId||m.level!==opponents[i].level||JSON.stringify(m.moveIds)!==JSON.stringify(opponents[i].moveIds))))throw Error('Trainer party contract mismatch');
  this.#preview=consumePreviewOpponents(previewPermit,{session,adapter,opponents,kind,partyId});
  if(this.#preview)this.#catalog=this.#preview.catalog;
  this.#latestAI=adapter.battleRuntime?.version==='v3.2_2026-09-27'&&kind==='trainer';
  if(this.#latestAI){
   const trainer=Object.values(adapter.storyRuntime?.trainers??{}).find(t=>t.partyId===partyId);
   this.#aiTier=this.#preview?adapter.battleRuntime.previewOpponent.aiTier:trainer?.ai??'AI_1';
   if(!['AI_1','AI_2','AI_3','AI_4'].includes(this.#aiTier))throw Error('Unknown battle AI tier');
   this.#aiItemUses=this.#preview?adapter.battleRuntime.previewOpponent.itemUses:trainer?.itemUses??0;
   this.#aiItemId=this.#preview?'hyper_potion':trainer?.itemId??null;
  }
  this.#kind=kind;this.#enemy=opponents.map(p=>{
   if(this.#preview)return this.#preview.createOpponent(p);
   if(p.namespace!=='canonical')throw Error('Explicit canonical opponent identity required');
   if(kind==='wild'&&!authorized&&!this.#catalog.canRandomEncounter(p.speciesId))throw Error('Species prohibited from wild encounters');
   const mon=createCanonicalCreature(this.#catalog,p.speciesId,p.level);
   if(p.moveIds){const s=this.#catalog.getSpeciesById(p.speciesId),allowed=[...s.moves.filter(m=>m.level<=p.level).map(m=>m.id),...s.tmIds.map(id=>this.#rules.tms[id]?.moveId),...(contracted?.moveLevelExceptions??[]).filter(e=>e.level===p.level).map(e=>e.move_id)];
    if(!p.moveIds.length||p.moveIds.length>4||new Set(p.moveIds).size!==p.moveIds.length||p.moveIds.some(id=>!allowed.includes(id)))throw Error('Illegal fixture moves');
    mon.moves=p.moveIds.map(id=>({id,pp:this.#rules.moves[id].pp}));
   }
   return mon;
  });
  this.#active=this.#runtime.party.findIndex(m=>m.hp>0);if(this.#active<0)throw Error('No conscious party member');
  this.#participants.add(this.#player.instanceId);this.#map=clone(map);this.#background=resolveBattleBackground(map);this.#vfx=createMoveVfxCatalog(this.#rules.moves);
  this.#markSeen();this.#emit('start',{kind,background:this.#background,audioIds:[this.#background.battleTransitionSfxId,this.#background.battleBgmId]});
 }
 get #player(){return this.#runtime.party[this.#active]}
 get #opponent(){return this.#enemy[this.#enemyActive]}
 #roll(){const n=this.#rng();if(!Number.isFinite(n)||n<0||n>=1)throw Error('RNG must return [0,1)');return n}
 #emit(type,data={}){this.#events.push({...clone(data),type,turn:this.#turn})}
 #stage(mon){if(!this.#stages.has(mon.instanceId))this.#stages.set(mon.instanceId,{});return this.#stages.get(mon.instanceId)}
 #markSeen(){if(!this.#preview&&!this.#runtime.dex.seen.includes(this.#opponent.speciesId))this.#runtime.dex.seen.push(this.#opponent.speciesId)}
 #speed(mon){return battleStats(this.#catalog,mon).spe*stageMultiplier(this.#stage(mon).spe)*(mon.status==='paralysis'?.5:1)}
 snapshot(){return clone({engine:'canonical-battle-v3',contentNamespace:'canonical-v1',...(this.#preview?{preview:this.#preview.metadata}:{}),kind:this.#kind,phase:this.#phase,outcome:this.#outcome,turn:this.#turn,active:this.#active,enemyActive:this.#enemyActive,party:this.#runtime.party,opponents:this.#enemy,background:this.#background,map:this.#map,events:this.#events,inventory:this.#runtime.inventory,bagItems:this.#runtime.bagItems??{},display:{front:battleDisplayFor(this.#catalog.reference(this.#opponent.speciesId),'front'),back:battleDisplayFor(this.#catalog.reference(this.#player.speciesId),'back')},stages:Object.fromEntries(this.#stages)})}
 /** The only save export point: committed aftermath, no partially executed turn. */
 aftermath(){if(this.#preview&&!this.#preview.metadata.persistable)throw Error('Preview rehearsal cannot export save aftermath');if(this.#phase!=='ended')throw Error('Finish the battle before saving aftermath');return validateCanonicalBattleSave(this.#runtime,this.#preview?.playerCatalog??this.#catalog)}
 #validate(action){
  if(this.#phase==='ended')throw Error('Battle already ended');
  if(!action||!['move','switch','capture','flee',...(this.#runtime.economy?['item']:[])].includes(action.type))throw Error('Unknown battle action');
  if(this.#phase==='forced-switch'&&action.type!=='switch')throw Error('Choose a conscious replacement');
  if(action.type==='move'){
   const usable=this.#player.moves.filter(m=>m.pp>0);
   if(usable.length&&!usable.some(m=>m.id===action.moveId))throw Error('Move not learned or PP exhausted');
   if(!usable.length&&action.moveId!==STRUGGLE.id)throw Error('All PP exhausted; use SYSTEM_STRUGGLE');
  }
  if(action.type==='switch'&&(!Number.isInteger(action.index)||action.index===this.#active||!this.#runtime.party[action.index]||this.#runtime.party[action.index].hp<=0))throw Error('Invalid replacement');
  if(action.type==='flee'&&this.#kind!=='wild')throw Error('Cannot flee a trainer battle');
  if(action.type==='capture'){
   if(this.#kind!=='wild')throw Error('Cannot capture a trainer species');
   if(!this.#rules.capture.balls.includes(action.ballId)||this.#runtime.inventory[action.ballId]<1&&!(this.#tutorial&&action.ballId==='ecology_ball'&&needsTutorialRefill(this.#runtime)))throw Error('Capture ball unavailable');
   if(this.#runtime.party.length===6&&this.#runtime.box.length===300)throw Error('Storage full; capture cancelled without consuming a ball');
  }
  if(action.type==='item'){
   if(typeof action.transactionId!=='string'||!action.transactionId||action.transactionId.length>160)throw Error('Item transaction ID required');
   if(!(this.#runtime.bagItems?.[action.itemId]>0))throw Error('아이템이 없습니다.');
   itemUseResult(this.#catalog,this.#rules.items[action.itemId],this.#runtime.party.find(m=>m.instanceId===action.instanceId),action);
  }
 }
 act(action){
  if(action?.type==='item'&&this.#runtime.economy?.transactions[action.transactionId]){const r=this.#runtime.economy.transactions[action.transactionId];if(r.fingerprint!==sha256(stableJSON(action)))throw Error('Transaction ID payload conflict');return this.snapshot()}
  this.#validate(action);
  if(this.#phase==='forced-switch'){this.#switch(action.index);this.#phase='turn';return this.snapshot()}
  this.#turn++;
  if(action.type==='flee'){this.#finish('fled');return this.snapshot()}
  if(action.type==='switch')this.#switch(action.index);
  if(action.type==='item')transaction(this.#runtime,action.transactionId,action,()=>{const mon=this.#runtime.party.find(m=>m.instanceId===action.instanceId),next=itemUseResult(this.#catalog,this.#rules.items[action.itemId],mon,action);Object.assign(mon,next);if(next.statusState===undefined)delete mon.statusState;this.#runtime.bagItems[action.itemId]--;this.#emit('item',{itemId:action.itemId,instanceId:mon.instanceId});return {kind:'battle-item',itemId:action.itemId}});
  if(action.type==='capture'){
   if(this.#tutorial&&refillTutorial(this.#runtime,this.#rules.capture.tutorial_safety))this.#emit('tutorial-refill',{quantity:3});
   this.#runtime.inventory[action.ballId]--;
   const base=captureProbability(this.#rules,this.#catalog,this.#opponent,action.ballId,this.#captureFailures),probability=this.#tutorial?tutorialChance(this.#runtime,this.#rules.capture.tutorial_safety,action.ballId,base):base,success=this.#roll()<probability;
   if(this.#tutorial&&action.ballId==='ecology_ball')this.#runtime.economy.tutorial.attempts++;
   this.#emit('capture',{ballId:action.ballId,probability,success});
   if(success){
    if(this.#tutorial){this.#runtime.economy.tutorial.completed=true;this.#runtime.economy.tutorial.open=false}
    this.#award(this.#opponent);const caught=clone(this.#opponent);caught.statusState??=statusState();caught.statusState.toxicTurns=1;
    if(this.#runtime.party.length<6)this.#runtime.party.push(caught);else this.#runtime.box.push(caught);
    if(!this.#runtime.dex.caught.includes(caught.speciesId))this.#runtime.dex.caught.push(caught.speciesId);
    this.#finish('captured');return this.snapshot();
   }
   this.#captureFailures++;
  }
  const usable=this.#opponent.moves.filter(m=>m.pp>0),enemyMove=this.#latestAI?chooseEnemyMove({rules:this.#rules,catalog:this.#catalog,actor:this.#opponent,target:this.#player,actorStages:this.#stage(this.#opponent),targetStages:this.#stage(this.#player),tier:this.#aiTier,heals:this.#aiHeals.get(this.#opponent.instanceId)??0,lastHeal:this.#aiLastHeal,sleptSpecies:this.#aiSleptSpecies,remaining:this.#enemy.length-this.#enemyActive},()=>this.#roll()):usable.length?usable[Math.floor(this.#roll()*usable.length)].id:STRUGGLE.id;
  const enemyItem=this.#latestAI&&this.#useEnemyItem();
  const enemyAction={actor:this.#opponent,target:this.#player,moveId:enemyMove,side:'opponent'};
  let actions=enemyItem?[]:[enemyAction];
  if(action.type==='move'){
   const playerAction={actor:this.#player,target:this.#opponent,moveId:action.moveId,side:'player'},ps=this.#speed(this.#player),es=this.#speed(this.#opponent);
   actions=enemyItem?[playerAction]:ps>es||ps===es&&this.#roll()<.5?[playerAction,enemyAction]:[enemyAction,playerAction];
  }
  const flinched=new Set();
  for(const a of actions){if(a.actor.hp>0&&a.target.hp>0)this.#attack(a,flinched)}
  // Both residual effects resolve before faint/EXP checks, preventing accidental revival or double rewards.
  for(const mon of [this.#player,this.#opponent])this.#residual(mon);
  this.#settle();return this.snapshot();
 }
 #useEnemyItem(){
  if(!this.#aiItemId||this.#aiItemsSpent>=this.#aiItemUses||this.#aiLastHeal)return false;
  const item=this.#rules.items[this.#aiItemId],restore=item?.effect?.hp_restore,mon=this.#opponent;
  if(!Number.isFinite(restore)&&restore!=='full')return false;
  const max=battleStats(this.#catalog,mon).hp,missing=max-mon.hp;
  if(mon.hp/max>.5||missing<Math.min(restore==='full'?max:restore,max)*.65)return false;
  const amount=Math.min(missing,restore==='full'?max:restore);
  mon.hp+=amount;this.#aiItemsSpent++;this.#aiLastHeal=true;
  this.#emit('item',{side:'opponent',itemId:this.#aiItemId,instanceId:mon.instanceId,amount});
  return true;
 }
 #switch(index){
  this.#stages.delete(this.#player.instanceId);if(this.#player.statusState)this.#player.statusState.toxicTurns=1;
  this.#active=index;this.#stages.delete(this.#player.instanceId);this.#participants.add(this.#player.instanceId);this.#emit('switch',{side:'player',index,speciesId:this.#player.speciesId});
 }
 #canAct(mon,flinched){
  const s=mon.statusState??=statusState();let blocked=null;
  if(flinched.has(mon.instanceId))blocked='flinch';
  else if(mon.status==='sleep'){
   if(s.sleepTurns===0)s.sleepTurns=1;
   s.sleepTurns--;blocked='sleep';if(s.sleepTurns===0){mon.status=null;this.#emit('status-cured',{instanceId:mon.instanceId,status:'sleep'})}
  }else if(mon.status==='freeze'){
   if(s.freezeTurns>=3||this.#roll()<.2){mon.status=null;s.freezeTurns=0;this.#emit('status-cured',{instanceId:mon.instanceId,status:'freeze'})}
   else{s.freezeTurns++;blocked='freeze'}
  }else if(mon.status==='paralysis'&&this.#roll()<.25)blocked='paralysis';
  if(blocked)this.#emit('cannot-act',{instanceId:mon.instanceId,reason:blocked});return !blocked;
 }
 #attack({actor,target,moveId,side},flinched){
  if(!this.#canAct(actor,flinched))return;
  const move=moveId===STRUGGLE.id?STRUGGLE:this.#rules.moves[moveId];
  if(side==='opponent'&&this.#latestAI)this.#aiLastHeal=move.effects.some(e=>e.kind==='heal');
  if(move!==STRUGGLE)actor.moves.find(m=>m.id===moveId).pp--;
  const a=this.#stage(actor),d=this.#stage(target),accuracy=move.accuracy===null?1:clamp(move.accuracy/100*stageMultiplier((a.accuracy??0)-(d.evasion??0),true),0,1),hit=move.accuracy===null||this.#roll()<accuracy;
  this.#emit('move',{side,instanceId:actor.instanceId,targetId:target.instanceId,moveId,hit,vfx:resolveMoveVfx(this.#vfx,moveId)});
  if(!hit){this.#emit('miss',{moveId});return}
  if(move.target!=='self'&&move!==STRUGGLE&&typeMultiplier(this.#rules,move.type,this.#catalog.getTypes(target.speciesId))===0){this.#emit('immune',{moveId});return}
  let actualDamage=0;
  if(move.power){
   const result=calculateDamage({rules:this.#rules,catalog:this.#catalog,move,attacker:actor,defender:target,attackStages:a,defenseStages:d,critical:this.#roll()<this.#rules.balance.damage_contract.critical_rate,randomPercent:90+Math.floor(this.#roll()*11)});
   // Operational no-PP fallback ignores immunities, preventing a permanent battle deadlock.
   if(move===STRUGGLE&&result.damage===0)result.damage=1;
   actualDamage=Math.min(target.hp,result.damage);target.hp-=actualDamage;this.#emit('damage',{targetId:target.instanceId,...result,attackType:result.type,actualDamage,hp:target.hp});
  }
  for(const effect of move.effects){
   const recipient=effect.target==='self'?actor:target;if(recipient.hp<=0||effect.chance<1&&this.#roll()>=effect.chance)continue;
   if(effect.kind==='heal'){const amount=Math.max(1,Math.floor(battleStats(this.#catalog,recipient).hp*effect.fraction));recipient.hp=Math.min(battleStats(this.#catalog,recipient).hp,recipient.hp+amount);this.#emit('heal',{instanceId:recipient.instanceId,amount});if(side==='opponent'&&this.#latestAI)this.#aiHeals.set(actor.instanceId,(this.#aiHeals.get(actor.instanceId)??0)+1)}
   if(effect.kind==='recoil'&&actualDamage>0){const amount=Math.min(actor.hp,Math.max(1,Math.floor(actualDamage*effect.fraction)));actor.hp-=amount;this.#emit('recoil',{instanceId:actor.instanceId,amount})}
   if(effect.kind==='stage'){for(const stat of effect.stats)this.#stage(recipient)[stat]=clamp((this.#stage(recipient)[stat]??0)+effect.amount,-6,6);this.#emit('stage',{instanceId:recipient.instanceId,stats:effect.stats,amount:effect.amount})}
   if(effect.kind==='flinch')flinched.add(recipient.instanceId);
   if(effect.kind==='status'){this.#inflict(recipient,effect.status);if(side==='opponent'&&this.#latestAI&&effect.status==='sleep'&&recipient.status==='sleep')this.#aiSleptSpecies.add(recipient.speciesId)}
  }
 }
 #inflict(mon,status){
  if(mon.status)return;
  const types=this.#catalog.getTypes(mon.speciesId);
  if((['poison','bad_poison'].includes(status)&&types.some(t=>['poison','steel'].includes(t)))||status==='burn'&&types.includes('fire')||status==='freeze'&&types.includes('ice')){this.#emit('status-immune',{instanceId:mon.instanceId,status});return}
  mon.status=status;mon.statusState=statusState();if(status==='sleep')mon.statusState.sleepTurns=1+Math.floor(this.#roll()*3);
  this.#emit('status',{instanceId:mon.instanceId,status});
 }
 #residual(mon){
  if(mon.hp<=0||!['poison','bad_poison','burn'].includes(mon.status))return;
  const s=mon.statusState??=statusState(),fraction=mon.status==='bad_poison'?s.toxicTurns/16:this.#rules.balance.status_contract[mon.status].end_turn_hp_fraction;
  const amount=Math.min(mon.hp,Math.max(1,Math.floor(battleStats(this.#catalog,mon).hp*fraction)));mon.hp-=amount;
  if(mon.status==='bad_poison')s.toxicTurns=Math.min(16,s.toxicTurns+1);
  this.#emit('residual',{instanceId:mon.instanceId,status:mon.status,amount});
 }
 #award(opponent){
  // Rehearsal remains sealed; approved EDNA opponents reuse normal per-defeat EXP.
  if(this.#preview&&!this.#preview.metadata.experienceEnabled)return;
  if(this.#awarded.has(opponent.instanceId))return;this.#awarded.add(opponent.instanceId);
  for(const mon of this.#runtime.party){
   const share=mon.hp<=0?'fainted':this.#participants.has(mon.instanceId)?'participated':'alive_nonparticipant',amount=earnedExperience(this.#rules,this.#catalog,opponent,this.#kind,share),before=mon.level,oldHp=battleStats(this.#catalog,mon).hp;
   mon.totalExp=Math.min(1000000,mon.totalExp+amount);while(mon.level<100&&mon.totalExp>=(mon.level+1)**3)mon.level++;
   if(mon.hp>0)mon.hp+=battleStats(this.#catalog,mon).hp-oldHp;
   this.#emit('exp',{instanceId:mon.instanceId,amount,share,totalExp:mon.totalExp});
   if(mon.level>before){
    this.#emit('level-up',{instanceId:mon.instanceId,from:before,to:mon.level});
    for(const learn of this.#catalog.getSpeciesById(mon.speciesId).moves.filter(m=>m.level>before&&m.level<=mon.level)){
     if(mon.moves.some(m=>m.id===learn.id))continue;
     if(mon.moves.length<4){mon.moves.push({id:learn.id,pp:this.#rules.moves[learn.id].pp});this.#emit('learned-move',{instanceId:mon.instanceId,moveId:learn.id})}
     else if(!this.#runtime.pendingMoves.some(p=>p.instanceId===mon.instanceId&&p.moveId===learn.id)){this.#runtime.pendingMoves.push({instanceId:mon.instanceId,moveId:learn.id});this.#emit('move-choice',{instanceId:mon.instanceId,moveId:learn.id})}
    }
   }
  }
 }
 #settle(){
  if(this.#opponent.hp<=0){this.#emit('faint',{side:'opponent',instanceId:this.#opponent.instanceId});this.#award(this.#opponent)}
  if(this.#player.hp<=0)this.#emit('faint',{side:'player',instanceId:this.#player.instanceId});
  if(this.#runtime.party.every(m=>m.hp<=0)){this.#finish('lost');return}
  if(this.#opponent.hp<=0){
   if(this.#enemyActive===this.#enemy.length-1){this.#finish('won');return}
   this.#enemyActive++;this.#aiLastHeal=false;this.#participants.clear();if(this.#player.hp>0)this.#participants.add(this.#player.instanceId);this.#markSeen();this.#emit('switch',{side:'opponent',index:this.#enemyActive});
  }
  if(this.#player.hp<=0)this.#phase='forced-switch';
 }
 #finish(outcome){
  this.#outcome=outcome;this.#phase='ended';this.#runtime.revision++;this.#runtime.updatedAt=Date.now();
  for(const mon of this.#runtime.party)if(mon.statusState)mon.statusState.toxicTurns=1;
  this.#runtime.battleHistory.push({kind:this.#kind,outcome,turns:this.#turn});this.#runtime.battleHistory=this.#runtime.battleHistory.slice(-50);
  this.#emit('end',{outcome});
 }
}
