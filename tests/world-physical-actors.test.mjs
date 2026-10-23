import test from 'node:test';
import assert from 'node:assert/strict';
import {freshWorld,walk} from './helpers/world-fixture.mjs';
import {testParty} from './helpers/story-fixture.mjs';
import {coreWalkable} from '../dist/field-engine-core.mjs';
import {cellPosition} from '../dist/world/definition.mjs';
const steps=['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER','RIVAL_00','P03_TUTORIAL','P04_SUSPICIOUS_TRACE'];
const point=id=>id==='RIVAL_00'?'trainer:'+id:'event:'+id;
async function through(count){let w=freshWorld();for(const id of steps.slice(0,count)){await walk(w,point(id));await w.interact(point(id));if(id==='P02_FIRST_PARTNER'){const save=testParty(w.snapshot());w.dispose();w=freshWorld({runtime:save})}}return w}
for(const [count,visible] of [[0,null],[1,'P01_ECO_CENTER'],[2,'P02_FIRST_PARTNER'],[3,null],[4,'P03_TUTORIAL'],[5,null],[6,null]])test(`doctor physical phase after ${count} events is ${visible??'none'} with matching colliders`,async()=>{
 const w=await through(count),s=w.snapshot(),doctors=w.field.core.npcs.filter(a=>a.canonicalNpcId==='NPC_CHAMPION_DOCTOR_YOON');assert.deepEqual(doctors.map(a=>a.pointId),visible?['event:'+visible]:[]);
 for(const id of steps.filter(id=>id!=='RIVAL_00')){const p=w.definition.points[point(id)],pos=cellPosition(p.mapId,p.x,p.y),shown=id===visible;assert.equal(w.host.canOccupy(s,p.mapId,p.x,p.y),!shown,id+' host collision');assert.equal(coreWalkable(w.field,pos.x,pos.y),!shown,id+' core collision');assert.ok(w.definition.eventBindings[id]);}
 const before=w.snapshot();w.syncField();assert.deepEqual(w.snapshot(),before);w.dispose();const restored=freshWorld({runtime:before});assert.deepEqual(restored.field.core.npcs.filter(a=>a.canonicalNpcId==='NPC_CHAMPION_DOCTOR_YOON').map(a=>a.pointId),visible?['event:'+visible]:[]);assert.deepEqual(restored.snapshot(),before);restored.dispose();
});
test('logical marker events remain local, gated, walk-reachable and complete in original order',async()=>{
 const w=freshWorld();await assert.rejects(w.interact('event:P04_SUSPICIOUS_TRACE'),/가까이/);await walk(w,'event:P04_SUSPICIOUS_TRACE');await assert.rejects(w.interact('event:P04_SUSPICIOUS_TRACE'),/unavailable/);assert.equal(w.story.eventCompleted('P04_SUSPICIOUS_TRACE'),false);w.dispose();const finished=await through(6);const done=finished.snapshot().progress.completedEvents;for(const id of steps)assert.ok(done.includes(id),id);for(let i=1;i<steps.length;i++)assert.ok(done.indexOf(steps[i-1])<done.indexOf(steps[i]));finished.dispose();
});
