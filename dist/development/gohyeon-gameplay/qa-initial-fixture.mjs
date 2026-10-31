// QA ONLY: root-approved existing Cargo L100 party helper stopped BEFORE S4 trainers. NOT natural progression,
// NOT ordinary entry, NOT user storage. Original engine produces every flag/reward.
import {CanonicalWorld} from '../../world/service.mjs';
import {cellPosition} from '../../world/definition.mjs';
import {SpeciesCatalogService} from '../../species-catalog-service.mjs';
import {createCanonicalCreature} from '../../canonical-session.mjs';
import {createBattleRules,calculateDamage} from '../../battle-v3/rules.mjs';
export async function createS4GameplayQAInitialFixture({adapter,signal}){
 const check=()=>{if(signal?.aborted)throw new DOMException('S4 gameplay QA preparation cancelled','AbortError')};
 const yieldTask=async()=>{check();await new Promise(resolve=>setTimeout(resolve,0));check()};check();
 const catalog=new SpeciesCatalogService({namespace:'canonical',adapter}),rules=createBattleRules(adapter);
function testParty(runtime){
 const next=structuredClone(runtime);next.party=['SPECIES_003','SPECIES_006','SPECIES_009','SPECIES_149','SPECIES_150','SPECIES_151'].map(id=>createCanonicalCreature(catalog,id,100));
 for(const mon of next.party)for(const key of ['seen','caught'])if(!next.dex[key].includes(mon.speciesId))next.dex[key].push(mon.speciesId);
 return next;
}
async function playBattle(battle){
 for(let turn=0;turn<4000;turn++){
  check();if(turn%32===0)await yieldTask();
  const s=battle.snapshot();if(s.phase==='ended')return s;
  if(s.phase==='forced-switch'){battle.act({type:'switch',index:s.party.findIndex(m=>m.hp>0)});continue}
  const mon=s.party[s.active],enemy=s.opponents[s.enemyActive],moves=mon.moves.filter(m=>m.pp>0);
  const score=id=>{const move=rules.moves[id];return move.power?calculateDamage({rules,catalog,move,attacker:mon,defender:enemy,critical:false,randomPercent:100}).damage:0};
  moves.sort((a,b)=>score(b.id)-score(a.id));battle.act({type:'move',moveId:moves[0]?.id??'SYSTEM_STRUGGLE'});
 }
 throw Error('Story fixture exceeded battle turn bound');
}

 const actions=[];let commits=0,battles=0,world=new CanonicalWorld({adapter,mode:'test',persist:async()=>{commits++;}});
 const conditionEvents=['S9_SHIP_ZONE1_COMPLETE_EVENT','S9_SHIP_ZONE2_RESCUE_EVENT','BLACKNET_BOMI_FINAL','BLACKNET_JUNSEOK_FINAL'],conditions={};
 const options={rng:()=>.4,map:{id:'TEST_ONLY_CANONICAL_PROGRESS',biomeId:'COAST'},battleDriver:async battle=>{const result=await playBattle(battle);if(result.outcome!=='won')throw Error('SOURCE_ENGINE_FIXTURE_LOST');battles++;}};
 try{
 for(const stageId of adapter.storyRuntime.sequence){
  await yieldTask();
  if(stageId==='FINAL'||stageId==='POST')break;
  if(world.snapshot().progress.currentStage!==stageId)await world.story.enterStage(stageId);
  for(let step=0;step<300;step++){
   await yieldTask();
   const s=world.story;
   if(stageId==='S4'){
    const runtime=s.snapshot();check();
    for(const id of ['ROUTE_S4_01','ROUTE_S4_02','ROUTE_S4_04'])if(runtime.progress.defeatedTrainers.includes(id)||!s.trainerAvailable(id))throw Error('S4_PRETRAINER_FIXTURE_INVALID');
    runtime.position=cellPosition('world:hub:S4',4,12,'down');runtime.world.mapId=runtime.position.scene;
    if(!runtime.world.visitedMaps.includes(runtime.position.scene))runtime.world.visitedMaps.push(runtime.position.scene);
    return {runtime,adapter,actions,evidence:{label:'QA_S4_GAMEPLAY_NO_USER_STORAGE',kind:'APPROVED_CARGO_HELPER_STOPPED_BEFORE_S4',commits,battles,flagsWrittenByFixture:0,rewardsWrittenByFixture:0,battleResultsWrittenByFixture:0,locationFixture:true,overlevelledPartyFixture:true,naturalJourney:false,difficultyCertified:false,userSave:false}};
   }
   const trainer=Object.values(s.contract.trainers).find(t=>t.stageId===stageId&&t.id!=='BLACKNET_HWIGYEONG_FINAL'&&s.trainerAvailable(t.id));
   if(trainer){await s.recoverParty();if(conditionEvents.includes(trainer.id))conditions[trainer.id]={before:s.snapshot()};await s.runTrainer(trainer.id,options);actions.push({kind:'trainer',id:trainer.id,revision:s.snapshot().revision});if(conditions[trainer.id])conditions[trainer.id].after=s.snapshot();continue;}
   const event=Object.values(s.contract.events).find(e=>e.stageId===stageId&&e.id!=='BLACKNET_HWIGYEONG_FINAL'&&s.eventAvailable(e.id));
   if(event){if(conditionEvents.includes(event.id))conditions[event.id]={before:s.snapshot()};await s.runEvent(event.id,options);actions.push({kind:'event',id:event.id,revision:s.snapshot().revision});if(conditions[event.id])conditions[event.id].after=s.snapshot();if(event.id==='P02_FIRST_PARTNER'){const runtime=testParty(s.snapshot());world.dispose();world=new CanonicalWorld({adapter,runtime,persist:async()=>{commits++;}});}continue;}
   await s.completeStage(stageId);actions.push({kind:'completeStage',id:stageId,revision:s.snapshot().revision});break;
  }
 }
 throw Error('SOURCE_FIXTURE_DID_NOT_REACH_S4');
 }finally{world?.dispose()}
}
