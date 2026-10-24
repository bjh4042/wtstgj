import {openingIdentity} from './ordinary/opening-identity.mjs';
import {approvedStandingPortrait,approvedMenuArt} from './art/approved-intro.mjs';
import {installApprovedFieldUI} from './art/approved-field-ui.mjs';
import './art/approved-field-ui.css';
import './art/polished-field-ui.css';
import {approvedTitleMarkup} from './art/approved-title.mjs';
import {launchRequest,launchError,requestLaunch} from './ordinary/launch.mjs';
import {mapPresentation,battleMapContext} from './presentation/map-presentation.mjs';
import {resolveBattleBackground} from './presentation/battle-background.mjs';
import {applyCurrentBattleDisplay} from './presentation/battle-render.mjs';
import {playBattleEntry} from './presentation/battle-transition.mjs';
import {drawResolvedEnvironment} from './presentation/weather-layer.mjs';
import {geojeEnvironment as sourceEnvironment} from './environment-service.mjs';
import {withSimpleDisplay} from './presentation/simple-display.mjs';
const geojeEnvironment=withSimpleDisplay(sourceEnvironment);
import {presentationAudio,createMapAudioRouter} from './presentation/audio-hooks.mjs';
const mapAudioRouter=createMapAudioRouter();
import {createSaveSlotStore,SLOT_PREFIX} from './compatibility/save-slots.mjs';
import {migrateSave,requireCurrentRuntime} from './compatibility/save-migration.mjs';
import {createFieldFollower,updateFieldFollower} from './field-follower.mjs';
import {drawFieldFollower} from './follower-render.mjs';
import {installFollowerDeveloperTools} from './follower-dev.mjs';
import {assetMarkup,installAssetDOM,configureAssets,loadAsset,guardLegacyImage} from './asset-runtime.mjs';
import {assetPath} from './asset-manifest.mjs';
import {installPipelineDeveloperTools} from './pipeline-dev.mjs';
import {
  SPECIES, BY_ID, MOVES, STARTERS, STONES, MAX_BOX,
  stats, moveKeys, moveInfo, createMonster, freshState, validateSave, xpNeeded, addExperience,
  evolutionTarget, evolve, calculateDamage, captureChance, healParty
} from './model.mjs';
import {REGIONS, REGION_BY_ID, BADGES, ADMIN_AREAS} from './regions.mjs';
import {
  GYMS, GYM_BY_REGION, LEAGUE, CHAMPION, STORY_BEATS,
  createGymPuzzleState, applyGymPuzzleAction, gymPuzzleSolved,
  nextStoryBeat, availableHubInteractions, LEGEND_ENCOUNTERS,
  canEncounterLegend, chooseWeightedEncounter, availableEncounterPool,
  availableAcquisitions
} from './campaign.mjs';
import {
  FIELD_FRAMEBUFFER, FIELD_WORLD_PIXEL, drawField, fieldCameraFor, fieldPointerTarget,
  fieldWalkable, fieldZone, fieldHotspotAt, fieldPointsFor
} from './field-world.mjs';
import {
  activeDirection, advanceRoute, buildGridRoute, clearDirections,
  createDirectionInput, pressDirection, releaseDirection,
  stepCardinal, walkFrame
} from './movement.mjs';
import {TRAINER_SHEETS, drawTrainer, trainerPortrait} from './trainer-sprites.mjs';
import {battleBackMarkup} from './battle-sprites.mjs';
import {playMoveEffect} from './attack-effects.mjs';
import {speciesArtMarkup, drawSpecies} from './species-art.mjs';
import {drawRider, preloadRiderArt} from './travel-art.mjs';
import {createIntroWorld,moveIntroWorld,inspectIntroWorld,drawIntroWorld,INTRO_SCENE_LABELS} from './intro-scene.mjs';
import {SLICE_SAVE_KEY,createSlice,serializeSlice,moveSlice,zoneAt,interactAt,drawSlice,walkable as sliceWalkable} from './vertical-slice.mjs';
import {fieldInputLocked,finishFieldBattle,coreWalkable} from './field-engine-core.mjs';
import {behaviorAt} from './field-behavior.mjs';
import {GOLDEN_SAVE_KEY,GOLDEN_MENU,GOLDEN_ACTIONS,createGoldenField,serializeGolden,loadGoldenAssets,goldenAssetsReady,moveGolden,interactGolden,toggleGoldenMenu,moveGoldenMenu,closeGoldenUI,drawGoldenField,drawGoldenText,goldenTextStats,updateGoldenEnvironment,configureGoldenQA,goldenEnvironmentStats,updateGoldenGrass,updateGoldenCore} from './golden-field.mjs?living=6';
import {fieldPresentation} from './field-presentation.mjs';

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const SAVE_KEY='geoje.monsters.save.v2';
const BACKUP_KEY=SAVE_KEY+'.backup';
const V1_KEY='geoje.monsters.save.v1';
const V1_ARCHIVE='geoje.monsters.save.v1.raw-archive';
const PREF_KEY='geoje.monsters.preferences';
const NAME_KEY='geoje.monsters.name';
const saveSlots=createSaveSlotStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)});
if(import.meta.env?.DEV)import('./compatibility/canonical-runtime-adapter.mjs').then(async({loadCanonicalRuntimeAdapter:loadCanonicalAdapter})=>{const adapter=await loadCanonicalAdapter({development:true});if(new URLSearchParams(location.search).get('catalog')==='1'&&adapter.validation.ready){const {installCanonicalDeveloperTools}=await import('./canonical-dev.mjs');installCanonicalDeveloperTools(adapter)}if(new URLSearchParams(location.search).get('battle-v3')==='1'&&adapter.validation.ready){const {installCanonicalBattleDeveloperTools}=await import('./battle-v3/dev.mjs');installCanonicalBattleDeveloperTools(adapter)}if(new URLSearchParams(location.search).get('hgss')==='1'&&adapter.validation.ready){const {installHGSSDeveloperTools}=await import('./presentation/dev-tools.mjs');installHGSSDeveloperTools(adapter)}}).catch(error=>console.error('[Canonical compatibility]',error));
if(import.meta.env?.DEV&&new URLSearchParams(location.search).get('story')==='1')import('./compatibility/canonical-runtime-adapter.mjs').then(async({loadCanonicalRuntimeAdapter:loadCanonicalAdapter})=>{const adapter=await loadCanonicalAdapter({development:true});if(adapter.validation.ready){const {installCanonicalStoryDeveloperTools}=await import('./story/dev.mjs');installCanonicalStoryDeveloperTools(adapter)}}).catch(error=>console.error('[Canonical story]',error));
const SLICE_SESSION_KEY='geoje.monsters.vertical-slice.active';
const BOX_LIMIT=Number.isInteger(MAX_BOX)?MAX_BOX:240;
const TRAINER_KINDS=new Set(['trainer','leader','league','champion','rival','gym']);
const STARTER_IDS=Array.isArray(STARTERS)&&STARTERS.length?STARTERS:[1,4,7];
const uniq=(array,value)=>{if(!array.includes(value))array.push(value)};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const randomOf=array=>array[Math.floor(Math.random()*array.length)];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,reducedMotion()?Math.min(ms,160):ms));
const isTrainerBattle=kind=>TRAINER_KINDS.has(kind);
const currentRegion=()=>REGION_BY_ID[state?.journey?.region??'gohyeon']??REGIONS[0];
const parseSpeciesId=value=>{
  if(typeof value==='string'&&/^\d+$/.test(value)){const number=Number(value);if(Object.hasOwn(BY_ID,number))return number}
  return Object.hasOwn(BY_ID,value)?value:value;
};
const dataId=id=>esc(String(id));

let state=null;
let playerName='여행자';
let gender='boy';
let chosen=STARTER_IDS[0];
let battle=null;
let saveConflict=false;
let modalLocked=false;
let animating=false;
let moveTarget=null;
let focusedControl=null;
let backAction=null;
let toastTimer;
let lastTime=0;
let lastStep=0;
let lastEncounter=0;
let walkDistance=0;
let facing='down';
let surfing=false;
let soundCtx;
let melodyTimer;
let musicStep=0;
let prefs={sound:false,sfx:.5,music:.2,fast:false};
let openingAdvance=null;
let openingBack=null;
let openingWorld=null;
let openingTyping=null;
let bootTimer=null;
let openingMoving=false;
const openingDirectionInput=createDirectionInput();
function releaseOpeningInput(){clearDirections(openingDirectionInput);openingHeldDirection=null;openingQueuedDirection=null}
let openingHeldDirection=null;
let openingQueuedDirection=null;
let helpReturn=null;
let helpFocus=null;
let verticalSlice=null;
let goldenField=null;
const FIELD_CORE_QA_SAVE='geoje.monsters.field-core.qa.v1';
const goldenNative=document.createElement('canvas');goldenNative.width=1536;goldenNative.height=1024;
const goldenNativeCtx=goldenNative.getContext('2d');
let goldenSampleDivisor=1;
let goldenFpsStart=0,goldenFpsFrames=0;
let campaignSnapshot=null;
let sliceEncounterSteps=0;
const sliceKeyStarts=new Map();
const sliceNudges=[];
try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch{}

const directionInput=createDirectionInput();
const modal=$('#modal');
const canvas=$('#world');
const ctx=canvas.getContext('2d');
const fieldBuffer=document.createElement('canvas');
fieldBuffer.width=FIELD_FRAMEBUFFER.width;
fieldBuffer.height=FIELD_FRAMEBUFFER.height;
const fieldCtx=fieldBuffer.getContext('2d');
installPipelineDeveloperTools();
const followerDev=installFollowerDeveloperTools();
const campaignFollower=createFieldFollower(),sliceFollower=createFieldFollower();
const followerParty=()=>followerDev?.speciesId?[{id:followerDev.speciesId}]:state?.party??[];
installAssetDOM();
const atlas=new Image();
loadAsset('legacy.monsters').then(a=>{atlas.src=a.src});
const trainerBoy=guardLegacyImage(new Image());
const trainerGirl=guardLegacyImage(new Image());
trainerBoy.src=TRAINER_SHEETS.boy.src;
trainerGirl.src=TRAINER_SHEETS.girl.src;
const trainerImages={boy:trainerBoy,girl:trainerGirl};
preloadRiderArt();

function speciesSpriteIndex(species){
  if(Number.isInteger(species?.sprite))return species.sprite;
  const number=Number(species?.dexNo??species?.id);
  return Number.isFinite(number)?(number-1)%10:0;
}
function legacySprite(index,width=70,extra=''){
  const trainer=index>=10;
  return `<span class="sprite ${extra}" style="width:${width}px;height:${Math.round(width*(trainer?372/384:8/9))}px;background-size:400% ${trainer?'275.268817':'300'}%;background-position:${(index%4)*100/3}% ${trainer?100:Math.floor(index/4)*50}%" aria-hidden="true"></span>`;
}
function monsterSprite(mon,width=70,side='front'){
  const species=BY_ID[mon?.id??mon];
  if(!species)return '';
  const markup=speciesArtMarkup(species.id,width,width<=88?'icon':side);
  if(markup)return markup;
  return legacySprite(speciesSpriteIndex(species),width,species.stage===3?'final-stage':'');
}
function battleMonsterSprite(mon,side){
  const dedicated=battleBackMarkup(mon,side);
  if(dedicated)return dedicated;
  const back=side==='ally'?speciesArtMarkup(mon,230,'back'):null;
  const art=back??speciesArtMarkup(mon,230,'front');
  if(art)return `<span class="battle-mon ${side} battle-species-wrap ${back?'has-back':''}">${art}</span>`;
  return monsterSprite(mon,230).replace('class="','class="battle-mon '+side+' ');
}
function drawLead(mon,x,y,width,renderCtx=ctx){
  if(!mon)return;
  const drawn=drawSpecies(renderCtx,mon,x,y,{width,side:'front'});
  if(drawn!==null)return;
  drawAtlas(speciesSpriteIndex(BY_ID[mon.id]),x,y,width,false,renderCtx);
}
function drawAtlas(index,x,y,width,flip=false,renderCtx=ctx){
  if(!atlas.complete||!atlas.naturalWidth)return;
  const sw=atlas.width/4;
  const sh=index>=10?atlas.height*372/1024:atlas.height/3;
  const sy=index>=10?atlas.height-sh:Math.floor(index/4)*sh;
  renderCtx.save();renderCtx.translate(x,y);if(flip)renderCtx.scale(-1,1);
  renderCtx.drawImage(atlas,(index%4)*sw,sy,sw,sh,-width/2,-width*sh/sw,width,width*sh/sw);
  renderCtx.restore();
}
function drawPlayer(x,y,frame,renderCtx=ctx){
  const selected=state?.gender==='girl'?'girl':'boy';
  const image=trainerImages[selected];
  if(image.complete&&image.naturalWidth)drawTrainer(renderCtx,image,{gender:selected,x,y,height:66,facing,frame,player:true});
}
function healthySurfMount(){return state?.party.find(mon=>mon.hp>0&&BY_ID[mon.id].types.some(type=>['물','바다'].includes(type)))??null}
function drawSurfRider(x,y,frame,renderCtx=ctx){
  const mount=healthySurfMount();if(!mount)return false;
  const drawn=drawSpecies(renderCtx,mount,x,y+12,{width:60,side:'back'});
  if(drawn===null)drawLead(mount,x,y+12,60,renderCtx);
  renderCtx.save();renderCtx.beginPath();renderCtx.rect(x-52,y-68,104,46);renderCtx.clip();drawPlayer(x,y,frame,renderCtx);renderCtx.restore();
  return true;
}
function types(species){return (species?.types??[]).map(type=>`<span class="type" data-type="${esc(type)}">${esc(type)}</span>`).join('')}
function dexLabel(species){return Number.isInteger(species?.id)?`No.${String(species.id).padStart(3,'0')}`:'이전판'}
function stoneName(key){return STONES?.[key]?.name??({forest:'숲결정',water:'물결결정',wind:'바람결정',light:'빛결정'}[key]??key)}

function tone(frequency,duration,delay,volume,type='triangle'){
  if(!soundCtx)return;
  const oscillator=soundCtx.createOscillator(),gain=soundCtx.createGain(),time=soundCtx.currentTime+delay;
  oscillator.type=type;oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.001,time+duration);
  oscillator.connect(gain);gain.connect(soundCtx.destination);oscillator.start(time);oscillator.stop(time+duration);
}
function beep(kind='tap'){
  if(!prefs.sound)return;
  try{
    soundCtx??=new (window.AudioContext||window.webkitAudioContext)();soundCtx.resume();
    const sequence={tap:[600],hit:[150,95],win:[523,659,784,1046],level:[440,554,659,880],capture:[659,523,784,1046],miss:[220,174],heal:[392,494,587,784],evolve:[330,440,554,659,880]}[kind]??[600];
    sequence.forEach((frequency,index)=>tone(frequency,.07,index*.09,prefs.sfx*.1,'square'));
  }catch{}
}
function startMusic(){
  clearInterval(melodyTimer);if(!prefs.sound)return;beep();
  const melody=[392,0,494,587,0,494,440,392,330,0,392,494,0,440,392,0];
  melodyTimer=setInterval(()=>{if(document.hidden||!soundCtx)return;const f=melody[musicStep++%melody.length];if(f)tone(battle?f*.75:f,.27,0,prefs.music*.055);if(musicStep%4===0)tone(130.81,.6,0,prefs.music*.04)},340);
}
function updateAudio(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch{}startMusic()}
function reducedMotion(){return prefs.fast||matchMedia('(prefers-reduced-motion: reduce)').matches}
function toast(message){
  const feedback=$('#modal-feedback');
  if(modal.open&&feedback){feedback.textContent=message;feedback.hidden=false;feedback.scrollIntoView({block:'nearest'});return}
  $('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3600);
}

function showModal(title,body,locked=false){
  if(goldenField)closeGoldenUI(goldenField);
  document.body.classList.remove('title-open');sliceNudges.length=0;
  clearDirections(directionInput);moveTarget=null;backAction=null;focusedControl=null;modalLocked=locked;modal.className='';
  document.activeElement?.blur();$('#toast').classList.remove('show');
  $('#modal-content').innerHTML=`<div class="modal-inner"><div class="modal-top"><h2 id="modal-title" tabindex="-1">${esc(title)}</h2>${locked?'':'<button class="close-button" data-close aria-label="닫기">×</button>'}</div><p id="modal-feedback" class="modal-feedback" role="status" hidden></p>${body}</div>`;
  if(!modal.open)modal.showModal();document.body.classList.add('modal-open');modal.scrollTop=0;$('#modal-content').scrollTop=0;$('#dialog-a').textContent='A 결정';
  $('#modal-title').focus({preventScroll:true});$('[data-close]')?.addEventListener('click',closeModal);
}
function closeModal(){if(modalLocked)return;document.activeElement?.blur();modal.close();document.body.classList.remove('modal-open');modal.className='';focusedControl=null;clearDirections(directionInput);setTimeout(()=>canvas.focus({preventScroll:true}),0);beep()}
function help(){showHelp()}
function showHelp(mode='controls',onClose=null){
 const panel=$('#help-modal');if(panel.open)return;
 releaseOpeningInput();helpFocus=document.activeElement;helpReturn=onClose;clearDirections(directionInput);moveTarget=null;openingQueuedDirection=null;
 const goal=goldenField?'생태센터 문으로 들어가거나, NPC 가까이에서 Z / A로 이야기를 나눠 보세요.':openingWorld?{room:'아래쪽 계단으로 내려가세요. 길이 막히면 가구를 돌아가세요.',home:'아래쪽 현관으로 나가세요.',town:'가운데 길을 따라 위쪽 연구소 문으로 들어가세요.',lab:'가운데 캡슐 테이블 바로 아래에 서서 Z / Enter로 조사하세요.'}[openingWorld.scene]:state?'지도에서 다음 지역을 확인하고, 지역 장치와 체육관에 도전하세요.':'이름을 정한 뒤 내 방 → 집 → 마을 → 연구소로 이동합니다.';
 const title=mode==='battle'?'첫 대결을 시작하기 전에':mode==='start'?'모험을 시작하기 전에':'조작 도움말';
 panel.innerHTML=`<h2 id="help-title" tabindex="-1">${title}</h2><p class="help-lead">${mode==='battle'?'싸운다 → 기술을 골라 사용하세요. HP가 0이 되면 쓰러집니다. 첫 연습 대결은 져도 회복하고 모험을 계속합니다.':(goldenField?'장승포 해안길에서 시작하는 거제 생태 탐험. 센터와 부두를 오가며 주민들의 이야기를 들어 보세요.':'거제의 숲과 바다에서 이상한 신호가 들려옵니다. 파트너를 만나 여덟 지역의 기록을 모아 주세요.')}</p><dl class="help-keys"><dt>이동 / 항목 선택</dt><dd>방향키 ↑ ↓ ← → 또는 W A S D · Shift와 함께 누르면 방향만 전환</dd><dt>말 걸기 / 조사 / 결정</dt><dd>Z 또는 Enter · 터치 화면은 A 버튼</dd><dt>뒤로 / 취소</dt><dd>X 또는 Esc · 터치 화면은 B 버튼</dd><dt>필드 메뉴</dt><dd>M 또는 Tab · 터치 화면은 메뉴</dd><dt>도움말 열기 / 닫기</dt><dd>H 또는 F1 · 닫기는 Esc도 가능</dd></dl><p class="help-goal"><strong>${mode==='battle'?'전투 요령':'지금 할 일'}</strong><br>${mode==='battle'?'야생 생태몬은 HP를 낮춘 뒤 가방의 아일볼로 포획하세요. 스타팅 세 계통은 야생에 나오지 않습니다.':goal}</p><p class="help-note">대사 아래 ▼가 보이면 Z / Enter를 눌러 계속하세요. 이름을 입력할 때는 한글 키보드도 사용할 수 있습니다.</p><button id="help-close">${mode==='controls'?'게임으로 돌아가기':'알겠어요 · 시작'}</button>`;
 panel.showModal();$('#help-close').onclick=closeHelp;$('#help-title').focus({preventScroll:true});panel.scrollTop=0;
}
function closeHelp(){const panel=$('#help-modal');if(!panel.open)return;panel.close();const callback=helpReturn;helpReturn=null;if(callback)callback();else if(helpFocus?.isConnected)helpFocus.focus({preventScroll:true});}
$('#help-modal').addEventListener('cancel',event=>{event.preventDefault();closeHelp()});
function requireState(){if(!state){welcome();return false}return !(battle||animating)}
modal.addEventListener('cancel',event=>{event.preventDefault();cancelAction()});
modal.addEventListener('close',()=>{document.body.classList.remove('modal-open');clearDirections(directionInput)});
modal.addEventListener('focusin',event=>{if(event.target.matches('#modal-content button:not([data-close])'))focusedControl=event.target});
$('#battle').addEventListener('focusin',event=>{if(event.target.matches('.battle-actions button,.battle-back'))focusedControl=event.target});

let activeSlot=launchRequest?.slot??'SLOT_1',ordinaryNew=false,newTicket=null,ordinaryAPI=null;
async function ordinarySlotsAPI(){if(!ordinaryAPI){const [{loadOrdinaryGameplayReleases},{createOrdinarySlots}]=await Promise.all([import('./ordinary/runtime-releases.mjs'),import('./ordinary/slots.mjs')]);ordinaryAPI=createOrdinarySlots(localStorage,await loadOrdinaryGameplayReleases())}return ordinaryAPI}
const menuTask=fn=>async()=>{try{await fn()}catch(e){toast(e.message)}};
function launchOrdinary(slot,namespace){requestLaunch(sessionStorage,slot,namespace);location.reload()}
async function ordinarySlotMenu(action='continue'){
 clearOpeningInput();state=null;goldenField=null;document.body.classList.remove('golden-active');
 const api=await ordinarySlotsAPI(),slots=['SLOT_1','SLOT_2','SLOT_3'].map(id=>api.summarize(id));
 showOpeningScreen(action==='new'?'새 모험 · 슬롯 선택':action==='files'?'저장 파일 · 슬롯 선택':'이어서 하기 · 슬롯 선택',`<div class="opening-save-menu">${slots.map(v=>`<button data-slot="${v.slot}">${v.slot} · ${v.empty?'비어 있음':esc([v.name,v.stage,v.badges!==undefined?'배지 '+v.badges+'개':null,v.savedAt?new Date(v.savedAt).toLocaleString('ko-KR'):null,v.namespace,v.recovered?'직전 저장 복구 가능':null,v.error?'저장 확인 필요: '+v.error:null].filter(Boolean).join(' · '))}</button>`).join('')}<button id="slots-back">돌아가기</button></div>`,'menu');
 for(const b of $$('[data-slot]'))b.onclick=menuTask(async()=>{
  activeSlot=b.dataset.slot;
  if(action==='files'){ordinaryFileMenu(api);return}
  if(action==='continue'){const v=api.read(activeSlot);launchOrdinary(activeSlot,v.contentNamespace);return}
  newTicket=api.stamp(activeSlot);const begin=()=>{ordinaryNew=true;newAdventure()};
  if(!api.store.has(activeSlot)){begin();return}
  showOpeningScreen('슬롯 덮어쓰기 확인',`<div class="opening-confirm"><p>${activeSlot}의 기존 모험을 백업한 뒤 새 모험으로 바꿀까요?</p><button id="confirm-new">새 모험 시작</button><button id="cancel-new">취소</button></div>`,'menu');
  $('#confirm-new').onclick=begin;$('#cancel-new').onclick=menuTask(()=>ordinarySlotMenu('new'));openingBack=()=>ordinarySlotMenu('new');
 });
 $('#slots-back').onclick=welcome;openingBack=welcome;openingAdvance=null;focusedControl=$('[data-slot]');focusedControl?.focus();
}
function ordinaryFileMenu(api){
 showOpeningScreen('저장 파일 · '+activeSlot,`<div class="opening-confirm"><p>대상 슬롯 ${activeSlot}</p><button id="file-export">선택 슬롯 내보내기</button><label class="field">파일 가져오기<input id="slot-file" type="file" accept="application/json,.json"></label><p id="slot-file-error" role="alert"></p><button id="file-back">슬롯 선택으로</button></div>`,'menu');
 $('#file-back').onclick=menuTask(()=>ordinarySlotMenu('files'));openingBack=()=>ordinarySlotMenu('files');openingAdvance=null;
 $('#file-export').onclick=menuTask(()=>{const out=api.exportFile(activeSlot),url=URL.createObjectURL(new Blob([out.text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=out.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 $('#slot-file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{
  if(file.size>1000000)throw Error('저장 파일이 너무 커요.');const raw=await file.text(),input=api.inspectImport(raw),ticket=api.stamp(activeSlot);
  showOpeningScreen('파일 가져오기 확인',`<div class="opening-confirm"><p>${activeSlot}에 ${esc(input.runtime.player?.name??input.profile.playerName??'저장된 모험')} 기록을 가져올까요? 기존 기록은 백업됩니다.</p><button id="file-confirm">가져오기</button><button id="file-cancel">취소</button><p id="slot-file-error" role="alert"></p></div>`,'menu');
  $('#file-cancel').onclick=()=>ordinaryFileMenu(api);openingBack=()=>ordinaryFileMenu(api);
  $('#file-confirm').onclick=()=>{try{api.importFile(ticket,raw,{confirmed:true});ordinaryFileMenu(api);$('#slot-file-error').textContent='가져오기 완료. 이어하기에서 선택하세요.'}catch(e){$('#slot-file-error').textContent=e.message}};
 }catch(e){$('#slot-file-error').textContent='파일을 적용하지 않았습니다. '+e.message}};
}
function rawSave(){try{const saved=saveSlots.load(activeSlot);return saved?.runtime?JSON.stringify(saved.runtime):activeSlot==='SLOT_1'?(localStorage.getItem(SAVE_KEY)||localStorage.getItem(V1_KEY)):null}catch{return null}}
function hasSave(){try{return saveSlots.has(activeSlot)}catch{return false}}
function archiveV1(raw){
  if(!raw)return;
  try{if(!localStorage.getItem(V1_ARCHIVE))localStorage.setItem(V1_ARCHIVE,raw)}catch{}
}
function clearOpeningInput(){releaseOpeningInput();openingHeldDirection=null;openingAdvance=null;openingBack=null;openingWorld=null;openingMoving=false;openingQueuedDirection=null;openingHeldDirection=null;clearInterval(openingTyping);openingTyping=null;clearTimeout(bootTimer);document.body.classList.remove('title-open')}
function showOpeningScreen(title,body,screen='dialogue'){
 releaseOpeningInput();
 clearInterval(openingTyping);openingTyping=null;showModal(title,`<div class="opening-frame opening-${screen}">${body}</div>`,true);modal.className=`opening-screen opening-${screen}`;document.body.classList.add('title-open');backAction=null;
 $('.opening-frame').insertAdjacentHTML('beforeend','<button class="opening-help" type="button">도움말 · H</button><span class="opening-key-hint">Z / Enter 결정 · X 돌아가기</span>');
 $('.opening-help').onclick=event=>{event.stopPropagation();showHelp()};
 if(screen==='title'||screen==='menu'){const install=document.createElement('button');install.type='button';install.className='opening-install';install.textContent='앱 설치';install.onclick=event=>{event.stopPropagation();document.getElementById('install-app')?.click()};$('.opening-frame').append(install)}
}
function typeOpeningText(text,onReady){
 const node=$('#opening-text');if(!node)return;let index=0;node.textContent='';clearInterval(openingTyping);
 const finish=()=>{clearInterval(openingTyping);openingTyping=null;node.textContent=text;onReady?.()};
 openingTyping=setInterval(()=>{node.textContent=text.slice(0,++index);if(index>=text.length)finish()},reducedMotion()?4:28);
 return finish;
}
function standingPortrait(role){return approvedStandingPortrait(role)}

function openingDialogue({title='윤 연구원',visual='',text,onNext,onBack,screen='dialogue'}){
 showOpeningScreen(title,`<div class="opening-visual">${visual}</div><div class="opening-textbox"><strong>${esc(title)}</strong><p id="opening-text" aria-live="polite"></p><i aria-hidden="true">▼</i></div>`,screen);
 let ready=false;const finish=typeOpeningText(text,()=>ready=true);openingAdvance=()=>{if(!ready){finish();ready=true;return}beep();onNext?.()};openingBack=onBack??null;
 $('.opening-frame').onclick=event=>{if(!event.target.closest('button,input'))openingAdvance?.()};
}

function titleScreen(){
 clearTimeout(bootTimer);showOpeningScreen('생태몬스터:거제도',`<button id="title-start" class="title-start" aria-label="생태몬스터:거제도 시작"><span class="title-stage approved-title">${approvedTitleMarkup()}</span></button>`,'title');
 $('#title-start').onclick=()=>{beep();welcome()};openingAdvance=()=>$('#title-start').click();openingBack=null;
}
function welcome(){
 clearOpeningInput();state=null;goldenField=null;ordinaryNew=false;document.body.classList.remove('golden-active');
 showOpeningScreen('시작 메뉴',`<span class="opening-menu-art">${approvedMenuArt()}</span><div class="opening-save-menu" role="menu"><button id="continue-start" role="menuitem">이어서 하기</button><button id="new-start" role="menuitem">새로운 모험</button><button id="import-start" role="menuitem">저장 파일 관리</button></div><p class="opening-menu-help">방향키 선택 · Z / Enter 결정 · H 도움말</p>`,'menu');
 $('#new-start').onclick=menuTask(()=>ordinarySlotMenu('new'));$('#continue-start').onclick=menuTask(()=>ordinarySlotMenu('continue'));$('#import-start').onclick=menuTask(()=>ordinarySlotMenu('files'));
 focusedControl=$('#continue-start');focusedControl.focus();openingAdvance=null;openingBack=titleScreen;
}
function readSliceSave(){try{return JSON.parse(localStorage.getItem(SLICE_SAVE_KEY)||'null')}catch{return null}}
function saveVerticalSlice(manual=false){
 if(!verticalSlice||battle||animating)return false;
 try{localStorage.setItem(SLICE_SAVE_KEY,JSON.stringify({slice:serializeSlice(verticalSlice),game:state,name:playerName}));if(manual)toast('새 아트 체험을 저장했어요.');return true}catch{return false}
}
function startVerticalSlice(){
 campaignSnapshot=state?{state,playerName,gender}:null;
 const saved=readSliceSave();verticalSlice=createSlice(saved?.slice);
 try{state=saved?.game?validateSave(saved.game):freshState(70,'boy')}catch{localStorage.removeItem(SLICE_SAVE_KEY);verticalSlice=createSlice();state=freshState(70,'boy');toast('손상된 체험 저장을 지우고 새 기록을 시작했어요.')}
 if(!saved?.game){state.party.push(createMonster(115,5));state.items.balls=Math.max(8,state.items.balls);state.items.potions=Math.max(3,state.items.potions)}
 playerName=saved?.name||'체험 탐험가';gender=state.gender;sessionStorage.setItem(SLICE_SESSION_KEY,'1');canvas.width=960;canvas.height=540;clearOpeningInput();modalLocked=false;modal.close();document.body.classList.add('slice-active');canvas.focus({preventScroll:true});toast('새 아트 체험: 사람과 건물에 말을 걸고 풀숲을 탐험해 보세요.');
}
function leaveVerticalSlice(){
 saveVerticalSlice();sessionStorage.removeItem(SLICE_SESSION_KEY);verticalSlice=null;document.body.classList.remove('slice-active');canvas.width=1200;canvas.height=800;
 if(campaignSnapshot){({state,playerName,gender}=campaignSnapshot);campaignSnapshot=null}else state=null;
 titleScreen();
}
function confirmNew(){
 showOpeningScreen('새로운 모험',`<div class="opening-confirm"><p>지금까지의 모험 위에 새 기록을 시작할까요?</p><button id="confirm-new">예</button><button id="cancel-new">아니요</button><button id="backup-first">저장 내보내기</button></div>`,'menu');
 $('#backup-first').onclick=()=>{try{exportData(validateSave(JSON.parse(rawSave())))}catch(error){toast(error.message)}};$('#confirm-new').onclick=newAdventure;$('#cancel-new').onclick=welcome;focusedControl=$('#confirm-new');focusedControl.focus();openingAdvance=null;openingBack=welcome;
}
function newAdventure(){
 try{archiveV1(localStorage.getItem(V1_KEY))}catch{}state=null;gender='boy';playerName='여행자';chosen=ordinaryNew?ordinaryAPI.catalog.starterIds[0]:STARTER_IDS[0];saveConflict=false;showHelp('start',()=>researcherIntro(0));
}
function researcherIntro(page=0){
 const pages=[
  '안녕! 거제의 생태 세계에 잘 왔다!',
  '나는 연구원 윤. 생태몬을 연구한단다.',
  '숲과 바다에서 이상한 신호가 들려와.',
  '파트너와 함께 신호의 원인을 찾아 주겠니?',
  '여덟 지역의 기록을 모으면 비밀이 풀릴 거야.',
  '먼저 네 이름과 모습을 알려 줘.',
  '그다음 연구소에서 첫 파트너를 만나자!'
 ];
 if(ordinaryNew){pages[1]='나는 생태몬을 연구하는 윤 박사란다.';pages[2]='요즘 야생 생태몬들이 평소와 다르게 움직이고 있어.';pages[3]='함께 그 이유를 살펴보겠니?';pages[4]='거제 곳곳의 생태를 기록하며 알아보자.'}
 const identity=openingIdentity(ordinaryNew),visual=`<div class="opening-portrait-stage">${standingPortrait(identity.researcherRole)}</div>`;
 openingDialogue({title:identity.researcher,visual,text:pages[page],onNext:()=>page<pages.length-1?researcherIntro(page+1):setupAvatar(),onBack:page?()=>researcherIntro(page-1):welcome});
}
function setupAvatar(){
 showOpeningScreen('모습 선택',`<div class="opening-avatar-stage"><div class="avatar-portrait-well">${standingPortrait(gender)}</div><div class="opening-avatar-menu" role="radiogroup" aria-label="모습 선택">${['boy','girl'].map((value,index)=>`<button class="avatar-choice ${gender===value?'selected':''}" data-gender="${value}" role="radio" aria-checked="${gender===value}">${index?'여자아이':'남자아이'}</button>`).join('')}</div></div><div class="opening-textbox"><strong>${openingIdentity(ordinaryNew).researcher}</strong><p id="avatar-question">이 모습으로 괜찮니?</p><button id="avatar-next">결정</button></div>`,'avatar');
 const choose=button=>{focusedControl=button;button.focus({preventScroll:true});gender=button.dataset.gender;$$('[data-gender]').forEach(card=>{const selected=card===button;card.classList.toggle('selected',selected);card.setAttribute('aria-checked',String(selected))});const portrait=$('.avatar-portrait-well .standing-portrait');portrait.className=`standing-portrait standing-${gender}`;portrait.setAttribute('aria-label',gender==='girl'?'여자아이 탐험가':'남자아이 탐험가');beep()};
 $$('[data-gender]').forEach(button=>button.onclick=()=>choose(button));$('#avatar-next').onclick=setupName;focusedControl=$(`[data-gender="${gender}"]`);focusedControl?.focus({preventScroll:true});openingAdvance=()=>{const card=document.activeElement?.closest?.('[data-gender]')??focusedControl?.closest?.('[data-gender]');if(card&&!card.classList.contains('selected'))choose(card);else $('#avatar-next').click()};openingBack=()=>researcherIntro(6);
}
function setupName(){
 const letterKeys='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),numberKeys='0123456789'.split('');
 showOpeningScreen('이름 입력',`<div class="opening-name-board"><div class="opening-name-card">${standingPortrait(gender)}<label for="name-input">너의 이름은?<input id="name-input" maxlength="8" value="${esc(playerName)}" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="text" enterkeyhint="done" placeholder="1~8글자 별명"></label><p id="name-error" role="alert"></p></div><div class="opening-name-tools"><span>추천 이름</span><div class="name-suggestions">${['바다','누리','솔빛','한결'].map(name=>`<button data-name-suggestion="${name}">${name}</button>`).join('')}</div></div><div class="opening-keyboard" aria-label="화면 이름 키보드"><div class="name-key-grid"></div><div class="name-key-actions"><button id="name-key-toggle" type="button">0-9</button><button data-name-key="space" type="button">띄어쓰기</button><button data-name-key="backspace" type="button">⌫ 지우기</button><button id="name-back" type="button">뒤로</button><button id="name-submit" type="button">결정</button></div></div></div>`,'name');
 const input=$('#name-input'),error=$('#name-error'),keyGrid=$('.name-key-grid');let keyMode='letters';
 const setValue=value=>{input.value=String(value).slice(0,8);error.textContent=''};
 const renderKeys=()=>{const keys=keyMode==='letters'?letterKeys:numberKeys;keyGrid.innerHTML=keys.map(key=>`<button type="button" data-name-key="${key}">${key}</button>`).join('');$('#name-key-toggle').textContent=keyMode==='letters'?'0-9':'A-Z'};
 const submit=()=>{const name=input.value.trim();if(!/^[가-힣a-zA-Z0-9 ]{1,8}$/.test(name)||/[0-9]{5}/.test(name)){error.textContent='한글·영문·숫자로 1~8글자를 입력해 주세요.';return}playerName=name;introduceRival()};
 renderKeys();$('.opening-name-board').onclick=event=>{const suggestion=event.target.closest('[data-name-suggestion]'),key=event.target.closest('[data-name-key]')?.dataset.nameKey;if(suggestion){setValue(suggestion.dataset.nameSuggestion);return}if(!key)return;if(key==='backspace')setValue([...input.value].slice(0,-1).join(''));else if(key==='space')setValue(input.value+' ');else setValue(input.value+key)};
 $('#name-key-toggle').onclick=()=>{keyMode=keyMode==='letters'?'numbers':'letters';renderKeys();beep()};$('#name-submit').onclick=submit;$('#name-back').onclick=setupAvatar;input.oninput=()=>{if([...input.value].length>8)input.value=[...input.value].slice(0,8).join('');error.textContent=''};input.onkeydown=event=>{if(event.isComposing){event.stopPropagation();return}if(event.key==='Enter'){event.preventDefault();event.stopPropagation();submit()}};focusedControl=$('#name-submit');openingAdvance=()=>{const active=document.activeElement;if(active?.matches('.opening-name-board button'))active.click();else submit()};openingBack=setupAvatar;
}
function introduceRival(){const identity=openingIdentity(ordinaryNew);openingDialogue({title:identity.researcher,visual:`<div class="opening-portrait-stage">${standingPortrait(identity.rivalRole)}</div>`,text:identity.rivalIntroduction,onNext:startHomeScene,onBack:setupName,screen:'rival'})}
function startHomeScene(){openingWorld=createIntroWorld('room',gender);renderOpeningWorld(`${playerName}, ${ordinaryNew?'윤 박사가':'윤 연구원이'} 연구소에서 기다리고 있어.`)}
function renderOpeningWorld(message=''){
 openingMoving=false;openingQueuedDirection=null;openingHeldDirection=null;
 const scene=openingWorld?.scene??'room';showOpeningScreen(INTRO_SCENE_LABELS[scene],`<canvas id="opening-world" width="960" height="640" aria-label="${esc(INTRO_SCENE_LABELS[scene])} 이동 장면"></canvas><span class="opening-place">${esc(INTRO_SCENE_LABELS[scene])}</span>${message?`<div class="opening-world-message"><p>${esc(message)}</p><i>▼</i></div>`:''}<div class="opening-map-controls" aria-label="인트로 이동 조작"><button data-opening-dir="up">▲</button><button data-opening-dir="left">◀</button><button data-opening-dir="down">▼</button><button data-opening-dir="right">▶</button><button data-opening-a>A</button></div>`,'world');
 drawIntroWorld($('#opening-world'),openingWorld);$$('[data-opening-dir]').forEach(button=>{const stop=event=>{openingHeldDirection=releaseDirection(openingDirectionInput,'pointer:'+event.pointerId);openingQueuedDirection=null};button.onpointerdown=event=>{event.preventDefault();event.stopPropagation();if($('.opening-world-message')){openingAdvance?.();return}button.setPointerCapture?.(event.pointerId);openingHeldDirection=pressDirection(openingDirectionInput,'pointer:'+event.pointerId,button.dataset.openingDir);openingMoveDirection(openingHeldDirection)};for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,stop);button.onpointermove=event=>{const r=button.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)stop(event)};button.onclick=event=>{event.stopPropagation();if(event.detail===0)openingMoveDirection(button.dataset.openingDir)}});$('[data-opening-a]').onclick=event=>{releaseOpeningInput();event.stopPropagation();openingAdvance?.()};
 $('#opening-world').onclick=event=>{if(message){openingAdvance?.();return}const r=event.currentTarget.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height,dx=x-(openingWorld.x+.5)/15,dy=y-(openingWorld.y+.5)/10;if(Math.abs(dx)<.1&&Math.abs(dy)<.15)openingInspect();else openingMoveDirection(Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down')};
 if(message)openingAdvance=()=>renderOpeningWorld();else openingAdvance=openingInspect;openingBack=null;$('.opening-key-hint').textContent=message?'Z / Enter 또는 A로 대사 닫기':'방향키 / WASD 이동 · Z / Enter 조사';
}
function openingMoveDirection(direction){
 if(!openingWorld||$('.opening-world-message'))return;if(openingMoving){openingQueuedDirection=direction;return}const previous=openingWorld,moved=moveIntroWorld(openingWorld,direction);openingWorld=moved.world;
 const messages={'stairs-up':'계단을 올라 내 방에 도착했다.','home-enter':'우리 집에 돌아왔다.','lab-exit':'연구소 문 앞에 나왔다.',stairs:'계단을 내려와 1층에 도착했다.',outside:'엄마가 손을 흔들었다. “연구소에 다녀오렴!”','town-warning':'혼자 마을 밖으로 나가면 위험해. 먼저 윤 연구원을 만나자.','lab-enter':'거제 생태 연구소에 들어왔다. 나루가 먼저 와 있다.'};if(ordinaryNew){messages['town-warning']='혼자 마을 밖으로 나가면 위험해. 먼저 윤 박사를 만나자.';messages['lab-enter']='거제 생태 연구소에 들어왔다. 하린이 먼저 와 있다.'}if(messages[moved.event])renderOpeningWorld(messages[moved.event]);
 else if(previous.scene===openingWorld.scene&&(previous.x!==openingWorld.x||previous.y!==openingWorld.y)){
  const canvasNode=$('#opening-world');
  const started=performance.now(),duration=145;openingMoving=true;
  const animate=now=>{if(!openingMoving||canvasNode!==$('#opening-world'))return;const progress=Math.min(1,(now-started)/duration),ease=progress;drawIntroWorld(canvasNode,{...openingWorld,x:previous.x+(openingWorld.x-previous.x)*ease,y:previous.y+(openingWorld.y-previous.y)*ease,walkFrame:progress<.5?1:2});if(progress<1)requestAnimationFrame(animate);else{openingMoving=false;drawIntroWorld(canvasNode,{...openingWorld,walkFrame:0});const queued=openingHeldDirection??openingQueuedDirection;openingQueuedDirection=null;if(queued)openingMoveDirection(queued)}};requestAnimationFrame(animate);
 }else drawIntroWorld($('#opening-world'),{...openingWorld,walkFrame:0});
}
function openingInspect(){
 if(!openingWorld)return;const found=inspectIntroWorld(openingWorld);
 if(found==='starters'){setupStarter();return}
 const messages={computer:'모험을 떠날 준비가 끝났다.',family:'“윤 연구원에게 예의 바르게 인사하렴.”', 'lab-sign':'간판: 거제 생태 연구소',nothing:'여기에는 특별한 것이 없다.'};if(ordinaryNew)messages.family='“윤 박사에게 예의 바르게 인사하렴.”';renderOpeningWorld(messages[found]);
}
function cancelCanonicalStarterSelection(){if(!ordinaryNew||!openingWorld||openingWorld.scene!=='lab'||!Number.isInteger(openingWorld.x)||!Number.isInteger(openingWorld.y)||openingWorld.x<0||openingWorld.x>=15||openingWorld.y<0||openingWorld.y>=10){toast('돌아갈 연구소 화면을 확인할 수 없어요. 파트너 선택 화면에서 다시 확인해 주세요.');return false}renderOpeningWorld();return true}
function canonicalStarterSelection(confirm=false){
 const catalog=ordinaryAPI.catalog,ids=catalog.starterIds,sp=catalog.getSpeciesById(chosen),art=id=>`<span class="species-art" style="display:inline-block;width:142px">${assetMarkup(catalog.resolveAssetId(id,'ui.icon'),catalog.getDisplayName(id))}</span>`;
 showOpeningScreen(confirm?'파트너 확인':'첫 파트너',confirm?`<div class="opening-partner-confirm">${art(chosen)}<h3>${esc(sp.name)}</h3></div><div class="opening-choice-box"><p>이 파트너와 모험을 시작할까요?</p><button id="confirm-starter">예</button><button id="back-avatar">아니요</button></div>`:`<div class="opening-lab-table"><span class="lab-researcher">윤</span><div class="starter-stations">${ids.map(id=>`<button class="starter-station ${chosen===id?'selected':''}" data-canonical-starter="${id}">${art(id)}<strong>${esc(catalog.getDisplayName(id))}</strong></button>`).join('')}</div></div><div class="opening-textbox"><p>${esc(sp.name)}. 이 파트너로 할까?</p><button id="begin-game">결정</button></div>`,confirm?'partner':'starter');
 if(confirm){$('#confirm-starter').onclick=menuTask(beginNewGame);$('#back-avatar').onclick=setupStarter;openingBack=setupStarter;focusedControl=$('#confirm-starter');focusedControl.focus();openingAdvance=null}
 else{for(const b of $$('[data-canonical-starter]'))b.onclick=()=>{chosen=b.dataset.canonicalStarter;canonicalStarterSelection()};$('#begin-game').onclick=()=>canonicalStarterSelection(true);openingAdvance=()=>canonicalStarterSelection(true);openingBack=cancelCanonicalStarterSelection}
}
function selectStarter(id){chosen=id;$$('[data-starter]').forEach(card=>{const selected=parseSpeciesId(card.dataset.starter)===chosen;card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',String(selected))});$('#starter-dialog-name').textContent=`${BY_ID[chosen].name}. 이 파트너로 할까?`;beep()}
function selectStarterByDelta(delta){if(ordinaryNew){const ids=ordinaryAPI.catalog.starterIds;chosen=ids[(ids.indexOf(chosen)+delta+ids.length)%ids.length];canonicalStarterSelection();return}const index=STARTER_IDS.indexOf(chosen);selectStarter(STARTER_IDS[(index+delta+STARTER_IDS.length)%STARTER_IDS.length])}
function setupStarter(){
 if(ordinaryNew){canonicalStarterSelection();return}
 showOpeningScreen('첫 파트너',`<div class="opening-lab-table"><span class="lab-researcher">윤</span><span class="lab-rival">나루</span><div class="starter-stations">${STARTER_IDS.map(id=>{const species=BY_ID[id];return `<button class="starter-station ${id===chosen?'selected':''}" data-starter="${dataId(id)}" aria-pressed="${id===chosen}"><span class="capsule" aria-hidden="true"></span>${monsterSprite(id,78)}<strong>${esc(species.name)}</strong><small><span class="station-type">${esc(species.types[0])}</span>${esc(species.real)}</small></button>`}).join('')}</div></div><div class="opening-textbox"><strong>윤 연구원</strong><p id="starter-dialog-name">${esc(BY_ID[chosen].name)}. 이 파트너로 할까?</p><button id="begin-game">결정</button></div>`,'starter');
 $$('[data-starter]').forEach(button=>button.onclick=()=>selectStarter(parseSpeciesId(button.dataset.starter)));$('#begin-game').onclick=confirmStarter;openingAdvance=confirmStarter;openingBack=()=>{openingWorld=createIntroWorld('lab',gender);renderOpeningWorld('세 개의 캡슐 중 함께할 파트너를 골라 보자.')};
}
function confirmStarter(){
 const species=BY_ID[chosen];showOpeningScreen('파트너 확인',`<div class="opening-partner-confirm">${monsterSprite(chosen,142)}<h3>${esc(species.name)}</h3><p>${types(species)} ${esc(species.real)}</p></div><div class="opening-choice-box"><p>${esc(species.name)}, 함께 모험을 시작할까?</p><button id="confirm-starter">예</button><button id="back-avatar">아니요</button></div>`,'confirm');
 $('#confirm-starter').onclick=beginNewGame;$('#back-avatar').onclick=setupStarter;focusedControl=$('#confirm-starter');focusedControl.focus();openingAdvance=null;openingBack=setupStarter;
}
function beginNewGame(){
 if(ordinaryNew){const saved=ordinaryAPI.newGame(newTicket,{starterId:chosen,playerName,appearance:gender},{confirmed:true});launchOrdinary(activeSlot,saved.contentNamespace);return}
 state=freshState(chosen,gender);state.journey.opening='first-battle';saveConflict=false;try{localStorage.setItem(NAME_KEY,playerName)}catch{}saveGame();startMusic();beep('win');openingRivalIntro(0);
}
function openingRivalIntro(page=0){
 const counter={115:70,67:115,70:67}[state?.party?.[0]?.id]??STARTER_IDS.find(id=>id!==state?.party?.[0]?.id);const lines=[`나루: 기다려, ${playerName}! 나도 ${BY_ID[counter].name}을 골랐어.`,`나루: 연구소를 나가기 전에 우리 파트너의 첫 승부를 해 보자!`];
 openingDialogue({title:'라이벌 나루',visual:`<div class="opening-portrait-stage">${standingPortrait('rival')}</div>`,text:lines[page],onNext:()=>page?showHelp('battle',()=>startOpeningBattle(counter)):openingRivalIntro(1),onBack:page?()=>openingRivalIntro(0):null,screen:'rival'});
}
function startOpeningBattle(counter){clearOpeningInput();modalLocked=false;startTeamBattle([[counter,5]],'rival',{rivalKey:'first',opening:true,trainerName:'나루'})}
function saveGame(manual=false){
  if(goldenField&&goldenEnvironmentStats().frozen)return false;
  if(goldenField?.core.qa){if(!manual&&!goldenField.core.defeated.length)return false;try{localStorage.setItem(FIELD_CORE_QA_SAVE,JSON.stringify(serializeGolden(goldenField)));return true}catch{return false}}
  if(!state||battle||animating)return false;
  if(verticalSlice)return saveVerticalSlice(manual);
  if(goldenField&&activeSlot==='SLOT_1')try{localStorage.setItem(GOLDEN_SAVE_KEY,JSON.stringify(serializeGolden(goldenField)))}catch{toast('지역 위치를 저장하지 못했어요.');return false}
  if(saveConflict){toast('다른 탭에서 진행이 바뀌었어요. 저장 화면에서 다시 불러와 주세요.');return false}
  try{
    const next=validateSave({...state,updatedAt:Date.now(),revision:(state.revision??0)+1});
    const saved=saveSlots.save(activeSlot,next,{playerName,field:goldenField?serializeGolden(goldenField):null});
    state=saved.runtime;
    if(manual)toast('모험을 이 기기에 저장했어요.');return true;
  }catch(error){toast('저장하지 못했어요. 저장 파일로 내보내 주세요.');return false}
}
function loadGame(backup=false){
  if(goldenField&&!backup){startGoldenField();return}
  try{
    const loaded=saveSlots.load(activeSlot,{backup});
    if(!loaded)throw Error('저장된 모험이 없어요.');
    state=requireCurrentRuntime(loaded);
    surfing=false;
    if(!fieldWalkable(currentRegion(),state,state.pos.x,state.pos.y,{surfing}))state.pos={x:49.5,y:44};
    playerName=loaded.profile.playerName||localStorage.getItem(NAME_KEY)||'여행자';saveConflict=false;modalLocked=false;modal.close();
    startMusic();beep('heal');
    if(state.journey.opening==='first-battle'){openingRivalIntro(0);return}
    clearOpeningInput();canvas.focus({preventScroll:true});toast(backup?'직전 저장을 복구했어요.':'다시 만나서 반가워요!');
  }catch(error){
    showModal('저장을 불러올 수 없어요',`<p class="modal-copy">${esc(error.message)}</p><div class="button-row"><button class="secondary-button" id="recover">직전 저장 복구</button><button class="secondary-button" id="go-welcome">처음 화면</button></div>`,!state);
    $('#recover').onclick=()=>loadGame(true);$('#go-welcome').onclick=welcome;
  }
}
window.addEventListener('storage',event=>{if(([SAVE_KEY,V1_KEY].includes(event.key)||event.key===SLOT_PREFIX+activeSlot+'.primary')&&state){saveConflict=true;clearDirections(directionInput);moveTarget=null;toast('다른 탭의 저장이 변경됐어요.')}});

async function startGoldenField(){
  clearTimeout(bootTimer);clearDirections(directionInput);sliceNudges.length=0;verticalSlice=null;
  sessionStorage.removeItem(SLICE_SESSION_KEY);
  let slot=null;
  try{slot=saveSlots.load(activeSlot);if(!slot&&launchRequest)throw Error('선택한 저장이 없습니다. 슬롯을 다시 확인하세요.');state=slot?requireCurrentRuntime(slot):freshState(70,'boy');if(!slot)state.journey.opening='complete'}catch(error){titleScreen();toast(error.message);return}
  playerName=slot?.profile.playerName||localStorage.getItem(NAME_KEY)||'여행자';saveConflict=false;
  let saved=slot?.profile.field??null;if(!saved&&activeSlot==='SLOT_1')try{saved=JSON.parse(localStorage.getItem(GOLDEN_SAVE_KEY)||'null')}catch{}
  configureGoldenQA(new URLSearchParams(location.search));
  const qaQuery=new URLSearchParams(location.search);
  const coreQA=import.meta.env?.DEV===true&&qaQuery.get('coreqa')==='1';
  let qaSave=null;if(coreQA&&qaQuery.get('resume')==='1')try{qaSave=JSON.parse(localStorage.getItem(FIELD_CORE_QA_SAVE)||'null')}catch{}
  if(coreQA){state=freshState(70,'boy');state.journey.opening='complete'}
  goldenField=createGoldenField(coreQA?qaSave:qaQuery.get("qa")==="1"?(qaQuery.get("pose")==="grass"?{scene:"outdoor",x:287,y:192,facing:"up"}:null):saved,{qa:coreQA,scenario:qaQuery.get('scenario')??'',movement:qaQuery.get('movement')??''});goldenField.humanId='player-'+(state.gender==='girl'?'girl':'boy');canvas.width=1536;canvas.height=1024;
  modalLocked=false;modal.close();document.body.classList.remove('slice-active','title-open','modal-open');document.body.classList.add('golden-active');
  canvas.dataset.renderer='golden-field-live';canvas.dataset.assetState='loading';
  try{await loadGoldenAssets();canvas.dataset.assetState='ready';canvas.focus({preventScroll:true});syncGoldenViewport()}
  catch(error){canvas.dataset.assetState='error';console.error(error);showModal('해안길을 불러오지 못했어요',`<p class="modal-copy">${esc(error.message)}</p><button id="reload-field" class="primary-button">다시 불러오기</button>`);$('#reload-field').onclick=startGoldenField}
}
function runGoldenInteraction(){
  if(!goldenField||!goldenAssetsReady()||goldenField.transition)return;
  clearDirections(directionInput);sliceNudges.length=0;
  const action=interactGolden(goldenField);
  const actions={dex,party:partyPanel,bag,explorer:explorerPanel,save:savePanel,settings};
  if(actions[action]){closeGoldenUI(goldenField);actions[action]();backAction=gameMenu}
  else if(action==='encounter'){startWild('land')}
  else if(action==='heal'){healParty(state);beep('heal');saveGame()}
  else if(action==='enter'||action==='exit'){saveGame();canvas.focus({preventScroll:true})}
}
function drawLiveGoldenFrame(dt){
  mapAudioRouter.update(mapPresentation(goldenField.scene),!!battle);
  updateGoldenCore(goldenField,dt,document.hidden||!!battle||modal.open||$('#help-modal').open||animating);
  if(fieldInputLocked(goldenField)){clearDirections(directionInput);sliceNudges.length=0;sliceKeyStarts.clear()}
  if(!goldenEnvironmentStats().frozen&&goldenAssetsReady()&&!battle&&!modal.open&&!$('#help-modal').open&&!animating&&!saveConflict){
    let direction=activeDirection(directionInput),delta=dt;
    const nudge=!direction?sliceNudges[0]:null;
    if(nudge){direction=nudge.direction;delta=Math.min(dt,nudge.remaining/260)}
    const before={x:goldenField.x,y:goldenField.y},transition=moveGolden(goldenField,direction,delta);
    if(nudge){const moved=Math.hypot(goldenField.x-before.x,goldenField.y-before.y);nudge.remaining-=moved;if(!moved||nudge.remaining<.1||transition)sliceNudges.shift()}
    if(transition){clearDirections(directionInput);sliceNudges.length=0;saveGame()}
  }else goldenField.moving=false;
  if(goldenField.core.battleReady&&!battle){
    const request=goldenField.core.pendingBattle;
    goldenField.core.battleReady=false; // Consume once, including asynchronous post-battle rewards.
    if(request?.kind==='trainer')beginBattle(createMonster(25,2),'trainer',[],{fieldTrainer:true,trainerId:request.trainerId,trainerName:'연습 탐험가',environment:'grass'});
    else if(request?.kind==='wild')startWild('land');
    if(!battle)finishFieldBattle(goldenField,'cancel');
  }
  updateGoldenGrass(goldenField);
  updateGoldenEnvironment(dt,document.hidden||!!battle||modal.open);
  goldenField.follower??=createFieldFollower();
  updateFieldFollower(goldenField.follower,goldenField,followerParty(),dt,{paused:document.hidden||!!battle||modal.open||$('#help-modal').open||animating||saveConflict||goldenEnvironmentStats().frozen,transition:!!goldenField.transition,jumping:goldenField.core.sequence?.kind==='ledge',canOccupy:(_scene,x,y)=>coreWalkable(goldenField,x,y)});
  canvas.dataset.fieldFollower=JSON.stringify({speciesId:goldenField.follower.speciesId,x:goldenField.follower.x,y:goldenField.follower.y,scene:goldenField.follower.scene,facing:goldenField.follower.facing,moving:goldenField.follower.moving,visible:goldenField.follower.visible,reason:goldenField.follower.reason});
  drawGoldenField(goldenNativeCtx,goldenField);
  ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(goldenNative,0,0,canvas.width,canvas.height);
  drawGoldenText(ctx,canvas.width/1536);
  canvas.dataset.fieldPosition=`${goldenField.x.toFixed(2)},${goldenField.y.toFixed(2)}`;
  canvas.dataset.fieldFacing=goldenField.facing;canvas.dataset.fieldScene=goldenField.scene;
  canvas.dataset.fieldMenu=goldenField.menu===null?'closed':GOLDEN_MENU[goldenField.menu];
  canvas.dataset.fieldDialogue=goldenField.dialogue[goldenField.dialogueIndex]??'';
  canvas.dataset.fieldTransition=goldenField.transition?.kind??'none';
  canvas.dataset.samplingDivisor=String(goldenSampleDivisor);
  canvas.dataset.imageSmoothing=String(ctx.imageSmoothingEnabled);canvas.dataset.bitmapFont=JSON.stringify(goldenTextStats());
  canvas.dataset.fieldAnimation=JSON.stringify(goldenEnvironmentStats());
  canvas.dataset.fieldCore=JSON.stringify({mode:goldenField.core.mode,lock:goldenField.core.lock,sequence:goldenField.core.sequence,steps:goldenField.core.steps,encounterChecks:goldenField.core.encounterChecks,terrain:behaviorAt(goldenField.scene,goldenField.x,goldenField.y).id,defeated:goldenField.core.defeated,area:goldenField.core.area,npcs:goldenField.core.npcs.filter(n=>n.map===goldenField.scene).map(n=>({id:n.id,x:Math.round(n.x),y:Math.round(n.y),facing:n.facing,movement:n.movement,paused:n.paused,defeated:n.defeated})),warnings:goldenField.core.warnings});
  canvas.dataset.fieldLayers='ground,decoration,collision-object,entity,foreground,vfx,ui';
  canvas.dataset.fieldTileCount='768';canvas.dataset.fieldObjectCount='21';canvas.dataset.walkFrame=goldenField.moving?String([1,3,2,3][Math.floor(goldenField.walk/26)%4]):'0';

}
function syncGoldenViewport(){
  if(!goldenField)return;
  const p=fieldPresentation(window.innerWidth,window.innerHeight,matchMedia('(pointer:coarse)').matches,window.devicePixelRatio);
  const {width,height,guide}=p;goldenSampleDivisor=p.divisor;
  if(canvas.width!==p.backingWidth||canvas.height!==p.backingHeight){canvas.width=p.backingWidth;canvas.height=p.backingHeight}
  canvas.dataset.devicePixelRatio=String(p.dpr);canvas.dataset.cssScale=String(width/canvas.width);canvas.dataset.physicalPixelScale=String(width*p.dpr/canvas.width);
  $('.play-key-guide').style.display=guide?'flex':'none';$('#menu-button').style.display=guide?'flex':'none';
  document.documentElement.style.setProperty('--golden-guide-display',guide?'flex':'none');
  document.documentElement.style.setProperty('--golden-width',width+'px');document.documentElement.style.setProperty('--golden-height',height+'px');
  document.documentElement.style.setProperty('--golden-left',p.left+'px');
  document.documentElement.style.setProperty('--golden-top',p.top+'px');
}
function drawFrame(time){
  approvedFieldUI.update(goldenField,{suppressed:!goldenField||!!battle||modal.open||$('#help-modal').open||!!goldenField?.transition});
  const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;
  if(goldenField){
    if(!goldenFpsStart)goldenFpsStart=time;
    goldenFpsFrames++;
    if(time-goldenFpsStart>=1000){canvas.dataset.renderFps=(goldenFpsFrames*1000/(time-goldenFpsStart)).toFixed(1);goldenFpsFrames=0;goldenFpsStart=time}
    drawLiveGoldenFrame(dt);requestAnimationFrame(drawFrame);return
  }
  const position=state?.pos??{x:49.5,y:44};let movement={distancePx:0,normalizedDistance:0,moved:false,facing:null};
  if(verticalSlice&&state&&!battle&&!modal.open&&!animating){
    const direction=activeDirection(directionInput),budget=112*dt;
    if(direction&&moveSlice(verticalSlice,direction,budget)){walkDistance+=budget;lastStep+=budget/32;if(lastStep>=1){lastStep=0;checkEncounter(time)}}
    else if(sliceNudges.length){
      const nudge=sliceNudges[0],distance=Math.min(budget,nudge.remaining),beforeX=verticalSlice.x,beforeY=verticalSlice.y;
      if(moveSlice(verticalSlice,nudge.direction,distance)){nudge.remaining-=Math.hypot(verticalSlice.x-beforeX,verticalSlice.y-beforeY);walkDistance+=distance}else sliceNudges.shift();
      if(sliceNudges[0]?.remaining<=.01)sliceNudges.shift();
    }else walkDistance=0;
  }else if(state&&!battle&&!modal.open&&!animating&&!saveConflict){
    const direction=activeDirection(directionInput),budget=(state.journey.cycling?180:110)*dt;
    const walkable=(x,y)=>fieldWalkable(currentRegion(),state,x,y,{surfing});
    if(direction){moveTarget=null;movement=stepCardinal(position,direction,budget,walkable)}
    else if(moveTarget?.length)movement=advanceRoute(position,moveTarget,budget,walkable);
    if(movement.facing)facing=movement.facing;
    if(movement.moved){Object.assign(position,movement.pos);walkDistance+=movement.distancePx;lastStep+=movement.normalizedDistance;while(lastStep>=1.7){state.steps++;lastStep-=1.7;checkEncounter(time)}}else walkDistance=0;
  }else walkDistance=0;
  if(modal.open&&modal.classList.contains('opening-screen')){requestAnimationFrame(drawFrame);return}
  if(verticalSlice){canvas.dataset.slicePosition=`${verticalSlice.x.toFixed(2)},${verticalSlice.y.toFixed(2)}`;canvas.dataset.sliceFacing=verticalSlice.facing;canvas.dataset.sliceScene=verticalSlice.scene;canvas.dataset.sliceQueue=String(sliceNudges.length);updateFieldFollower(sliceFollower,{...verticalSlice,facing:({front:'down',back:'up'})[verticalSlice.facing]??verticalSlice.facing},followerParty(),dt,{gap:24,speed:140,paused:document.hidden||!!battle||modal.open||animating,canOccupy:(_scene,x,y)=>sliceWalkable(verticalSlice,x,y)});mapAudioRouter.update(mapPresentation('slice-'+verticalSlice.scene),!!battle);drawSlice(ctx,verticalSlice,sliceFollower);drawResolvedEnvironment(ctx,geojeEnvironment.getFrame(mapPresentation('slice-'+verticalSlice.scene)),time,canvas.width,canvas.height);requestAnimationFrame(drawFrame);return}
  mapAudioRouter.update(mapPresentation(currentRegion()),!!battle);
  const camera=fieldCameraFor(position);
  fieldCtx.setTransform(1,0,0,1,0,0);fieldCtx.clearRect(0,0,fieldBuffer.width,fieldBuffer.height);fieldCtx.imageSmoothingEnabled=false;
  const fieldZoom=camera.zoom/FIELD_WORLD_PIXEL;
  fieldCtx.save();fieldCtx.setTransform(fieldZoom,0,0,fieldZoom,-camera.x*fieldZoom,-camera.y*fieldZoom);
  drawField(fieldCtx,currentRegion(),time,{surfing});
  const playerX=Math.round(position.x*12/FIELD_WORLD_PIXEL)*FIELD_WORLD_PIXEL,playerY=Math.round(position.y*8/FIELD_WORLD_PIXEL)*FIELD_WORLD_PIXEL,travelFrame=movement.moved?walkFrame(walkDistance):0;
  updateFieldFollower(campaignFollower,{x:position.x*12,y:position.y*8,scene:currentRegion().id,facing},surfing?[]:followerParty(),dt,{gap:36,speed:220,paused:document.hidden||!!battle||modal.open||animating||saveConflict,canOccupy:(_scene,x,y)=>fieldWalkable(currentRegion(),state,x/12,y/8,{surfing})});
  if(campaignFollower.y<=playerY)drawFieldFollower(fieldCtx,campaignFollower,{unitScale:.6});
  if(!surfing){fieldCtx.fillStyle='#384858';fieldCtx.fillRect(playerX-12,playerY-3,24,3)}
  if(surfing)drawSurfRider(playerX,playerY,travelFrame,fieldCtx);
  else if(state?.journey?.cycling){if(!drawRider(fieldCtx,state.gender,playerX,playerY,{facing,frame:travelFrame,height:72}))drawPlayer(playerX,playerY,travelFrame,fieldCtx)}
  else drawPlayer(playerX,playerY,travelFrame,fieldCtx);
  if(campaignFollower.y>playerY)drawFieldFollower(fieldCtx,campaignFollower,{unitScale:.6});
  fieldCtx.restore();
  drawResolvedEnvironment(fieldCtx,geojeEnvironment.getFrame(mapPresentation(currentRegion())),time,fieldBuffer.width,fieldBuffer.height);
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(fieldBuffer,0,0,canvas.width,canvas.height);
  requestAnimationFrame(drawFrame);
}
function goTo(point){
  if(!state||battle||modal.open||animating)return;
  const route=buildGridRoute(state.pos,point,(x,y)=>fieldWalkable(currentRegion(),state,x,y,{surfing}));
  if(!route){toast('이어진 길이나 물길을 선택해 주세요.');return}moveTarget=route;canvas.focus({preventScroll:true});
}
canvas.addEventListener('click',event=>{if(!state||verticalSlice||goldenField)return;goTo(fieldPointerTarget(event.clientX,event.clientY,canvas.getBoundingClientRect(),state.pos))});
function encounter(method){
  const picked=chooseWeightedEncounter(currentRegion().id,method,Math.random,state.journey);
  if(!picked)return null;
  if(picked.id!==undefined)return createMonster(picked.id,picked.level??picked.minLevel??currentRegion().level);
  return createMonster(picked.speciesId,picked.level??currentRegion().level);
}
function checkEncounter(time){
  if(time-lastEncounter<5000||battle)return;
  if(verticalSlice){if(zoneAt(verticalSlice)==='tall'&&++sliceEncounterSteps>=3){sliceEncounterSteps=0;lastEncounter=time;beginBattle(createMonster([13,25,139][Math.floor(Math.random()*3)],4),'wild',[],{environment:'grass',verticalSlice:true})}return}
  const zone=fieldZone(currentRegion(),state,state.pos.x,state.pos.y,{surfing});
  const method=zone==='water'?'surf':zone==='grass'?'land':null;
  if(method&&Math.random()<.17){const enemy=encounter(method);if(enemy){lastEncounter=time;moveTarget=null;beginBattle(enemy,'wild')}}
}

const dirKeys={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
window.addEventListener('keydown',event=>{
  if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.isComposing)return;
  const inputKey=/^Key[A-Z]$/.test(event.code)?event.code.slice(3).toLowerCase():event.key;const key=inputKey.toLowerCase();
  if($('#help-modal').open){if(['escape','h','f1','enter','z','x'].includes(key)){event.preventDefault();if(!event.repeat)closeHelp()}return}
  if(key==='h'||key==='f1'){event.preventDefault();if(!event.repeat)showHelp();return}
  if(modal.open||battle||animating){if(dirKeys[inputKey]){event.preventDefault();if(modal.matches('.opening-world')){if(!event.repeat){openingHeldDirection=pressDirection(openingDirectionInput,'keyboard:'+event.code,dirKeys[inputKey]);openingMoveDirection(openingHeldDirection)}}else if(modal.matches('.opening-starter'))selectStarterByDelta(['left','up'].includes(dirKeys[inputKey])?-1:1);else moveFocusDirection(dirKeys[inputKey]);return}if(['z','e'].includes(key)){event.preventDefault();if(!event.repeat)acceptAction();return}if(['x','escape'].includes(key)){event.preventDefault();if(!event.repeat)cancelAction();return}if(key==='enter'){event.preventDefault();if(!event.repeat)acceptAction()}return}
  if(goldenField&&(goldenField.menu!==null||goldenField.dialogue.length)){event.preventDefault();if(dirKeys[inputKey]){if(!event.repeat)moveGoldenMenu(goldenField,dirKeys[inputKey])}else if(['z','e','enter',' '].includes(key)&&!event.repeat)runGoldenInteraction();else if(['x','escape','m'].includes(key)&&!event.repeat){closeGoldenUI(goldenField);canvas.focus({preventScroll:true})}return}
  if(goldenField&&fieldInputLocked(goldenField))return;
  if(event.target.closest('button,a'))return;
  if(dirKeys[inputKey]){event.preventDefault();if(goldenField?.transition)return;if(goldenField&&event.shiftKey){goldenField.facing=dirKeys[inputKey];clearDirections(directionInput);sliceNudges.length=0;return}if((verticalSlice||goldenField)&&!event.repeat&&!sliceKeyStarts.has(event.code)){const field=goldenField??verticalSlice;sliceKeyStarts.set(event.code,{x:field.x,y:field.y,direction:dirKeys[inputKey]})}pressDirection(directionInput,'keyboard:'+event.code,dirKeys[inputKey])}
  if(['z','e','enter',' '].includes(key)){event.preventDefault();if(!event.repeat)interact()}
  if(['x'].includes(key)){event.preventDefault();clearDirections(directionInput);moveTarget=null}
  if(key==='escape'){event.preventDefault();if(!event.repeat)cancelAction()}
  if(key==='m'||key==='tab'){event.preventDefault();if(!event.repeat)gameMenu()}
});
window.addEventListener('keyup',event=>{releaseDirection(directionInput,'keyboard:'+event.code);const start=sliceKeyStarts.get(event.code);if(start&&(verticalSlice||goldenField)&&!(goldenField&&fieldInputLocked(goldenField))){const field=goldenField??verticalSlice;const moved=Math.hypot(field.x-start.x,field.y-start.y);if(moved<32)sliceNudges.push({direction:start.direction,remaining:32-moved})}sliceKeyStarts.delete(event.code);if(dirKeys[/^Key[A-Z]$/.test(event.code)?event.code.slice(3).toLowerCase():event.key]){openingHeldDirection=releaseDirection(openingDirectionInput,'keyboard:'+event.code);openingQueuedDirection=null}});window.addEventListener('blur',()=>{releaseOpeningInput();sliceKeyStarts.clear()});
window.addEventListener('orientationchange',releaseOpeningInput);window.addEventListener('resize',releaseOpeningInput);document.addEventListener('focusin',event=>{if(event.target.closest('input,textarea,select,[contenteditable]'))releaseOpeningInput()});
window.addEventListener('blur',()=>{clearDirections(directionInput);sliceNudges.length=0;moveTarget=null});
document.addEventListener('visibilitychange',()=>{releaseOpeningInput();clearDirections(directionInput);moveTarget=null;if(document.hidden)saveGame()});
$$('[data-dir]').forEach(button=>{button.onpointerdown=event=>{if(battle&&!battle.busy){event.preventDefault();moveFocusDirection(button.dataset.dir);return}if(!state||modal.open||battle||animating||(goldenField&&fieldInputLocked(goldenField)))return;event.preventDefault();if(goldenField?.menu!==null&&goldenField){moveGoldenMenu(goldenField,button.dataset.dir);return}if(goldenField?.dialogue.length)return;button.dataset.turnOnly=goldenField&&goldenField.facing!==button.dataset.dir?'1':'0';if(goldenField)goldenField.facing=button.dataset.dir;button.dataset.startX=(goldenField??verticalSlice)?.x??'';button.dataset.startY=(goldenField??verticalSlice)?.y??'';button.setPointerCapture(event.pointerId);pressDirection(directionInput,'pointer:'+event.pointerId,button.dataset.dir)};for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{releaseDirection(directionInput,'pointer:'+event.pointerId);if(type==='pointerup'&&!(goldenField&&fieldInputLocked(goldenField))&&(verticalSlice||goldenField)&&!(goldenField&&(goldenField.menu!==null||goldenField.dialogue.length))&&button.dataset.startX!==''){const field=goldenField??verticalSlice;const moved=Math.hypot(field.x-Number(button.dataset.startX),field.y-Number(button.dataset.startY));if(moved<32&&!(goldenField&&button.dataset.turnOnly==='1'&&moved<.1))sliceNudges.push({direction:button.dataset.dir,remaining:32-moved})}})});

function interact(){
  if(!requireState()||modal.open)return;
  if(goldenField){runGoldenInteraction();return}
  if(verticalSlice){
    const found=interactAt(verticalSlice);
    if(found.type==='grass')return beginBattle(createMonster(25,4),'wild',[],{environment:'grass',verticalSlice:true});
    saveVerticalSlice();
    if(found.type==='enter'||found.type==='exit'){toast(found.type==='enter'?found.label+'에 들어왔어요.':'마을로 돌아왔어요.');return}
    showModal(found.name,`<p class="slice-dialogue">${esc(found.text)}</p>`);return;
  }
  const zone=fieldZone(currentRegion(),state,state.pos.x,state.pos.y,{surfing});
  const p=state.pos,hotspot=fieldHotspotAt(currentRegion(),p.x,p.y);
  if(hotspot==='heal')return healAtCenter();
  if(hotspot==='gym')return gymIntro();
  if(hotspot==='lab')return lab();
  if(zone==='water')return surfPanel();
  if(zone==='shore')return shorePanel();
  if(zone==='grass')return grassPanel();
  routeSign();
}
function introStory(){
  showModal('고현 · 이상한 조류 신호',`<p class="modal-copy">연구원 윤이 거제 지도를 건넸습니다.<br><br>“숲과 바다의 관찰 장치에서 같은 신호가 반복되고 있어. 생태몬을 만나며 여덟 지역의 기록을 모아 줘.”</p><div class="notice">첫 도전은 거제면의 새싹 체육관입니다.</div><button class="primary-button" id="intro-done">여행을 시작한다</button>`,true);
  $('#intro-done').onclick=()=>{state.journey.rod=true;uniq(state.journey.story,'signal-start');modalLocked=false;closeModal();saveGame();toast('관찰 낚싯대와 거제 지도를 받았어요!')};
}
function completeOpening(result){
 healParty(state);state.journey.opening='complete';state.journey.rod=true;uniq(state.journey.story,'signal-start');state.pos={x:49.5,y:44};surfing=false;saveGame();
 const resultLine=result==='win'?'첫 승리까지 훌륭했어!':result==='lose'?'괜찮아. 파트너와 함께라면 다음에는 더 잘할 수 있어.':'승부를 멈추는 판단도 탐험가에게는 중요하단다.';
 openingDialogue({title:'윤 연구원',visual:`<div class="opening-reward-art">${monsterSprite(state.party[0],116)}<span class="map-token">거제 지도</span></div>`,text:`${resultLine} 관찰 낚싯대와 거제 지도를 줄게. 여덟 지역의 기록을 모아 보렴.`,onNext:()=>{modalLocked=false;clearOpeningInput();closeModal();canvas.focus({preventScroll:true});toast('관찰 낚싯대와 거제 지도를 받았어요!')}});
}
function lab(){
  const beat=nextStoryBeat(state.journey,state.badges);
  const complete151=SPECIES.every(species=>state.caught.includes(species.id));
  showModal(currentRegion().name+' · 생태 연구소',`<p class="modal-copy">“${esc(playerName)}, 기록은 잘 모이고 있니?”</p><div class="notice">만난 종 ${state.seen.filter(id=>Number.isInteger(id)).length}/151 · 포획한 종 ${state.caught.filter(id=>Number.isInteger(id)).length}/151<br>배지 ${state.badges.length}/8</div>${beat?`<p class="modal-copy">다음 이야기: ${esc(beat.title??beat.name??'새로운 기록')}</p>`:''}${complete151?'<div class="notice"><strong>151종 완성의 비밀</strong><br>온섬령과 함께 섬의 모든 생태 기록이 빛납니다. 연구소의 최고 기록을 달성했어요.</div>':''}<div class="button-row"><button class="primary-button" id="lab-dex">도감 확인</button>${state.badges.length===8?'<button class="primary-button" id="lab-league">섬 리그로</button>':''}<button class="secondary-button" id="lab-rival">나루와 연습 승부</button></div>`);
  $('#lab-dex').onclick=dex;$('#lab-league')?.addEventListener('click',leaguePanel);$('#lab-rival').onclick=rivalIntro;
  if(state.journey.champion&&STARTER_IDS.some(id=>!state.caught.includes(id))){const giftButton=document.createElement('button');giftButton.className='secondary-button';giftButton.id='protected-research';giftButton.textContent='보호종 동행 연구';giftButton.onclick=protectedStarterResearch;$('.button-row').append(giftButton)}
  if(beat){const storyButton=document.createElement('button');storyButton.className='secondary-button';storyButton.textContent='이야기 듣기';storyButton.onclick=()=>storyPanel(beat,lab);$('.button-row').append(storyButton)}
}
function protectedStarterResearch(){
 const missing=STARTER_IDS.filter(id=>!state.caught.includes(id));
 if(!state.journey.champion||!missing.length){toast('현재 신청할 수 있는 보호종 연구가 없어요.');return}
 showModal('보호종 동행 연구',`<p class="modal-copy">섬 리그 챔피언에게 아직 기록하지 못한 보호종의 돌봄 연구를 맡깁니다.</p><div class="starter-grid">${missing.map(id=>{const species=BY_ID[id];return `<button class="starter-card" data-protected-gift="${dataId(id)}">${monsterSprite(id,82)}<span class="starter-info"><strong>${esc(species.name)}</strong>${types(species)}<small>${esc(species.real)}</small></span></button>`}).join('')}</div><p class="support-note">각 보호종은 한 번만 동행할 수 있습니다. 파티가 차면 보관소로 이동합니다.</p>`);
 $$('[data-protected-gift]').forEach(button=>button.onclick=()=>{const id=parseSpeciesId(button.dataset.protectedGift);if(state.caught.includes(id)){protectedStarterResearch();return}if(state.party.length>=6&&state.box.length>=BOX_LIMIT){toast('파티와 보관소가 가득 찼어요. 자리를 만든 뒤 다시 신청해 주세요.');return}const mon=createMonster(id,5);const destination=state.party.length<6?state.party:state.box;destination.push(mon);uniq(state.caught,id);uniq(state.seen,id);saveGame();beep('capture');toast(`${BY_ID[id].name}이(가) ${destination===state.party?'파티':'보관소'}에 합류했어요!`);missing.length>1?protectedStarterResearch():lab()});
}
function grantAcquisitions(){
  const gained=[];
  for(const key of availableAcquisitions(state.journey,state.badges)){state.journey[key]=true;gained.push(key)}
  return gained.map(key=>({rod:'관찰 낚싯대',bike:'접이식 자전거',boat:'조사선 승선증',surf:'파도타기'}[key]??key));
}
function storyPanel(beat,after=routeSign){
  showModal(beat.title,`<span class="eyebrow">${esc(beat.speaker)}</span><p class="modal-copy">“${esc(beat.text)}”</p><button class="primary-button" id="story-record">기록한다</button>`);
  $('#story-record').onclick=()=>{uniq(state.journey.story,beat.id);const gained=grantAcquisitions();saveGame();if(gained.length)toast(gained.join(' · ')+'을(를) 받았어요!');after()};
}
function grassPanel(){
  showModal(currentRegion().name+' · 풀숲',`<p class="modal-copy">풀잎 사이에서 생태몬의 움직임이 들려요.</p><div class="button-row"><button class="primary-button" id="search-grass">주변 탐색</button><button class="secondary-button" id="observe">식생 관찰</button><button class="secondary-button" id="hidden-search">숨은 곳 살피기</button>${legendButtons('land')}</div>`);
  $('#search-grass').onclick=()=>startWild('land');$('#observe').onclick=observeRegion;$('#hidden-search').onclick=hiddenItem;bindLegendButtons();
}
function shorePanel(){
  showModal(currentRegion().name+' · 해안',`<p class="modal-copy">파도와 바위 틈에서 생태몬의 기척이 느껴져요.</p><div class="button-row"><button class="primary-button" id="search-shore">해안 탐색</button><button class="secondary-button" id="fish">낚시</button><button class="secondary-button" id="surf">파도타기</button>${state.journey.champion&&currentRegion().id==='port'&&state.journey.boat?'<button class="secondary-button" id="boat-island">배로 지심도 이동</button>':''}${legendButtons('rod')}${legendButtons('boat')}</div>`);
  $('#search-shore').onclick=()=>startWild(availableEncounterPool(currentRegion().id,'land',state.journey).length?'land':'rod');$('#fish').onclick=fish;$('#surf').onclick=toggleSurf;$('#boat-island')?.addEventListener('click',()=>travel('island',true));bindLegendButtons();
}
function surfPanel(){
  showModal('파도타기',`<p class="modal-copy">현재 물길을 탐색하고 있어요.</p><div class="button-row"><button class="primary-button" id="surf-find">물길 탐색</button><button class="secondary-button" id="surf-land">육지로 돌아가기</button>${legendButtons('surf')}</div>`);
  $('#surf-find').onclick=()=>startWild('surf');$('#surf-land').onclick=toggleSurf;bindLegendButtons();
}
function legendButtons(method){
  return LEGEND_ENCOUNTERS.filter(entry=>entry.regionId===currentRegion().id&&(entry.method??'land')===method&&canEncounterLegend(entry.id,state)&&!state.caught.includes(entry.id)).map(entry=>`<button class="secondary-button" data-legend="${dataId(entry.id)}">${esc(entry.title??'신비한 기척')}</button>`).join('');
}
function bindLegendButtons(){$$('[data-legend]').forEach(button=>button.onclick=()=>legendIntro(parseSpeciesId(button.dataset.legend)))}
function legendIntro(id){
  const species=BY_ID[id],entry=LEGEND_ENCOUNTERS.find(value=>value.id===id);
  showModal('특별한 기척',`<div class="detail-layout">${monsterSprite(id,150)}<div><h2>${esc(species.name)}</h2>${types(species)}<p class="modal-copy">${esc(entry?.intro??'섬의 깊은 곳에서 강한 기운이 다가옵니다.')}</p></div></div><div class="button-row"><button class="primary-button" id="legend-start">전투 시작</button></div>`);
  $('#legend-start').onclick=()=>{uniq(state.journey.legendsSeen,id);closeModal();beginBattle(createMonster(id,entry?.level??55),'legend',[],{legendId:id,method:entry?.method,environment:entry?.method==='boat'?'boat':entry?.method==='land'?'grass':'coast'})};
}
function startWild(method){const enemy=encounter(method);if(!enemy){toast('아직 이곳에서 만날 수 있는 생태몬이 없어요.');return}closeModal();lastEncounter=performance.now();beginBattle(enemy,'wild',[],{environment:method==='land'?'grass':method==='boat'?'boat':'coast'})}
function fish(){if(!state.journey.rod){toast('고현 연구소에서 낚싯대를 받아야 해요.');return}showModal('낚시',`<p class="modal-copy">찌가 크게 흔들립니다!</p><button class="primary-button" id="fish-reel">낚싯줄 당기기</button>`);$('#fish-reel').onclick=()=>startWild('rod')}
function toggleSurf(){
  if(!state.journey.surf){toast('수평선 배지를 얻고 이야기를 기록하면 파도타기를 배워요.');return}
  if(!surfing&&!healthySurfMount()){toast('건강한 물 또는 바다 타입 생태친구가 필요해요.');return}
  surfing=!surfing;
  if(surfing)state.journey.cycling=false;
  state.pos=surfing?{x:48,y:78}:{x:48,y:74};
  modalLocked=false;modal.close();saveGame();toast(surfing?'파트너와 물길로 들어갔어요.':'해안으로 돌아왔어요.');
}
function healAtCenter(){
  showModal(currentRegion().name+' 생태센터',`<p class="modal-copy">파티 전체를 회복할까요?</p><div class="button-row"><button class="primary-button" id="heal-confirm">모두 회복</button><button class="secondary-button" id="shop-open">상점</button></div>`);
  $('#heal-confirm').onclick=()=>{healParty(state);saveGame();closeModal();beep('heal');toast('모두 건강해졌어요!')};$('#shop-open').onclick=shop;
}
function shop(){
  const stoneRows=Object.entries(STONES??{}).map(([key,stone])=>[key,'◆',stone.name,stone.description??'특정 생태몬을 진화시켜요.',stone.price??300]);
  const rows=[['balls','◈','아일볼','야생 생태몬 포획',30],['potions','＋','회복약','HP 30 회복',40],...stoneRows];
  showModal('탐험 물품 상점',`<p class="modal-copy">보유 코인 <strong>${state.coins}</strong></p>${rows.map(([key,icon,name,description,cost])=>`<div class="item-row"><span class="item-icon">${icon}</span><div class="item-info"><strong>${esc(name)}</strong><p>${esc(description)} · 보유 ${state.items[key]??0}</p></div><button class="secondary-button" data-buy="${esc(key)}" data-cost="${cost}">${cost}코인</button></div>`).join('')}`);
  $$('[data-buy]').forEach(button=>button.onclick=()=>{const cost=Number(button.dataset.cost);if(state.coins<cost){toast('코인이 부족해요.');return}state.coins-=cost;state.items[button.dataset.buy]=(state.items[button.dataset.buy]??0)+1;saveGame();shop();beep()});
}

function gymIntro(){
  const gym=GYM_BY_REGION[currentRegion().id];
  if(!gym){toast('이 지역에는 공식 도전이 없어요.');return}
  const required=GYMS.indexOf(gym),unlocked=state.badges.length>=required||state.badges.includes(gym.badge);
  if(!unlocked){showModal(gym.name??currentRegion().challenge,`<p class="modal-copy">앞선 지역 도전을 먼저 마쳐야 해요.</p><div class="notice">다음 목표: ${esc(nextChallenge().challenge)}</div>`);return}
  const puzzleState=state.journey.gymPuzzles?.[gym.regionId]??createGymPuzzleState(gym.regionId);
  if(!gymPuzzleSolved(gym.regionId,puzzleState))return gymPuzzle(gym,puzzleState);
  const completed=state.journey.gymTrainers?.[gym.regionId]??[];
  const trainer=gym.trainers.find(value=>!completed.includes(value.id));
  if(trainer)return trainerIntro(gym,trainer);
  if(state.badges.includes(gym.badge)){showModal(gym.name??currentRegion().challenge,`<p class="modal-copy">${esc(gym.leader.win??'이 지역의 도전을 완수했어요.')}</p><div class="notice">${esc(REGION_BY_ID[gym.regionId].badgeName)} 배지 획득 완료</div>`);return}
  leaderIntro(gym);
}
function gymPuzzle(gym,puzzleState){
  const puzzle=gym.puzzle,prompt=puzzle.instructions??'올바른 순서로 길을 열어 보세요.',view=puzzleView(puzzle,puzzleState);
  showModal(`${gym.name} · ${puzzle.title}`,`<p class="modal-copy">${esc(prompt)}</p>${view.status}<div class="puzzle-board">${view.actions}</div>${view.hint}<p class="support-note">조작 ${puzzleState.moves}회 · 틀려도 다시 시도할 수 있어요.</p>`);
  $$('[data-puzzle]').forEach(button=>button.onclick=()=>{try{const next=applyGymPuzzleAction(gym.regionId,puzzleState,button.dataset.puzzle);state.journey.gymPuzzles[gym.regionId]=next;saveGame();if(gymPuzzleSolved(gym.regionId,next)){beep('win');toast('도전의 길이 열렸어요!');gymIntro()}else gymPuzzle(gym,next)}catch(error){toast(error.message)}});
  $('#puzzle-repeat')?.addEventListener('click',()=>{const sequence=puzzle.sequence.map(value=>puzzle.labels[value]).join(' → ');$('#puzzle-hint').textContent=sequence;beep()});
}
function puzzleView(puzzle,puzzleState){
  const arrows=['↑','→','↓','←'],nodeLabels={gate:'입구',field:'들판',well:'우물',wall:'돌담',yard:'마당',ridge:'능선',summit:'정상',dock:'부두',blue:'푸른 물길',foam:'물거품',eddy:'소용돌이',rock:'바위',channel:'수로',exit:'출구'};
  if(['switch','gate'].includes(puzzle.kind)){
    const actions=(puzzle.kind==='gate'?puzzle.links:puzzle.labels).map((_,index)=>`<button data-puzzle="${index}">${esc(puzzle.labels[index])}<br>${puzzleState.bits[index]?'● 열림':'○ 닫힘'}</button>`).join('');
    return {status:`<p class="notice">현재 수로: ${puzzleState.bits.map(value=>value?'●':'○').join(' ')}</p>`,actions,hint:puzzle.kind==='gate'?'<p class="support-note">각 수문은 서로 이어진 두 수로를 함께 바꿉니다.</p>':''};
  }
  if(['maze','current'].includes(puzzle.kind)){
    const ways=puzzle.graph[puzzleState.position]??{},labels={up:'위로',down:'아래로',left:'왼쪽으로',right:'오른쪽으로'};
    return {status:`<p class="notice">현재 위치: <strong>${esc(nodeLabels[puzzleState.position]??puzzleState.position)}</strong> · 목표: ${esc(nodeLabels[puzzle.goal]??puzzle.goal)}</p>`,actions:Object.keys(ways).map(direction=>`<button data-puzzle="${direction}">${labels[direction]} → ${esc(nodeLabels[ways[direction]]??ways[direction])}</button>`).join(''),hint:''};
  }
  if(['rotate','beam'].includes(puzzle.kind)){
    const actions=puzzle.labels.map((label,index)=>`<button data-puzzle="${index}">${esc(label)}<br>${arrows[puzzleState.rotations[index]]} → 목표 ${arrows[puzzle.target[index]]}</button>`).join('');
    return {status:`<p class="notice">현재 방향 ${puzzleState.rotations.map(value=>arrows[value]).join(' ')}</p>`,actions,hint:'<p class="support-note">각 장치를 눌러 화살표를 목표 방향에 맞추세요.</p>'};
  }
  const labels=Object.entries(puzzle.labels);
  const entered=puzzleState.sequence.map(value=>puzzle.labels[value]).join(' → ')||'아직 입력하지 않음';
  return {status:`<p class="notice">입력: ${esc(entered)} · ${puzzleState.sequence.length}/${puzzle.sequence.length}</p>`,actions:labels.map(([id,label])=>`<button data-puzzle="${id}">${esc(label)}</button>`).join(''),hint:`<div class="button-row"><button class="secondary-button" id="puzzle-repeat">단서 다시 보기</button></div><p id="puzzle-hint" class="support-note">${puzzle.kind==='memory'?'빛난 꽃잎의 순서를 다시 볼 수 있어요.':'바람 깃발의 순서를 다시 볼 수 있어요.'}</p>`};
}
function trainerIntro(gym,trainer){
  showModal(`${gym.name??currentRegion().challenge} · ${trainer.name}`,`<p class="modal-copy">“${esc(trainer.intro)}”</p><p class="notice">${trainer.team.map(([id,level])=>`${esc(BY_ID[id].name)} Lv.${level}`).join(' · ')}</p><button class="primary-button" id="trainer-start">승부</button>`);
  $('#trainer-start').onclick=()=>startTeamBattle(trainer.team,'trainer',{gymRegion:gym.regionId,trainerId:trainer.id,trainerName:trainer.name});
}
function leaderIntro(gym){
  const leader=gym.leader;
  showModal(`${gym.name??currentRegion().challenge} · 관장 ${leader.name}`,`<span class="eyebrow">${esc(leader.title??REGION_BY_ID[gym.regionId].badgeName+' 배지')}</span><p class="modal-copy">“${esc(leader.intro)}”</p><p class="notice">${leader.team.map(([id,level])=>`${esc(BY_ID[id].name)} Lv.${level}`).join(' · ')}</p><button class="primary-button" id="leader-start">관장에게 도전</button>`);
  $('#leader-start').onclick=()=>startTeamBattle(leader.team,'leader',{gymRegion:gym.regionId,badge:gym.badge,gym});
}
function startTeamBattle(team,kind,meta={}){closeModal();const monsters=team.map(([id,level])=>createMonster(id,level));beginBattle(monsters.shift(),kind,monsters,meta)}
function nextChallenge(){return REGIONS.find(region=>region.badge&&!state.badges.includes(region.badge))??REGION_BY_ID.south}

function leaguePanel(){
  if(state.badges.length<8){toast('여덟 개의 배지가 필요해요.');return}
  const cleared=state.journey.league??[];
  const member=LEAGUE.find(value=>!cleared.includes(value.id));
  if(member){showModal('섬 리그',`<div class="league-list">${LEAGUE.map(value=>`<div class="league-member ${cleared.includes(value.id)?'cleared':''}"><strong>${esc(value.title??'리그')} ${esc(value.name)}</strong><br>${cleared.includes(value.id)?'승리 기록':'도전 대기'}</div>`).join('')}</div><p class="modal-copy">“${esc(member.intro)}”</p><button class="primary-button" id="league-start">${esc(member.name)}에게 도전</button>`);$('#league-start').onclick=()=>startTeamBattle(member.team,'league',{leagueId:member.id,memberName:member.name});return}
  if(!state.journey.champion){showModal('챔피언의 방',`<p class="modal-copy">“${esc(CHAMPION.intro)}”</p><p class="notice">${CHAMPION.team.map(([id,level])=>`${esc(BY_ID[id].name)} Lv.${level}`).join(' · ')}</p><button class="primary-button" id="champion-start">최종 승부</button>`);$('#champion-start').onclick=()=>startTeamBattle(CHAMPION.team,'champion',{championId:CHAMPION.id});return}
  endingPanel();
}
function endingPanel(){
  showModal('섬의 기록 · 엔딩',`<div class="badge-art">◆</div><h2>챔피언 ${esc(playerName)}!</h2><p class="modal-copy">여덟 지역의 기록과 리그 승리가 명예의 전당에 새겨졌습니다.</p><div class="notice">145~150번 특별 생태몬의 기록을 모으면 지심도에서 마지막 151번의 기척이 열립니다. 장승포의 조사선을 타고 새로운 탐험을 시작하세요.</div>${legendQuestMarkup()}<div class="button-row"><button class="primary-button" id="ending-record">여행 기록</button><button class="secondary-button" id="ending-field">계속 탐험</button></div>`);
  $('#ending-record').onclick=journalPanel;$('#ending-field').onclick=closeModal;
}
function rivalIntro(){
  const level=Math.max(8,8+state.badges.length*5),ids=STARTER_IDS.filter(id=>id!==state.party[0]?.id).slice(0,2);
  showModal('라이벌 · 나루',`<p class="modal-copy">“파트너와 얼마나 가까워졌는지 승부로 확인해 보자!”</p><button class="primary-button" id="rival-start">연습 승부</button>`);
  const keys=['first','first','north','north','port','port','south','south','final'];
  $('#rival-start').onclick=()=>startTeamBattle(ids.map(id=>[id,level]),'rival',{rivalKey:keys[Math.min(state.badges.length,8)]});
}

function showMonster(mon){
  const species=BY_ID[mon.id],maximum=stats(mon)[0],labels=['체력','공격','방어','특수공격','특수방어','속도'];
  showModal(species.name,`<div class="detail-layout">${monsterSprite(mon,150)}<div>${types(species)}<p class="modal-copy">${dexLabel(species)} · Lv.${mon.level}<br>HP ${mon.hp}/${maximum} · EXP ${mon.xp}/${xpNeeded(mon.level)}</p></div></div><div class="stats-grid">${stats(mon).map((number,index)=>`<div class="stat-line"><span>${labels[index]}</span><div class="bar"><i style="width:${clamp(number/160*100,0,100)}%"></i></div><strong>${number}</strong></div>`).join('')}</div><div class="move-list">${moveKeys(mon).map((key,index)=>{const move=moveInfo(mon,key);return `<div class="move-chip">${esc(move.name)} ${types({types:[move.type]})}<small>${move.kind==='physical'?'물리':move.kind==='special'?'특수':'변화'} · 위력 ${move.power||'—'} · PP ${mon.pp[index]}/${move.pp}</small></div>`}).join('')}</div><p class="support-note">기술 습득: Lv.8 · Lv.12 / 기술 강화: 진화 · Lv.20 · Lv.36 (최대 4개)</p><div class="notice">${species.evo?species.stone?`진화: ${stoneName(species.stone)} → ${esc(BY_ID[species.evo].name)}`:`진화: Lv.${species.evoLevel} → ${esc(BY_ID[species.evo].name)}`:'최종 형태'}</div><p class="support-note">모티프: ${esc(species.real)}<br>${esc(species.fact)}</p><div class="button-row">${state.party.includes(mon)?'<button class="secondary-button" id="make-lead">선두로</button>':''}${evolutionTarget(mon)?'<button class="primary-button" id="manual-evolve">진화</button>':''}</div>`);
  $('#make-lead')?.addEventListener('click',()=>{if(mon.hp<=0){toast('먼저 회복해 주세요.');return}const index=state.party.indexOf(mon);[state.party[0],state.party[index]]=[state.party[index],state.party[0]];saveGame();closeModal();toast(species.name+'가 선두가 되었어요.')});
  $('#manual-evolve')?.addEventListener('click',async()=>{closeModal();await evolutionScene(mon,evolutionTarget(mon));saveGame()});
}
function dex(query=''){
  if(!requireState())return;
  const filtered=SPECIES.filter(species=>`${species.id} ${species.name} ${species.real}`.toLowerCase().includes(query.toLowerCase()));
  showModal('생태몬 도감',`<div class="dex-tools"><label class="field">151종 검색<input id="dex-search" type="search" value="${esc(query)}" placeholder="이름, 번호, 모티프"></label><p>만남 ${state.seen.filter(id=>Number.isInteger(id)).length}/151 · 포획 ${state.caught.filter(id=>Number.isInteger(id)).length}/151</p></div><div class="list-grid">${filtered.map(species=>{const seen=state.seen.includes(species.id),caught=state.caught.includes(species.id);return `<button class="dex-card ${seen?'':'unseen'}" data-dex="${dataId(species.id)}">${monsterSprite(species,88)}<small>${dexLabel(species)} ${caught?'· 포획':''}</small><strong>${seen?esc(species.name):'???'}</strong><small>${seen?esc(species.real):'아직 만나지 못했어요'}</small></button>`}).join('')}</div>`);
  $('#dex-search').onchange=event=>dex(event.target.value);$('#dex-search').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();dex(event.target.value)}};
  $$('[data-dex]').forEach(button=>button.onclick=()=>{const id=parseSpeciesId(button.dataset.dex);if(!state.seen.includes(id)){toast('아직 만나지 못한 생태몬이에요.');return}const own=[...state.party,...state.box].find(mon=>mon.id===id);showMonster(own??createMonster(id,5));backAction=()=>dex(query)});
}
function partyPanel(mode='party'){
  const list=mode==='box'?state.box:state.party;
  showModal(mode==='box'?'생태몬 보관소':'나의 생태친구',`<p class="modal-copy">파티 ${state.party.length}/6 · 보관소 ${state.box.length}/${BOX_LIMIT}</p><div class="button-row"><button class="secondary-button" id="party-tab">파티</button><button class="secondary-button" id="box-tab">보관소</button></div><div class="party-list">${list.length?list.map((mon,index)=>`<div class="party-entry">${monsterSprite(mon,70)}<div class="entry-info"><strong>${esc(BY_ID[mon.id].name)}</strong>${types(BY_ID[mon.id])}<p>Lv.${mon.level} · HP ${mon.hp}/${stats(mon)[0]}</p></div><button class="secondary-button" data-detail="${index}">상세</button><button class="secondary-button" data-transfer="${index}">${mode==='box'?'데려오기':'보관'}</button></div>`).join(''):'<p class="modal-copy">보관된 생태몬이 없어요.</p>'}</div>`);
  $('#party-tab').onclick=()=>partyPanel();$('#box-tab').onclick=()=>partyPanel('box');
  $$('[data-detail]').forEach(button=>button.onclick=()=>{showMonster(list[Number(button.dataset.detail)]);backAction=()=>partyPanel(mode)});
  $$('[data-transfer]').forEach(button=>button.onclick=()=>{if(mode==='box'&&state.party.length>=6){toast('파티가 가득 찼어요.');return}if(mode==='party'&&(state.party.length<=1||state.box.length>=BOX_LIMIT)){toast(state.party.length<=1?'파티에는 최소 한 마리가 필요해요.':'보관소가 가득 찼어요.');return}const [mon]=list.splice(Number(button.dataset.transfer),1);(mode==='box'?state.party:state.box).push(mon);saveGame();partyPanel(mode)});
}
function bag(pocket='items'){
  if(!state)return;const pockets=[['items','도구'],['balls','볼'],['stones','진화'],['key','중요']];
  if(!pockets.some(([key])=>key===pocket))pocket='items';
  const rows=pocket==='items'?[{id:'potions',name:'회복약',count:state.items.potions,hint:'생태친구 한 마리의 HP를 30 회복합니다.'}]:pocket==='balls'?[{id:'balls',name:'아일볼',count:state.items.balls,hint:'야생 전투의 가방에서 사용합니다. 상대의 HP를 낮추면 포획하기 쉬워집니다.'}]:pocket==='stones'?Object.entries(STONES??{}).map(([id,stone])=>({id,name:stone.name,count:state.items[id]??0,hint:stone.description??'특정 생태친구를 진화시키는 결정입니다.'})):[
    {id:'rod',name:'낚싯대',owned:state.journey.rod,hint:'해안이나 선착장에서 A를 눌러 낚시를 시작합니다.'},
    {id:'bike',name:'자전거',owned:state.journey.bike,hint:'탐험가의 여행 기록에서 타거나 내릴 수 있습니다.'},
    {id:'surf',name:'물길 탐험',owned:state.journey.surf,hint:'물길 탐험을 배운 파트너와 해안에서 파도타기를 시작합니다.'}
  ].filter(row=>row.owned);
  showModal('탐험 가방',`<div class="bag-stage"><aside class="bag-left"><h2>${esc(pockets.find(([key])=>key===pocket)[1])}</h2><div class="bag-art" role="img" aria-label="노란 탐험 가방"></div><nav class="bag-pockets" aria-label="가방 분류">${pockets.map(([key,label])=>`<button data-pocket="${key}" aria-pressed="${pocket===key}">${label}</button>`).join('')}</nav></aside><section class="bag-list" aria-label="아이템 목록">${rows.map((row,index)=>`<button class="bag-item" data-bag-item="${index}"><span>${esc(row.name)}</span>${row.count===undefined?'':`<span>×${row.count}</span>`}</button>`).join('')}${rows.length?'':'<p class="bag-empty">아직 도구가 없어요.</p>'}<button class="bag-item" id="bag-shop">상점</button><button class="bag-item" id="bag-close">닫기</button></section><div class="bag-description" role="status"><span aria-hidden="true">▶</span><p id="bag-description">${esc(rows[0]?.hint??'분류를 바꾸어 가방을 살펴보세요.')}</p></div></div>`);
  modal.className='classic-bag';backAction=gameMenu;
  $$('[data-pocket]').forEach(button=>button.onclick=()=>bag(button.dataset.pocket));
  $$('[data-bag-item]').forEach(button=>{const row=rows[Number(button.dataset.bagItem)];button.onfocus=()=>$('#bag-description').textContent=row.hint;button.onpointerenter=button.onfocus;button.onclick=()=>{if(row.id==='potions'||STONES[row.id]){chooseItemTarget(row.id);backAction=()=>bag(pocket)}else $('#bag-description').textContent=row.hint}});
  $('#bag-shop').onclick=()=>{shop();backAction=()=>bag(pocket)};$('#bag-shop').onfocus=()=>$('#bag-description').textContent='코인으로 탐험에 필요한 도구를 구입합니다.';
  $('#bag-close').onclick=gameMenu;$('#bag-close').onfocus=()=>$('#bag-description').textContent='가방을 닫습니다.';
  focusedControl=$('.bag-item');focusedControl?.focus({preventScroll:true});
}
function chooseItemTarget(item){
  if(!(state.items[item]>0)){toast('이 아이템이 없어요.');return}
  showModal('누구에게 사용할까요?',`<div class="party-list">${state.party.map((mon,index)=>`<button class="party-entry" data-target="${index}">${monsterSprite(mon,65)}<span class="entry-info"><strong>${esc(BY_ID[mon.id].name)} · Lv.${mon.level}</strong><p>HP ${mon.hp}/${stats(mon)[0]}</p></span></button>`).join('')}</div>`);
  $$('[data-target]').forEach(button=>button.onclick=async()=>{const mon=state.party[Number(button.dataset.target)];if(item==='potions'){if(mon.hp<=0||mon.hp>=stats(mon)[0]){toast('지금은 사용할 수 없어요.');return}mon.hp=Math.min(stats(mon)[0],mon.hp+30);state.items[item]--;closeModal();beep('heal');saveGame()}else{const target=evolutionTarget(mon,item);if(!target){toast(`${stoneName(item)}에 반응하지 않아요.`);return}state.items[item]--;closeModal();await evolutionScene(mon,target);saveGame()}});
}

function gameMenu(){
  if(!requireState())return;
  if(goldenField&&fieldInputLocked(goldenField))return;
  if(goldenField){modalLocked=false;modal.close();document.body.classList.remove('modal-open');clearDirections(directionInput);sliceNudges.length=0;toggleGoldenMenu(goldenField);canvas.focus({preventScroll:true});return}
  const entries=[['dex','도감','만난 생태몬과 151종 기록을 확인합니다.'],['party','생태친구','파티와 보관소의 생태몬을 관리합니다.'],['bag','가방','도구와 진화의 돌을 사용합니다.'],['explorer','탐험가','지도, 이정표, 리그와 여행 기록을 봅니다.'],['save','저장','모험을 저장하거나 파일로 옮깁니다.'],['settings','설정','소리와 표시 설정을 바꿉니다.']];
  showModal('모험 메뉴',`<nav class="game-menu">${entries.map(([id,name,hint])=>`<button data-menu="${id}" data-hint="${esc(hint)}">${name}</button>`).join('')}</nav><p id="field-menu-description">${entries[0][2]}</p>`);modal.className='field-menu';placeFieldMenu();
  const actions={dex,party:partyPanel,bag,explorer:explorerPanel,save:savePanel,settings};
  $$('[data-menu]').forEach(button=>{const hint=()=>$('#field-menu-description').textContent=button.dataset.hint;button.onfocus=hint;button.onpointerenter=hint;button.onclick=()=>{actions[button.dataset.menu]();backAction=gameMenu}});focusedControl=$('[data-menu]');focusedControl?.focus({preventScroll:true});
}
function placeFieldMenu(){const rect=$('.world-frame').getBoundingClientRect();modal.style.setProperty('--field-left',rect.left+'px');modal.style.setProperty('--field-top',rect.top+'px');modal.style.setProperty('--field-width',rect.width+'px');modal.style.setProperty('--field-height',rect.height+'px')}
function explorerPanel(){
  if(goldenField){showModal('탐험가 · '+esc(playerName),`<p class="modal-copy">현재 위치: ${goldenField.scene==='interior'?'거제 생태센터 · 관찰 연구실':'장승포 해안길'}</p><p class="modal-copy">생태센터, 풀숲, 방파제와 부두를 직접 걸으며 둘러보세요.</p><button class="secondary-button" id="explore-help">조작 안내</button>`);$('#explore-help').onclick=help;backAction=gameMenu;return}
  if(verticalSlice){showModal('탐험가 · '+playerName,`<p class="modal-copy">현재 위치: ${verticalSlice.scene==='interior'?'생태 연구소 · 표본실':'고현 생태마을'}</p><div class="notice">이 체험에서는 마을, 연구소, NPC 대화, 풀숲 조우와 전투를 확인할 수 있어요.</div><button class="secondary-button" id="explore-help">조작 안내</button>`);$('#explore-help').onclick=help;backAction=gameMenu;return}
  showModal('탐험가 · '+playerName,`<div class="game-menu"><button id="explore-map">거제 지도</button><button id="explore-near">주변 이정표</button><button id="explore-journal">여행 기록</button><button id="explore-league" ${state.badges.length<8?'disabled':''}>섬 리그</button><button id="explore-help">조작 안내</button></div>`);
  $('#explore-map').onclick=worldPanel;$('#explore-near').onclick=routeSign;$('#explore-journal').onclick=journalPanel;$('#explore-league').onclick=leaguePanel;$('#explore-help').onclick=help;backAction=gameMenu;
}
function worldPanel(){
  const region=currentRegion();showModal('거제 여행 지도',`<p class="modal-copy">현재 위치: ${esc(region.name)}</p><div class="region-grid">${REGIONS.map(value=>`<button class="region-card ${value.id===region.id?'active':''}" data-region="${value.id}"><span>${state.journey.visited.includes(value.id)?'방문 기록':'미방문'}</span><h3>${esc(value.name)}</h3><p>${esc(value.area)}</p></button>`).join('')}</div>`);$$('[data-region]').forEach(button=>button.onclick=()=>regionInfo(button.dataset.region));
}
function directionTo(to){const from=currentRegion(),dx=to.x-from.x,dy=to.y-from.y;return (Math.abs(dy)>12?(dy<0?'북':'남'):'')+(Math.abs(dx)>12?(dx<0?'서':'동'):'')||'가까운'}
function routeSign(){
  const region=currentRegion(),beat=nextStoryBeat(state.journey,state.badges);if(beat)return storyPanel(beat,routeSign);
  const points=fieldPointsFor(region),hub=availableHubInteractions(region.id,state.journey)[0];showModal(region.name+' · 이정표',`<p class="modal-copy">${esc(region.note)}</p>${hub?`<div class="notice"><strong>${esc(hub.name)}</strong><br>${esc(hub.text)}</div>`:''}<div class="route-row">${region.neighbors.map(id=>{const value=REGION_BY_ID[id];return `<button data-travel="${id}">${directionTo(value)}쪽 → ${esc(value.name)}</button>`}).join('')}</div><div class="button-row"><button class="secondary-button" id="near-heal">생태센터</button><button class="secondary-button" id="near-challenge">${GYM_BY_REGION[region.id]?'지역 도전':'연구소'}</button><button class="secondary-button" id="near-grass">풀숲</button><button class="secondary-button" id="near-shore">해안</button></div>`);
  $$('[data-travel]').forEach(button=>button.onclick=()=>travel(button.dataset.travel));$('#near-heal').onclick=()=>{closeModal();goTo(points.heal)};$('#near-challenge').onclick=()=>{closeModal();goTo(GYM_BY_REGION[region.id]?points.gym:points.lab)};$('#near-grass').onclick=()=>{closeModal();goTo(points.grass)};$('#near-shore').onclick=()=>{closeModal();goTo(points.shore)};
}
function travel(id,byBoat=false){
  const region=currentRegion();const allowed=region.neighbors.includes(id)||(byBoat&&region.id==='port'&&id==='island'&&state.journey.boat&&state.journey.champion);
  if(!allowed){toast('이어진 이정표나 배를 이용해 주세요.');return}
  state.journey.region=id;surfing=false;if(byBoat)state.journey.cycling=false;uniq(state.journey.visited,id);state.pos={x:49.5,y:44};clearDirections(directionInput);moveTarget=null;lastEncounter=performance.now();modalLocked=false;modal.close();saveGame();canvas.focus({preventScroll:true});toast(REGION_BY_ID[id].name+'에 도착했어요.');
}
function regionInfo(id){const region=REGION_BY_ID[id],adjacent=currentRegion().neighbors.includes(id);showModal(region.name+' · 지역 안내',`<p class="modal-copy">${esc(region.area)}<br>${esc(region.note)}</p>${region.history?`<div class="notice"><strong>역사 기록</strong><br>${esc(region.history)}</div>`:''}<div class="button-row">${adjacent?'<button class="primary-button" id="region-go">이동</button>':''}<button class="secondary-button" id="region-back">지도</button></div>`);$('#region-go')?.addEventListener('click',()=>travel(id));$('#region-back').onclick=worldPanel;backAction=worldPanel}
function observeRegion(){const region=currentRegion();uniq(state.journey.observed,region.id);saveGame();showModal(region.plant+' · 관찰 기록',`<p class="modal-copy">${esc(region.note)}</p><div class="notice">${esc(region.name)}의 식생 관찰을 기록했어요.</div><button class="primary-button" id="observe-done">돌아가기</button>`);$('#observe-done').onclick=grassPanel}
function hiddenItem(){const region=currentRegion();if(state.journey.hiddenItems.includes(region.id)){toast('이미 살펴본 곳이에요.');return}uniq(state.journey.hiddenItems,region.id);state.items.balls+=3;saveGame();toast('아일볼 3개를 찾았어요!')}
function journalPanel(){
  const journey=state.journey;showModal('여행 기록',`<div class="record-grid"><div>방문 거점<strong>${journey.visited.length}/${REGIONS.length}</strong></div><div>식생 관찰<strong>${journey.observed.length}/${REGIONS.length}</strong></div><div>포획 종류<strong>${state.caught.filter(id=>Number.isInteger(id)).length}/151</strong></div><div>플레이 시간<strong>${Math.floor(journey.playSeconds/60)}분</strong></div></div><div class="badge-grid">${GYMS.map(gym=>`<div class="badge-token ${state.badges.includes(gym.badge)?'earned':''}"><b>${state.badges.includes(gym.badge)?'◆':'◇'}</b>${esc(REGION_BY_ID[gym.regionId].badgeName)}</div>`).join('')}</div><p class="notice">${journey.champion?'챔피언 기록 완료 · 특별 탐험을 시작하세요.':'다음 목표: '+(state.badges.length===8?'섬 리그':nextChallenge().name+' · '+nextChallenge().challenge)}</p>${journey.champion?legendQuestMarkup():''}<div class="button-row"><button class="secondary-button" id="bike-toggle">${journey.cycling?'자전거 내리기':'자전거 타기'}</button><button class="secondary-button" id="history-record">역사·지리 기록</button></div>`);
  $('#bike-toggle').onclick=()=>{if(surfing){toast('해안으로 돌아온 뒤 자전거를 탈 수 있어요.');return}if(!journey.bike){toast('두 번째 배지 뒤 자전거를 받을 수 있어요.');return}journey.cycling=!journey.cycling;saveGame();journalPanel()};$('#history-record').onclick=historyRecords;
}
function legendQuestMarkup(){
  return `<div class="league-list">${LEGEND_ENCOUNTERS.map(entry=>{const caught=state.caught.includes(entry.id),ready=canEncounterLegend(entry.id,state),region=REGION_BY_ID[entry.regionId];const method={land:'풀숲',surf:'물길',boat:'조사선'}[entry.method]??entry.method;return `<div class="league-member ${caught?'cleared':''}"><strong>${caught?'✓ ':ready?'◆ ':'◇ '}${esc(entry.title)}</strong><br>${caught?`${BY_ID[entry.id].name} 기록 완료`:ready?`${region.name} · ${method}에서 조사`:`${entry.id===151?'145~150번 기록 필요':'이야기와 탐험 도구가 더 필요'}`}</div>`}).join('')}</div>`;
}
function historyRecords(){showModal('거제 · 역사와 지리',`${REGIONS.filter(region=>region.history).map(region=>`<div class="notice"><strong>${esc(region.landmark??region.name)}</strong><br>${esc(region.history)}</div>`).join('')}<p class="support-note">거제시의 18개 면·동: ${ADMIN_AREAS.map(esc).join(' · ')}</p>`);backAction=journalPanel}

function exportData(data){const clean=validateSave(data),blob=new Blob([JSON.stringify(clean,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`geoje-monsters-${clean.saveCode}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function savePanel(fromStart=false){
  if(verticalSlice){showModal('새 아트 체험 저장',`<p class="modal-copy">현재 위치와 파티, 포획·전투 기록을 이 기기에 저장합니다.</p><div class="button-row"><button class="primary-button" id="manual-save">지금 저장</button><button class="secondary-button" id="slice-title">타이틀로</button></div><div class="notice">기존 모험 저장은 바뀌지 않습니다.</div>`);$('#manual-save').onclick=()=>saveVerticalSlice(true);$('#slice-title').onclick=leaveVerticalSlice;return}
  showModal('모험 저장 · '+activeSlot,`${state?`<div class="code-display">${esc(state.saveCode)}</div><p class="support-note">마지막 저장 ${new Date(state.updatedAt).toLocaleString('ko-KR')}</p>`:''}<div class="button-row"><button class="primary-button" id="manual-save" ${state?'':'disabled'}>지금 저장</button><button class="secondary-button" id="export-save" ${state||hasSave()?'':'disabled'}>파일 내보내기</button><button class="secondary-button" id="reload-save" ${hasSave()?'':'disabled'}>기기 저장 불러오기</button></div><label class="field">저장 파일 불러오기<input type="file" accept="application/json,.json" id="import-file"></label><p id="import-error" class="modal-error"></p><div class="notice">저장은 이 기기에만 보관됩니다. 기기를 옮기기 전 파일로 내보내세요.</div>${fromStart?'<button class="secondary-button" id="save-back">처음으로</button>':''}`,fromStart);
  $('#manual-save').onclick=()=>{saveGame(true);savePanel(fromStart)};$('#reload-save').onclick=()=>goldenField?startGoldenField():loadGame();$('#export-save').onclick=()=>{try{exportData(state??JSON.parse(rawSave()))}catch(error){$('#import-error').textContent=error.message}};$('#save-back')?.addEventListener('click',welcome);
  $('#import-file').onchange=async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>1000000)throw Error('저장 파일이 너무 커요.');const raw=await file.text();saveSlots.archive(raw);const parsed=JSON.parse(raw);if(parsed?.version===1)archiveV1(raw);const imported=requireCurrentRuntime(migrateSave(raw));showModal('이 모험을 불러올까요?',`<p class="modal-copy">${esc(imported.saveCode)} · 포획 ${imported.caught.length}종 · 배지 ${imported.badges.length}개</p><div class="button-row"><button class="primary-button" id="confirm-import">불러오기</button><button class="secondary-button" id="cancel-import">취소</button></div>`,true);$('#confirm-import').onclick=()=>{try{const result=saveSlots.importSave(activeSlot,raw,{playerName:'여행자'});if(!result.committed)throw Error('원본을 보존했으며 호환 확인이 필요합니다.');state=requireCurrentRuntime(result.prepared)}catch(error){toast(error.message);return}surfing=false;playerName='여행자';saveConflict=false;localStorage.removeItem(NAME_KEY);modalLocked=false;modal.close();saveGame();if(state.journey.opening==='first-battle')openingRivalIntro(0);else{clearOpeningInput();canvas.focus({preventScroll:true});toast('모험을 불러왔어요.')}};$('#cancel-import').onclick=()=>savePanel(fromStart)}catch(error){$('#import-error').textContent='파일을 읽을 수 없어요. '+error.message}};
}
function settings(){
  showModal('환경 설정',`<div class="settings-line"><span>소리</span><button class="secondary-button" id="sound-setting">${prefs.sound?'켜짐':'꺼짐'}</button></div><label class="settings-line">효과음 <input id="sfx-range" type="range" min="0" max="100" value="${prefs.sfx*100}"></label><label class="settings-line">배경음악 <input id="music-range" type="range" min="0" max="100" value="${prefs.music*100}"></label><label class="settings-line">빠른 연출 <input id="fast-setting" type="checkbox" ${prefs.fast?'checked':''}></label>${state?`<label class="field">게임 속 이름<input id="rename-input" maxlength="8" value="${esc(playerName)}"></label><button class="secondary-button" id="rename-button">이름 적용</button><div class="button-row"><button class="secondary-button" id="to-title">${goldenField?'저장하고 게임으로':'타이틀로'}</button></div>`:''}`);
  $('#sound-setting').onclick=()=>{prefs.sound=!prefs.sound;updateAudio();settings()};$('#sfx-range').oninput=event=>{prefs.sfx=Number(event.target.value)/100;localStorage.setItem(PREF_KEY,JSON.stringify(prefs))};$('#music-range').oninput=event=>{prefs.music=Number(event.target.value)/100;localStorage.setItem(PREF_KEY,JSON.stringify(prefs));startMusic()};$('#fast-setting').onchange=event=>{prefs.fast=event.target.checked;localStorage.setItem(PREF_KEY,JSON.stringify(prefs))};
  $('#rename-button')?.addEventListener('click',()=>{const name=$('#rename-input').value.trim();if(!/^[가-힣a-zA-Z0-9 ]{1,8}$/.test(name)||/[0-9]{5}/.test(name)){toast('1~8글자의 별명을 입력해 주세요.');return}playerName=name;if(!verticalSlice)localStorage.setItem(NAME_KEY,name);toast('이름을 바꿨어요.')});$('#to-title')?.addEventListener('click',()=>goldenField?(saveGame(),closeModal()):verticalSlice?leaveVerticalSlice():(saveGame(),welcome()));
}
function oldHelp(){showModal('모험 안내',`<ol class="log-list"><li>방향키/WASD로 이동하고 Z/Enter로 조사합니다. X는 취소, Esc는 메뉴입니다.</li><li>풀숲과 물길을 걸으면 야생 생태몬을 만납니다.</li><li>지역 장치를 풀고 트레이너를 이긴 뒤 관장에게 도전합니다.</li><li>여덟 배지를 모으면 연구소에서 섬 리그로 갈 수 있습니다.</li><li>야생 생태몬의 체력을 낮춘 뒤 아일볼을 사용합니다. 트레이너의 생태몬은 포획할 수 없습니다.</li><li>파티는 6마리, 보관소는 ${BOX_LIMIT}마리까지입니다.</li><li>엔딩 뒤 특별한 생태몬과 151종 완성의 비밀이 열립니다.</li></ol>`)}

function beginBattle(enemy,kind='wild',queue=[],meta={}){
  if(!state||battle||animating||saveConflict)return;
  if(!state.party.some(mon=>mon.hp>0)){toast('파티가 지쳤어요. 생태센터를 이용해 주세요.');return}
  saveGame();clearDirections(directionInput);moveTarget=null;const active=state.party.findIndex(mon=>mon.hp>0);
  const owner=meta.trainerName??meta.memberName??meta.gym?.leader?.name??(kind==='champion'?CHAMPION.name:null);
  const mapContext=battleMapContext({map:goldenField?goldenField.scene:verticalSlice?'slice-'+verticalSlice.scene:currentRegion(),opening:meta.opening,gym:kind==='leader',league:['league','champion'].includes(kind),battleBackgroundId:meta.battleBackgroundId});
  const background=resolveBattleBackground(mapContext),environment=({COAST:'coast',ROCKY_SHORE:'coast',INDOOR:'lab',GYM:'lab',LEAGUE:'lab'})[mapContext.biomeId]??'grass';
  battle={environment,background,mapContext,enemy,kind,queue:[...queue],active,menu:'main',log:isTrainerBattle(kind)?`${owner??'트레이너'}가 ${BY_ID[enemy.id].name}을 내보냈다!`:kind==='legend'?`${BY_ID[enemy.id].name}의 강한 기운이 다가왔다!`:`야생 ${BY_ID[enemy.id].name}이 나타났다!`,busy:false,guardA:0,guardE:0,participants:new Set([state.party[active].uid]),rewards:0,meta};
  uniq(state.seen,enemy.id);const entryOwner=battle;
  const showBattle=()=>{if(battle!==entryOwner)return;battle.busy=false;$('#battle').hidden=false;document.body.classList.add('in-battle');beep('hit');presentationAudio.emit(background.battleBgmId,{channel:'battle-bgm'});renderBattle();$('.battle-actions button:not(:disabled)')?.focus({preventScroll:true})};
  const coreCompleted=goldenField?.core.sequence?.phase==='battle';
  if(coreCompleted||reducedMotion()){presentationAudio.emit(background.battleTransitionSfxId??'battle.transition',{channel:'battle-transition'});showBattle()}else{battle.busy=true;playBattleEntry({element:canvas,sfxId:background.battleTransitionSfxId??'battle.transition'}).then(showBattle,showBattle)}
}
function combatCard(mon,side){const maximum=stats(mon)[0],hp=clamp(mon.hp/maximum*100,0,100),xp=clamp(mon.xp/xpNeeded(mon.level)*100,0,100);return `<div class="combat-card ${side}"><div class="combat-title"><span>${esc(BY_ID[mon.id].name)}${mon.status?' · '+(mon.status==='poison'?'중독':'둔화'):''}</span><span>Lv.${mon.level}</span></div><div class="combat-meter"><b>HP</b><div class="bar ${hp<30?'low':''}" role="meter" aria-valuemin="0" aria-valuemax="${maximum}" aria-valuenow="${mon.hp}"><i style="width:${hp}%"></i></div></div><div class="combat-hp">${side==='ally'?`${mon.hp} / ${maximum}`:'&nbsp;'}</div>${side==='ally'?`<div class="exp-meter"><b>EXP</b><div class="exp-bar"><i style="width:${xp}%"></i></div></div>`:''}</div>`}
function renderBattle(){
  if(!battle)return;const ally=state.party[battle.active],enemy=battle.enemy;let actions='';
  if(battle.menu==='moves'){actions=moveKeys(ally).map((key,index)=>{const move=moveInfo(ally,key);return `<button class="${move.name.length>7?'long-move':''}" data-move="${index}" ${ally.pp[index]<=0?'disabled':''}>${esc(move.name)}</button>`}).join('');if(ally.pp.slice(0,moveKeys(ally).length).every(value=>value===0))actions='<button data-struggle>마지막 힘</button>';actions+='<button data-bback>돌아가기</button>'}
  else if(battle.menu==='switch'){actions=state.party.map((mon,index)=>`<button data-switch="${index}" ${index===battle.active||mon.hp<=0?'disabled':''}>${esc(BY_ID[mon.id].name)}<small>Lv.${mon.level} · HP ${mon.hp}/${stats(mon)[0]}</small></button>`).join('');if(ally.hp>0)actions+='<button data-bback>돌아가기</button>'}
  else if(battle.menu==='bag'){actions=`<button data-command="capture" ${isTrainerBattle(battle.kind)||!state.items.balls?'disabled':''}>아일볼<small>${isTrainerBattle(battle.kind)?'트레이너전 사용 불가':state.items.balls+'개'}</small></button><button data-command="potion" ${!state.items.potions?'disabled':''}>회복약<small>${state.items.potions}개 · HP 30</small></button><button data-bback>돌아가기</button>`}
  else actions=`<button data-command="moves">싸운다</button><button data-command="bag">가방</button><button data-command="switch">생태친구</button><button data-command="run">${isTrainerBattle(battle.kind)?'중단':'도망'}</button>`;
  const backButton=actions.includes('data-bback')?'<button class="battle-back" data-bback>돌아가기 · X</button>':'';actions=actions.replace('<button data-bback>돌아가기</button>','');
  const moveDetail=battle.menu==='moves'?(()=>{const key=moveKeys(ally)[0],move=moveInfo(ally,key);return `<span id="selected-move-info">PP ${ally.pp[0]} / ${move.pp}<br>${esc(move.type)} · 위력 ${move.power||'—'}</span>`})():esc(battle.log);
  $('#battle').innerHTML=`<div class="battle-window ${battle.busy?'is-resolving':''}">${backButton}<button class="battle-help" aria-label="전투 도움말">도움말 · H</button><div data-asset-background="${battle.background.assetId}" data-biome="${battle.background.biomeId}" class="battle-field environment-${battle.environment} ${battle.captured?'capture-complete':''}">${verticalSlice?'<span class="slice-battle-ground" aria-hidden="true"><i class="enemy-ground"></i><i class="ally-ground"></i></span>':''}${combatCard(enemy,'enemy')}${battleMonsterSprite(enemy,'enemy')}${battleMonsterSprite(ally,'ally')}${combatCard(ally,'ally')}${battle.capturing||battle.captured?'<span class="capture-orb" aria-hidden="true"></span>':''}</div><div class="battle-bottom"><div class="battle-log ${battle.menu==='moves'?'move-info':''}" role="status" aria-live="polite">${moveDetail}</div><div class="battle-actions ${battle.menu==='main'?'is-main':'is-submenu'}" ${battle.busy?'inert aria-hidden="true"':''}>${actions}</div></div></div>`;
  applyCurrentBattleDisplay($('.battle-mon.enemy'),{namespace:'work-v2',speciesId:enemy.id},'front');applyCurrentBattleDisplay($('.battle-mon.ally'),{namespace:'work-v2',speciesId:ally.id},'back');
  $('.battle-help').onclick=()=>showHelp('battle');
  if(battle.busy)$$('.battle-actions button').forEach(button=>button.disabled=true);
  $$('[data-move]').forEach(button=>button.onfocus=()=>{const index=Number(button.dataset.move),key=moveKeys(ally)[index],move=moveInfo(ally,key),detail=$('#selected-move-info');if(detail)detail.innerHTML=`PP ${ally.pp[index]} / ${move.pp}<br>${esc(move.type)} · 위력 ${move.power||'—'}`});
  $$('[data-command]').forEach(button=>button.onclick=()=>command(button.dataset.command));$$('[data-move]').forEach(button=>button.onclick=()=>takeTurn(Number(button.dataset.move)));$('[data-struggle]')?.addEventListener('click',()=>takeTurn(-1));$('[data-bback]')?.addEventListener('click',()=>{if(!battle.busy){battle.menu='main';renderBattle()}});$$('[data-switch]').forEach(button=>button.onclick=()=>switchMonster(Number(button.dataset.switch)));
  if(!battle.busy&&!document.activeElement?.closest('.battle-actions')){focusedControl=$('.battle-actions button:not(:disabled)');focusedControl?.focus({preventScroll:true})}
}
async function playMotion(element,frames,duration){if(!element||reducedMotion()||typeof element.animate!=='function')return;const animation=element.animate(frames,{duration,easing:'ease-in-out',fill:'forwards'});try{await animation.finished}catch{}finally{animation.cancel()}}
async function battleMotion(side,key,outcome='hit'){const owner=battle,field=$('.battle-field'),actor=$('.battle-mon.'+side),target=$('.battle-mon.'+(side==='ally'?'enemy':'ally'));try{await playMoveEffect({field,actor,target,key,outcome,reduced:reducedMotion(),audioContext:prefs.sound?soundCtx:null,volume:prefs.sfx})}catch{}return battle===owner}
async function captureMotion(){const orb=$('.capture-orb'),enemy=$('.battle-mon.enemy');await playMotion(orb,[{left:'16%',top:'80%',transform:'rotate(0) scale(.6)'},{left:'45%',top:'5%',transform:'rotate(240deg)',offset:.5},{left:'75%',top:'48%',transform:'rotate(480deg)'}],650);await playMotion(enemy,[{opacity:1,scale:'1'},{opacity:0,scale:'.05'}],300);if(enemy)enemy.style.opacity='0';for(let i=0;i<3;i++){beep('tap');await playMotion(orb,[{rotate:'0deg'},{rotate:'-24deg'},{rotate:'24deg'},{rotate:'0deg'}],280);await wait(160)}}
async function say(message,delay=650){if(!battle)return;battle.log=message;renderBattle();await wait(delay)}
async function attack(attacker,defender,key,side){
  if(!battle||attacker.hp<=0)return;const owner=battle,move=moveInfo(attacker,key);
  if(move.kind==='heal'){battle.log=BY_ID[attacker.id].name+'의 '+move.name+'!';renderBattle();if(!await battleMotion(side,key)||battle!==owner)return;attacker.hp=Math.min(stats(attacker)[0],attacker.hp+Math.ceil(stats(attacker)[0]*.3));await say(BY_ID[attacker.id].name+'의 체력이 회복됐다!');return}
  if(move.kind==='guard'){battle.log=BY_ID[attacker.id].name+'의 '+move.name+'!';renderBattle();if(!await battleMotion(side,key)||battle!==owner)return;const guard=side==='ally'?'guardA':'guardE';battle[guard]=Math.min(3,battle[guard]+1);await say(BY_ID[attacker.id].name+'의 방어가 올랐다!');return}
  const result=calculateDamage(attacker,defender,key,Math.random,side==='ally'?battle.guardE:battle.guardA);battle.log=BY_ID[attacker.id].name+'의 '+move.name+'!';renderBattle();
  if(result.miss){if(!await battleMotion(side,key,'miss')||battle!==owner)return;await say('공격이 빗나갔다!');return}
  if(!await battleMotion(side,key)||battle!==owner)return;defender.hp=Math.max(0,defender.hp-result.damage);if(move.effect&&Math.random()<.3&&defender.hp>0)defender.status=move.effect;const extra=result.factor>1.1?' 효과가 굉장했다!':result.factor<.9?' 효과가 약했다.':'';await say(`${result.damage}의 피해!${extra}${result.critical?' 급소에 맞았다!':''}`);
}
async function enemyTurn(){if(!battle||battle.enemy.hp<=0)return;const enemy=battle.enemy,options=moveKeys(enemy).map((key,index)=>({key,index})).filter(value=>enemy.pp[value.index]>0&&MOVES[value.key].kind!=='heal'&&MOVES[value.key].kind!=='guard'),picked=randomOf(options)??{key:'struggle',index:-1};if(picked.index>=0)enemy.pp[picked.index]--;await attack(enemy,state.party[battle.active],picked.key,'enemy')}
async function afterRound(){if(!battle)return;for(const mon of [state.party[battle.active],battle.enemy])if(mon.status==='poison'&&mon.hp>0){mon.hp=Math.max(0,mon.hp-Math.max(1,Math.floor(stats(mon)[0]/12)));await say(BY_ID[mon.id].name+'가 독 피해를 입었다!')}await settle()}
async function takeTurn(index){
  if(!battle||battle.busy)return;const owner=battle,ally=state.party[battle.active],key=index<0?'struggle':moveKeys(ally)[index];if(index>=0&&(!key||ally.pp[index]<=0))return;const rollback=state.party.map(mon=>({mon,hp:mon.hp,pp:[...mon.pp],status:mon.status})).concat([{mon:battle.enemy,hp:battle.enemy.hp,pp:[...battle.enemy.pp],status:battle.enemy.status}]);const guards=[battle.guardA,battle.guardE];battle.busy=true;battle.menu='main';
  try{const enemy=battle.enemy,first=stats(ally)[5]*(ally.status==='slow'?.6:1)>=stats(enemy)[5]*(enemy.status==='slow'?.6:1);if(first){if(index>=0)ally.pp[index]--;await attack(ally,enemy,key,'ally');if(battle===owner&&enemy.hp>0)await enemyTurn()}else{await enemyTurn();if(battle===owner&&ally.hp>0){if(index>=0)ally.pp[index]--;await attack(ally,enemy,key,'ally')}}if(battle===owner)await afterRound()}catch(error){console.error('Battle turn failed',error);if(battle===owner){for(const snapshot of rollback)Object.assign(snapshot.mon,{hp:snapshot.hp,pp:snapshot.pp,status:snapshot.status});[battle.guardA,battle.guardE]=guards;battle.busy=false;battle.log='행동을 완료하지 못해 이 턴을 되돌렸어요. 다시 선택해 주세요.';renderBattle()}}
}
async function command(commandName){
  if(!battle||battle.busy)return;if(['moves','switch','bag'].includes(commandName)){battle.menu=commandName;renderBattle();return}const owner=battle;battle.busy=true;
  try{
    if(commandName==='potion'){const mon=state.party[battle.active];if(!state.items.potions||mon.hp>=stats(mon)[0]){battle.busy=false;await say('지금은 회복약을 사용할 수 없어요.',300);return}state.items.potions--;mon.hp=Math.min(stats(mon)[0],mon.hp+30);beep('heal');await say('회복약을 사용했다!');await enemyTurn();if(battle===owner)await afterRound()}
    else if(commandName==='capture'){
      if(isTrainerBattle(battle.kind)||!state.items.balls){battle.busy=false;renderBattle();return}if(state.party.length>=6&&state.box.length>=BOX_LIMIT){battle.busy=false;await say('보관소가 가득 찼어요.');return}
      const enemy=battle.enemy;state.items.balls--;battle.capturing=true;battle.log='아일볼을 던졌다…';renderBattle();await captureMotion();if(battle!==owner)return;battle.capturing=false;
      if(Math.random()<captureChance(enemy)){battle.captured=true;enemy.hp=Math.max(1,enemy.hp);(state.party.length<6?state.party:state.box).push(enemy);uniq(state.caught,enemy.id);uniq(state.seen,enemy.id);if(BY_ID[enemy.id].unique){uniq(state.legendCaught,enemy.id);uniq(state.journey.legendsCaught,enemy.id)}state.captures++;beep('capture');await say(`${BY_ID[enemy.id].name} 포획 성공!\n${state.party.includes(enemy)?'파티에 합류했다!':'보관소로 이동했다!'}`,900);await finishBattle('capture')}
      else{beep('miss');await playMotion($('.battle-mon.enemy'),[{opacity:0,transform:'scale(.1)'},{opacity:1,transform:'scale(1)'}],360);await say('아쉽게 빠져나왔다!');await enemyTurn();if(battle===owner)await afterRound()}
    }else if(commandName==='run'){await say(isTrainerBattle(battle.kind)?'도전을 중단하고 밖으로 나왔다.':'무사히 도망쳤다.',350);await finishBattle('run')}
  }catch(error){console.error('Battle turn failed',error);if(battle===owner){battle.busy=false;battle.log='전투 흐름을 다시 정리했어요.';renderBattle()}}
}
async function switchMonster(index){if(!battle||battle.busy||index===battle.active||state.party[index]?.hp<=0)return;const owner=battle,forced=state.party[battle.active].hp<=0;battle.busy=true;battle.active=index;battle.guardA=0;battle.participants.add(state.party[index].uid);battle.menu='main';try{await say('가자, '+BY_ID[state.party[index].id].name+'!');if(!forced)await enemyTurn();if(battle===owner)await settle()}finally{if(battle===owner&&battle.busy){battle.busy=false;renderBattle()}}}
async function settle(){
  if(!battle)return;
  if(battle.enemy.hp<=0){battle.rewards+=battle.enemy.level*60;if(battle.queue.length){await say(BY_ID[battle.enemy.id].name+'가 쓰러졌다!');if(!battle)return;battle.enemy=battle.queue.shift();battle.guardE=0;uniq(state.seen,battle.enemy.id);await say('상대가 '+BY_ID[battle.enemy.id].name+'을 내보냈다!')}else{beep('win');await say('전투에서 승리했다!',700);await finishBattle('win');return}}
  if(!battle)return;const ally=state.party[battle.active];if(ally.hp<=0){if(state.party.every(mon=>mon.hp<=0)){await say('파티가 모두 지쳤다.\n생태센터로 돌아갑니다.',800);await finishBattle('lose');return}battle.menu='switch';battle.log='다음 생태몬을 선택해 주세요.'}
  if(battle){battle.busy=false;renderBattle()}
}
async function finishBattle(result){
  if(!battle)return;const finished=battle,enemyName=BY_ID[finished.enemy.id].name;$('#battle').hidden=true;document.body.classList.remove('in-battle');battle=null;focusedControl=null;clearDirections(directionInput);lastEncounter=performance.now();let message='',badgeWon=null,showEnding=false,reopen=null;
  if(result==='lose'){const {x,y}=fieldPointsFor(currentRegion()).heal;healParty(state);state.pos={x,y};surfing=false;message='생태센터에서 모두 회복했어요.'}
  let gainedItems=[];
  if(result==='win'){
    state.wins++;state.coins+=finished.kind==='wild'?35:isTrainerBattle(finished.kind)?90:60;
    if(finished.kind==='trainer'&&!finished.meta.fieldTrainer){const {gymRegion,trainerId}=finished.meta;state.journey.gymTrainers[gymRegion]??=[];uniq(state.journey.gymTrainers[gymRegion],trainerId);reopen=gymIntro}
    if(finished.kind==='leader'){const gym=finished.meta.gym;if(!state.badges.includes(gym.badge)){state.badges.push(gym.badge);state.coins+=300;state.items.balls+=5;badgeWon=gym;gainedItems=grantAcquisitions()}}
    if(finished.kind==='league'){uniq(state.journey.league,finished.meta.leagueId);reopen=leaguePanel}
    if(finished.kind==='rival'&&finished.meta.rivalKey)uniq(state.journey.rivals,finished.meta.rivalKey);
    if(finished.kind==='champion'&&!state.journey.champion){state.journey.champion=true;uniq(state.journey.league,CHAMPION.id);showEnding=true}
    message='승리! 경험치와 코인을 얻었어요.';
  }
  if(result==='win'||result==='capture'){
    const reward=result==='capture'?finished.enemy.level*35:finished.rewards;
    for(const mon of state.party.filter(value=>finished.participants.has(value.uid))){const levels=addExperience(mon,reward);if(levels){beep('level');toast(`${BY_ID[mon.id].name} Lv.${mon.level}! 기술 목록과 위력이 성장했어요.`)}let target=evolutionTarget(mon);while(target){await evolutionScene(mon,target);target=evolutionTarget(mon)}}
    if(result==='capture')message=enemyName+' 포획 완료!';
  }
  if(surfing&&!healthySurfMount()){surfing=false;state.pos={x:48,y:74};message+=(message?' ':'')+'파도타기 파트너를 쉬게 하고 해안으로 돌아왔어요.'}
  if(finished.meta.opening){completeOpening(result);return}
  if(goldenField?.core.pendingBattle)finishFieldBattle(goldenField,result);
  saveGame();
  if(showEnding)endingPanel();
  else if(badgeWon){const badgeName=REGION_BY_ID[badgeWon.regionId]?.badgeName??'지역';showModal(badgeName+' 배지 획득!',`<div class="badge-art">◆</div><p class="modal-copy">배지 ${state.badges.length}/8 · 300코인과 아일볼 5개를 받았어요.</p>${gainedItems.length?`<div class="notice">새 탐험 도구: ${gainedItems.map(esc).join(' · ')}</div>`:''}<div class="notice">${state.badges.length===8?'고현 연구소에서 섬 리그 초대를 확인하세요.':'다음 도전: '+nextChallenge().challenge}</div>`)}
  else if(reopen){toast(message);reopen()}
  else toast(message||(verticalSlice?'새 아트 체험을 계속해요.':'탐험을 계속해요.'));
  if(!modal.open)canvas.focus({preventScroll:true});
}
async function evolutionScene(mon,target){if(!target)return;animating=true;const old=BY_ID[mon.id].name,species=BY_ID[target];$('#evolution').hidden=false;$('#evolution').innerHTML=`<div>${monsterSprite(mon,260)}<p>어라? ${esc(old)}의 모습이…</p><h2>새로운 힘이 깨어납니다!</h2></div>`;beep('evolve');await wait(1500);evolve(mon,target);uniq(state.caught,target);uniq(state.seen,target);$('#evolution').innerHTML=`<div>${monsterSprite(mon,260)}<h2>${esc(species.name)}(으)로 진화했어요!</h2><p>새로운 기술과 강화된 힘을 확인해 보세요.</p><button class="primary-button" id="evo-continue">계속하기</button></div>`;beep('win');await new Promise(resolve=>$('#evo-continue').onclick=resolve);$('#evolution').hidden=true;animating=false}

function focusableControls(){return [...document.querySelectorAll(modal.open?'#modal-content button:not(:disabled):not([data-close])':battle?'.battle-actions button:not(:disabled),.battle-back:not(:disabled)':'#evolution button')].filter(button=>button.getClientRects().length)}
function moveFocus(delta){const controls=focusableControls();if(!controls.length)return;const index=controls.indexOf(controls.includes(document.activeElement)?document.activeElement:focusedControl);focusedControl=controls[(index+delta+controls.length)%controls.length];focusedControl.focus();focusedControl.scrollIntoView({block:'nearest'})}
function moveFocusDirection(direction){
  const controls=focusableControls();if(!controls.length)return;let index=controls.indexOf(controls.includes(document.activeElement)?document.activeElement:focusedControl);if(index<0)index=0;
  if(battle&&controls.every(button=>button.closest('.battle-actions'))){const current=controls[index],rect=current.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,horizontal=['left','right'].includes(direction),sign=['left','up'].includes(direction)?-1:1;const candidates=controls.filter(button=>button!==current).map(button=>{const r=button.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,primary=(horizontal?x-cx:y-cy)*sign,secondary=Math.abs(horizontal?y-cy:x-cx);return{button,primary,secondary}}).filter(value=>value.primary>1).sort((a,b)=>(a.primary*10+a.secondary)-(b.primary*10+b.secondary));focusedControl=candidates[0]?.button??current}else focusedControl=controls[(index+(['left','up'].includes(direction)?-1:1)+controls.length)%controls.length];focusedControl.focus();focusedControl.scrollIntoView({block:'nearest'});
}
function acceptAction(){releaseOpeningInput();if(animating){$('#evo-continue')?.click();return}if(battle?.busy)return;if(modal.open&&openingAdvance){openingAdvance();return}if(modal.open||battle){const controls=focusableControls(),target=$('#begin-game')??(controls.includes(document.activeElement)?document.activeElement:controls.includes(focusedControl)?focusedControl:$('#avatar-next')??controls[0]);target?.click();return}interact()}
function cancelAction(){releaseOpeningInput();clearDirections(directionInput);sliceNudges.length=0;moveTarget=null;if(goldenField&&!modal.open&&!battle){closeGoldenUI(goldenField);canvas.focus({preventScroll:true});return}if(animating)return;if(modal.open){if(openingBack){openingBack();return}if($('#back-avatar')){$('#back-avatar').click();return}if(backAction){backAction();return}if(modalLocked){toast('화면의 항목을 선택해 주세요.');return}closeModal();return}if(battle){if(battle.busy)return;if(state.party[battle.active].hp>0){battle.menu='main';renderBattle()}return}if(state)toast('이동을 멈췄어요.')}
function syncViewport(){const viewport=window.visualViewport,height=viewport?.height??window.innerHeight;document.documentElement.style.setProperty('--visible-height',height+'px');document.documentElement.style.setProperty('--viewport-top',((viewport?.offsetTop??0)+height/2)+'px');if(modal.matches('.field-menu[open]'))placeFieldMenu();syncGoldenViewport()}

const goldenHitboxes=document.createElement('nav');goldenHitboxes.id='golden-menu-hitboxes';goldenHitboxes.hidden=true;goldenHitboxes.setAttribute('aria-label','모험 메뉴');
goldenHitboxes.innerHTML=GOLDEN_MENU.map((name,i)=>`<button data-index="${i}" aria-label="${name}" style="top:${(42+i*83)/1024*100}%"><span class="sr-only">${name}</span></button>`).join('');$('.world-frame').append(goldenHitboxes);
for(const button of goldenHitboxes.children){button.onpointerenter=()=>{if(goldenField?.menu!==null&&goldenField)goldenField.menu=Number(button.dataset.index)};button.onclick=()=>{goldenField.menu=Number(button.dataset.index);runGoldenInteraction()}}
const goldenLog=document.createElement('div');goldenLog.id='golden-dialogue-log';goldenLog.className='sr-only';goldenLog.setAttribute('role','log');goldenLog.setAttribute('aria-live','polite');$('.world-frame').append(goldenLog);
const approvedFieldUI=installApprovedFieldUI({menu:goldenHitboxes,log:goldenLog,onSelect:i=>{if(goldenField&&goldenField.menu!==null)goldenField.menu=i},onAdvance:acceptAction,onClose:cancelAction});

$('#help-button').onclick=()=>showHelp();$('#menu-button').onclick=gameMenu;$('#touch-menu').onclick=gameMenu;$('#touch-a').onclick=acceptAction;$('#touch-b').onclick=cancelAction;$('#dialog-a').onclick=acceptAction;$('#dialog-b').onclick=cancelAction;$('#dialog-prev').onclick=()=>moveFocus(-1);$('#dialog-next').onclick=()=>moveFocus(1);
setInterval(()=>{if(state&&!document.hidden&&!battle&&!modal.open&&!animating)saveGame()},30000);
setInterval(()=>{if(state&&!document.hidden&&!modal.open&&!animating)state.journey.playSeconds++},1000);
syncViewport();window.visualViewport?.addEventListener('resize',syncViewport);window.visualViewport?.addEventListener('scroll',syncViewport);requestAnimationFrame(drawFrame);if(import.meta.env.DEV&&new URLSearchParams(location.search).get('handoff-20260927')==='1'){import('./ordinary/candidate-entry.mjs').then(({startCandidateRuntime})=>startCandidateRuntime()).catch(error=>{console.error('[Staged canonical QA]',error);titleScreen();toast('후보 런타임 진입 실패: '+error.message)})}else if(launchRequest?.namespace==='legacy-work-v2'){startGoldenField()}else if(import.meta.env.DEV&&new URLSearchParams(location.search).has('coreqa')){startGoldenField()}else{titleScreen();if(launchError)toast('이어하기 실패: '+launchError)}
if(import.meta.env?.DEV&&new URLSearchParams(location.search).get('economy')==='1')import('./compatibility/canonical-runtime-adapter.mjs').then(async({loadCanonicalRuntimeAdapter})=>{const adapter=await loadCanonicalRuntimeAdapter({development:true});if(adapter.validation.ready){const {installEconomyDeveloperTools}=await import('./economy/dev.mjs');installEconomyDeveloperTools(adapter)}}).catch(error=>console.error('[Economy candidate]',error));
