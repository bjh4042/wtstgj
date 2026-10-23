import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {HIDDEN_PLACEMENT_V1 as policy,HIDDEN_PLACEMENT_HASH} from '../dist/world/hidden-placement-v1.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';import {createWorldDefinition,cellPosition,tileAt,positionCell} from '../dist/world/definition.mjs';
import {worldGate,worldStageAccess,syncWorldLocation} from '../dist/world/state.mjs';import {pathToPoint,mapRoute} from '../dist/world/reachability.mjs';
import {validateCanonicalStorySave,storyBattleInput,mergeStoryAftermath} from '../dist/story/save.mjs';import {StoryProgressionService} from '../dist/story/progression-service.mjs';
import {createWorldStore} from '../dist/world/save-store.mjs';import {recordAcquisition,registerCompanion} from '../dist/encounter/acquisition.mjs';
import {postLeagueFixture,isolatedStorage} from './helpers/enhanced-league-fixture.mjs';import {sha256,stableJSON} from '../dist/compatibility/codec.mjs';
const read=f=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8');
const adapter=await loadCanonicalRuntimeAdapter({readText:async f=>read(f)}),historical={...adapter,hiddenPlacementPolicy:undefined};
const make=(runtime=null,options={})=>new CanonicalWorld({adapter,runtime,mode:'test',rng:()=>.99,...options});
const ready=()=>{const s=postLeagueFixture(adapter);s.progress.items.field_ability_surf=1;return s};
function place(s,w,mapId,x,y){s.position=cellPosition(mapId,x,y);syncWorldLocation(s,w.host);return s}
function relocated(input,id,options={}){const s=structuredClone(input),base=make(s),p=base.definition.points[id];let cell;for(const [dx,dy]of [[0,1],[-1,0],[1,0],[0,-1]])if(base.host.canOccupy(s,p.mapId,p.x+dx,p.y+dy)){cell=[p.x+dx,p.y+dy];break}assert.ok(cell,id);place(s,base,p.mapId,...cell);base.dispose();return make(s,options)}
async function walk(w,id){const path=pathToPoint(w,id);assert.ok(path,'reachable '+id);for(const dir of path)assert.equal((await w.move(dir)).moved,true);return path}
function atStage(stage,{includeCurrent=false,omit=[]}={}){const s=ready(),w=make(s),c=w.story.contract,p=s.progress,n=c.sequence.indexOf(stage);p.completedStages=c.sequence.slice(0,n);
 p.completedEvents=Object.values(c.events).filter(e=>e.active&&!e.acquisitionOnly&&c.sequence.indexOf(e.stageId)<n+(includeCurrent?1:0)&&!omit.includes(e.id)).map(e=>e.id);
 p.defeatedTrainers=Object.values(c.trainers).filter(t=>c.sequence.indexOf(t.stageId)<n+(includeCurrent?1:0)&&(!t.eventId||p.completedEvents.includes(t.eventId))).map(t=>t.id);
 p.flags=Object.fromEntries(Object.values(c.flags).map(f=>[f.id,f.set_by.some(id=>p.completedEvents.includes(c.aliases[id]??id))]));p.gymClears=c.gyms.filter(g=>p.defeatedTrainers.includes(g.id)).map(g=>g.id);p.badges=c.gyms.filter(g=>p.defeatedTrainers.includes(g.id)).map(g=>g.badgeId);p.leagueWins=c.elite.filter(id=>p.defeatedTrainers.includes(id));p.rewardClaims=Object.values(c.rewards).filter(r=>p.completedEvents.includes(r.triggerEvent)).map(r=>r.id);
 if(!p.flags.BADGE_07)delete p.items.field_ability_surf;place(s,w,'world:hub:'+stage,4,12);w.dispose();return s;
}
const tally=s=>({inventory:s.inventory.geoje_ball,counter:s.geojeBallsGranted,history:s.progress.geojeBallGrantHistory,hidden:s.geojeHidden});

test('approved 12 slots preserve candidate IDs/maps/onceFlags and all active tables; facilities stay at existing IDs/coordinates',()=>{
 const text=readFileSync(new URL('../docs/canonical-world-gameplay-integration-v1/GEOJE_BALL_HIDDEN_PLACEMENT_CANDIDATE_v1.json',import.meta.url),'utf8'),candidate=JSON.parse(text);
 assert.equal(sha256(text),policy.candidateSha256);assert.equal(candidate.runtimeEnabled,false);assert.equal(HIDDEN_PLACEMENT_HASH,sha256(stableJSON(policy)));
 const old=createWorldDefinition(historical),d=createWorldDefinition(adapter);assert.equal(policy.slots.length,12);assert.equal(new Set(policy.slots.map(s=>s.slotId)).size,12);assert.equal(new Set(policy.slots.map(s=>s.onceFlag)).size,12);
 policy.slots.forEach((s,i)=>{const c=candidate.slots[i];assert.deepEqual([s.slotId,s.mapId,s.areaId,s.onceFlag],[c.slotId,c.mapCandidate,c.areaCandidate,c.onceFlag]);assert.equal(s.quantity,1);assert.equal(s.permanentlyMissable,false);assert.deepEqual([d.points[s.slotId].x,d.points[s.slotId].y],s.cell)});
 for(const [id,m]of Object.entries(old.maps)){const n=d.maps[id];for(const k of ['encounterZones','fishingPoints','observationPoints','storyTriggers','trainers','solidObjects'])assert.deepEqual(n[k],m[k]);for(const p of m.points.filter(id=>['shop','heal','research'].includes(old.points[id].kind))){const a=old.points[p],b=d.points[p];assert.deepEqual([b.mapId,b.x,b.y,b.hubId],[a.mapId,a.x,a.y,a.hubId]);assert.equal(b.placementStatus,'APPROVED_GAMEPLAY_PLACEMENT_V1');assert.ok(tileAt(n,b.x,b.y).walkable)}}
 const zones=Object.values(d.maps).flatMap(m=>m.encounterZones);assert.equal(Object.keys(adapter.encounterRuntime.tables).length,46);assert.equal(zones.filter(z=>!z.policyExcluded).length,25);assert.equal(zones.filter(z=>z.policyExcluded).length,8);assert.equal(Object.keys(d.fishingBindings).length,7);assert.equal(Object.values(adapter.encounterRuntime.tables).filter(t=>t.rod).reduce((n,t)=>n+t.slots.length,0),70);
});

test('approved stages reach optional paths, Surf is required only for 07/08, all paths return and 10 needs no champion',async()=>{
 for(const slot of policy.slots){const s=atStage(slot.stage,{includeCurrent:slot.slotId==='HIDDEN_GEOJE_07'}),w=make(s);assert.ok(mapRoute(w,slot.mapId),'map gate '+slot.slotId);assert.ok(worldGate(s,w.story.contract,slot.accessGate));
  const m=w.definition.maps[slot.mapId];place(s,w,m.id,...m.spawn);w.dispose();const local=make(s),path=pathToPoint(local,slot.slotId);assert.ok(path,slot.slotId);const start=positionCell(s.position),dirs={up:'down',down:'up',left:'right',right:'left'};
  // Walk only new optional branches in isolated stage fixtures; no battles/playthrough.
  await walk(local,slot.slotId);assert.ok(local.nearby().some(p=>p.id===slot.slotId));for(const dir of [...path].reverse())assert.equal((await local.move(dirs[dir])).moved,true);assert.deepEqual(positionCell(local.snapshot().position),start);
  if(slot.slotId==='HIDDEN_GEOJE_10')assert.equal(s.progress.flags.MAIN_STORY_CLEAR,false);local.dispose();
 }
 const s=atStage('S7'),w=make(s);assert.equal(worldGate(s,w.story.contract,policy.slots[6].accessGate),false);place(s,w,policy.slots[6].mapId,29,18);w.dispose();const noSurf=make(s);assert.equal(pathToPoint(noSurf,'HIDDEN_GEOJE_07'),null);noSurf.dispose();
 const early=make();assert.equal(worldStageAccess(early.snapshot(),early.story.contract,'S1'),false);early.dispose();
});

test('12 explicit interactions grant once; S4 NPC gives only hint, two distinct saved POST markers required',async()=>{
 let s=ready();
 for(const slot of policy.slots){let w=relocated(s,slot.slotId);const before=tally(w.snapshot());
  if(slot.slotId==='HIDDEN_GEOJE_04'){w.dispose();w=relocated(s,slot.slotId+':clue');assert.match((await w.interact(slot.slotId+':clue')).message,/직접/);assert.deepEqual(tally(w.snapshot()),before);s=w.snapshot();w.dispose();w=relocated(s,slot.slotId)}
  if(slot.requiredMarkers){await assert.rejects(()=>w.interact(slot.slotId),/표식 2개/);w.dispose();for(const [i,id]of slot.requiredMarkers.entries()){w=relocated(s,id);await w.interact(id);await w.interact(id);s=w.snapshot();w.dispose();if(i===0){const b=relocated(s,slot.slotId);await assert.rejects(()=>b.interact(slot.slotId),/표식 2개/);b.dispose()}}w=relocated(s,slot.slotId)}
  await w.interact(slot.slotId);await w.interact(slot.slotId);assert.equal(w.snapshot().geojeBallsGranted,before.counter+1);assert.ok(w.snapshot().geojeHidden.onceFlags.includes(slot.onceFlag));s=w.snapshot();w.dispose();
  w=relocated(s,slot.slotId);await w.interact(slot.slotId);assert.equal(w.snapshot().geojeBallsGranted,s.geojeBallsGranted);w.dispose();
 }
 assert.equal(s.inventory.geoje_ball,12);assert.equal(s.geojeBallsGranted,12);assert.equal(Object.keys(s.geojeHidden.receipts).length,12);assert.deepEqual(s.progress.geojeBallGrantHistory,[]);
});

test('No149 already captured still permits sanctuary entry and slot12; no legendary capture prerequisite',async()=>{
 const s=ready(),base=make(s),c=base.catalog.encounterContract,e=c.events.LEGEND_149_CAPTURE;
 for(const id of ['LEGEND_148_CAPTURE','LEGEND_149_CAPTURE']){const event=c.events[id];registerCompanion(s,base.catalog,event.speciesId,60);recordAcquisition(s,event,{speciesIds:[event.speciesId],outcome:'captured'});s.progress.completedEvents.push(event.storyId);}
 for(const f of Object.values(base.story.contract.flags))s.progress.flags[f.id]=f.set_by.some(id=>s.progress.completedEvents.includes(base.story.contract.aliases[id]??id));
 for(const r of Object.values(base.story.contract.rewards))if(['POST_CAPTURE_148','POST_CAPTURE_149'].includes(r.triggerEvent))s.progress.rewardClaims.push(r.id);
 validateCanonicalStorySave(s,base.catalog);assert.equal(base.definition.points['area-entry:'+e.areaId].gate,policy.source149AccessExpression);base.dispose();
 const w=relocated(s,'HIDDEN_GEOJE_12');assert.ok(mapRoute(w,'world:hub:POST'));assert.equal(worldGate(s,w.story.contract,w.definition.points['area-entry:'+e.areaId].gate),true);await w.interact('HIDDEN_GEOJE_12');assert.equal(w.snapshot().inventory.geoje_ball,1);w.dispose();
});

test('historical six grants including spent balls leave only six; no slot reassignment and cap failures never mark received',async()=>{
 let s=ready();delete s.geojeHidden;s.geojeBallsGranted=6;s.inventory.geoje_ball=1;s.progress.geojeBallGrantHistory=['GEOJE_BALL_DOCTOR_CHAE_2','GEOJE_BALL_S9_2','GEOJE_BALL_CHAMPION_2'];const old=structuredClone(s);
 for(const slot of policy.slots.slice(0,6)){const w=relocated(s,slot.slotId);assert.equal(w.snapshot().geojeHidden.original.counter,6);await w.interact(slot.slotId);s=w.snapshot();w.dispose()}
 assert.equal(s.geojeBallsGranted,12);assert.equal(s.inventory.geoje_ball,7);assert.deepEqual(s.progress.geojeBallGrantHistory,old.progress.geojeBallGrantHistory);
 const w=relocated(s,'HIDDEN_GEOJE_07'),before=w.snapshot();await assert.rejects(()=>w.interact('HIDDEN_GEOJE_07'),/한도 12개/);assert.deepEqual(w.snapshot(),before);assert.equal(w.snapshot().geojeHidden.receipts.HIDDEN_GEOJE_07,undefined);w.dispose();assert.equal(old.inventory.geoje_ball,1);
});

test('uncertain old lifetime holds only Geoje grants; original evidence, normal actions and battle save envelope survive',async()=>{
 for(const kind of ['missing-counter','missing-ledger','mismatch']){const s=ready();delete s.geojeHidden;s.inventory.geoje_ball=1;s.geojeBallsGranted=3;if(kind==='missing-counter')delete s.geojeBallsGranted;if(kind==='missing-ledger')delete s.progress.geojeBallGrantHistory;const raw=stableJSON(s);
  let w=relocated(s,'HIDDEN_GEOJE_01');assert.equal(w.snapshot().geojeHidden.status,'HOLD');assert.ok(w.snapshot().geojeHidden.reasons.length);assert.equal(w.story.rewardClaimed('GEOJE_BALL_CHAMPION_2'),false);await assert.rejects(()=>w.interact('HIDDEN_GEOJE_01'),/추가 지급만 보류/);
  await w.move('left');const current=w.snapshot(),battle=storyBattleInput(current,w.catalog),after=mergeStoryAftermath(current,battle,w.catalog);assert.deepEqual(tally(after),tally(current));validateCanonicalStorySave(after,w.catalog);
  const storage=isolatedStorage(),store=createWorldStore(storage,w.catalog,w.host);store.save('SLOT_1',current);assert.deepEqual(tally(store.load('SLOT_1')),tally(current));w.dispose();
  w=relocated(current,'heal:S1');await w.interact('heal:S1',{type:'heal',transactionId:kind});assert.equal(w.snapshot().geojeHidden.status,'HOLD');w.dispose();assert.equal(stableJSON(s),raw);
 }
});

test('hidden grant commit is atomic across write failures, retry, reload, repeated clicks and independent slots',async()=>{
 for(const fault of ['before','after']){const s=ready(),base=relocated(s,'HIDDEN_GEOJE_01'),storage=isolatedStorage(),store=createWorldStore(storage,base.catalog,base.host),initial=base.snapshot();store.save('SLOT_1',initial);store.save('SLOT_2',initial);const other=storage.getItem(store.keys('SLOT_2').primary);base.dispose();let reject=true;
  let w=make(initial,{persist:n=>{if(reject&&fault==='before')throw Error('injected-before');store.save('SLOT_1',n);if(reject&&fault==='after')throw Error('injected-after')}});
  await assert.rejects(()=>w.interact('HIDDEN_GEOJE_01'),/injected/);assert.equal(w.snapshot().geojeBallsGranted,0);assert.equal(w.story.pendingCommit,true);await assert.rejects(()=>w.interact('HIDDEN_GEOJE_01'),/WORLD_BUSY/);
  const durable=store.load('SLOT_1');assert.equal(durable.geojeBallsGranted,fault==='after'?1:0);reject=false;await w.story.retryCommit();assert.equal(w.snapshot().geojeBallsGranted,1);w.dispose();w=make(store.load('SLOT_1'));await w.interact('HIDDEN_GEOJE_01');assert.equal(w.snapshot().geojeBallsGranted,1);assert.equal(storage.getItem(store.keys('SLOT_2').primary),other);w.dispose();
 }
});

test('ordinary world and non-world story stop historical automatic grants while preserving the event and other rewards',async()=>{
 for(const nonWorld of [false,true]){const s=atStage('S9',{includeCurrent:true,omit:['S9_RELEASE_RESCUED']}),w=make(s);if(nonWorld)delete s.world;
  const story=nonWorld?new StoryProgressionService({runtime:s,adapter,catalog:w.catalog}):w.story;assert.equal(story.eventAvailable('S9_RELEASE_RESCUED'),true);const before=tally(story.snapshot());await story.runEvent('S9_RELEASE_RESCUED');assert.deepEqual(tally(story.snapshot()),before);assert.ok(story.snapshot().progress.completedEvents.includes('S9_RELEASE_RESCUED'));await story.runEvent('S9_RELEASE_RESCUED');assert.deepEqual(tally(story.snapshot()),before);w.dispose();
 }
});

test('FINAL facilities stay outside the league and active enhanced league cannot heal/use storage; current entry and return cells remain safe',async()=>{
 const w=make(ready()),d=w.definition;for(const id of ['heal:FINAL','shop:FINAL']){const p=d.points[id];assert.equal(p.mapId,'world:hub:FINAL');assert.ok(pathToPoint(w,id));assert.ok(w.host.validLanding(cellPosition(p.mapId,p.x,p.y),w.snapshot()))}
 const l=adapter.enhancedLeague;assert.ok(w.host.validLanding(cellPosition(l.entryMapId,...l.safeCell),w.snapshot()));w.dispose();
 let n=relocated(ready(),l.entryPointId);await n.interact(l.entryPointId,{type:'begin',transactionId:'entry'});let s=n.snapshot();n.dispose();n=relocated(s,'heal:FINAL');
 for(const type of ['heal','storage-exchange'])await assert.rejects(()=>n.interact('heal:FINAL',{type,transactionId:type}),/강화 리그/);
 await assert.rejects(()=>n.story.economyCommand({type:'heal',hubId:'CENTER:FINAL',transactionId:'bypass'}),/강화 리그/);await assert.rejects(()=>n.story.recoverParty(),/강화 리그/);n.dispose();
});


test('new optional-path collision repairs only an old landing; original stored bytes/backup and hub identity remain intact',()=>{
 const s=ready(),old=new CanonicalWorld({adapter:historical,runtime:s,mode:'test'});delete s.world.placementApproval;delete s.geojeHidden;
 const current=make(s),cell=current.definition.placementCollisions.find(p=>p.mapId==='world:area:S1_YEONCHO_STREAM');place(s,old,cell.mapId,cell.x,cell.y);const raw=stableJSON(s),storage=isolatedStorage(),oldStore=createWorldStore(storage,old.catalog,old.host);oldStore.save('SLOT_1',s);const before=storage.getItem(oldStore.keys('SLOT_1').primary);
 const store=createWorldStore(storage,current.catalog,current.host),loaded=store.load('SLOT_1');assert.deepEqual(loaded.world.placementRecovery.originalPosition,s.position);assert.ok(current.host.validLanding(loaded.position,loaded));assert.equal(loaded.position.scene,s.position.scene);assert.equal(storage.getItem(store.keys('SLOT_1').primary),before);assert.equal(stableJSON(s),raw);
 const again=make(loaded);assert.deepEqual(again.snapshot().position,loaded.position);store.save('SLOT_1',again.snapshot());assert.equal(storage.getItem(store.keys('SLOT_1').lastKnownGood),before);assert.deepEqual(loaded.world.visitedHubs,s.world.visitedHubs);old.dispose();current.dispose();again.dispose();
});

test('main league already in sequence cannot walk out to facilities; loss recovery remains the existing route',async()=>{
 const s=atStage('FINAL',{includeCurrent:true,omit:['FINAL_CHAMPION','FINAL_ENDING_RECORD']}),base=make(s),door=base.definition.points['league-door:1:return'];place(s,base,door.mapId,3,12);base.dispose();const w=make(s);assert.equal(w.snapshot().progress.leagueWins.length,4);const before=w.snapshot();await assert.rejects(()=>w.interact(door.id),/본편 리그 연전/);assert.deepEqual(w.snapshot(),before);w.dispose();
});

test('hidden save rejects counter/flag/interaction divergence; no reset or extra grant after tampering',async()=>{
 const w=relocated(ready(),'HIDDEN_GEOJE_01');await w.interact('HIDDEN_GEOJE_01');const s=w.snapshot();
 for(const change of [s=>s.geojeBallsGranted++,s=>s.geojeHidden.onceFlags=[],s=>s.world.interactions=[],s=>s.geojeHidden.original.counter++]){const bad=structuredClone(s);change(bad);assert.throws(()=>validateCanonicalStorySave(bad,w.catalog));}
 assert.deepEqual(w.snapshot(),s);w.dispose();
});
