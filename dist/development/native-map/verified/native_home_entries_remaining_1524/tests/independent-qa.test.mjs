import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {NativeHomeSession} from '../session.mjs';
const root=new URL('../',import.meta.url),c=JSON.parse(fs.readFileSync(new URL('contract.json',root))),masks=Object.fromEntries(Object.entries(c.masks).map(([k,s])=>[k,new Uint8Array(fs.readFileSync(new URL(s.path,root)))]));
function walk(s,path){assert.deepEqual(s.snapshot().foot,path[0]);for(const p of path.slice(1)){const [x,y]=s.snapshot().foot;assert.equal(Math.abs(x-p[0])+Math.abs(y-p[1]),1);assert.equal(s.move(p[0]<x?'left':p[0]>x?'right':p[1]<y?'up':'down').ok,true);}}
async function enter(s){s.setDoorState('OPEN');walk(s,s.snapshot().homeId==='upper'?c.houses.upper.exteriorDoor.approachRoute:c.houses.family.exteriorDoor.approachRoute);assert.equal((await s.action()).kind,'enter');s.releaseAction();}
test('cancelled upper stairs load cannot overwrite reset exterior; no canonical warp/receipt invented',async()=>{
 let finish;const s=new NativeHomeSession({contract:c,homeId:'upper',masks,loadScene:target=>target==='upper_2F'?new Promise(r=>finish=r):Promise.resolve({sha256:c.sources[target].sha256})});
 await enter(s);walk(s,c.floors.upper_1F.routes.entryArrival_stair);const old=s.action();assert.equal(s.snapshot().pending,true);s.cancel();s.reset();const reset=s.snapshot();finish({sha256:c.sources.upper_2F.sha256});assert.equal((await old).reason,'STALE');assert.deepEqual(s.snapshot(),reset);assert.equal(s.snapshot().canonicalMapBinding,null);s.dispose();
});
test('failed family exterior return preserves indoor state; explicit release/leave/retry returns exact native landing',async()=>{
 let bad=true;const s=new NativeHomeSession({contract:c,homeId:'family',masks,loadScene:async target=>({sha256:target==='exterior'&&bad?'bad':c.sources[target].sha256})});
 await enter(s);const path=c.floors.family_1F.routes.entryArrival_entry;walk(s,path);s.face('down');const before=s.snapshot();assert.equal((await s.action()).reason,'TARGET_SOURCE_PIN_MISMATCH');assert.equal(s.snapshot().scene,before.scene);assert.deepEqual(s.snapshot().foot,before.foot);assert.equal(s.snapshot().portalTransfers,1);s.releaseAction();assert.equal((await s.action()).reason,'RELEASE_AND_LEAVE_TRIGGER_REQUIRED');s.releaseAction();walk(s,[...path].reverse());bad=false;walk(s,path);s.face('down');assert.equal((await s.action()).kind,'return');assert.deepEqual(s.snapshot().foot,c.houses.family.exteriorDoor.arrival);assert.equal(s.snapshot().facing,'down');s.dispose();
});
