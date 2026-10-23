import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../../dist/compatibility/canonical-runtime-adapter.mjs';
import {SpeciesCatalogService} from '../../dist/species-catalog-service.mjs';
import {createCanonicalCreature} from '../../dist/canonical-session.mjs';
import {createCanonicalStoryGame,activateCanonicalEncounterSave,validateCanonicalStorySave} from '../../dist/story/save.mjs';
import {StoryProgressionService} from '../../dist/story/progression-service.mjs';
import {playBattle,testParty} from './story-fixture.mjs';
export const adapter=await loadCanonicalRuntimeAdapter({readText:async f=>readFileSync(new URL('../../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
export const catalog=new SpeciesCatalogService({namespace:'canonical',adapter});
export const service=runtime=>new StoryProgressionService({runtime,catalog,adapter});
export const capture=b=>b.act({type:'capture',ballId:'ecology_ball'});
// Uses the approved production adapter and the actual Story/Battle services throughout.
export async function progress(starterId='SPECIES_001'){
 let s=service(activateCanonicalEncounterSave(createCanonicalStoryGame(catalog,{mode:'test',starterId}),catalog));const checkpoints={};
 for(const stageId of adapter.storyRuntime.sequence.filter(id=>id!=='POST')){
  if(stageId!=='PROLOGUE')await s.enterStage(stageId);
  for(let i=0;i<150;i++){
   const trainer=Object.values(s.contract.trainers).find(t=>t.stageId===stageId&&t.required&&s.trainerAvailable(t.id));
   if(trainer){await s.recoverParty();await s.runTrainer(trainer.id,{rng:()=>.4,battleDriver:playBattle});continue}
   const event=Object.values(s.contract.events).find(e=>e.stageId===stageId&&s.eventAvailable(e.id));
   if(event){await s.runEvent(event.id,{rng:()=>.4,battleDriver:playBattle});if(event.id==='P02_FIRST_PARTNER')s=service(testParty(s.snapshot()));continue}
   await s.completeStage(stageId);break;
  }
  checkpoints[stageId]=s.snapshot();
 }
 await s.enterStage('POST');checkpoints.POST=s.snapshot();return checkpoints;
}
/** QA-only supplies, deterministic successful capture rolls, and level training.
 * Story progress comes from actual service events; no acquisition completion is fabricated.
 */
export async function collectAll(checkpoint){
 const c=catalog.encounterContract,tables=Object.values(c.tables),events=Object.values(c.events),chains=Object.values(c.chains);
 let runtime=structuredClone(checkpoint);runtime.party=[createCanonicalCreature(catalog,runtime.starterId,100)];runtime.box=[];runtime.dex={seen:[runtime.starterId,'SPECIES_150'],caught:[runtime.starterId]};runtime.inventory.ecology_ball=200;let s=service(runtime);const usedTables=[];
 const obtain=async id=>{const t=tables.find(t=>t.active&&t.slots.some(x=>x.speciesId===id));if(!t)return false;const i=t.slots.findIndex(x=>x.speciesId===id),u=(t.slots.slice(0,i).reduce((n,x)=>n+x.weight,0)+t.slots[i].weight/2)/100;let calls=0;const opts={mode:'test',rng:()=>calls++===0?u:0,battleDriver:capture};await s.enterArea(t.areaId,t.method);if(t.rod)await s.fish(t.rod,opts);else await s.forceEncounter(opts);usedTables.push(t.id);return true};
 for(const ch of chains){
  if(s.snapshot().dex.caught.includes(ch.baseId)||await obtain(ch.baseId))continue;
  const e=events.find(e=>e.active&&e.id!=='STARTER_CHOICE_PROLOGUE'&&(e.speciesId===ch.baseId||e.candidateIds.includes(ch.baseId)));assert.ok(e,'Missing route '+ch.baseId);
  await s.enterArea(e.areaId);if(e.requirements.includes('story_evening_survey'))await s.surveyAcquisition(e.id);if(e.speciesId==='SPECIES_151')await s.assembleCompass();
  const tradeInstanceId=[...s.snapshot().party,...s.snapshot().box].find(m=>m.speciesId===e.requiredSpeciesId)?.instanceId;
  await s.acquire(e.id,{rng:()=>0,battleDriver:capture,tradeInstanceId});
 }
 for(const ch of chains)if(![...s.snapshot().party,...s.snapshot().box].some(m=>m.speciesId===ch.baseId))assert.ok(await obtain(ch.baseId));
 runtime=s.snapshot();for(const mon of [...runtime.party,...runtime.box])Object.assign(mon,{...createCanonicalCreature(catalog,mon.speciesId,100),instanceId:mon.instanceId});s=service(runtime);
 for(const mon of [...s.snapshot().party,...s.snapshot().box]){let current=mon;while(catalog.getSpeciesById(current.speciesId).evo){await s.evolve(mon.instanceId);current=[...s.snapshot().party,...s.snapshot().box].find(m=>m.instanceId===mon.instanceId)}}
 const save=validateCanonicalStorySave(s.snapshot(),catalog);assert.equal(save.dex.caught.length,151);return {save,usedTables:[...new Set(usedTables)],assistance:{ecologyBalls:200,levelTraining:100,deterministicCaptureRng:true,storyOverlevelParty:true,normalEconomyPlaythrough:false}};
}
