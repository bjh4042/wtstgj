import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoldenField,moveGolden,serializeGolden,interactGolden,closeGoldenUI,goldenCamera} from '../dist/golden-field.mjs';
import {FIELD_BEHAVIOR,behaviorAt,QA_MAPS} from '../dist/field-behavior.mjs';
import {createFieldAnimation,tickFieldAnimation} from '../dist/field-animation.mjs';
import {coreWalkable,tickFieldCore,trainerSees,recordFieldMovement,finishFieldBattle,fieldInputLocked,beginEncounter} from '../dist/field-engine-core.mjs';
const qa=(scenario='npc',movement)=>createGoldenField(null,{qa:true,scenario,movement});
function tick(s,a,frames=1){for(let i=0;i<frames;i++){tickFieldAnimation(a,1/60,false);tickFieldCore(s,1/60,a)}}
function walk(s,d,frames=1){for(let i=0;i<frames;i++)moveGolden(s,d,1/60)}

test('behavior registry covers all requested actions without any graphic identity',()=>{
 for(const id of ['NORMAL','TALL_GRASS','WATER','WATER_EDGE','SHORE','LEDGE','DOOR','WARP','SIGN','ENCOUNTER','BLOCKED'])assert.ok(FIELD_BEHAVIOR[id]);
 assert.equal(behaviorAt('outdoor',280,200).encounter,true);assert.equal(behaviorAt('outdoor',1200,500).walkable,false);
 assert.equal(behaviorAt('qa_a',450,690).id,'LEDGE');assert.equal(behaviorAt('qa_b',300,600).id,'NORMAL');
});
test('only movement steps trigger encounters, never idle, dialogue, menu, or scripted input',()=>{
 const s=createGoldenField({scene:'outdoor',x:280,y:200,facing:'down'});s.core.encounterGrace=0;
 for(let i=0;i<120;i++)recordFieldMovement(s,0,()=>0);assert.equal(s.core.encounterChecks,0);
 recordFieldMovement(s,47,()=>0);assert.equal(s.core.pendingBattle,null);
 assert.equal(recordFieldMovement(s,1,()=>0),true);assert.equal(s.core.steps,1);assert.equal(s.core.encounterChecks,1);assert.equal(s.core.lock,'encounter');
 recordFieldMovement(s,48,()=>0);assert.equal(s.core.encounterChecks,1);
 const at={x:s.x,y:s.y};walk(s,'right',20);assert.equal(s.x,at.x);assert.equal(s.y,at.y);
 finishFieldBattle(s,'run');assert.equal(s.core.mode,'WALK');assert.equal(s.core.encounterGrace,3);
 s.menu=0;recordFieldMovement(s,100,()=>0);assert.equal(s.core.encounterChecks,1);s.menu=null;s.dialogue=['hello'];recordFieldMovement(s,100,()=>0);assert.equal(s.core.encounterChecks,1);
});
test('fixed NPC stays fixed; look-around changes facing without translating',()=>{
 for(const movement of ['FACE_FIXED','LOOK_AROUND']){const s=qa('npc',movement),n=s.core.npcs.at(-1),a=createFieldAnimation(),faces=new Set();for(let i=0;i<900;i++){tick(s,a);faces.add(n.facing)}assert.equal(n.x,528);assert.equal(n.y,480);assert.equal(faces.size>1,movement==='LOOK_AROUND')}
});
test('patrol follows waypoints; wander remains bounded and respects walls and player',()=>{
 for(const movement of ['PATROL','WANDER']){const s=qa('npc',movement),n=s.core.npcs.at(-1),a=createFieldAnimation();let moved=false;for(let i=0;i<1600;i++){tick(s,a);moved||=n.x!==528||n.y!==480;assert.ok(Math.abs(n.x-n.homeX)<=96.01&&Math.abs(n.y-n.homeY)<=96.01);assert.ok(Math.hypot(n.x-s.x,n.y-s.y)>=47);assert.equal(coreWalkable(s,n.x,n.y,n.id),true)}assert.equal(moved,true)}
});
test('NPC turns to player and patrol cannot move during dialogue, then resumes',()=>{
 const s=qa(),n=s.core.npcs.at(-1),a=createFieldAnimation();s.x=528;s.y=576;s.facing='up';interactGolden(s);assert.equal(n.facing,'down');assert.equal(n.paused,true);assert.equal(s.core.mode,'SCRIPTED');const [x,y]=[n.x,n.y];tick(s,a,300);assert.equal(n.x,x);assert.equal(n.y,y);closeGoldenUI(s);assert.equal(n.paused,false);tick(s,a,300);assert.notEqual(n.x,x);
});
test('trainer sight respects direction, grid alignment, range and solid wall',()=>{
 const s=qa('trainer'),n=s.core.npcs.at(-1);s.x=648;assert.equal(trainerSees(s,n),true);s.x=600;assert.equal(trainerSees(s,n),false);s.x=648;s.y=240;assert.equal(trainerSees(s,n),false);s.y=900;assert.equal(trainerSees(s,n),false);
 const blocked=qa('blocked');assert.equal(trainerSees(blocked,blocked.core.npcs.at(-1)),false);
});
test('trainer notice approaches one tile, dialogues, uses existing battle handoff, and persists defeat',()=>{
 const s=qa('trainer'),n=s.core.npcs.at(-1),a=createFieldAnimation();s.x=648;tick(s,a);assert.equal(s.core.lock,'trainer');assert.ok(a.effects.some(e=>e.kind==='exclamation'));
 const origin={x:s.x,y:s.y};walk(s,'left',30);assert.equal(s.x,origin.x);tick(s,a,240);assert.equal(s.core.sequence.phase,'dialogue');assert.equal(n.y,s.y-48);assert.ok(s.dialogue.length);
 interactGolden(s);assert.equal(s.core.pendingBattle.kind,'trainer');tick(s,a,30);assert.equal(s.core.battleReady,true);
 finishFieldBattle(s,'win');assert.equal(n.defeated,true);assert.equal(trainerSees(s,n),false);assert.equal(fieldInputLocked(s),false);assert.equal(s.x,origin.x);assert.equal(s.y,origin.y);
 const saved=serializeGolden(s),restored=createGoldenField(saved,{qa:true,scenario:'trainer'});assert.ok(restored.core.defeated.includes('qa_observer'));assert.equal(restored.core.npcs.at(-1).defeated,true);assert.equal(saved.version,1);
});
test('blocked trainer approach stops safely with one warning and no immediate retrigger',t=>{
 t.mock.method(console,'warn',()=>{});const s=qa('trainer'),n=s.core.npcs.at(-1),a=createFieldAnimation();s.x=648;tick(s,a);s.core.npcs.push({...n,id:'blocker',trainer:false,x:648,y:500,body:[-25,-20,50,24]});tick(s,a,240);assert.equal(s.core.sequence,null);assert.equal(s.core.mode,'WALK');assert.equal(s.core.warnings.length,1);assert.ok(n.y<500);tick(s,a,10);assert.equal(s.core.sequence,null);
});
test('one-way ledge arcs to a validated landing, locks input, blocks reverse travel',()=>{
 const s=qa('ledge'),a=createFieldAnimation();walk(s,'down',7);assert.equal(s.core.sequence.kind,'ledge');const x=s.x;walk(s,'right',20);assert.equal(s.x,x);tick(s,a,13);assert.ok(s.core.jumpOffset>0);assert.equal(Number.isInteger(goldenCamera(s)),true);tick(s,a,20);assert.equal(s.y,744);assert.equal(s.core.jumpOffset,0);assert.equal(s.core.mode,'WALK');assert.ok(a.effects.some(e=>e.kind==='landingDust'));walk(s,'up',80);assert.ok(s.y>720);
});
test('ledge cannot jump into a solid landing or unrelated obstacle',()=>{
 const s=qa('ledge');s.core.npcs.push({...s.core.npcs.at(-1),id:'landing-block',x:456,y:744});walk(s,'down',50);assert.equal(s.core.sequence,null);assert.ok(s.y<672);
});
test('two QA edge connections preserve relative coordinate and facing without changing first field',()=>{
 const s=qa('connection');s.x=1247;s.y=800;s.facing='right';moveGolden(s,'right',1/60);assert.equal(s.scene,'qa_b');assert.equal(s.x,289);assert.equal(s.y,800);assert.equal(s.facing,'right');assert.equal(s.core.area.name,QA_MAPS.qa_b.name);assert.equal(goldenCamera(s),0);moveGolden(s,'left',1/60);assert.equal(s.scene,'qa_a');assert.equal(s.x,1247);assert.equal(s.y,800);
});
test('region banner expires on shared clock and paused core does not advance',()=>{
 const s=qa('area'),a=createFieldAnimation();tickFieldCore(s,1,a,true);assert.equal(s.core.area.age,0);tick(s,a,140);assert.equal(s.core.area,null);
});
test('old saves default optional trainer state safely and preserve canonical fields',()=>{
 const old={version:1,scene:'outdoor',x:765,y:448,facing:'up',doorX:765};assert.deepEqual(serializeGolden(createGoldenField(old)),old);assert.deepEqual(createGoldenField({...old,defeatedTrainers:'bad'}).core.defeated,[]);
});

test('fractional walking budgets produce exactly one encounter check per 48 pixels',()=>{
 const s=qa();for(let i=0;i<60;i++)moveGolden(s,'down',1/60);assert.equal(s.core.steps,5);assert.ok(Math.abs(s.core.stepDistance-20)<1e-5);
 const t=qa();for(let i=0;i<960;i++)recordFieldMovement(t,.1,()=>1);assert.equal(t.core.steps,2);assert.ok(t.core.stepDistance<1e-6);
});

test('a battle handoff is issued once even while asynchronous battle rewards finish',()=>{
 const s=qa(),a=createFieldAnimation();beginEncounter(s,{kind:'wild'});tick(s,a,30);
 assert.equal(s.core.battleReady,true);s.core.battleReady=false; // App acknowledges the handoff.
 tick(s,a,180);assert.equal(s.core.battleReady,false);assert.equal(s.core.lock,'battle');
 assert.equal(beginEncounter(s,{kind:'wild'}),false);
 finishFieldBattle(s,'capture');assert.equal(s.core.pendingBattle,null);assert.equal(s.core.mode,'WALK');
});

test('one hundred map round trips preserve NPCs, defeat flags, facing, and encounter state',()=>{
 const s=qa('connection');s.core.defeated=['already-won'];const npcs=JSON.stringify(s.core.npcs);
 for(let i=0;i<100;i++){
  s.x=1247;s.y=800;moveGolden(s,'right',1/60);
  assert.deepEqual([s.scene,s.x,s.y,s.facing,goldenCamera(s)],['qa_b',289,800,'right',0]);
  moveGolden(s,'left',1/60);assert.deepEqual([s.scene,s.x,s.y,s.facing],['qa_a',1247,800,'left']);
  assert.equal(s.core.pendingBattle,null);assert.equal(s.core.encounterChecks,0);assert.equal(s.core.sequence,null);
 }
 assert.equal(JSON.stringify(s.core.npcs),npcs);assert.deepEqual(s.core.defeated,['already-won']);assert.deepEqual(s.core.warnings,[]);
});

test('only valid grass checks encounters and long idle, blocked movement, and menus cannot trigger them',()=>{
 const s=createGoldenField({scene:'outdoor',x:765,y:448,facing:'up'}),a=createFieldAnimation();s.core.encounterGrace=0;
 for(let i=0;i<100;i++)recordFieldMovement(s,48,()=>0);
 assert.equal(s.core.encounterChecks,0);assert.equal(s.core.pendingBattle,null);
 s.x=280;s.y=200;tick(s,a,3600);assert.equal(s.core.encounterChecks,0);
 s.menu=1;walk(s,'right',200);assert.deepEqual([s.x,s.y],[280,200]);s.menu=null;
 s.dialogue=['pause'];walk(s,'left',200);assert.deepEqual([s.x,s.y],[280,200]);s.dialogue=[];
 s.scene='qa_b';s.x=1248;s.y=800;s.core.stepDistance=0;walk(s,'right',240);
 assert.equal(s.x,1248);assert.equal(s.core.stepDistance,0);assert.equal(s.core.encounterChecks,0);
});

test('all battle outcomes restore the exact field anchor and only victory survives restart as defeated',()=>{
 for(const result of ['win','run','lose','capture']){
  const s=qa('trainer'),original={scene:s.scene,x:s.x,y:s.y,facing:s.facing};
  beginEncounter(s,{kind:'trainer',trainerId:'qa_observer'});s.x=400;s.y=800;
  finishFieldBattle(s,result);assert.deepEqual({scene:s.scene,x:s.x,y:s.y,facing:s.facing},original);
  const saved=JSON.parse(JSON.stringify(serializeGolden(s))),again=createGoldenField(saved,{qa:true,scenario:'trainer'});
  assert.deepEqual(serializeGolden(again),saved);assert.equal(again.core.npcs.at(-1).defeated,result==='win');
  if(result==='win'){again.x=648;again.y=624;tick(again,createFieldAnimation(),900);assert.equal(again.core.sequence,null);assert.equal(again.core.pendingBattle,null)}
 }
});

test('rapid contradictory input during a jump cannot change its landing, camera, or next input',()=>{
 const s=qa('ledge'),a=createFieldAnimation();walk(s,'down',7);
 for(let i=0;i<60;i++){
  if(!s.core.sequence)break;
  for(const d of ['up','right','left','down'])moveGolden(s,d,1/60);
  tick(s,a);assert.equal(s.x,456);assert.equal(Number.isInteger(goldenCamera(s)),true);
 }
 assert.deepEqual([s.x,s.y,s.core.jumpOffset,s.core.mode],[456,744,0,'WALK']);
 walk(s,'up',100);assert.ok(s.y>720);assert.equal(s.core.sequence,null);
 const before=s.x;walk(s,'right',8);assert.ok(s.x>before);
});
