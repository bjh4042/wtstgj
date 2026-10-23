import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonical20260927Adapter} from '../dist/compatibility/canonical-20260927-adapter.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';
import {candidateConvenience,selectCandidateDex} from '../dist/ordinary/candidate-convenience.mjs';
import {candidatePanel,CANDIDATE_QA_KEY} from '../dist/ordinary/candidate-entry.mjs';

const readStaging=file=>readFileSync(new URL('../dist/data/staging-20260927/'+file,import.meta.url),'utf8');
const adapter=await loadCanonical20260927Adapter({readStaging});

test('candidate convenience derives world, regional dex, objective, post and trainer state without mutating save',()=>{
 const world=new CanonicalWorld({adapter,mode:'test'});
 try{
  const snapshot=world.snapshot(),before=structuredClone(snapshot),speciesId=adapter.encounters.P_ECO_CENTER_EDGE.methods.land_grass?.[0]?.id??Object.values(adapter.encounters.P_ECO_CENTER_EDGE.methods)[0][0].id;
  snapshot.dex.seen.push(speciesId);snapshot.dex.caught.push(speciesId);
  snapshot.progress.defeatedTrainers.push(Object.values(adapter.storyRuntime.trainers).find(t=>['route_general','gym_subtrainer'].includes(t.kind)).id);
  const view=candidateConvenience(snapshot,adapter,world.definition),area=view.areas.find(a=>a.id==='P_ECO_CENTER_EDGE');
  assert.equal(view.version,'canonical-20260927');assert.equal(view.trainers.length,104);assert.equal(view.maps.length,56);assert.equal(view.regions.length,9);
  assert.equal(view.dex.caught,1);assert.equal(area.caught,1);assert.equal(selectCandidateDex(view,{filter:'caught',areaId:area.id}).length,1);
  assert.equal(selectCandidateDex(view,{areaId:'S1'}).length,view.regions.find(x=>x.id==='S1').total);
  assert.equal(view.post[0].completed,false);assert.equal(view.post.at(-1).completed,false);
  assert.equal(view.fieldResearch.visitedMaps,1);assert.equal(view.trainers.filter(x=>x.defeated).length,1);
  assert.deepEqual(world.snapshot(),before,'read-only derivation must not write to world save');
 }finally{world.dispose()}
});

test('candidate menu escapes source labels, exposes filters and settings, and is version-gated',()=>{
 const world=new CanonicalWorld({adapter,mode:'test'});
 try{
  const view=candidateConvenience(world.snapshot(),adapter,world.definition);
  for(const tab of ['overview','world','story','dex','research','help'])assert.match(candidatePanel(view,{tab}),/<section aria-live="polite">/);
  assert.match(candidatePanel(view,{tab:'dex'}),/data-filter/);assert.match(candidatePanel(view,{tab:'dex'}),/data-area/);
  assert.match(candidatePanel(view,{tab:'help'}),/data-speed/);assert.match(candidatePanel(view,{tab:'help'}),/data-contrast/);
  assert.match(candidatePanel({...view,objective:'<script>alert(1)</script>'}),/&lt;script&gt;/);
  assert.ok(!CANDIDATE_QA_KEY.startsWith('geoje.monsters.slots.v1.'));
  assert.throws(()=>candidateConvenience(world.snapshot(),{...adapter,version:'canonical-v1'},world.definition),/Validated 20260927/);
 }finally{world.dispose()}
});
