import {readFile,writeFile} from 'node:fs/promises';
import {STARTERS,freshState} from '../dist/model.mjs';

const source=new URL('../dist/index.html',import.meta.url);
const marker='<script type="module"';
const html=await readFile(source,'utf8');
if(!html.includes(marker))throw new Error('index.html module script marker not found');
const appSource=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
const introCss=await readFile(new URL('../dist/intro.css',import.meta.url),'utf8');

function mediaContents(sourceText,query){
 const start=sourceText.indexOf(query);if(start<0)throw new Error(`${query} not found`);
 const open=sourceText.indexOf('{',start);let depth=0;
 for(let index=open;index<sourceText.length;index++){
  if(sourceText[index]==='{')depth++;
  else if(sourceText[index]==='}'&&!--depth)return sourceText.slice(open+1,index);
 }
 throw new Error(`${query} is not balanced`);
}
const forceCoarse=`<style data-qa-force-coarse>${mediaContents(introCss,'@media(pointer:coarse)').replace(/\.opening-textbox\{[^}]*\}/g,'')}</style>`;

function storageShim(prefix,seed,name,fast=true){
 const entries={
  'geoje.monsters.preferences':JSON.stringify({sound:false,sfx:0,music:0,fast}),
  ...(seed?{'geoje.monsters.save.v2':JSON.stringify(seed)}:{}),
  ...(name?{'geoje.monsters.name':name}:{})
 };
 return `<script>
(()=>{
 const real=window.localStorage,prefix=${JSON.stringify(prefix)},initial=${JSON.stringify(entries)};
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
 for(const [key,value] of Object.entries(initial))if(storage.getItem(key)===null)storage.setItem(key,value);
})();
</script>`;
}

function writeFixture(filename,prefix,seed=null,name='',extra=''){
 return writeFile(new URL('../dist/'+filename,import.meta.url),html.replace(marker,storageShim(prefix,seed,name)+extra+marker));
}

async function writeStage(name,startup,{width='',coarse=false,fast=true}={}){
 const appName=`__intro-qa-app-${name}.js`,htmlName=`__intro-${name}${width?'-'+width:''}.html`;
 const staged=appSource.replace(/titleScreen\(\);\s*$/,startup);
 if(staged===appSource)throw new Error('app startup marker not found');
 await writeFile(new URL('../dist/'+appName,import.meta.url),staged);
 const stageHtml=html.replace(/src="app\.js\?v=\d+"/,`src="${appName}"`);
 const fixedWidth=width?`<style data-qa-fixed-width>dialog.opening-screen[open],dialog.classic-bag[open]{width:${width}px!important;max-width:${width}px!important}</style>`:'';
 await writeFile(new URL('../dist/'+htmlName,import.meta.url),stageHtml.replace(marker,storageShim(`__v11introstage${name}${width}:`,null,'',fast)+(coarse?forceCoarse:'')+fixedWidth+marker));
 return htmlName;
}

const pending=freshState(STARTERS[0],'girl');
pending.journey.opening='first-battle';
const complete=freshState(STARTERS[1],'boy');
complete.journey.opening='complete';
const legacyComplete=freshState(STARTERS[2],'girl');
delete legacyComplete.journey.opening;

await Promise.all([
 writeFixture('__intro-qa.html','__v11introqa:'),
 writeFixture('__intro-room-resume.html','__v11introstageroom-v1:'),
 writeFixture('__intro-qa-320.html','__v11introqa320:'),
 writeFixture('__intro-qa-390.html','__v11introqa390:'),
 writeFixture('__intro-pending.html','__intropending:',pending,'재개검증'),
 writeFixture('__intro-complete.html','__introcomplete:',complete,'완료검증'),
 writeFixture('__intro-legacy-complete.html','__introlegacy:',legacyComplete,'기존검증')
]);

await Promise.all([
 writeStage('lab','gender="girl";openingWorld=createIntroWorld("lab",gender);renderOpeningWorld();'),
 writeStage('avatar','gender="girl";setupAvatar();',{width:'320',coarse:true}),
 writeStage('starter','chosen=STARTER_IDS[0];setupStarter();',{width:'390',coarse:true}),
 writeStage('lab-mobile','gender="girl";openingWorld=createIntroWorld("lab",gender);renderOpeningWorld("모바일 조작 안내");',{width:'320',coarse:true})
 ,writeStage('researcher-v1','researcherIntro(0);')
 ,writeStage('name-v1','gender="girl";playerName="";setupName();',{width:'390',coarse:true})
 ,writeStage('name-small-v1','gender="boy";playerName="";setupName();',{width:'320',coarse:true})
 ,writeStage('room-v1','gender="boy";openingWorld=createIntroWorld("room",gender);renderOpeningWorld();')
 ,writeStage('room-motion','gender="boy";openingWorld=createIntroWorld("room",gender);renderOpeningWorld();',{fast:false})
 ,writeStage('bag-v1','state=freshState(139,"boy");state.journey.opening="complete";bag();')
 ,writeStage('bag-small-v1','state=freshState(139,"boy");state.journey.opening="complete";bag();',{width:'320',coarse:true})
 ,writeStage('field-v1','state=freshState(67,"girl");state.journey.opening="complete";clearOpeningInput();')
 ,writeStage('battle-v1','state=freshState(139,"boy");state.journey.opening="complete";beginBattle(createMonster(10,5),"wild");')
 ,writeStage('battle-motion-v12','state=freshState(139,"boy");state.journey.opening="complete";beginBattle(createMonster(70,5),"rival",[],{opening:true});',{fast:false})
 ,writeStage('home-v12','openingWorld=createIntroWorld("home","boy");renderOpeningWorld();',{fast:false})
 ,writeStage('town-v12','openingWorld=createIntroWorld("town","boy");renderOpeningWorld();',{fast:false})
 ,writeStage('water-v12','state=freshState(67,"boy");state.journey.opening="complete";beginBattle(createMonster(70,5),"wild",[],{environment:"coast"});',{fast:false})
 ,writeStage('grown-v12','state=freshState(70,"boy");state.party=[createMonster(72,36)];state.journey.opening="complete";beginBattle(createMonster(10,36),"wild",[],{environment:"boat"});',{fast:false})
 ,writeStage('rollback-v12','state=freshState(139,"boy");state.journey.opening="complete";beginBattle(createMonster(10,5),"wild");const realRender=renderBattle;let fault=true;renderBattle=()=>{if(battle?.busy&&fault){fault=false;throw Error("QA injected rendering failure")}realRender()};',{fast:false})
 ,writeStage('battle-mobile-v12','state=freshState(70,"boy");state.journey.opening="complete";beginBattle(createMonster(139,5),"wild",[],{environment:"grass"});',{width:'390',coarse:true,fast:false})

]);

await writeFile(new URL('../dist/__intro-qa-mobile.html',import.meta.url),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Intro mobile QA</title>
<style>html{background:#0b2230;color:#fff;font:14px system-ui}body{display:flex;gap:24px;align-items:flex-start;margin:16px;min-width:max-content}figure{margin:0}figcaption{margin-bottom:8px;font-weight:700}iframe{display:block;border:2px solid #9db6c4;background:#102a38}</style>
<figure><figcaption>320 × 568 px · avatar</figcaption><iframe title="Intro QA avatar 320" width="320" height="568" src="/__intro-avatar-320.html"></iframe></figure>
<figure><figcaption>390 × 844 px · starters</figcaption><iframe title="Intro QA starters 390" width="390" height="844" src="/__intro-starter-390.html"></iframe></figure></html>`);

await writeFile(new URL('../dist/__v1-mobile.html',import.meta.url),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>1.0 mobile QA</title>
<style>html{background:#0b2230;color:white;font:14px system-ui}body{display:flex;gap:24px;margin:16px;width:max-content}figure{margin:0}iframe{display:block;border:2px solid #9db6c4}figcaption{margin-bottom:8px}</style>
<figure><figcaption>320 × 568 · 이름 입력</figcaption><iframe title="V1 이름 320" width="320" height="568" src="/__intro-name-small-v1-320.html"></iframe></figure>
<figure><figcaption>320 × 568 · 가방</figcaption><iframe title="V1 가방 320" width="320" height="568" src="/__intro-bag-small-v1-320.html"></iframe></figure>
<figure><figcaption>390 × 568 · 이름 입력</figcaption><iframe title="V1 이름 390" width="390" height="568" src="/__intro-name-v1-390.html"></iframe></figure></html>`);

console.log('intro release QA fixtures created');
