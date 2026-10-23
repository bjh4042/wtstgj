import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonicalAdapter} from '../dist/compatibility/canonical-adapter.mjs';
import {SpeciesCatalogService} from '../dist/species-catalog-service.mjs';
import {createCanonicalCreature,createCanonicalTestGame,createGameSession} from '../dist/canonical-session.mjs';
import {activateCanonicalBattleSave} from '../dist/battle-v3/save.mjs';
import {createBattleRules,battleStats} from '../dist/battle-v3/rules.mjs';
import {chooseEnemyMove,rankEnemyMoves} from '../dist/battle-v3/ai-20260927.mjs';
import {startSessionBattle} from '../dist/battle-v3/engine.mjs';

const adapter=await loadCanonicalAdapter({readText:async f=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
const catalog=new SpeciesCatalogService({namespace:'canonical',adapter}),rules=createBattleRules(adapter);
const mon=(id,level=50,moves)=>{const m=createCanonicalCreature(catalog,id,level);if(moves)m.moves=moves.map(id=>({id,pp:rules.moves[id].pp}));return m};
const context=(actor,target,tier='AI_4')=>({rules,catalog,actor,target,tier});

test('tiers use visible type, STAB, accuracy and expected damage without an action input',()=>{
 const actor=mon('SPECIES_004',50,['MV001','MV010']),target=mon('SPECIES_001');
 const c=context(actor,target,'AI_2'),rank=rankEnemyMoves(c);
 assert.equal(rank[0].id,'MV010');assert.ok(rank[0].expectedDamage>rank[1].expectedDamage);
 assert.equal(chooseEnemyMove(c,()=>.99),'MV010');
 assert.equal(chooseEnemyMove({...c,tier:'AI_1'},()=>.01),'MV001');
});

test('AI_3 and AI_4 sample top candidates at specified bands and favor near-certain KO',()=>{
 const c=context(mon('SPECIES_004',50,['MV001','MV010','MV011']),mon('SPECIES_001'));
 const top=rankEnemyMoves(c).map(x=>x.id);
 for(const [tier,rolls] of [['AI_3',[.69,.71,.91]],['AI_4',[.79,.81,.96]]]){
  assert.deepEqual(rolls.map(x=>chooseEnemyMove({...c,tier},()=>x)),top);
 }
 c.target.hp=1;assert.equal(rankEnemyMoves(c)[0].id,'MV010');
});

test('heal caps, consecutive heals, sleep loop and status immunity remove utility choices',()=>{
 const actor=mon('SPECIES_001',50,['MV005','MV040','MV001']),target=mon('SPECIES_010');actor.hp=Math.floor(battleStats(catalog,actor).hp*.25);
 const c=context(actor,target);
 assert.ok(rankEnemyMoves(c).find(x=>x.id==='MV005').score>0);
 assert.ok(rankEnemyMoves({...c,heals:2}).find(x=>x.id==='MV005').score<0);
 assert.ok(rankEnemyMoves({...c,lastHeal:true}).find(x=>x.id==='MV005').score<0);
 const sleeper=mon('SPECIES_015',50,['MV214','MV001']);
 const sleepRules={...rules,moves:{...rules.moves,MV214:{...rules.moves.MV214,power:null,effects:[{kind:'status',status:'sleep',chance:1,target:'opponent'}]}}};
 assert.ok(rankEnemyMoves({...context(sleeper,target),rules:sleepRules,sleptSpecies:new Set([target.speciesId])}).find(x=>x.id==='MV214').score<0);
});

test('only v3.2 trainer path uses tier AI; v3 keeps uniform random',()=>{
 const latest=structuredClone(adapter);latest.battleRuntime.version='v3.2_2026-09-27';
 latest.storyRuntime.trainers.TEST_AI={partyId:'TEST_PARTY',ai:'AI_2',itemUses:0};
 latest.storyRuntime.parties.TEST_PARTY={members:[{namespace:'canonical',speciesId:'SPECIES_004',level:50,moveIds:['MV001','MV010']}]};
 const save=activateCanonicalBattleSave(createCanonicalTestGame(catalog,{mode:'test',starterId:'SPECIES_001'}),catalog);
 save.party=[mon('SPECIES_001',50,['MV001'])];
 const start=a=>startSessionBattle(createGameSession(save,catalog),{kind:'trainer',...(a===latest?{partyId:'TEST_PARTY'}:{}),opponents:latest.storyRuntime.parties.TEST_PARTY.members,rng:()=>0},{adapter:a});
 const newEvent=start(latest).act({type:'move',moveId:'MV001'}).events.find(e=>e.type==='move'&&e.side==='opponent');
 const oldEvent=start(adapter).act({type:'move',moveId:'MV001'}).events.find(e=>e.type==='move'&&e.side==='opponent');
 assert.equal(newEvent.moveId,'MV010');assert.equal(oldEvent.moveId,'MV001');
});

test('v3.2 trainer consumes at most two item turns and never heals on consecutive turns',()=>{
 const latest=structuredClone(adapter);latest.battleRuntime.version='v3.2_2026-09-27';
 latest.storyRuntime.trainers.TEST_ITEM={partyId:'TEST_ITEM_PARTY',ai:'AI_4',itemUses:2,itemId:'hyper_potion'};
 latest.storyRuntime.parties.TEST_ITEM_PARTY={members:[{namespace:'canonical',speciesId:'SPECIES_004',level:75,moveIds:['MV001']}]};
 const save=activateCanonicalBattleSave(createCanonicalTestGame(catalog,{mode:'test',starterId:'SPECIES_001'}),catalog);
 save.party=[mon('SPECIES_086',75,['MV130'])];save.dex={seen:['SPECIES_086'],caught:['SPECIES_086']};
 const battle=startSessionBattle(createGameSession(save,catalog),{kind:'trainer',partyId:'TEST_ITEM_PARTY',opponents:latest.storyRuntime.parties.TEST_ITEM_PARTY.members,rng:()=>.5},{adapter:latest});
 for(let i=0;i<35&&battle.snapshot().phase==='turn';i++)battle.act({type:'move',moveId:'MV130'});
 const itemTurns=battle.snapshot().events.filter(e=>e.type==='item'&&e.side==='opponent').map(e=>e.turn);
 assert.ok(itemTurns.length>=1&&itemTurns.length<=2);assert.ok(itemTurns.every((turn,i)=>i===0||turn-itemTurns[i-1]>1));
});
