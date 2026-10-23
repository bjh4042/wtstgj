import {readFileSync} from 'node:fs';
import {loadCanonicalAdapter} from '../../dist/compatibility/canonical-adapter.mjs';
import {SpeciesCatalogService} from '../../dist/species-catalog-service.mjs';
import {createCanonicalCreature} from '../../dist/canonical-session.mjs';
import {createCanonicalStoryGame} from '../../dist/story/save.mjs';
import {StoryProgressionService} from '../../dist/story/progression-service.mjs';
import {createBattleRules,calculateDamage} from '../../dist/battle-v3/rules.mjs';
export const adapter=await loadCanonicalAdapter({readText:async f=>readFileSync(new URL('../../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
export const catalog=new SpeciesCatalogService({namespace:'canonical',adapter});
export const legacyCatalog=new SpeciesCatalogService({namespace:'work-v2'});
export const rules=createBattleRules(adapter);
export const game=(starterId='SPECIES_001')=>createCanonicalStoryGame(catalog,{mode:'test',starterId});
export const service=(runtime=game(),options={})=>new StoryProgressionService({runtime,catalog,adapter,...options});
export const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
/** TEST ONLY: deliberately over-levelled party isolates progression from balance/grinding.
 * No flags, defeated state or battle outcomes are synthesized; every victory runs Battle v3.
 */
export function testParty(runtime){
 const next=structuredClone(runtime);next.party=['SPECIES_003','SPECIES_006','SPECIES_009','SPECIES_149','SPECIES_150','SPECIES_151'].map(id=>createCanonicalCreature(catalog,id,100));
 for(const mon of next.party)for(const key of ['seen','caught'])if(!next.dex[key].includes(mon.speciesId))next.dex[key].push(mon.speciesId);
 return next;
}
export async function playBattle(battle){
 for(let turn=0;turn<4000;turn++){
  const s=battle.snapshot();if(s.phase==='ended')return s;
  if(s.phase==='forced-switch'){battle.act({type:'switch',index:s.party.findIndex(m=>m.hp>0)});continue}
  const mon=s.party[s.active],enemy=s.opponents[s.enemyActive],moves=mon.moves.filter(m=>m.pp>0);
  const score=id=>{const move=rules.moves[id];return move.power?calculateDamage({rules,catalog,move,attacker:mon,defender:enemy,critical:false,randomPercent:100}).damage:0};
  moves.sort((a,b)=>score(b.id)-score(a.id));battle.act({type:'move',moveId:moves[0]?.id??'SYSTEM_STRUGGLE'});
 }
 throw Error('Story fixture exceeded battle turn bound');
}
export async function simulateStory({starterId='SPECIES_001',allTrainers=true,onCheckpoint=()=>{}}={}){
 let s=service(game(starterId));const checkpoints={},battles=[];
 const options={rng:()=>.4,map:{id:'qa_a',biomeId:'COAST'},battleDriver:async b=>{const result=await playBattle(b);if(result.outcome!=='won')throw Error('Fixture lost canonical battle');battles.push({opponents:result.opponents.map(m=>m.speciesId),background:result.background.assetId,engine:result.engine})}};
 for(const stageId of adapter.storyRuntime.sequence.filter(id=>id!=='POST')){
  if(stageId!=='PROLOGUE')await s.enterStage(stageId);
  for(let step=0;step<150;step++){
   let acted=false;
   for(const t of Object.values(s.contract.trainers).filter(t=>t.stageId===stageId&&(allTrainers||t.required))){if(s.trainerAvailable(t.id)){await s.recoverParty();await s.runTrainer(t.id,options);await onCheckpoint(s,t.id);acted=true;break}}
   if(acted)continue;
   for(const e of Object.values(s.contract.events).filter(e=>e.stageId===stageId))if(s.eventAvailable(e.id)){
    await s.runEvent(e.id,options);if(e.id==='P02_FIRST_PARTNER')s=service(testParty(s.snapshot()));await onCheckpoint(s,e.id);acted=true;break;
   }
   if(!acted){await s.completeStage(stageId);break}
   if(step===149)throw Error('Story fixture stage deadlock: '+stageId);
  }
  checkpoints[stageId]=s.snapshot();await onCheckpoint(s,stageId);s=service(s.snapshot());
 }
 await s.enterStage('POST');checkpoints.POST=s.snapshot();return {service:s,checkpoints,battles};
}
