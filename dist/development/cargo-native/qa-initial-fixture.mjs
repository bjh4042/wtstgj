// QA ONLY: over-levelled L100 party + explicit ship location. NOT natural progression,
// NOT ordinary entry, NOT user storage. Original engine produces every flag/reward.
import {CanonicalWorld} from '../../world/service.mjs';
import {cellPosition} from '../../world/definition.mjs';
import {SpeciesCatalogService} from '../../species-catalog-service.mjs';
import {createCanonicalCreature} from '../../canonical-session.mjs';
import {createBattleRules,calculateDamage} from '../../battle-v3/rules.mjs';
export async function createCargoQAInitialFixture({adapter,signal,postBoss=false}){
 const check=()=>{if(signal?.aborted)throw new DOMException('Cargo QA preparation cancelled','AbortError')};
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

 let commits=0,battles=0,world=new CanonicalWorld({adapter,mode:'test',persist:async()=>{commits++;}});
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
   if(stageId==='S9'&&s.trainerAvailable('BLACKNET_HWIGYEONG_FINAL')){
    // Explicit opt-in QA only: use the same original battle driver, never seed flags.
    if(postBoss===true){await s.runTrainer('BLACKNET_HWIGYEONG_FINAL',options);check();if(!s.snapshot().progress.flags.S9_BLACKNET_BOSS_DEFEATED)throw Error('QA_ORIGINAL_BOSS_WIN_REQUIRED')}
    const runtime=s.snapshot();check();
    // Explicit synthetic location fixture only. It does not claim a native warp.
    runtime.position=cellPosition('world:ship:S9',30,7,'up');runtime.world.mapId='world:ship:S9';
    if(!runtime.world.visitedMaps.includes('world:ship:S9'))runtime.world.visitedMaps.push('world:ship:S9');
    return {runtime,adapter,conditions,evidence:{kind:'TEST_ONLY_SOURCE_ENGINE_GENERATED',postBossFixture:postBoss===true,commits,battles,flagsWrittenByFixture:0,rewardsWrittenByFixture:0,battleResultsWrittenByFixture:0,locationFixture:true,overlevelledPartyFixture:true,naturalJourney:false,userSave:false}};
   }
   const trainer=Object.values(s.contract.trainers).find(t=>t.stageId===stageId&&t.id!=='BLACKNET_HWIGYEONG_FINAL'&&s.trainerAvailable(t.id));
   if(trainer){await s.recoverParty();if(conditionEvents.includes(trainer.id))conditions[trainer.id]={before:s.snapshot()};await s.runTrainer(trainer.id,options);if(conditions[trainer.id])conditions[trainer.id].after=s.snapshot();continue;}
   const event=Object.values(s.contract.events).find(e=>e.stageId===stageId&&e.id!=='BLACKNET_HWIGYEONG_FINAL'&&s.eventAvailable(e.id));
   if(event){if(conditionEvents.includes(event.id))conditions[event.id]={before:s.snapshot()};await s.runEvent(event.id,options);if(conditions[event.id])conditions[event.id].after=s.snapshot();if(event.id==='P02_FIRST_PARTNER'){const runtime=testParty(s.snapshot());world.dispose();world=new CanonicalWorld({adapter,runtime,persist:async()=>{commits++;}});}continue;}
   await s.completeStage(stageId);break;
  }
 }
 throw Error('SOURCE_FIXTURE_DID_NOT_REACH_PREBOSS');
 }finally{world?.dispose()}
}
