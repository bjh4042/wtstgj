import {BADGES, freshJourney, cleanJourney} from './regions.mjs';
import {CANONICAL_SPECIES_RECORDS, SPECIES_SOURCE_META} from './species-data.mjs';
import {STARTER_IDS as CONFIGURED_STARTER_IDS,STARTER_FAMILIES,STARTER_FAMILY_IDS,isStarterFamilyId} from './starter-config.mjs';

// All types, powers, evolutions, habitats and encounter pools below are fictional game data.
export const SAVE_VERSION=2;
export const MAX_BOX=300;
export const MAX_COLLECTION=169;
export const STARTERS=CONFIGURED_STARTER_IDS;
export const STARTER_IDS=STARTERS;
export {STARTER_FAMILIES,STARTER_FAMILY_IDS,isStarterFamilyId};
export const PROTECTED_IDS=Object.freeze([145,146,147]);
export const LEGEND_IDS=Object.freeze([148,149,150]);
export const SECRET_ID=151;
export const UNIQUE_IDS=Object.freeze([...PROTECTED_IDS,...LEGEND_IDS,SECRET_ID]);
export const STONES=Object.freeze({
 forest:Object.freeze({key:'forest',name:'숲결정'}),water:Object.freeze({key:'water',name:'물결결정'}),sun:Object.freeze({key:'sun',name:'햇빛결정'}),wind:Object.freeze({key:'wind',name:'바람결정'}),tide:Object.freeze({key:'tide',name:'해류결정'}),mystic:Object.freeze({key:'mystic',name:'신비결정'})
});

function randomId(){const c=globalThis.crypto;if(c?.randomUUID)return c.randomUUID();if(c?.getRandomValues){const h=[...c.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`}return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`}

export const MOVES=Object.freeze({
 peck:Object.freeze({name:'쪼기',type:'바람',kind:'physical',power:35,accuracy:100,pp:25}),petal:Object.freeze({name:'꽃잎탄',type:'꽃',kind:'special',power:45,accuracy:100,pp:20}),heal:Object.freeze({name:'꽃의 숨결',type:'꽃',kind:'heal',power:0,accuracy:100,pp:5}),gust:Object.freeze({name:'꽃바람',type:'바람',kind:'special',power:65,accuracy:95,pp:15}),
 leaf:Object.freeze({name:'잎새탄',type:'풀',kind:'special',power:45,accuracy:100,pp:20}),fire:Object.freeze({name:'불꽃탄',type:'불',kind:'special',power:60,accuracy:100,pp:15}),
 tackle:Object.freeze({name:'몸통박치기',type:'땅',kind:'physical',power:35,accuracy:100,pp:25}),water:Object.freeze({name:'물방울탄',type:'물',kind:'special',power:45,accuracy:100,pp:20}),mud:Object.freeze({name:'갯벌치기',type:'땅',kind:'physical',power:55,accuracy:95,pp:15,effect:'slow'}),wave:Object.freeze({name:'파도돌진',type:'물',kind:'physical',power:75,accuracy:90,pp:10}),
 shell:Object.freeze({name:'껍질치기',type:'바위',kind:'physical',power:45,accuracy:100,pp:20}),guard:Object.freeze({name:'단단한 갑주',type:'바위',kind:'guard',power:0,accuracy:100,pp:10}),crush:Object.freeze({name:'해각분쇄',type:'바위',kind:'physical',power:70,accuracy:95,pp:10}),tide:Object.freeze({name:'해류파',type:'바다',kind:'special',power:55,accuracy:100,pp:15}),
 wing:Object.freeze({name:'날개베기',type:'바람',kind:'physical',power:60,accuracy:100,pp:20}),bite:Object.freeze({name:'물어뜯기',type:'그림자',kind:'physical',power:50,accuracy:100,pp:20}),forest:Object.freeze({name:'숲의 파동',type:'숲',kind:'special',power:60,accuracy:100,pp:15}),poison:Object.freeze({name:'독안개',type:'독',kind:'special',power:30,accuracy:90,pp:15,effect:'poison'}),mystic:Object.freeze({name:'별빛나선',type:'신비',kind:'special',power:90,accuracy:95,pp:10}),coral:Object.freeze({name:'심해공명',type:'바다',kind:'special',power:95,accuracy:95,pp:10}),struggle:Object.freeze({name:'마지막 힘',type:'땅',kind:'physical',power:30,accuracy:100,pp:999})
});

const profile=(types,stats,moves,habitats,sprite)=>Object.freeze({types:Object.freeze(types),stats:Object.freeze(stats),moves:Object.freeze(moves),habitats:Object.freeze(habitats),sprite});
export const FAMILY_PROFILES=Object.freeze({
 starterFlora:profile(['꽃','숲'],[48,45,45,62,58,52],['tackle','petal','forest','heal'],['forest','town'],0),
 starterWater:profile(['물','땅'],[55,55,50,55,50,45],['tackle','water','mud','wave'],['wetland','coast'],1),
 starterRock:profile(['바위','숲'],[58,58,65,38,55,36],['tackle','shell','guard','crush'],['forest','town'],2),
 protectedGrassStarter:profile(['풀','숲'],[50,45,50,60,55,45],['leaf','heal','forest','poison'],['forest','town'],0),
 protectedWaterStarter:profile(['물','바다'],[50,55,45,60,50,55],['tackle','water','wave','tide'],['coast','wetland'],7),
 protectedFireStarter:profile(['불','그림자'],[52,68,45,42,48,65],['bite','tackle','fire','poison'],['forest'],9),
 flyingInsect:profile(['숲','바람'],[42,48,38,55,42,75],['tackle','forest','wing','gust'],['forest','wetland'],3),
 flowerBird:profile(['바람','꽃'],[43,46,39,57,48,67],['peck','petal','gust','heal'],['forest','town'],4),
 shoreBird:profile(['바람','바다'],[46,54,42,52,44,67],['peck','water','wing','tide'],['coast','sky'],5),
 raptor:profile(['바람','그림자'],[48,66,43,40,43,70],['peck','wing','bite','gust'],['sky','forest'],6),
 mysticBird:profile(['바람','신비'],[44,55,42,58,51,65],['peck','wing','gust','mystic'],['sky','wetland'],6),
 aquatic:profile(['물','바다'],[50,55,45,60,50,55],['tackle','water','wave','tide'],['coast','wetland'],7),
 swiftFish:profile(['물','바다'],[44,55,40,54,42,80],['tackle','water','wave','tide'],['coast'],7),
 crustacean:profile(['바위','바다'],[55,65,70,40,50,35],['shell','crush','water','guard'],['coast','wetland'],8),
 cleverSea:profile(['물','그림자'],[52,55,48,68,57,50],['water','bite','tide','poison'],['coast'],7),
 shell:profile(['바위','물'],[58,58,72,42,58,30],['shell','guard','water','crush'],['coast','wetland'],8),
 forestMammal:profile(['숲','땅'],[55,62,50,42,50,56],['tackle','bite','forest','mud'],['forest','town'],9),
 heavyForest:profile(['땅','바위'],[65,72,65,35,45,28],['tackle','mud','shell','crush'],['forest'],9),
 shadowHunter:profile(['그림자','숲'],[52,68,45,42,48,65],['bite','tackle','forest','poison'],['forest'],9),
 amphibian:profile(['물','숲'],[52,45,48,62,55,48],['water','mud','forest','poison'],['wetland','forest'],8),
 flora:profile(['꽃','숲'],[50,40,52,68,65,35],['petal','heal','forest','poison'],['forest','town'],0),
 seaMystic:profile(['바다','신비'],[50,46,50,70,62,42],['water','tide','mystic','guard'],['coast'],7),
 shellMystic:profile(['바위','신비'],[58,45,72,62,67,28],['shell','guard','poison','mystic'],['forest','coast'],8),
 coralMystic:profile(['바다','신비'],[58,42,72,74,70,25],['coral','guard','tide','mystic'],['coast'],8),
 protectedFlora:profile(['꽃','신비'],[90,70,85,120,115,85],['petal','heal','forest','mystic'],['special'],0),
 protectedCoral:profile(['바다','신비'],[90,70,115,120,115,60],['coral','guard','tide','mystic'],['special'],8),
 seaLegend:profile(['바다','신비'],[95,90,90,115,105,95],['wave','coral','tide','mystic'],['special'],7),
 forestLegend:profile(['숲','신비'],[100,95,105,105,110,75],['forest','heal','poison','mystic'],['special'],0),
 windLegend:profile(['바람','신비'],[90,105,85,105,90,125],['peck','wing','gust','mystic'],['special'],6),
 islandLegend:profile(['신비','바다'],[105,105,105,105,105,95],['mystic','coral','forest','heal'],['special'],9)
});

const PROFILE_BY_CHAIN=Object.freeze({1:'starterFlora',2:'starterWater',3:'starterRock',4:'flowerBird',5:'flyingInsect',6:'flyingInsect',7:'crustacean',8:'shoreBird',9:'swiftFish',10:'swiftFish',11:'aquatic',12:'cleverSea',13:'swiftFish',14:'forestMammal',15:'heavyForest',16:'amphibian',17:'flora',18:'seaMystic',19:'shell',20:'shell',21:'aquatic',22:'shoreBird',23:'protectedWaterStarter',24:'protectedFireStarter',25:'amphibian',26:'raptor',27:'raptor',28:'raptor',29:'shoreBird',30:'raptor',31:'raptor',32:'raptor',33:'raptor',34:'raptor',35:'mysticBird',36:'mysticBird',37:'raptor',38:'mysticBird',39:'flowerBird',40:'flowerBird',41:'shoreBird',42:'amphibian',43:'raptor',44:'starterRock',45:'crustacean',46:'shellMystic',47:'shell',48:'flora',49:'protectedGrassStarter',50:'flora',51:'aquatic',52:'protectedFlora',53:'protectedCoral',54:'protectedFlora',55:'seaLegend',56:'forestLegend',57:'windLegend',58:'islandLegend'});
const STONE_BY_CHAIN=Object.freeze({17:'sun',18:'water',38:'wind',42:'forest',46:'mystic',47:'tide',48:'sun',50:'water',51:'tide'});
const TRIPLE_GROWTH=Object.freeze({1:[0,0,0,0,0,0],2:[12,15,12,17,14,15],3:[32,40,32,45,38,38]});
const DOUBLE_GROWTH=Object.freeze({1:[10,10,10,10,10,10],2:[35,40,35,40,35,35]});
const addStats=(a,b)=>Object.freeze(a.map((n,i)=>n+b[i]));
const rarityFor=r=>isStarterFamilyId(r.no)?'스타팅':r.category==='일반'?'일반':r.category==='전설'?'전설':r.category==='비밀종'?'환상':r.category==='특별 보호종'?'특별':'희귀';
const stageTypes=(types,position)=>Object.freeze(position===1?[types[0]]:[...types]);
const evolutionLevel=r=>r.no===139?24:r.chain_length===3?(r.chain_position===1?16:36):32+(r.chain_id%4)*2;
const canonicalEntry=r=>{const p=FAMILY_PROFILES[PROFILE_BY_CHAIN[r.chain_id]],growth=r.chain_length===3?TRIPLE_GROWTH[r.chain_position]:r.chain_length===2?DOUBLE_GROWTH[r.chain_position]:[0,0,0,0,0,0],next=r.chain_position<r.chain_length?r.no+1:undefined,stone=next&&r.chain_position===r.chain_length-1?STONE_BY_CHAIN[r.chain_id]:undefined;return Object.freeze({id:r.no,dexNo:r.dex_no,name:r.name,types:stageTypes(p.types,r.chain_position),sprite:p.sprite,stats:addStats(p.stats,growth),moves:p.moves,real:r.motif,fact:`${r.name}은(는) ${r.motif} 모티프를 ${r.evolution_stage} 모습으로 풀어낸 창작 생태몬이에요. 기술과 진화는 판타지 설정이에요.`,rarity:rarityFor(r),category:r.category,habitats:p.habitats,chainId:r.chain_id,chainLength:r.chain_length,stage:r.chain_position,protectedPriority:r.protected_priority_30,officialVerificationRequired:r.official_verification_required,...(next?{evo:next,...(stone?{stone}:{evoLevel:evolutionLevel(r)})}:{}),...(UNIQUE_IDS.includes(r.no)?{unique:true}:{}),sourceVersion:SPECIES_SOURCE_META.sourceVersion})};
export const SPECIES=Object.freeze(CANONICAL_SPECIES_RECORDS.map(canonicalEntry));

const legacyEntry=(oldId,name,types,sprite,stats,moves,real,fact,rarity='일반',extra={})=>Object.freeze({id:`legacy:${oldId}`,legacyId:oldId,name,types:Object.freeze(types),sprite,stats:Object.freeze(stats),moves:Object.freeze(moves),real,fact,rarity,habitats:Object.freeze(['legacy']),...extra});
export const LEGACY_SPECIES=Object.freeze([
 legacyEntry(1,'동비',['꽃'],0,[45,40,45,65,55,50],['peck','petal','heal','gust'],'동백나무·동박새','동백꽃과 새를 결합한 창작 몬스터예요.','스타팅',{evo:'legacy:2',evoLevel:16}),legacyEntry(2,'백초롱',['꽃','바람'],0,[60,55,60,90,75,65],['peck','petal','heal','gust'],'동백나무·동박새','동백꽃과 새의 판타지 성장형이에요.','스타팅',{evo:'legacy:3',evoLevel:36,stage:2}),legacyEntry(3,'동백봉',['꽃','바람'],0,[80,70,80,120,105,80],['peck','petal','heal','gust'],'동백나무·동박새','동백꽃과 새의 최종 창작 성장형이에요.','스타팅',{stage:3}),
 legacyEntry(4,'망울치',['물'],1,[55,60,45,40,40,55],['tackle','water','mud','wave'],'망둑어류','망둑어류를 모티프로 만든 창작 몬스터예요.','스타팅',{evo:'legacy:5',evoLevel:16}),legacyEntry(5,'갯둥치',['물','땅'],1,[70,85,60,55,55,70],['tackle','water','mud','wave'],'망둑어류','망둑어류의 판타지 성장형이에요.','스타팅',{evo:'legacy:6',evoLevel:36,stage:2}),legacyEntry(6,'파도망둑',['물','땅'],1,[90,110,85,75,80,95],['tackle','water','mud','wave'],'망둑어류','망둑어류의 최종 창작 성장형이에요.','스타팅',{stage:3}),
 legacyEntry(7,'소롱',['바위'],2,[60,55,65,30,50,30],['tackle','shell','guard','tide'],'소라류','나선형 패각을 모티프로 한 창작 몬스터예요.','스타팅',{evo:'legacy:8',evoLevel:16}),legacyEntry(8,'뿔소라',['바위','바다'],2,[80,80,90,40,70,35],['shell','guard','crush','tide'],'소라류','소라류 모티프의 판타지 성장형이에요.','스타팅',{evo:'legacy:9',evoLevel:36,stage:2}),legacyEntry(9,'해각룡',['바위','바다'],2,[105,110,125,55,95,45],['shell','guard','crush','tide'],'소라류','소라와 바다 용을 결합한 창작 몬스터예요.','스타팅',{stage:3}),
 legacyEntry(19,'갈몽',['바람'],5,[40,45,35,40,35,65],['peck','water','wing','tide'],'괭이갈매기','괭이갈매기를 모티프로 한 창작 몬스터예요.','일반',{evo:'legacy:20',evoLevel:12}),legacyEntry(20,'괭갈매',['바람','바다'],5,[55,65,45,60,50,85],['peck','water','wing','tide'],'괭이갈매기','갈매기 모티프의 판타지 성장형이에요.','일반',{evo:'legacy:21',evoLevel:28,stage:2}),legacyEntry(21,'해풍갈',['바람','바다'],5,[75,85,60,75,65,95],['peck','wave','wing','tide'],'괭이갈매기','해풍을 타는 모습을 표현한 창작 몬스터예요.','일반',{stage:3}),
 legacyEntry(31,'도롱알',['물'],8,[45,35,45,55,50,40],['tackle','water','forest','poison'],'도롱뇽류','도롱뇽류를 모티프로 한 창작 몬스터예요.','희귀',{evo:'legacy:32',evoLevel:16}),legacyEntry(32,'물도롱',['물','숲'],8,[65,45,65,80,65,55],['water','forest','heal','poison'],'도롱뇽류','도롱뇽류 모티프의 판타지 성장형이에요.','희귀',{evo:'legacy:33',stone:'forest',stage:2}),legacyEntry(33,'숲도롱왕',['물','숲'],8,[80,60,85,105,90,55],['water','forest','heal','poison'],'도롱뇽류','도롱뇽류의 최종 창작 성장형이에요.','희귀',{stage:3}),
 legacyEntry(10,'물토리',['물','바다'],3,[65,70,55,65,75,80],['tackle','water','bite','tide'],'수달','수달을 모티프로 한 단일형 창작 몬스터예요.','희귀'),legacyEntry(65,'외줄령',['숲','신비'],9,[110,90,110,125,135,100],['forest','mystic','heal','poison'],'거제외줄달팽이','거제외줄달팽이에서 착안한 환상 몬스터예요.','환상',{unique:true}),legacyEntry(68,'진총제로',['바다','신비'],7,[105,80,120,155,145,75],['coral','mystic','guard','tide'],'둔한진총산호','산호 모티프의 심해 판타지 몬스터예요.','전설',{unique:true})
]);

export const BY_ID=Object.freeze(Object.fromEntries([...SPECIES,...LEGACY_SPECIES].map(s=>[s.id,s])));
const poolEntries=SPECIES.filter(s=>s.stage===1&&!s.unique&&!isStarterFamilyId(s.id));
export const HABITAT_POOLS=Object.freeze({...Object.fromEntries(['forest','coast','wetland','sky','town'].map(h=>[h,Object.freeze(poolEntries.filter(s=>s.habitats.includes(h)).map(s=>s.id))])),special:UNIQUE_IDS});
export const ENCOUNTER_POOLS=HABITAT_POOLS;
export const GIFT_IDS=PROTECTED_IDS;

export const TYPE_CHART=Object.freeze({풀:{물:1.5,불:.67,풀:.67},물:{바위:1.5,꽃:.67,불꽃:1.5,불:1.5,풀:.67,물:.67},불:{풀:1.5,물:.67,불:.67},꽃:{물:1.5,바위:.67,꽃:.67},바위:{꽃:1.5,물:.67,바람:1.5},땅:{강철:1.5,독:1.5,숲:.67},숲:{물:1.5,땅:1.5,불꽃:.67},바람:{곤충:1.5,숲:1.5,바위:.67},바다:{바위:1.5,독:.67,바다:.67},그림자:{빛:1.5,신비:1.5},빛:{그림자:1.5},독:{꽃:1.5,숲:1.5,바위:.67},신비:{신비:.67},불꽃:{숲:1.5,꽃:1.5,곤충:1.5,물:.67}});
export function typeFactor(type,types){return types.reduce((n,t)=>n*(TYPE_CHART[type]?.[t]??1),1)}
export function stats(mon){const s=BY_ID[mon.id];if(!s)throw Error('알 수 없는 몬스터');return s.stats.map((b,i)=>Math.floor(b*2*mon.level/100)+(i===0?mon.level+10:5))}
export function moveKeys(mon){const s=BY_ID[mon.id];return s.moves.slice(0,Math.max(mon.level>=12?4:mon.level>=8?3:2,(s.stage??1)>=2?4:s.id===70?3:2))}
export function moveInfo(mon,key){const base=MOVES[key];if(!base)return null;const tier=Math.max(mon.level>=36?2:mon.level>=20?1:0,(BY_ID[mon.id].stage??1)-1);if(!base.power||!tier||key==='struggle')return base;const titles={leaf:['잎날베기','태양잎 폭풍'],fire:['화염방사','작열폭풍'],water:['물대포','폭포격류'],tackle:['돌진','기가충돌'],forest:['숲의 숨결','대숲폭풍'],bite:['날카로운 엄니','맹수엄니']};return {...base,name:titles[key]?.[tier-1]??`${tier===2?'궁극':'강화'} ${base.name}`,power:base.power+tier*25}}
export function createMonster(id,level=5){if(!BY_ID[id])throw Error('알 수 없는 몬스터');if(!Number.isInteger(level)||level<1||level>100)throw Error('레벨 정보가 올바르지 않아요.');const m={uid:randomId(),id,level,xp:0,hp:1,pp:BY_ID[id].moves.map(k=>MOVES[k].pp),status:null};m.hp=stats(m)[0];return m}
export function xpNeeded(level){return level*100}
export function addExperience(mon,amount){if(!Number.isFinite(amount)||amount<0)throw Error('경험치 정보가 올바르지 않아요.');mon.xp+=Math.floor(amount);let levels=0;const old=stats(mon)[0];while(mon.level<100&&mon.xp>=xpNeeded(mon.level)){mon.xp-=xpNeeded(mon.level);mon.level++;levels++}if(mon.level===100)mon.xp=0;mon.hp=Math.min(stats(mon)[0],mon.hp+stats(mon)[0]-old);return levels}
export function evolutionTarget(mon,stone){const s=BY_ID[mon.id];if(!s?.evo)return null;if(s.stone)return stone===s.stone?s.evo:null;return mon.level>=s.evoLevel?s.evo:null}
export function evolve(mon,target){if(!BY_ID[target]||BY_ID[mon.id]?.evo!==target)throw Error('잘못된 진화');const old=stats(mon)[0];mon.id=target;mon.hp=Math.min(stats(mon)[0],mon.hp+stats(mon)[0]-old);mon.pp=BY_ID[target].moves.map(k=>MOVES[k].pp);return mon}
export function calculateDamage(a,b,key,rng=Math.random,guard=0){const m=moveInfo(a,key);if(!m)throw Error('알 수 없는 기술');if(rng()*100>=m.accuracy)return {damage:0,miss:true,factor:1,critical:false};const sa=stats(a),sb=stats(b),physical=m.kind==='physical';const factor=typeFactor(m.type,BY_ID[b.id].types);const critical=rng()<.0625,same=BY_ID[a.id].types.includes(m.type)?1.2:1,attack=sa[physical?1:3],defense=sb[physical?2:4]*(1+guard*.4),damage=Math.max(1,Math.floor((((2*a.level/5+2)*m.power*attack/defense)/50+2)*same*factor*(critical?1.5:1)*(.9+rng()*.1)));return {damage,miss:false,factor,critical}}
export function captureChance(mon){const s=BY_ID[mon.id],health=mon.hp/stats(mon)[0];return Math.min(.92,Math.max(.04,(s.unique?.1:s.rarity==='희귀'?.28:s.rarity==='특별'?.16:.47)+(1-health)*.4+(mon.status?.12:0)))}
export function healParty(state){for(const m of state.party){m.hp=stats(m)[0];m.pp=BY_ID[m.id].moves.map(k=>MOVES[k].pp);m.status=null}}

const freshItems=()=>({balls:12,potions:5,...Object.fromEntries(Object.keys(STONES).map(k=>[k,k==='forest'?1:0]))});
export function freshState(starter,gender){if(!STARTERS.includes(starter))throw Error('선택할 수 없는 첫 파트너예요.');return {version:SAVE_VERSION,journey:freshJourney(),saveCode:'GJ-'+randomId().replace(/[^a-f0-9]/gi,'').slice(0,8).padEnd(8,'0').toUpperCase(),gender,party:[createMonster(starter)],box:[],seen:[starter],caught:[starter],badges:[],items:freshItems(),coins:300,pos:{x:49.5,y:44},steps:0,wins:0,captures:0,legendCaught:[],updatedAt:Date.now(),revision:0,gymRewardClaimed:false}}

const LEGACY_ID_SET=new Set(LEGACY_SPECIES.map(s=>s.legacyId));
const toLegacyId=id=>{if(typeof id==='string'&&id.startsWith('legacy:'))return id;if(Number.isInteger(id)&&LEGACY_ID_SET.has(id))return `legacy:${id}`;throw Error('구버전 몬스터 번호가 올바르지 않아요.')};
export function migrateV1Save(data){if(!data||data.version!==1)throw Error('마이그레이션할 수 없는 저장 파일이에요.');const migrated=structuredClone(data);migrated.version=SAVE_VERSION;for(const key of ['party','box'])if(Array.isArray(migrated[key]))migrated[key]=migrated[key].map(mon=>({...mon,id:toLegacyId(mon.id)}));for(const key of ['seen','caught','legendCaught'])if(Array.isArray(migrated[key]))migrated[key]=migrated[key].map(toLegacyId);migrated.items={...freshItems(),...(migrated.items||{})};return migrated}

const cleanMon=m=>({uid:m.uid,id:m.id,level:m.level,xp:m.xp,hp:m.hp,pp:[...m.pp],status:m.status});
const assertCollection=(value,label)=>{if(!Array.isArray(value)||value.length>MAX_COLLECTION||value.some(id=>!BY_ID[id]))throw Error(`${label} 정보가 올바르지 않아요.`)};
export function validateSave(input){
 const data=input?.version===1?migrateV1Save(input):input;
 if(!data||data.version!==SAVE_VERSION)throw Error('지원하지 않는 저장 파일이에요.');
 if(!Array.isArray(data.party)||!data.party.length||data.party.length>6||!Array.isArray(data.box)||data.box.length>MAX_BOX)throw Error('파티 정보가 올바르지 않아요.');
 if(!['boy','girl'].includes(data.gender)||!/^GJ-[A-F0-9]{8}$/.test(data.saveCode))throw Error('저장 코드가 올바르지 않아요.');
 for(const m of [...data.party,...data.box]){const s=m&&BY_ID[m.id];if(!s||!Number.isInteger(m.level)||m.level<1||m.level>100||!Number.isFinite(m.xp)||m.xp<0||m.xp>1e7||!Number.isFinite(m.hp)||m.hp<0||m.hp>stats(m)[0]||!Array.isArray(m.pp)||m.pp.length!==4||m.pp.some((v,i)=>!Number.isInteger(v)||v<0||v>MOVES[s.moves[i]].pp)||![null,'poison','slow'].includes(m.status)||typeof m.uid!=='string'||!m.uid.length||m.uid.length>50)throw Error('몬스터 저장 정보가 손상되었어요.')}
 const owned=[...data.party,...data.box],uids=owned.map(m=>m.uid);if(new Set(uids).size!==uids.length)throw Error('중복된 몬스터 정보예요.');
 for(const id of [...UNIQUE_IDS,'legacy:65','legacy:68'])if(owned.filter(m=>m.id===id).length>1)throw Error('고유 몬스터가 중복되었어요.');
 assertCollection(data.seen,'도감');assertCollection(data.caught,'도감');assertCollection(data.legendCaught,'특별 포획');
 if(!Array.isArray(data.badges)||data.badges.some(x=>!BADGES.includes(x))||data.badges.length>8)throw Error('배지 정보 오류');
 for(const k of ['balls','potions',...Object.keys(STONES)])if(!Number.isInteger(data.items?.[k])||data.items[k]<0||data.items[k]>9999)throw Error('아이템 정보 오류');
 for(const k of ['coins','steps','wins','captures','revision'])if(!Number.isInteger(data[k])||data[k]<0||data[k]>1e9)throw Error('진행 정보 오류');
 if(!Number.isFinite(data.pos?.x)||!Number.isFinite(data.pos?.y)||data.pos.x<0||data.pos.x>100||data.pos.y<0||data.pos.y>100)throw Error('위치 정보 오류');
 return structuredClone({version:SAVE_VERSION,journey:cleanJourney(data.journey),saveCode:data.saveCode,gender:data.gender,party:data.party.map(cleanMon),box:data.box.map(cleanMon),seen:[...new Set(data.seen)],caught:[...new Set(data.caught)],legendCaught:[...new Set(data.legendCaught)],badges:[...new Set(data.badges)],items:Object.fromEntries(['balls','potions',...Object.keys(STONES)].map(k=>[k,data.items[k]])),coins:data.coins,pos:{x:data.pos.x,y:data.pos.y},steps:data.steps,wins:data.wins,captures:data.captures,updatedAt:Number.isFinite(data.updatedAt)?data.updatedAt:Date.now(),revision:data.revision,gymRewardClaimed:!!data.gymRewardClaimed});
}
