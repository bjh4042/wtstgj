import test from 'node:test';
import assert from 'node:assert/strict';
import {gymWorld,gymSeed,adapter} from './helpers/gym-polish-fixture.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';
import {pathToPoint} from '../dist/world/reachability.mjs';
import {cellPosition,positionCell,tileAt} from '../dist/world/definition.mjs';
import {coreWalkable,trainerSees,moveNPC} from '../dist/field-engine-core.mjs';
import {gymBarrierAt} from '../dist/world/gym-polish.mjs';
import {createWorldStore} from '../dist/world/save-store.mjs';
import {isolatedStorage} from './helpers/enhanced-league-fixture.mjs';
async function walk(w,id){const path=pathToPoint(w,id);assert.ok(path,'reachable '+id);for(const dir of path)assert.equal((await w.move(dir)).moved,true);return path.length}

for(let number=1;number<=8;number++)test(`gym ${number}: entrance / ordered devices / leader / return, solid NPC placement`,async()=>{
 const w=gymWorld(number),m=w.map,s=w.snapshot(),leader=m.trainers.find(id=>w.story.contract.trainers[w.definition.points[id].trainerId].kind==='gym');
 assert.ok(m.puzzle.steps.length>=2&&m.puzzle.steps.length<=4);
 assert.equal(pathToPoint(w,leader),null,'gate cannot be bypassed');
 await walk(w,'gym-guide:'+number);assert.ok((await w.interact('gym-guide:'+number)).message);
 for(const a of m.actors){assert.ok(tileAt(m,a.x,a.y).walkable);assert.ok(!gymBarrierAt(m,a.x,a.y));assert.equal(coreWalkable(w.field,a.x*48+24,a.y*48+24),false);assert.ok(pathToPoint(w,a.pointId)||a.pointId===leader)}
 assert.equal(new Set(m.actors.map(a=>a.x+','+a.y)).size,m.actors.length);
 const final=m.puzzle.switchPoint;await walk(w,final);const before=w.snapshot();
 await assert.rejects(()=>w.interact(final),/먼저/);assert.deepEqual(w.snapshot(),before);assert.equal(w.busy,false);
 let tiles=0;
 for(const [i,id]of m.puzzle.steps.entries()){
  tiles+=await walk(w,id);await w.interact(id);await w.interact(id);
  assert.equal(w.snapshot().world.interactions.filter(x=>x===id).length,1);
  if(i<m.puzzle.steps.length-1)assert.equal(pathToPoint(w,leader),null);
 }
 assert.deepEqual(w.snapshot().world.puzzles,[m.puzzle.id]);
 tiles+=await walk(w,leader);assert.ok(w.nearby().some(p=>p.id===leader));
 tiles+=await walk(w,'gym-entry:'+number+':return');await w.interact('gym-entry:'+number+':return');
 const hubCell=positionCell(w.snapshot().position);assert.ok(w.host.validLanding(w.snapshot().position,w.snapshot()));
 assert.ok(!w.map.warps.some(id=>{const p=w.definition.points[id];return p.x===hubCell.x&&p.y===hubCell.y}));
 await walk(w,'gym-entry:'+number);await w.interact('gym-entry:'+number);
 assert.deepEqual(positionCell(w.snapshot().position),{x:3,y:18});assert.ok(w.host.validLanding(w.snapshot().position,w.snapshot()));
 assert.deepEqual(w.snapshot().party,s.party);assert.deepEqual(w.snapshot().inventory,s.inventory);
 assert.deepEqual(w.snapshot().progress.defeatedTrainers,s.progress.defeatedTrainers);
 assert.ok(tiles>0);w.dispose();
});

test('new gym barriers block Surf, cardinal sight and NPC approach through geometry',()=>{
 const w=gymWorld(2),m=w.map,s=w.snapshot();
 for(const [x,y]of [[9,13],[17,18]])assert.equal(w.host.canOccupy(s,m.id,x,y),false);
 // Isolated actor across the circuit wall; reuse the actual FieldCore collision binding.
 Object.assign(w.field,cellPosition(m.id,10,14));const n={...w.field.core.npcs[1],...cellPosition(m.id,8,14),id:'fixture-approach',trainer:true,defeated:false,facing:'right',sightRange:4,sightCooldown:0,target:{x:10*48+24,y:14*48+24}};
 assert.equal(trainerSees(w.field,n),false);const start=n.x;
 for(let i=0;i<60;i++)moveNPC(w.field,n,1/60);
 assert.ok(n.x<9*48,'cannot enter barrier');assert.ok(n.x>=start);w.dispose();
 const water=gymWorld(1);assert.equal(water.host.canOccupy(water.snapshot(),water.map.id,10,14),false);water.dispose();
});

test('existing completed switch preserved; only newly obstructed old coordinates recover without changing owned data',()=>{
 const s=gymSeed(2);s.world.puzzles=['gym-switch:2'];s.position=cellPosition('world:gym:2',9,14);const original=structuredClone(s);
 const w=new CanonicalWorld({adapter,runtime:s,mode:'test'}),after=w.snapshot();
 assert.deepEqual(s,original);assert.ok(w.host.validLanding(after.position,after));assert.ok(positionCell(after.position).y>10);
 assert.deepEqual(after.world.puzzles,s.world.puzzles);assert.deepEqual(after.world.placementRecovery.originalPosition,s.position);
 for(const k of ['party','box','inventory','progress','economy','geojeHidden'])assert.deepEqual(after[k],s[k]);
 const leader=w.map.trainers.find(id=>w.story.contract.trainers[w.definition.points[id].trainerId].kind==='gym');assert.ok(pathToPoint(w,leader));w.dispose();
 const reload=new CanonicalWorld({adapter,runtime:after,mode:'test'});assert.deepEqual(reload.snapshot(),after);reload.dispose();
});

test('partial puzzle receipts persist; failed final-switch commit retries once and retains independent slots',async()=>{
 const w=gymWorld(2),ids=w.map.puzzle.steps;await walk(w,ids[0]);await w.interact(ids[0]);
 const memory=isolatedStorage(),store=createWorldStore(memory,w.catalog,w.host,{qa:true});store.save('SLOT_1',w.snapshot());store.save('SLOT_2',w.snapshot());const second=memory.getItem(store.keys('SLOT_2').primary);w.dispose();
 let restored=new CanonicalWorld({adapter,runtime:store.load('SLOT_1'),mode:'test'});
 assert.ok(restored.snapshot().world.interactions.includes(ids[0]));await walk(restored,ids[1]);await restored.interact(ids[1]);await walk(restored,ids[2]);const prior=restored.snapshot();restored.dispose();
 let fail=true;restored=new CanonicalWorld({adapter,runtime:prior,mode:'test',persist:s=>{if(fail)throw Error('fixture write failure');store.save('SLOT_1',s)}});
 await assert.rejects(()=>restored.interact(ids[2]),/fixture write failure/);assert.deepEqual(restored.snapshot().world.puzzles,[]);
 fail=false;await restored.story.retryCommit();await restored.interact(ids[2]);
 assert.deepEqual(restored.snapshot().world.puzzles,['gym-switch:2']);assert.equal(restored.snapshot().world.interactions.filter(id=>id===ids[2]).length,1);
 assert.equal(memory.getItem(store.keys('SLOT_2').primary),second);restored.dispose();
});
