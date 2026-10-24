import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshWorld,walk} from './helpers/world-fixture.mjs';
import {testParty,playBattle} from './helpers/story-fixture.mjs';
import {lockField} from '../dist/field-engine-core.mjs';

async function readyRival(){let w=freshWorld();for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await w.story.runEvent(id);const save=testParty(w.snapshot());w.dispose();w=freshWorld({runtime:save});await walk(w,'trainer:RIVAL_00');return w}
function hold(w,phase){lockField(w.field,'trainer');w.field.core.sequence={kind:'trainer',phase,elapsed:1,npcId:'actor:trainer:RIVAL_00'};}
const entry=()=>readFileSync(new URL('../dist/world/entry.mjs',import.meta.url),'utf8');
function runMenuHandler(w,isActive=true){const source=entry(),start=source.indexOf("el('menu').onclick="),end=source.indexOf(';\n',start);assert.ok(start>=0&&end>start);return new Function('world','isActive','let menu=false,battle=null;const active=()=>isActive,render=()=>{};const handler='+source.slice(start+"el('menu').onclick=".length,end)+';handler();return menu;')(w,isActive)}
function runSaveHandler(w){const source=entry(),start=source.indexOf("el('save').onclick=safe("),end=source.indexOf(";el('load').onclick",start);assert.ok(start>=0&&end>start);return new Function('world',"let writes=0,bound=null;const battle=null,store={save:()=>writes++},el=()=>({value:'SLOT_1'}),say=()=>{},safe=fn=>fn;const handler="+source.slice(start+"el('save').onclick=".length,end)+";try{handler()}catch(error){return {writes,error:error.message}}return {writes};")(w)}

test('won canonical trainer speaks existing after-dialogue, without battle/reward/state changes, also after reload',async()=>{let w=await readyRival();let battles=0;w.battleDriver=async b=>{battles++;return playBattle(b)};await w.interact('trainer:RIVAL_00');assert.equal(battles,1);assert.ok(w.snapshot().progress.defeatedTrainers.includes('RIVAL_00'));const saved=w.snapshot();for(let i=0;i<2;i++){const before=w.snapshot(),r=await w.interact('trainer:RIVAL_00');assert.equal(r.message,'조사를 응원해요.');assert.equal(r.alreadyDefeated,true);assert.deepEqual(w.snapshot(),before)}assert.equal(battles,1);w.dispose();w=freshWorld({runtime:saved,battleDriver:()=>{throw Error('unexpected repeat battle')}});const r=await w.interact('trainer:RIVAL_00');assert.equal(r.alreadyDefeated,true);assert.deepEqual(w.snapshot(),saved);w.dispose()});
for(const phase of ['notice','approach']){
 test(`trainer ${phase} rejects a second interaction without changing sequence, actor or save`,async()=>{const w=await readyRival();hold(w,phase);const before=w.snapshot(),seq=structuredClone(w.field.core.sequence),actors=structuredClone(w.field.core.npcs);await assert.rejects(w.interact('trainer:RIVAL_00'),/WORLD_INPUT_LOCKED/);assert.deepEqual(w.snapshot(),before);assert.deepEqual(w.field.core.sequence,seq);assert.deepEqual(w.field.core.npcs,actors);w.dispose()});
 test(`trainer ${phase} UI menu handler is locked`,async()=>{const w=await readyRival();hold(w,phase);assert.equal(runMenuHandler(w),false);assert.equal(w.field.menu,null);w.dispose()});
 test(`trainer ${phase} manual save handler is locked`,async()=>{const w=await readyRival();hold(w,phase);const r=runSaveHandler(w);assert.equal(r.writes,0);assert.ok(r.error);w.dispose()});
}
test('idle UI still opens menu and saves normally',()=>{const w=freshWorld();assert.equal(runMenuHandler(w),true);w.field.menu=null;assert.equal(runSaveHandler(w).writes,1);w.dispose()});
test('detected trainer completes exactly one battle through its owned lock',async()=>{const w=await readyRival();let battles=0;w.battleDriver=async b=>{battles++;return playBattle(b)};const n=w.field.core.npcs.find(n=>n.canonicalTrainerId==='RIVAL_00'); // Position a valid detection ray without changing committed save identity.
 w.field.x=n.x;w.field.y=n.y+96;w.tick(.016);assert.equal(w.field.core.sequence?.phase,'notice');for(let i=0;i<60;i++)w.tick(.05);assert.equal(w.field.core.sequence?.phase,'dialogue');assert.equal(w.continueTrainerDialogue(),true);for(let i=0;i<20;i++)w.tick(.05);assert.equal(w.field.core.battleReady,true);await Promise.all([w.startDetectedBattle(),w.startDetectedBattle()]);assert.equal(battles,1);assert.equal(w.field.core.sequence,null);assert.equal(w.field.core.pendingBattle,null);assert.ok(w.snapshot().progress.defeatedTrainers.includes('RIVAL_00'));w.dispose()});
test('battle modal has a label and local Tab wrap, with no global listener',()=>{
 const source=entry();assert.match(source,/data-w="battle-panel"[^>]+role="dialog"[^>]+aria-label="생태몬 대결"/);
 const marker="el('battle-panel').addEventListener('keydown',",start=source.indexOf(marker),end=source.indexOf(');\n for(const id',start);assert.ok(start>=0&&end>start);
 let focused=null,targets=[];const panel={querySelectorAll:()=>targets,focus:()=>{focused=panel}},first={focus:()=>{focused=first}},last={focus:()=>{focused=last}},doc={activeElement:panel};
 const handler=new Function('el','battle','document','return '+source.slice(start+marker.length,end))(()=>panel,{},doc);
 const press=shiftKey=>{let prevented=false;handler({key:'Tab',shiftKey,preventDefault:()=>{prevented=true}});assert.equal(prevented,true)};
 press(false);assert.equal(focused,panel);targets=[first,last];doc.activeElement=panel;press(false);assert.equal(focused,first);doc.activeElement=first;press(true);assert.equal(focused,last);doc.activeElement=last;press(false);assert.equal(focused,first);
});

test('temporarily inactive lifecycle does not open a new menu',()=>{const w=freshWorld();assert.equal(runMenuHandler(w,false),false);assert.equal(w.field.menu,null);w.dispose()});
