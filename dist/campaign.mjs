import {BADGES, REGION_BY_ID, TRAVEL_LINKS} from './regions.mjs';

const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child)}return value};
const team=(...rows)=>rows;
const trainer=(id,name,intro,...members)=>({id,name,intro,team:members});

export const GYMS=freeze([
 {regionId:'garden',order:1,badge:'garden',name:'새싹 체육관',theme:'온실 물길',recommendedLevel:10,
  puzzle:{kind:'switch',title:'세 갈래 물길',instructions:'세 밸브를 눌러 모든 화단에 물을 보내세요.',labels:['왼쪽 밸브','가운데 밸브','오른쪽 밸브'],target:[true,true,true]},
  trainers:[trainer('garden-dara','새싹 지킴이 다라','작은 싹도 물의 길을 기억해!',[13,7],[46,8]),trainer('garden-bom','정원사 봄','서두르면 흙이 넘쳐. 차분히 와!',[49,8],[16,9])],
  leader:{name:'초록',title:'새싹을 돌보는 사람',intro:'강한 돌봄은 잘 보고, 필요한 만큼 돕는 거야.',win:'네가 만든 물길이라면 어린 싹도 잘 자라겠어.',team:team([49,9],[14,10],[50,11])}},
 {regionId:'west',order:2,badge:'stone',name:'돌담 체육관',theme:'돌길 미로',recommendedLevel:16,
  puzzle:{kind:'maze',title:'돌담 갈림길',instructions:'무너지지 않은 길을 이어 정상 깃발까지 가세요.',start:'gate',goal:'summit',graph:{gate:{up:'field'},field:{left:'well',right:'wall'},well:{up:'ridge',down:'gate'},wall:{left:'field',up:'yard'},yard:{left:'ridge',down:'wall'},ridge:{right:'summit',down:'well'},summit:{}}},
  trainers:[trainer('west-hodu','들길 소년 호두','돌 하나도 제 자리가 있어!',[7,12],[43,13]),trainer('west-seul','돌담 연구가 슬','막힌 길은 돌아가면 돼.',[55,13],[58,14])],
  leader:{name:'돌찬',title:'오래된 길의 안내자',intro:'돌담을 넘지 말고 길을 읽어 보렴.',win:'힘만 쓰지 않고 길을 찾았구나. 돌담 배지를 받아!',team:team([43,14],[56,15],[8,16])}},
 {regionId:'bamboo',order:3,badge:'bamboo',name:'대숲 체육관',theme:'회전 대나무 다리',recommendedLevel:21,
  puzzle:{kind:'rotate',title:'대나무 다리 맞추기',instructions:'세 기둥을 돌려 다리의 마디를 이어 주세요.',labels:['푸른 기둥','노란 기둥','붉은 기둥'],modulo:4,target:[1,2,3]},
  trainers:[trainer('bamboo-sol','대숲 소년 솔','바람 소리를 따라와 봐!',[40,17],[10,18]),trainer('bamboo-rim','숲길 지킴이 림','발밑의 마디도 살펴야 해.',[47,18],[124,19]),trainer('bamboo-juk','죽공예가 죽','다리는 돌리고 마음은 곧게!',[2,19],[125,20])],
  leader:{name:'대솔',title:'대숲의 길잡이',intro:'휘어도 다시 서는 대나무처럼 끝까지 와 보렴.',win:'바람과 다리의 박자를 찾았구나!',team:team([41,19],[125,20],[48,21])}},
 {regionId:'north',order:4,badge:'wind',name:'해풍 체육관',theme:'바람 방향 장치',recommendedLevel:26,
  puzzle:{kind:'order',title:'네 방향 바람개비',instructions:'바람 깃발이 가리킨 순서대로 방향 장치를 누르세요.',sequence:['north','east','west','south'],labels:{north:'북풍',east:'샛바람',west:'하늬바람',south:'마파람'}},
  trainers:[trainer('north-paran','등대 소년 파란','첫 바람의 방향을 놓치지 마!',[22,22],[64,23]),trainer('north-hae','해안 지킴이 해','깃발은 바람을 숨기지 않아.',[76,23],[79,24]),trainer('north-un','바람 관찰가 운','틀리면 처음 바람부터 다시야.',[82,24],[65,25])],
  leader:{name:'바루',title:'북쪽 바람을 읽는 사람',intro:'눈을 감아도 바람이 온 길은 알 수 있단다.',win:'네 선택에는 망설임보다 관찰이 먼저였어.',team:team([23,24],[65,25],[83,26])}},
 {regionId:'okpo',order:5,badge:'current',name:'물결 체육관',theme:'해류 발판',recommendedLevel:31,
  puzzle:{kind:'current',title:'움직이는 해류판',instructions:'화살표 발판의 흐름을 타고 출구까지 가세요.',start:'dock',goal:'exit',graph:{dock:{right:'blue'},blue:{up:'foam',left:'dock'},foam:{right:'eddy',down:'blue'},eddy:{down:'rock',left:'foam'},rock:{right:'channel',up:'eddy'},channel:{up:'exit',left:'rock'},exit:{}}},
  trainers:[trainer('okpo-mul','해류 소녀 물','물길은 한 칸 더 데려갈 수도 있어!',[31,27],[25,28]),trainer('okpo-cho','부두 소년 초','소용돌이 옆에는 잔잔한 길이 있지.',[34,28],[52,29]),trainer('okpo-ryu','물결 관찰가 류','되돌아가는 것도 항해야.',[28,29],[35,30])],
  leader:{name:'해준',title:'물길을 잇는 항해자',intro:'바다는 늘 움직여. 너도 흐름 속에서 답을 골라 봐.',win:'거센 흐름에서도 출구를 놓치지 않았어!',team:team([32,29],[35,30],[53,31])}},
 {regionId:'port',order:6,badge:'horizon',name:'수평선 체육관',theme:'등대 거울',recommendedLevel:36,
  puzzle:{kind:'beam',title:'등대빛 맞추기',instructions:'거울 셋을 돌려 빛을 바다 쪽 렌즈로 보내세요.',labels:['아래 거울','가운데 거울','위 거울'],modulo:4,target:[3,1,2]},
  trainers:[trainer('port-bit','등대지기 빛','거울 하나가 빛의 길을 바꿔!',[37,32],[64,33]),trainer('port-ran','항구 소녀 란','먼 곳을 보려면 가까운 거울부터.',[22,33],[95,34]),trainer('port-gil','선착장 안내원 길','마지막 반사는 위쪽이야.',[38,34],[65,35])],
  leader:{name:'빛나',title:'수평선을 비추는 사람',intro:'작은 빛도 잘 이으면 먼 배에 닿을 수 있어.',win:'네 빛이 수평선까지 곧게 닿았어.',team:team([38,34],[96,35],[66,36])}},
 {regionId:'ilun',order:7,badge:'camellia',name:'동백 체육관',theme:'꽃잎 디딤판',recommendedLevel:41,
  puzzle:{kind:'memory',title:'동백 꽃잎 길',instructions:'잠깐 빛난 꽃잎의 색 순서를 기억해 그대로 밟으세요.',sequence:['red','white','pink','red','white'],labels:{red:'붉은 꽃잎',white:'흰 꽃잎',pink:'분홍 꽃잎'}},
  trainers:[trainer('ilun-kkot','정원 소녀 꽃','꽃잎 다섯 장의 순서를 기억해!',[49,36],[115,37]),trainer('ilun-dong','숲 소년 동','틀려도 다시 피우면 돼.',[118,37],[124,38]),trainer('ilun-baek','동백 해설사 백','색만 보지 말고 박자도 기억해.',[137,38],[50,39])],
  leader:{name:'동하',title:'동백숲의 기록자',intro:'꽃은 피고 지지만, 잘 본 순서는 마음에 남지.',win:'다섯 꽃잎의 약속을 모두 지켰구나.',team:team([50,39],[119,40],[126,41])}},
 {regionId:'south',order:8,badge:'ocean',name:'큰바다 체육관',theme:'밀물 썰물 수문',recommendedLevel:46,
  puzzle:{kind:'gate',title:'네 개의 수문',instructions:'이어진 수문을 열고 닫아 네 수로에 물을 채우세요.',labels:['북쪽 수문','동쪽 수문','남쪽 수문','서쪽 수문'],links:[[0,1],[1,2],[2,3],[0,3]],target:[true,true,true,true]},
  trainers:[trainer('south-bada','바다 소년 바다','수문 하나가 옆 수문도 움직여!',[28,41],[52,42]),trainer('south-mong','몽돌 소녀 몽','파도는 돌을 밀고 다시 데려가.',[55,42],[121,43]),trainer('south-solbi','해안 지킴이 솔비','네 수로를 모두 살려 봐.',[143,43],[85,44]),trainer('south-pung','언덕 소년 풍','마지막 바람은 내가 막을게!',[122,44],[144,45])],
  leader:{name:'해솔',title:'큰바다의 수문장',intro:'산에서 온 물과 바닷물이 만나는 길을 열어 보렴.',win:'섬의 여러 물길을 하나로 이어 냈구나!',team:team([53,44],[122,45],[144,45],[126,46])}}
]);

export const GYM_BY_REGION=freeze(Object.fromEntries(GYMS.map(g=>[g.regionId,g])));
export const GYM_ORDER=freeze(GYMS.map(g=>g.regionId));

function puzzleFor(regionId){const gym=GYM_BY_REGION[regionId];if(!gym)throw Error('체육관 퍼즐 정보 오류');return gym.puzzle}
export function createGymPuzzleState(regionId){const p=puzzleFor(regionId);if(p.kind==='switch'||p.kind==='gate')return {moves:0,solved:false,bits:p.target.map(()=>false)};if(p.kind==='maze'||p.kind==='current')return {moves:0,solved:false,position:p.start};if(p.kind==='rotate'||p.kind==='beam')return {moves:0,solved:false,rotations:p.target.map(()=>0)};return {moves:0,solved:false,sequence:[]}}
export function gymPuzzleSolved(regionId,state){const p=puzzleFor(regionId);if(!state||typeof state!=='object')return false;if(p.kind==='switch'||p.kind==='gate')return Array.isArray(state.bits)&&p.target.every((v,i)=>state.bits[i]===v);if(p.kind==='maze'||p.kind==='current')return state.position===p.goal;if(p.kind==='rotate'||p.kind==='beam')return Array.isArray(state.rotations)&&p.target.every((v,i)=>state.rotations[i]===v);return Array.isArray(state.sequence)&&state.sequence.length===p.sequence.length&&p.sequence.every((v,i)=>state.sequence[i]===v)}
export function applyGymPuzzleAction(regionId,state,action){
 const p=puzzleFor(regionId),s=structuredClone(state??createGymPuzzleState(regionId));
 if(gymPuzzleSolved(regionId,s))return {...s,solved:true};
 s.moves=(Number.isInteger(s.moves)?s.moves:0)+1;
 if(s.moves>9999)throw Error('퍼즐 이동 횟수 오류');
 if(p.kind==='switch'){const i=Number(action);if(!Number.isInteger(i)||i<0||i>=p.target.length)throw Error('선택할 수 없는 장치');s.bits[i]=!s.bits[i]}
 else if(p.kind==='gate'){const i=Number(action),link=p.links[i];if(!link)throw Error('선택할 수 없는 수문');for(const n of link)s.bits[n]=!s.bits[n]}
 else if(p.kind==='maze'||p.kind==='current'){const next=p.graph[s.position]?.[action];if(!next)throw Error('그쪽으로 갈 수 없어요.');s.position=next}
 else if(p.kind==='rotate'||p.kind==='beam'){const i=Number(action);if(!Number.isInteger(i)||i<0||i>=p.target.length)throw Error('선택할 수 없는 장치');s.rotations[i]=(s.rotations[i]+1)%p.modulo}
 else {if(!Object.hasOwn(p.labels,action))throw Error('선택할 수 없는 순서');const expected=p.sequence[s.sequence.length];s.sequence=action===expected?[...s.sequence,action]:action===p.sequence[0]?[action]:[]}
 s.solved=gymPuzzleSolved(regionId,s);return s;
}

export const LEAGUE=freeze([
 {id:'reef',name:'사천',title:'암초의 수호자',intro:'흔들려도 자리를 지키는 힘을 보여 주지.',team:team([57,48],[33,48],[132,49],[60,50])},
 {id:'forest',name:'푸름',title:'난대숲의 기록자',intro:'숲의 작은 기척까지 읽어 보렴.',team:team([51,49],[105,49],[120,50],[142,51])},
 {id:'sky',name:'마루',title:'하늘길 관찰자',intro:'바람은 멀리서 온 소식도 데려온단다.',team:team([78,50],[84,50],[90,51],[111,52])},
 {id:'tide',name:'여울',title:'바다숲의 안내자',intro:'밀물과 썰물, 두 박자를 모두 견뎌 봐.',team:team([54,51],[63,51],[87,52],[144,53])}
]);
export const CHAMPION=freeze({id:'champion',name:'나루',title:'조류 신호의 동행자',intro:'처음엔 내가 먼저 답을 찾고 싶었어. 이제는 네가 지킨 길과 내 길을 함께 겨뤄 보자!',win:'네가 이겼어. 섬의 신호는 한 사람의 것이 아니라 모두가 함께 지키는 약속이었구나.',team:team([3,52],[6,52],[9,52],[117,53],[128,54],[134,55])});

export const ACQUISITIONS=freeze({
 rod:{name:'관찰 낚싯대',requiresBadges:0,story:'signal-start',message:'연구원이 관찰 낚싯대를 건넸다. 해안에서 물속 생태몬을 만날 수 있다.'},
 bike:{name:'접이식 자전거',requiresBadges:2,story:'west-marker',message:'나루가 접이식 자전거를 빌려주었다. 들길을 더 빠르게 달릴 수 있다.'},
 boat:{name:'조사선 승선증',requiresBadges:4,story:'north-beacon',message:'장목 관찰소에서 조사선 승선증을 받았다. 항구의 정해진 항로를 이용할 수 있다.'},
 surf:{name:'파도타기',requiresBadges:6,story:'port-lens',message:'빛나가 얕은 해안에서 안전하게 파도타는 법을 알려 주었다. 물 위를 직접 탐색할 수 있다.'}
});
export function availableAcquisitions(journey={},badges=[]){return Object.entries(ACQUISITIONS).filter(([id,a])=>!journey[id]&&badges.length>=a.requiresBadges&&(!a.story||journey.story?.includes(a.story))).map(([id])=>id)}
export function canExplore(method,progress={}){const j=progress.journey??progress;if(method==='land')return true;if(method==='rod')return !!j.rod;if(method==='surf')return !!j.surf;if(method==='boat')return !!j.boat;return false}
export function canTravel(from,to,progress={}){const j=progress.journey??progress;const link=TRAVEL_LINKS.find(r=>(r.from===from&&r.to===to)||(r.from===to&&r.to===from));if(!link)return false;if(link.mode==='walk')return true;if(link.mode==='boat')return !!j.boat&&(!link.requires||!!j[link.requires]);return false}

export function availableEncounterPool(regionId,method='land',progress={}){const region=REGION_BY_ID[regionId];if(!region)throw Error('지역 정보 오류');if(!canExplore(method,progress))return [];return [...(region.encounters[method]??[])]}
export function chooseWeightedEncounter(regionId,method='land',rng=Math.random,progress={}){const rows=availableEncounterPool(regionId,method,progress);if(!rows.length)return null;const roll=rng();if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('난수 범위 오류');const total=rows.reduce((n,r)=>n+r.weight,0);let cursor=roll*total,pick=rows.at(-1);for(const row of rows){cursor-=row.weight;if(cursor<0){pick=row;break}}const levelRoll=rng();if(!Number.isFinite(levelRoll)||levelRoll<0||levelRoll>=1)throw Error('난수 범위 오류');return {id:pick.id,level:pick.minLevel+Math.floor(levelRoll*(pick.maxLevel-pick.minLevel+1)),method,regionId}}

export const STORY_BEATS=freeze([
 {id:'signal-start',regionId:'gohyeon',requiresBadges:0,title:'이상한 조류 신호',speaker:'연구원 윤',text:'거제 둘레의 관찰 장치에서 같은 소리가 되풀이되고 있어. 새의 이동과 바닷물 흐름을 함께 살펴야 해. 이 일은 게임 속 창작 사건이야.'},
 {id:'garden-sample',regionId:'garden',requiresBadges:0,title:'온실 밖의 잎',speaker:'나루',text:'온실 식물과 밖에서 자라는 식물은 다르게 기록해야 한대. 사진을 찍고, 잎은 꺾지 말자.'},
 {id:'west-marker',regionId:'west',requiresBadges:1,title:'쓰러진 표지',speaker:'나루',text:'신호를 따라 달리다 길 표지를 넘어뜨릴 뻔했어. 빠르게 가는 것보다 길을 지키는 게 먼저구나.'},
 {id:'bamboo-echo',regionId:'bamboo',requiresBadges:2,title:'대숲의 메아리',speaker:'대솔',text:'대나무 사이에서 신호가 크게 울렸구나. 소리가 큰 곳이 시작점이라고 바로 정하면 안 돼.'},
 {id:'north-beacon',regionId:'north',requiresBadges:3,title:'북쪽 관찰등',speaker:'관찰원 해미',text:'장치는 철새를 부르는 등이 아니야. 멀리서 온 관찰 기록을 모아 보내는 장치란다.'},
 {id:'okpo-current',regionId:'okpo',requiresBadges:4,title:'두 번째 뜻',speaker:'나루',text:'이제 알겠어. 조류는 새 무리를 뜻하기도 하고 바닷물 흐름을 뜻하기도 해. 신호에는 두 기록이 겹쳐 있었어!'},
 {id:'port-lens',regionId:'port',requiresBadges:5,title:'깨끗해진 렌즈',speaker:'빛나',text:'소금기 묻은 렌즈를 닦으니 신호가 남쪽을 가리켜. 장치를 고칠 때도 주변 생물을 건드리지 않아야 해.'},
 {id:'ilun-bloom',regionId:'ilun',requiresBadges:6,title:'동백숲의 약속',speaker:'동하',text:'숲길 밖으로 나가면 뿌리가 다칠 수 있어. 정해진 길에서 소리와 꽃핀 때만 기록하자.'},
 {id:'south-source',regionId:'south',requiresBadges:7,title:'신호의 시작점',speaker:'나루',text:'누군가 꾸민 경보가 아니었어. 오래된 관찰 장치들이 서로의 기록을 되돌려 보내며 신호가 커진 거야.'},
 {id:'league-open',regionId:'gohyeon',requiresBadges:8,title:'섬 리그 초대',speaker:'연구원 윤',text:'여덟 지역의 기록이 모두 모였어. 리그에서 네 관찰과 돌봄의 힘을 보여 주렴.'},
 {id:'signal-restored',regionId:'gohyeon',requiresChampion:true,title:'모두의 관찰망',speaker:'나루',text:'장치를 새로 연결했어. 이제 큰 신호 하나 대신, 지역마다 작은 변화를 정확히 알려 줄 거야.'},
 {id:'postgame-call',regionId:'port',requiresChampion:true,title:'지심도의 답신',speaker:'선장 미르',text:'조사선에 조용한 답신이 왔어. 승선증이 있다면 지심도로 가 보자.'},
 {id:'whole-island',regionId:'island',requiresChampion:true,requiresCaught:[145,146,147,148,149,150],title:'온 섬이 잇는 신호',speaker:'나루',text:'숲, 하늘, 바다의 기록이 하나로 이어졌어. 마지막 기척은 우리가 함께 지킨 모든 길에서 온 거야.'}
]);
export function storyBeatAvailable(beat,journey={},badges=[]){return !journey.story?.includes(beat.id)&&badges.length>=(beat.requiresBadges??0)&&(!beat.requiresChampion||journey.champion)&&(!beat.requiresCaught||beat.requiresCaught.every(id=>(journey.legendsCaught??[]).includes(id)))}
export function nextStoryBeat(journey={},badges=[]){return STORY_BEATS.find(b=>b.regionId===(journey.region??'gohyeon')&&storyBeatAvailable(b,journey,badges))??null}

export const HUB_INTERACTIONS=freeze([
 {id:'gohyeon-lab',regionId:'gohyeon',name:'고현 연구소',text:'도감과 조류 신호 기록을 확인하고 팀을 회복한다.'},
 {id:'garden-note',regionId:'garden',name:'식물 기록대',text:'온실 식물과 야외 식생을 나누어 기록한다.'},
 {id:'west-wall',regionId:'west',name:'돌담 이정표',text:'담을 넘지 않고 열린 길을 지도에 표시한다.'},
 {id:'bamboo-listen',regionId:'bamboo',name:'대숲 소리통',text:'대숲 안의 소리를 조용히 듣고 방향을 비교한다.'},
 {id:'north-station',regionId:'north',name:'장목 관찰소',text:'바람과 바다의 관찰 기록을 전송한다.'},
 {id:'okpo-board',regionId:'okpo',name:'해류 기록판',text:'밀물과 썰물 때의 차이를 확인한다.'},
 {id:'port-lighthouse',regionId:'port',name:'항구 관찰등',text:'렌즈를 닦고 정해진 항로의 신호를 확인한다.'},
 {id:'ilun-trail',regionId:'ilun',name:'동백숲 안내판',text:'탐방로 안에서 꽃과 잎을 관찰한다.'},
 {id:'south-gate',regionId:'south',name:'남쪽 수문대',text:'산물과 바닷물이 만나는 수로를 살핀다.'},
 {id:'island-dock',regionId:'island',name:'지심도 조사 부두',text:'조사선 기록과 섬의 답신을 맞춰 본다.',requiresChampion:true}
]);
export function availableHubInteractions(regionId,journey={}){return HUB_INTERACTIONS.filter(h=>h.regionId===regionId&&(!h.requiresChampion||journey.champion))}

export const LEGEND_ENCOUNTERS=freeze([
 {id:145,kind:'protected',regionId:'garden',method:'land',title:'바람에 숨은 향',requiresBadges:8},
 {id:146,kind:'protected',regionId:'okpo',method:'surf',title:'깊은 물의 울림',requiresBadges:8,requires:'surf'},
 {id:147,kind:'protected',regionId:'ilun',method:'land',title:'숲바닥의 작은 빛',requiresBadges:8},
 {id:148,kind:'legend',regionId:'north',method:'land',title:'바다의 큰 물결',requiresChampion:true},
 {id:149,kind:'legend',regionId:'bamboo',method:'land',title:'숲의 깊은 숨',requiresChampion:true},
 {id:150,kind:'legend',regionId:'island',method:'boat',title:'섬을 도는 바람',requiresChampion:true,requires:'boat'},
 {id:151,kind:'secret',regionId:'island',method:'land',title:'온 섬의 답신',requiresChampion:true,requiresCaught:[145,146,147,148,149,150]}
]);
export const LEGEND_BY_ID=freeze(Object.fromEntries(LEGEND_ENCOUNTERS.map(x=>[x.id,x])));
export const UNIQUE_ENCOUNTER_IDS=freeze(LEGEND_ENCOUNTERS.map(x=>x.id));
export function canEncounterLegend(id,progress={}){const entry=LEGEND_BY_ID[id];if(!entry)return false;const j=progress.journey??progress,badges=progress.badges??j.badges??[],caught=new Set([...(progress.legendCaught??[]),...(j.legendsCaught??[]),...(j.legendCaught??[])]);if(caught.has(id))return false;if(badges.length<(entry.requiresBadges??0))return false;if(entry.requiresChampion&&!j.champion)return false;if(entry.requires&&!j[entry.requires])return false;if(entry.requiresCaught&&!entry.requiresCaught.every(n=>caught.has(n)))return false;return true}

// Factual notes are deliberately separate from the fictional story above.
export const FACT_SOURCES=freeze([
 {id:'geoje-admin',label:'거제시 공공데이터포털 행정구역',url:'https://data.geoje.go.kr/index.geoje?apiIdx=15149756&apiType=&codeCdStr=OC0003&menuCd=DOM_000000204001001000',supports:'거제시 행정구역 구성'},
 {id:'geoje-map',label:'거제시 공공데이터포털 행정지도',url:'https://data.geoje.go.kr/index.geoje?apiIdx=15133194&menuCd=DOM_000000204001001000',supports:'18개 면·동의 상대 위치 검토'},
 {id:'pow-park',label:'한국관광공사 열린관광지 포로수용소유적공원',url:'https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=4b6fff1b-1f3f-4203-8724-08333c016e5b',supports:'한국전쟁 포로수용소 부지에 조성된 역사유적공원'}
]);

export function nextLeagueOpponent(journey={}){const done=new Set(journey.league??[]);return LEAGUE.find(m=>!done.has(m.id))??(!done.has(CHAMPION.id)?CHAMPION:null)}
export function leagueUnlocked(badges=[]){return BADGES.every(b=>badges.includes(b))}
