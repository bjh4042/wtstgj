import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGIONS,BADGES,TRAVEL_LINKS,freshJourney,cleanJourney} from '../dist/regions.mjs';
import {STARTERS} from '../dist/model.mjs';
import {GYMS,GYM_BY_REGION,LEAGUE,CHAMPION,ACQUISITIONS,STORY_BEATS,FACT_SOURCES,LEGEND_ENCOUNTERS,createGymPuzzleState,applyGymPuzzleAction,gymPuzzleSolved,availableEncounterPool,chooseWeightedEncounter,canTravel,canEncounterLegend,nextLeagueOpponent,leagueUnlocked} from '../dist/campaign.mjs';

const catalog=JSON.parse(readFileSync(new URL('../dist/data/geoje_species_151_v2.json',import.meta.url))).species;
const byId=Object.fromEntries(catalog.map(s=>[s.no,s]));

test('eight ordered gyms have distinct real puzzle mechanics, trainers and escalating leaders',()=>{
 assert.equal(GYMS.length,8);
 assert.deepEqual(GYMS.map(g=>g.badge),BADGES);
 assert.equal(new Set(GYMS.map(g=>g.puzzle.kind)).size,8);
 let prior=0;
 for(const gym of GYMS){
  assert.equal(GYM_BY_REGION[gym.regionId],gym);
  assert.ok(gym.trainers.length>=2);
  assert.ok(gym.leader.team.length>=3);
  const ace=Math.max(...gym.leader.team.map(([,level])=>level));
  assert.ok(ace>prior);prior=ace;
  for(const who of [...gym.trainers,gym.leader])for(const [id,level] of who.team){assert.ok(byId[id],`missing #${id}`);assert.ok(level>=1&&level<=100)}
  assert.doesNotMatch(`${gym.puzzle.title} ${gym.puzzle.instructions}`,/퀴즈|문제의 정답/);
 }
});

test('all eight gym puzzle reducers reach a solved state through actual actions',()=>{
 const solutions={
  garden:[0,1,2],west:['up','left','up','right'],bamboo:[0,1,1,2,2,2],north:['north','east','west','south'],
  okpo:['right','up','right','down','right','up'],port:[0,0,0,1,2,2],ilun:['red','white','pink','red','white'],south:[0,2]
 };
 for(const gym of GYMS){let state=createGymPuzzleState(gym.regionId);assert.equal(gymPuzzleSolved(gym.regionId,state),false);for(const action of solutions[gym.regionId])state=applyGymPuzzleAction(gym.regionId,state,action);assert.equal(state.solved,true,gym.regionId);assert.equal(gymPuzzleSolved(gym.regionId,state),true)}
});

test('every nonstarter nonunique base family is obtainable and special encounters stay out of random pools',()=>{
 const bases=catalog.filter(s=>s.chain_position===1&&s.no<145&&!STARTERS.includes(s.no)).map(s=>s.no);
 const entries=REGIONS.flatMap(r=>Object.values(r.encounters).flat());
 const ids=new Set(entries.map(x=>x.id));
 assert.deepEqual(bases.filter(id=>!ids.has(id)),[]);
 assert.equal(entries.some(x=>x.id>=145),false);
 for(const entry of entries){assert.ok(entry.weight>0);assert.ok(entry.minLevel<=entry.maxLevel)}
 const protectedBases=catalog.filter(s=>s.chain_position===1&&s.protected_priority_30&&s.no<145&&!STARTERS.includes(s.no)).map(s=>s.no);
 for(const id of protectedBases){const appearances=entries.filter(e=>e.id===id);assert.ok(appearances.length,`protected base #${id}`);assert.ok(appearances.every(e=>e.weight<=3),`protected rarity #${id}`)}
});

test('rod, surf and boat are separate exploration gates',()=>{
 const j=freshJourney();
 assert.equal(availableEncounterPool('gohyeon','rod',j).length,0);
 j.rod=true;assert.ok(availableEncounterPool('gohyeon','rod',j).length);
 assert.equal(availableEncounterPool('south','surf',j).length,0);
 j.surf=true;assert.ok(availableEncounterPool('south','surf',j).length);
 assert.equal(canTravel('port','island',j),false);j.boat=true;assert.equal(canTravel('port','island',j),false);j.champion=true;assert.equal(canTravel('port','island',j),true);
 assert.deepEqual(Object.keys(ACQUISITIONS),['rod','bike','boat','surf']);
 assert.deepEqual(TRAVEL_LINKS.filter(x=>x.mode==='boat').map(x=>[x.from,x.to]),[['port','island']]);
});

test('weighted encounters respect range and deterministic boundary rolls',()=>{
 const j={rod:true};const rows=availableEncounterPool('gohyeon','rod',j);const first=chooseWeightedEncounter('gohyeon','rod',()=>0,j);assert.equal(first.id,rows[0].id);assert.equal(first.level,rows[0].minLevel);
 const rolls=[.999999,.999999];const last=chooseWeightedEncounter('gohyeon','rod',()=>rolls.shift(),j);assert.equal(last.id,rows.at(-1).id);assert.equal(last.level,rows.at(-1).maxLevel);
});

test('four league members lead to Naru champion and ending state',()=>{
 assert.equal(LEAGUE.length,4);assert.equal(CHAMPION.id,'champion');assert.equal(CHAMPION.name,'나루');assert.ok(CHAMPION.team.length>=6);assert.equal(leagueUnlocked(BADGES),true);
 let journey={league:[]};for(const member of LEAGUE){assert.equal(nextLeagueOpponent(journey).id,member.id);journey.league.push(member.id)}assert.equal(nextLeagueOpponent(journey).id,'champion');journey.league.push('champion');assert.equal(nextLeagueOpponent(journey),null);
});

test('145 through 151 are gated unique encounters and 151 is the completion secret',()=>{
 assert.deepEqual(LEGEND_ENCOUNTERS.map(x=>x.id),[145,146,147,148,149,150,151]);
 const state={badges:[...BADGES],journey:{surf:true,boat:true,champion:true,legendsCaught:[]}};
 for(const id of [145,146,147,148,149,150])assert.equal(canEncounterLegend(id,state),true,`#${id}`);
 assert.equal(canEncounterLegend(151,state),false);
 state.journey.legendsCaught=[145,146,147,148,149,150];assert.equal(canEncounterLegend(151,state),true);
 state.journey.legendsCaught.push(151);assert.equal(canEncounterLegend(151,state),false);
});

test('journey migration adds campaign fields, strips unknown puzzle data and validates enums',()=>{
 const old={region:'gohyeon',visited:['gohyeon'],observed:[],hiddenItems:[],rivals:[],rod:false,bike:false,cycling:false,surf:false,champion:false,playSeconds:7};
 const migrated=cleanJourney(old);assert.deepEqual(migrated.story,[]);assert.deepEqual(migrated.league,[]);assert.deepEqual(migrated.gymPuzzles,{});assert.equal(migrated.boat,false);
 const state=createGymPuzzleState('garden');state.unknown='remove me';migrated.gymPuzzles={garden:state};const cleaned=cleanJourney(migrated);assert.equal(cleaned.gymPuzzles.garden.unknown,undefined);
 migrated.story=['not-real'];assert.throws(()=>cleanJourney(migrated),/이야기/);
});

test('story is original stewardship fiction and factual sources are separate',()=>{
 assert.ok(STORY_BEATS.length>=12);assert.ok(STORY_BEATS.some(x=>x.id==='signal-start'&&x.text.includes('창작')));assert.ok(STORY_BEATS.some(x=>x.speaker==='나루'));
 assert.ok(FACT_SOURCES.length>=3);for(const source of FACT_SOURCES)assert.match(source.url,/^https:\/\//);
});
