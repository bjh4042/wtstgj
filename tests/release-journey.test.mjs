import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

import {
 BY_ID, GIFT_IDS, LEGACY_SPECIES, SECRET_ID, SPECIES, STARTERS, UNIQUE_IDS,
 createMonster, freshState, validateSave
} from '../dist/model.mjs';
import {CANONICAL_SPECIES_RECORDS} from '../dist/species-data.mjs';
import {BADGES, REGIONS} from '../dist/regions.mjs';
import {
 CHAMPION, GYMS, LEAGUE, LEGEND_ENCOUNTERS, STORY_BEATS,
 applyGymPuzzleAction, canEncounterLegend, canTravel, createGymPuzzleState,
 gymPuzzleSolved, leagueUnlocked, nextLeagueOpponent, storyBeatAvailable
} from '../dist/campaign.mjs';
import {fieldPointsFor, fieldWalkable} from '../dist/field-world.mjs';
import {buildGridRoute} from '../dist/movement.mjs';

const CANONICAL_JSON_SHA256='b4b57fa948f6ae0659d58ca8960a63937887e734ea9f359dc6dc4ceeb3aef29b';

function puzzleActions(puzzle){
 if(puzzle.kind==='switch'||puzzle.kind==='rotate'||puzzle.kind==='beam')return puzzle.target.map((_,index)=>index);
 if(puzzle.kind==='gate')return puzzle.links.map((_,index)=>index);
 if(puzzle.kind==='maze'||puzzle.kind==='current')return [...new Set(Object.values(puzzle.graph).flatMap(Object.keys))];
 return Object.keys(puzzle.labels);
}

function solvePuzzle(gym){
 const initial=createGymPuzzleState(gym.regionId),queue=[initial],seen=new Set([JSON.stringify(initial)]),actions=puzzleActions(gym.puzzle);
 for(const state of queue){
  if(gymPuzzleSolved(gym.regionId,state))return state;
  for(const action of actions){
   let next;try{next=applyGymPuzzleAction(gym.regionId,state,action)}catch{continue}
   const key=JSON.stringify(next);if(!seen.has(key)){seen.add(key);queue.push(next)}
  }
  assert.ok(queue.length<10000,`${gym.regionId} puzzle search remains finite`);
 }
 throw new Error(`${gym.regionId} puzzle has no solution`);
}

test('release catalog is byte-identical to the approved v2 source and keeps canonical IDs/chains immutable',()=>{
 const bytes=readFileSync(new URL('../dist/data/geoje_species_151_v2.json',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),CANONICAL_JSON_SHA256);
 const source=JSON.parse(bytes).species;
 assert.deepEqual(CANONICAL_SPECIES_RECORDS,source);
 assert.deepEqual(SPECIES.map(s=>s.id),Array.from({length:151},(_,index)=>index+1));
 assert.deepEqual(SPECIES.map(s=>s.name),source.map(s=>s.name));
 for(const row of source){
  const species=BY_ID[row.no];
  assert.equal(species.chainId,row.chain_id,`No.${row.no} chain`);
  assert.equal(species.stage,row.chain_position,`No.${row.no} stage`);
  assert.equal(species.chainLength,row.chain_length,`No.${row.no} length`);
 }
 assert.equal(BY_ID[1].name,'도토람');
 assert.equal(BY_ID['legacy:1'].name,'동비');
 assert.ok(Object.isFrozen(SPECIES)&&Object.isFrozen(CANONICAL_SPECIES_RECORDS));
});

test('v1 migration preserves every owned legacy monster without colliding with canonical IDs',()=>{
 const old=freshState(STARTERS[0],'girl'),party=createMonster('legacy:4',19),boxed=createMonster('legacy:65',31);
 old.version=1;delete old.journey;
 old.party=[{...party,id:4}];old.box=[{...boxed,id:65}];
 old.seen=[4,65];old.caught=[4,65];old.legendCaught=[65];old.badges=['garden'];
 old.items={balls:5,potions:2,forest:1};old.saveCode='GJ-A1B2C3D4';
 const before=structuredClone(old),migrated=validateSave(old);
 assert.deepEqual(old,before,'migration never mutates the v1 input object');
 assert.equal(migrated.version,2);
 assert.deepEqual(migrated.party.map(m=>m.id),['legacy:4']);
 assert.deepEqual(migrated.box.map(m=>m.id),['legacy:65']);
 assert.deepEqual(migrated.seen,['legacy:4','legacy:65']);
 assert.deepEqual(migrated.caught,['legacy:4','legacy:65']);
 assert.deepEqual(migrated.legendCaught,['legacy:65']);
 assert.deepEqual(migrated.badges,['garden']);
 assert.equal(migrated.party[0].uid,party.uid);assert.equal(migrated.party[0].hp,party.hp);assert.deepEqual(migrated.party[0].pp,party.pp);
 assert.equal(migrated.box[0].uid,boxed.uid);assert.equal(migrated.box[0].level,boxed.level);
 assert.equal(migrated.journey.region,'gohyeon');
 for(const key of ['forest','water','sun','wind','tide','mystic'])assert.equal(Number.isInteger(migrated.items[key]),true,`migrated item ${key}`);
});

test('all seven canonical uniques and both legacy uniques reject duplicate ownership',()=>{
 assert.deepEqual(UNIQUE_IDS,[145,146,147,148,149,150,151]);
 for(const id of [...UNIQUE_IDS,'legacy:65','legacy:68']){
  const state=freshState(STARTERS[0],'boy');state.party=[createMonster(id,30)];state.box=[createMonster(id,30)];
  assert.throws(()=>validateSave(state),/고유 몬스터가 중복/,String(id));
 }
 const ordinary=freshState(STARTERS[0],'boy');ordinary.party=[createMonster(1,5),createMonster(1,5)];
 assert.equal(validateSave(ordinary).party.length,2);
});

test('each starter choice plus the two postgame research gifts can reach all 151 species',()=>{
 const encounterIds=new Set(REGIONS.flatMap(region=>Object.values(region.encounters).flat().map(row=>row.id)));
 const specialIds=new Set(LEGEND_ENCOUNTERS.map(row=>row.id)),availableGiftBases=caught=>STARTERS.filter(baseId=>!caught.includes(baseId));
 assert.deepEqual([...specialIds].sort((a,b)=>a-b),UNIQUE_IDS);
 assert.deepEqual([...GIFT_IDS].sort((a,b)=>a-b),[145,146,147]);
 assert.deepEqual(availableGiftBases(['legacy:1']),STARTERS,'legacy saves can research all three new starters');
 for(const id of encounterIds){assert.ok(BY_ID[id],`encounter No.${id}`);assert.equal(BY_ID[id].stage,1,`encounters start a chain at No.${id}`);assert.equal(BY_ID[id].unique,undefined,`unique No.${id} stays out of random pools`)}
 for(const chosen of STARTERS){
  const caught=[chosen],postgameGiftBases=availableGiftBases(caught);
  assert.equal(postgameGiftBases.length,2,`No.${chosen} leaves two research gifts`);
  assert.deepEqual(new Set([chosen,...postgameGiftBases]),new Set(STARTERS));
  const reachable=new Set([chosen,...postgameGiftBases,...encounterIds,...specialIds]);
  for(const id of [...reachable]){let next=BY_ID[id]?.evo;while(next){reachable.add(next);next=BY_ID[next]?.evo}}
  const missing=SPECIES.map(s=>s.id).filter(id=>!reachable.has(id));
  assert.deepEqual(missing,[],`No.${chosen} single-save reachability`);
  assert.equal(reachable.size,151);
 }
});

test('each of eight gyms has a solvable puzzle, distinct trainers, a leader, and round-trippable completion flags',()=>{
 assert.equal(GYMS.length,8);assert.deepEqual(GYMS.map(g=>g.order),[1,2,3,4,5,6,7,8]);assert.deepEqual(GYMS.map(g=>g.badge),BADGES);
 assert.equal(new Set(GYMS.map(g=>g.puzzle.kind)).size,8);
 const aceLevels=GYMS.map(g=>Math.max(...g.leader.team.map(([,level])=>level)));
 assert.ok(aceLevels.every((level,index)=>index===0||level>aceLevels[index-1]),`leader aces rise in level: ${aceLevels.join(' → ')}`);
 const trainerIds=new Set();
 for(const gym of GYMS){
  assert.ok(gym.trainers.length>=2,`${gym.regionId} trainers`);assert.ok(gym.leader?.name&&gym.leader.team.length>=3,`${gym.regionId} leader`);
  for(const trainer of gym.trainers){assert.equal(trainerIds.has(trainer.id),false,`distinct trainer ${trainer.id}`);trainerIds.add(trainer.id);assert.ok(trainer.team.length>=2)}
  for(const [id,level] of [...gym.trainers.flatMap(t=>t.team),...gym.leader.team]){assert.ok(BY_ID[id],`${gym.regionId} team No.${id}`);assert.ok(Number.isInteger(level)&&level>=1&&level<=100)}
  const solved=solvePuzzle(gym);assert.equal(solved.solved,true);assert.equal(gymPuzzleSolved(gym.regionId,solved),true);
  const state=freshState(STARTERS[0],'boy');state.journey.gymPuzzles[gym.regionId]=structuredClone(solved);state.journey.gymTrainers[gym.regionId]=gym.trainers.map(t=>t.id);state.badges=[gym.badge];
  state.journey.gymPuzzles[gym.regionId].unknown='drop me';
  const roundtrip=validateSave(state);
  assert.deepEqual(roundtrip.journey.gymPuzzles[gym.regionId],solved,`${gym.regionId} puzzle persists and strips unknown fields`);
  assert.deepEqual(roundtrip.journey.gymTrainers[gym.regionId],gym.trainers.map(t=>t.id),`${gym.regionId} trainers persist`);
  assert.deepEqual(roundtrip.badges,[gym.badge],`${gym.regionId} leader win persists`);
 }
});

test('league, champion, island travel, six special catches, and secret No.151 unlock in order',()=>{
 assert.equal(leagueUnlocked(BADGES.slice(0,7)),false);assert.equal(leagueUnlocked(BADGES),true);
 for(let completed=0;completed<=LEAGUE.length;completed++)assert.equal(nextLeagueOpponent({league:LEAGUE.slice(0,completed).map(x=>x.id)}).id,completed<LEAGUE.length?LEAGUE[completed].id:CHAMPION.id);
 assert.equal(nextLeagueOpponent({league:[...LEAGUE.map(x=>x.id),CHAMPION.id]}),null);
 assert.equal(canTravel('port','island',{journey:{boat:true,champion:false}}),false);
 assert.equal(canTravel('port','island',{journey:{boat:true,champion:true}}),true);
 const before={journey:{champion:false,boat:true,surf:true,legendsCaught:[]},badges:BADGES};
 for(const id of [148,149,150,151])assert.equal(canEncounterLegend(id,before),false,`No.${id} stays locked before champion`);
 const champion={journey:{champion:true,boat:true,surf:true,legendsCaught:[]},badges:BADGES};
 for(const id of [145,146,147,148,149,150])assert.equal(canEncounterLegend(id,champion),true,`No.${id} unlocks`);
 assert.equal(canEncounterLegend(SECRET_ID,champion),false);
 const six=[145,146,147,148,149,150],postgame={journey:{champion:true,boat:true,surf:true,legendsCaught:six},badges:BADGES};
 assert.equal(canEncounterLegend(SECRET_ID,postgame),true);
 const secretBeat=STORY_BEATS.find(beat=>beat.requiresCaught?.includes(150));
 assert.equal(storyBeatAvailable(secretBeat,postgame.journey,BADGES),true);
 assert.equal(canEncounterLegend(145,{...postgame,legendCaught:[145]}),false,'caught uniques never reappear');
});

test('every regional field landmark remains reachable from the saved start coordinate',()=>{
 for(const region of REGIONS){
  const canWalk=(x,y)=>fieldWalkable(region,null,x,y),points=fieldPointsFor(region);
  for(const [name,point] of Object.entries(points))assert.ok(buildGridRoute({x:49.5,y:44},point,canWalk),`${region.id} ${name} is reachable`);
 }
});

test('legacy roster remains an isolated compatibility namespace',()=>{
 assert.equal(LEGACY_SPECIES.length,18);
 assert.equal(new Set(LEGACY_SPECIES.map(s=>s.id)).size,18);
 assert.ok(LEGACY_SPECIES.every(s=>String(s.id).startsWith('legacy:')));
 assert.ok(SPECIES.every(s=>Number.isInteger(s.id)));
});
