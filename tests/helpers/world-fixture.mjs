import assert from 'node:assert/strict';
import {raw as latest} from './economy-fixture.mjs';
// Preserve STEP 9 geometry/blocked-POST snapshot; current approved league has its own scoped suite.
const raw={...latest,enhancedLeague:undefined,harinPostRematch:undefined};
import {testParty,playBattle} from './story-fixture.mjs';
import {CanonicalWorld} from '../../dist/world/service.mjs';
import {pathToPoint,mapRoute} from '../../dist/world/reachability.mjs';
import {hubId} from '../../dist/world/definition.mjs';
export {raw};
export const freshWorld=(options={})=>new CanonicalWorld({adapter:raw,mode:'test',rng:()=>.99,battleDriver:playBattle,...options});
export async function walk(w,id,opts={}){const path=pathToPoint(w,id,opts);assert.ok(path,'walk path '+id);for(const dir of path)assert.equal((await w.move(dir)).moved,true,'move '+id);return path.length}
export async function travel(w,id){const route=mapRoute(w,id);assert.ok(route,'gated route '+id);for(const p of route){await walk(w,p);await w.interact(p)}}
export async function interact(w,id,a={}){const p=w.definition.points[id];assert.ok(p,'point '+id);await travel(w,p.mapId);if(w.map.puzzle&&p.y<10&&!w.snapshot().world.puzzles.includes(w.map.puzzle.id)){for(const step of w.map.puzzle.steps??[w.map.puzzle.switchPoint]){await walk(w,step);await w.interact(step)}}for(const step of p.requiresInteractions??[]){await walk(w,step);await w.interact(step)}await walk(w,id);return w.interact(id,a)}
/** QA only: level100 starter evolutions; every step/warp/event/battle uses production APIs.
 * NOT evidence of normal growth, economic balance, or real-user completion time.
 */
export async function traverseMain({candidate=false,starterId='SPECIES_001'}={}){let w=freshWorld({candidate,starterId});const checkpoints={},trace=[],battles=[],driver=async b=>{const r=await playBattle(b);assert.equal(r.outcome,'won');battles.push({kind:r.kind,opponents:r.opponents.map(m=>m.speciesId),background:r.background.assetId})};w.battleDriver=driver;
 for(const stage of w.definition.stageSequence.filter(s=>s!=='POST')){assert.equal(w.snapshot().progress.currentStage,stage);
  for(let n=0;n<200;n++){let id=null;for(const t of Object.values(w.story.contract.trainers))if(t.stageId===stage&&w.story.trainerAvailable(t.id)){id=w.definition.trainerBindings[t.id];break}if(!id)for(const e of Object.values(w.story.contract.events))if(e.active&&e.stageId===stage&&w.story.eventAvailable(e.id)){id=w.definition.eventBindings[e.id];break}if(!id)break;
   if(w.definition.points[id].kind==='trainer')await interact(w,'heal:'+stage,{transactionId:'heal-'+id});await interact(w,id);trace.push(id);
   if(id==='event:P02_FIRST_PARTNER'){const old=w.snapshot(),s=testParty(old);s.party=s.party.filter(m=>!['SPECIES_149','SPECIES_150','SPECIES_151'].includes(m.speciesId));s.dex=structuredClone(old.dex);for(const k of ['seen','caught'])for(const m of s.party)if(!s.dex[k].includes(m.speciesId))s.dex[k].push(m.speciesId);w.dispose();w=freshWorld({candidate,runtime:s,battleDriver:driver})}if(n===199)throw Error('Stage deadlock '+stage);
  }
  await travel(w,hubId(stage));const next=w.definition.stageSequence[w.definition.stageSequence.indexOf(stage)+1],id='route:'+stage+':'+next;await walk(w,id);checkpoints[stage]=w.snapshot();await w.interact(id);
 }
 checkpoints.POST=w.snapshot();return {world:w,checkpoints,trace,battles,assistance:{level100Party:true,deterministicRng:.99,normalPlay:false,noLegendInjected:true}};
}
