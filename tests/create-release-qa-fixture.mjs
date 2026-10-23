import {readFile, writeFile} from 'node:fs/promises';
import {STARTERS, createMonster, freshState, validateSave} from '../dist/model.mjs';
import {GYMS, LEAGUE, STORY_BEATS} from '../dist/campaign.mjs';
import {BADGES} from '../dist/regions.mjs';

const source=new URL('../dist/index.html',import.meta.url);
const marker='<script type="module"';
const shim=prefix=>`<script>
(()=>{
 const real=window.localStorage,prefix=${JSON.stringify(prefix)};
 const get=real.getItem.bind(real),set=real.setItem.bind(real),remove=real.removeItem.bind(real),rawKey=real.key.bind(real);
 const qaKeys=()=>Array.from({length:real.length},(_,index)=>rawKey(index)).filter(key=>key&&key.startsWith(prefix));
 const storage=new Proxy(real,{get(target,property){
  if(property==='getItem')return key=>get(prefix+String(key));
  if(property==='setItem')return (key,value)=>set(prefix+String(key),String(value));
  if(property==='removeItem')return key=>remove(prefix+String(key));
  if(property==='clear')return ()=>qaKeys().forEach(remove);
  if(property==='key')return index=>qaKeys()[Number(index)]?.slice(prefix.length)??null;
  if(property==='length')return qaKeys().length;
  return Reflect.get(target,property,target);
 }});
 Object.defineProperty(window,'localStorage',{configurable:true,value:storage});
})();
</script>`;

const html=await readFile(source,'utf8');
if(!html.includes(marker))throw new Error('index.html module script marker not found');

// These two saves exercise late campaign screens without altering production
// code or a player's real save. The level-100 party is deliberately overlevelled
// so UI-gate verification is deterministic and is not represented as a playthrough.
function overlevelledState(){
 const state=freshState(STARTERS[0],'girl');
 state.party=[3,6,9,117,128,134].map(id=>createMonster(id,100));
 state.seen=state.party.map(mon=>mon.id);state.caught=[...state.seen];
 state.items.balls=99;state.items.potions=99;state.coins=99999;
 return state;
}
const gymSeed=overlevelledState();
gymSeed.journey.region=GYMS[0].regionId;gymSeed.journey.visited.push(GYMS[0].regionId);
gymSeed.journey.story=['signal-start'];gymSeed.journey.rod=true;gymSeed.pos={x:79,y:48};
const leagueSeed=overlevelledState(),specials=[145,146,147,148,149,150];
leagueSeed.badges=[...BADGES];leagueSeed.journey.region='gohyeon';leagueSeed.pos={x:15,y:44};
leagueSeed.journey.visited=[...new Set([...leagueSeed.journey.visited,'gohyeon'])];
leagueSeed.journey.story=STORY_BEATS.filter(beat=>!beat.requiresChampion&&!beat.requiresCaught).map(beat=>beat.id);
Object.assign(leagueSeed.journey,{rod:true,bike:true,boat:true,surf:true,league:LEAGUE.slice(0,-1).map(row=>row.id),legendsSeen:[...specials],legendsCaught:[...specials]});
leagueSeed.legendCaught=[...specials];leagueSeed.seen.push(...specials);leagueSeed.caught.push(...specials);

const validSeeds={gym:validateSave(gymSeed),league:validateSave(leagueSeed)};
function seedScript(seed,name){return `<script>(()=>{if(!localStorage.getItem('geoje.monsters.save.v2'))localStorage.setItem('geoje.monsters.save.v2',${JSON.stringify(JSON.stringify(seed))});if(!localStorage.getItem('geoje.monsters.preferences'))localStorage.setItem('geoje.monsters.preferences','{"sound":false,"sfx":0,"music":0,"fast":true}');if(!localStorage.getItem('geoje.monsters.name'))localStorage.setItem('geoje.monsters.name',${JSON.stringify(name)});})();</script>`}
const fixtures=[
 ['__release-qa.html','__releaseqa:'],
 ['__release-qa-320.html','__releaseqa320:'],
 ['__release-qa-390.html','__releaseqa390:']
];
for(const [name,prefix] of fixtures){
 const output=new URL('../dist/'+name,import.meta.url);
 await writeFile(output,html.replace(marker,shim(prefix)+marker));
 console.log(output.pathname);
}

for(const [name,prefix,seed,playerName] of [
 ['__release-qa-gym.html','__releaseqagym:',validSeeds.gym,'체육관검증'],
 ['__release-qa-league.html','__releaseqaleague:',validSeeds.league,'리그검증']
]){
 const output=new URL('../dist/'+name,import.meta.url);
 await writeFile(output,html.replace(marker,shim(prefix)+seedScript(seed,playerName)+marker));
 console.log(output.pathname);
}

const mobile=new URL('../dist/__release-qa-mobile.html',import.meta.url);
await writeFile(mobile,`<!doctype html><meta charset="utf-8"><title>Release mobile QA</title>
<style>html{background:#0b2230;color:#fff;font:14px system-ui}body{display:flex;gap:24px;align-items:flex-start;margin:16px}figure{margin:0}figcaption{margin-bottom:8px;font-weight:700}iframe{display:block;border:2px solid #9db6c4;background:#102a38}</style>
<figure><figcaption>320 × 568 px</figcaption><iframe title="Release QA 320" width="320" height="568" src="/__release-qa-320.html"></iframe></figure>
<figure><figcaption>390 × 844 px</figcaption><iframe title="Release QA 390" width="390" height="844" src="/__release-qa-390.html"></iframe></figure>`);
console.log(mobile.pathname);
