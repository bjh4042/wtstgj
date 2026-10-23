import test from 'node:test';
import assert from 'node:assert/strict';
import {CANONICAL_SPECIES_RECORDS,SPECIES_SOURCE_META} from '../dist/species-data.mjs';
import {SAVE_VERSION,MAX_BOX,MAX_COLLECTION,SPECIES,LEGACY_SPECIES,BY_ID,MOVES,STARTERS,STARTER_IDS,STARTER_FAMILIES,STARTER_FAMILY_IDS,STONES,UNIQUE_IDS,PROTECTED_IDS,LEGEND_IDS,SECRET_ID,HABITAT_POOLS,TYPE_CHART,typeFactor,freshState,validateSave,migrateV1Save,createMonster,stats,xpNeeded,addExperience,evolutionTarget,evolve,calculateDamage,captureChance,healParty} from '../dist/model.mjs';
import {REGIONS,freshJourney,cleanJourney} from '../dist/regions.mjs';
import {availableEncounterPool,chooseWeightedEncounter} from '../dist/campaign.mjs';

test('canonical catalog preserves all 151 immutable numbers, names, and 58 chains',()=>{
 assert.equal(SAVE_VERSION,2);assert.equal(SPECIES.length,151);assert.equal(SPECIES_SOURCE_META.chainCount,58);
 assert.deepEqual(SPECIES.map(s=>s.id),Array.from({length:151},(_,i)=>i+1));
 assert.deepEqual(SPECIES.map(s=>s.name),CANONICAL_SPECIES_RECORDS.map(s=>s.name));
 const chains=Map.groupBy(SPECIES,s=>s.chainId);assert.equal(chains.size,58);
 assert.deepEqual([...chains.values()].map(c=>c.length).reduce((a,n)=>(a[n]=(a[n]||0)+1,a),{}),{1:7,2:9,3:42});
 for(const chain of chains.values())for(let i=0;i<chain.length;i++){assert.equal(chain[i].stage,i+1);assert.equal(chain[i].chainLength,chain.length);assert.equal(chain[i].evo,chain[i+1]?.id)}
});

test('all canonical species have complete fictional gameplay metadata',()=>{
 assert.equal(new Set(SPECIES.map(s=>s.id)).size,151);
 for(const s of SPECIES){assert.equal(s.stats.length,6);assert.ok(s.stats.every(Number.isFinite));assert.equal(s.moves.length,4);assert.ok(s.moves.every(m=>MOVES[m]));assert.ok(s.types.length>=1);assert.ok(s.habitats.length>=1);assert.match(s.fact,new RegExp(s.real));assert.match(s.fact,/창작|판타지/)}
 assert.deepEqual(STARTERS,[139,67,70]);assert.equal(STARTER_IDS,STARTERS);
 assert.deepEqual(STARTER_FAMILIES.map(row=>[row.id,row.type,row.members]),[[139,'풀',[139,140]],[67,'물',[67,68,69]],[70,'불',[70,71,72]]]);
 assert.deepEqual(STARTER_FAMILY_IDS,[139,140,67,68,69,70,71,72]);
 assert.deepEqual(STARTERS.map(id=>BY_ID[id].name),['송이싹','수달콩','삵콩']);
 assert.deepEqual(STARTERS.map(id=>BY_ID[id].types[0]),['풀','물','불']);
 for(const row of STARTER_FAMILIES){const chain=row.members.map(id=>BY_ID[id]);assert.deepEqual(chain.map(s=>s.stage),row.members.map((_,i)=>i+1));assert.ok(chain.every(s=>s.protectedPriority&&s.rarity==='스타팅'));assert.ok(chain.at(-1).stats.reduce((a,b)=>a+b)>chain[0].stats.reduce((a,b)=>a+b))}
 for(const id of PROTECTED_IDS)assert.ok(BY_ID[id].stats.reduce((a,b)=>a+b)>535);
 for(const id of LEGEND_IDS)assert.ok(BY_ID[id].stats.reduce((a,b)=>a+b)>=590);
});

test('all 58 families are obtainable from a base encounter or explicit unique route',()=>{
 const encounterIds=new Set(Object.values(HABITAT_POOLS).flat()),explicit=new Set([...STARTERS,...PROTECTED_IDS,...LEGEND_IDS,SECRET_ID]);
 for(const chain of Map.groupBy(SPECIES,s=>s.chainId).values()){const base=chain[0];assert.ok(encounterIds.has(base.id)||explicit.has(base.id),`unreachable family ${base.chainId}`);for(let i=0;i<chain.length-1;i++)assert.equal(chain[i].evo,chain[i+1].id)}
 assert.deepEqual(UNIQUE_IDS,[145,146,147,148,149,150,151]);
 assert.deepEqual(HABITAT_POOLS.special,UNIQUE_IDS);
 assert.deepEqual(new Set(SPECIES.filter(s=>s.stone).map(s=>s.stone)),new Set(Object.keys(STONES)));
});

test('starter triangle is 풀 over 물 over 불 over 풀 with compatible move slots',()=>{
 assert.equal(TYPE_CHART.풀.물,1.5);assert.equal(TYPE_CHART.물.불,1.5);assert.equal(TYPE_CHART.불.풀,1.5);
 assert.equal(typeFactor('풀',BY_ID[67].types),1.5);assert.equal(typeFactor('물',BY_ID[70].types),1.5);assert.equal(typeFactor('불',BY_ID[139].types),1.5);
 assert.equal(typeFactor('물',BY_ID[139].types),.67);assert.equal(typeFactor('불',BY_ID[67].types),.67);assert.equal(typeFactor('풀',BY_ID[70].types),.67);
 assert.equal(MOVES.leaf.type,'풀');assert.equal(MOVES.fire.type,'불');assert.deepEqual(BY_ID[139].moves,['leaf','heal','forest','poison']);assert.deepEqual(BY_ID[70].moves,['bite','tackle','fire','poison']);
});

test('all three starter families stay out of habitat, region, and weighted encounters',()=>{
 const blocked=new Set(STARTER_FAMILY_IDS),allRegionIds=[];
 for(const ids of Object.values(HABITAT_POOLS))for(const id of ids)assert.equal(blocked.has(id),false,`habitat No.${id}`);
 for(const region of REGIONS){
  for(const id of region.pool){assert.equal(blocked.has(id),false,`${region.id} fallback No.${id}`);allRegionIds.push(id)}
  for(const method of ['land','rod','surf']){
   const rows=availableEncounterPool(region.id,method,{rod:true,surf:true});
   for(const row of rows){assert.equal(blocked.has(row.id),false,`${region.id}/${method} No.${row.id}`);allRegionIds.push(row.id)}
   if(rows.length){for(const roll of [0,.999999]){const rng=()=>roll,picked=chooseWeightedEncounter(region.id,method,rng,{rod:true,surf:true});assert.ok(picked);assert.equal(blocked.has(picked.id),false,`${region.id}/${method} boundary ${roll}`)}}
  }
 }
 assert.ok(allRegionIds.length>0);
});

test('male and female starts roundtrip with a 300-place box schema',()=>{
 assert.equal(MAX_BOX,300);assert.equal(MAX_COLLECTION,169);
 for(const gender of ['boy','girl']){const state=freshState(STARTERS[0],gender);state.name='must not export';const clean=validateSave(state);assert.equal(clean.name,undefined);assert.equal(clean.party.length,1);assert.equal(clean.gender,gender);assert.deepEqual(Object.keys(STONES).sort(),Object.keys(clean.items).filter(k=>k!=='balls'&&k!=='potions').sort())}
});

test('canonical level and stone evolutions preserve growth and refill move PP',()=>{
 const levelMon=createMonster(1,15);assert.equal(evolutionTarget(levelMon),null);addExperience(levelMon,xpNeeded(15));assert.equal(levelMon.level,16);assert.equal(evolutionTarget(levelMon),2);const hp=levelMon.hp;evolve(levelMon,2);assert.ok(levelMon.hp>=hp);levelMon.level=36;assert.equal(evolutionTarget(levelMon),3);evolve(levelMon,3);assert.equal(evolutionTarget(levelMon),null);
 const stoneMon=createMonster(124,16);assert.equal(evolutionTarget(stoneMon),125);evolve(stoneMon,125);assert.equal(evolutionTarget(stoneMon),null);assert.equal(evolutionTarget(stoneMon,'water'),null);assert.equal(evolutionTarget(stoneMon,'forest'),126);evolve(stoneMon,126);assert.equal(evolutionTarget(stoneMon,'forest'),null);assert.deepEqual(stoneMon.pp,BY_ID[126].moves.map(k=>MOVES[k].pp));
});

test('experience pace requires a full level budget and settles at level 100',()=>{
 const m=createMonster(4,15);addExperience(m,xpNeeded(15)-1);assert.equal(m.level,15);addExperience(m,1);assert.equal(m.level,16);
 const max=createMonster(4,99);addExperience(max,1000000);assert.equal(max.level,100);assert.equal(max.xp,0);
});

test('v1 migration namespaces every old identifier and preserves monster values',()=>{
 const a=createMonster('legacy:1',22),b=createMonster('legacy:32',35),c=createMonster('legacy:68',50);
 Object.assign(a,{id:1,xp:1999,hp:7,status:'slow'});Object.assign(b,{id:32,xp:733,hp:11,status:'poison'});Object.assign(c,{id:68,xp:0,hp:1});
 const v1={...freshState(STARTERS[0],'girl'),version:1,party:[a],box:[b,c],seen:[1,32,68],caught:[1,32,68],legendCaught:[68],items:{balls:8,potions:3,forest:2}};
 const migrated=migrateV1Save(v1);assert.equal(migrated.version,2);assert.deepEqual(migrated.party.map(m=>m.id),['legacy:1']);assert.deepEqual(migrated.box.map(m=>m.id),['legacy:32','legacy:68']);
 const clean=validateSave(v1);assert.deepEqual(clean.party[0],{uid:a.uid,id:'legacy:1',level:22,xp:1999,hp:7,pp:a.pp,status:'slow'});assert.deepEqual(clean.seen,['legacy:1','legacy:32','legacy:68']);assert.deepEqual(clean.legendCaught,['legacy:68']);assert.equal(clean.items.forest,2);assert.equal(clean.items.water,0);
 assert.deepEqual(BY_ID['legacy:1'].stats,[45,40,45,65,55,50]);assert.deepEqual(BY_ID['legacy:1'].moves,['peck','petal','heal','gust']);assert.equal(BY_ID['legacy:1'].evo,'legacy:2');
});

test('migrated legacy evolution remains playable without colliding with canonical IDs',()=>{
 assert.equal(LEGACY_SPECIES.length,18);assert.equal(BY_ID[1].name,'도토람');assert.equal(BY_ID['legacy:1'].name,'동비');
 const m=createMonster('legacy:1',16);assert.equal(evolutionTarget(m),'legacy:2');evolve(m,'legacy:2');assert.equal(m.id,'legacy:2');assert.deepEqual(m.pp,[25,20,5,15]);
});

test('capture, damage, and healing continue to use each species profile',()=>{
 const normal=createMonster(22,8),full=captureChance(normal);normal.hp=1;assert.ok(captureChance(normal)>full);const legend=createMonster(148,20);assert.ok(captureChance(legend)<full);assert.ok(captureChance(normal)<=.92);
 const attacker=createMonster(1,10),defender=createMonster(4,10),hit=calculateDamage(attacker,defender,'petal',()=>.5);assert.ok(hit.damage>0);assert.equal(hit.factor,1.5);assert.ok(calculateDamage(attacker,defender,'petal',()=>.5,3).damage<hit.damage);
 const state=freshState(STARTERS[1],'boy');state.party[0].hp=0;state.party[0].pp.fill(0);state.party[0].status='poison';healParty(state);assert.equal(state.party[0].hp,stats(state.party[0])[0]);assert.equal(state.party[0].status,null);assert.ok(state.party[0].pp.every(v=>v>0));
});

test('save validation accepts mixed 169-species collections and rejects corrupt data',()=>{
 const state=freshState(STARTERS[2],'girl');state.seen=[...SPECIES.map(s=>s.id),...LEGACY_SPECIES.map(s=>s.id)];state.caught=[...state.seen];assert.equal(validateSave(state).seen.length,169);
 const variants=[v=>v.party[0].hp=-1,v=>v.party[0].id=999,v=>v.items.balls=-1,v=>v.items.sun=Infinity,v=>v.party[0].pp=[1],v=>v.party[0].level=101,v=>v.pos.x=NaN,v=>v.party.push({...v.party[0]})];for(const mutate of variants){const value=structuredClone(state);mutate(value);assert.throws(()=>validateSave(value))}
});

test('canonical and legacy unique monsters are limited to one owned instance',()=>{
 for(const id of [145,148,151,'legacy:65','legacy:68']){const state=freshState(STARTERS[0],'boy');state.party.push(createMonster(id,20));state.box.push(createMonster(id,20));assert.throws(()=>validateSave(state),/고유 몬스터/)}
});

test('old saves keep former starters and pre-change starter-family HP and PP values',()=>{
 const old=freshState(STARTERS[0],'boy');old.journey.opening='complete';old.party=[createMonster(1,28),createMonster(4,28),createMonster(7,28)];old.box=[createMonster(115,28),createMonster(67,28),createMonster(70,28)];
 old.seen=[1,4,7,115,67,70];old.caught=[...old.seen];
 old.box[0].pp=[25,20,15,5];old.box[1].pp=[25,20,10,15];old.box[2].pp=[20,25,15,15];
 const clean=validateSave(old);assert.deepEqual(clean.party.map(m=>m.id),[1,4,7]);assert.deepEqual(clean.box.map(m=>m.id),[115,67,70]);assert.deepEqual(clean.box.map(m=>m.pp),[[25,20,15,5],[25,20,10,15],[20,25,15,15]]);
 assert.throws(()=>freshState(1,'boy'),/첫 파트너/);
});

test('opening migration resumes only new games at the first battle',()=>{
 assert.equal(freshJourney().opening,'first-battle');assert.equal(freshState(STARTERS[0],'girl').journey.opening,'first-battle');assert.equal(cleanJourney({region:'gohyeon',visited:['gohyeon'],observed:[],hiddenItems:[],rivals:[],playSeconds:0}).opening,'complete');assert.throws(()=>cleanJourney({...freshJourney(),opening:'unknown'}),/인트로/);
});
