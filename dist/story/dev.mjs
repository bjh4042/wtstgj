import {devRequestId} from '../economy/dev-request-id.mjs';
import {activateConfirmedEconomy} from '../economy/contract.mjs';
import {SpeciesCatalogService} from '../species-catalog-service.mjs';
import {createSaveSlotStore,SAVE_SLOTS} from '../compatibility/save-slots.mjs';
import {createCanonicalStoryGame,CANONICAL_STORY_SAVE,activateCanonicalEncounterSave} from './save.mjs';
import {installEncounterDeveloperPanel} from '../encounter/dev.mjs';
import {StoryProgressionService} from './progression-service.mjs';
import {createStoryFieldHooks,storyFieldEvents} from './field-bridge.mjs';
import {createGoldenField} from '../golden-field.mjs';
import {createBattlePresentation} from '../battle-v3/presentation.mjs';
import {battleStats} from '../battle-v3/rules.mjs';
/** Explicit DEV session host. Existing app state / maps / default New Game are not replaced. */
export function installCanonicalStoryDeveloperTools(adapter){
 if(import.meta.env?.DEV!==true||new URLSearchParams(location.search).get('story')!=='1')return null;
 const catalog=new SpeciesCatalogService({namespace:'canonical',adapter}),legacyCatalog=new SpeciesCatalogService({namespace:'work-v2'}),slots=createSaveSlotStore(localStorage,{canonicalCatalog:catalog,legacyCatalog});
 const panel=document.createElement('section');panel.id='canonical-story-dev';panel.style.cssText='position:fixed;inset:8px 8px 8px auto;z-index:1200;width:min(550px,96vw);overflow:auto;background:#142d3e;color:white;padding:12px;font:14px sans-serif;border:2px solid #83b4ce';
 panel.innerHTML=`<h2>Canonical Story v1 · DEV</h2><p>독립 canonical-v1 세션 · 본편 진행 / Battle v3 · 공개 v21 변경 없음</p><label>이름 <input data-s="name" maxlength="40" value="탐험가"></label><label>첫 친구 <select data-s="starter"></select></label><button data-s="new">프롤로그 시작</button><p><label>슬롯 <select data-s="slot">${SAVE_SLOTS.map(id=>`<option ${id==='SLOT_2'?'selected':''}>${id}</option>`).join('')}</select></label><button data-s="save">저장 / 자동저장 연결</button><button data-s="load">불러오기</button><button data-s="retry">저장 재시도</button></p><output data-s="status" role="status"></output><pre data-s="progress" style="white-space:pre-wrap"></pre><p data-s="dialogue"></p><div data-s="events"></div><button data-s="advance">Stage 완료 / 다음 Stage</button><button data-s="heal">센터 회복</button><details><summary>현재 Stage 트레이너</summary><div data-s="trainers"></div></details><canvas data-s="canvas" width="432" height="240" style="width:100%;display:block" aria-label="canonical story battle"></canvas><pre data-s="battle" style="white-space:pre-wrap"></pre><div data-s="moves"></div><div data-s="switches"></div><details><summary>기술 학습</summary><select data-s="tm"></select><select data-s="move-slot"><option value="0">기술 1</option><option value="1">기술 2</option><option value="2">기술 3</option><option value="3">기술 4</option></select><button data-s="teach">파티 1번 TM 학습</button><div data-s="pending"></div></details>`;
 document.body.append(panel);for(const control of panel.querySelectorAll('button,input,select'))control.style.color='#142d3e';const el=id=>panel.querySelector(`[data-s="${id}"]`),say=message=>el('status').textContent=message;
 for(const id of catalog.starterIds){const o=document.createElement('option');o.value=id;o.textContent=`${catalog.getDisplayName(id)} · ${id}`;el('starter').append(o)}
 let service=null,field=null,presentation=null,snapshot=null,boundSlot=null,raf=0,disposed=false,lastBusy=false,encounterDev=null,lastFrame=0;
 const safe=fn=>async()=>{try{await fn()}catch(error){say(error.message)}finally{render()}};
 const addButton=(parent,label,fn,disabled=false)=>{const b=document.createElement('button');b.textContent=label;b.style.color='#142d3e';b.disabled=disabled;b.onclick=safe(fn);parent.append(b)};
 const requireIdle=()=>{if(service?.busy||service?.pendingCommit)throw Error('현재 전투/저장을 완료하세요.')};
 function install(runtime,slot=null){
  runtime=activateConfirmedEconomy(runtime);
  requireIdle();presentation?.stop();snapshot=null;boundSlot=slot;field=createGoldenField(runtime.encounterVersion?runtime.position:null);
  const fieldHooks=createStoryFieldHooks(field,{dialogue:({text})=>{el('dialogue').textContent=text},cutIn:({speciesId})=>{el('dialogue').textContent+=` · ${catalog.getDisplayName(speciesId)} 목격 (전투/포획 없음)`}});
  service=new StoryProgressionService({runtime,catalog,adapter,persist:async s=>{if(boundSlot)slots.save(boundSlot,s)},hooks:{...fieldHooks,battleReady:s=>{presentation?.stop();presentation=createBattlePresentation();snapshot=s;presentation.consume(s);render()},battleFinished:outcome=>{fieldHooks.battleFinished(outcome);say(`전투 결과: ${outcome}`)}}});
 }
 async function event(id){if(!service)throw Error('먼저 세션을 생성하세요.');await service.runEvent(id,{map:{id:field.scene,biomeId:'COAST'}});say(`이벤트 완료: ${id}`)}
 function render(){
  const s=service?.snapshot(),locked=!!service?.busy||!!service?.pendingCommit,battleLocked=!!presentation?.busy;
  for(const key of ['new','save','load','advance','heal','teach'])el(key).disabled=locked;
  el('retry').disabled=!service?.pendingCommit;el('events').replaceChildren();el('trainers').replaceChildren();el('moves').replaceChildren();el('switches').replaceChildren();el('pending').replaceChildren();
  if(!s){el('progress').textContent='세션 없음';return}
  el('progress').textContent=`${s.contentNamespace} · ${s.progress.currentStage}\n배지 ${s.progress.badges.length}/8 · 이벤트 ${s.progress.completedEvents.length} · 리그 ${s.progress.leagueRunState}\n본편 완료 ${s.progress.flags.MAIN_STORY_CLEAR} · POST ${s.progress.flags.POST_UNLOCKED}\n저장: ${boundSlot??'수동 저장 전 (메모리 전용)'} · 시각/지역 배치는 placeholder 검증용`;
  if(s.party.length)addButton(el('events'),'회복약 사용 (파티 1)',()=>service.economyCommand({type:'use-item',transactionId:devRequestId(),itemId:'potion',instanceId:s.party[0].instanceId}),locked);
  if(s.economy.tutorial.open&&s.encounterVersion)addButton(el('events'),'지정 튜토리얼 포획',()=>service.runTutorialCapture(),locked);
  const bundle=storyFieldEvents(service,field.scene);
  for(const e of bundle.storyEvents)if(!service.eventCompleted(e.eventId))addButton(el('events'),e.eventId,()=>event(e.eventId),locked||!e.available);
  for(const t of bundle.trainers){const descriptor=service.contract.trainers[t.id];addButton(el('trainers'),`${descriptor.label} · ${t.id}`,()=>service.runTrainer(t.id,{map:{id:field.scene,biomeId:'COAST'}}),locked||!t.available)}
  el('tm').replaceChildren(...s.ownedTms.map(id=>{const o=document.createElement('option');o.value=id;o.textContent=`${id} ${catalog.getTmById(id).name}`;return o}));
  for(const p of s.pendingMoves){addButton(el('pending'),`${catalog.getMoveById(p.moveId).name} 학습`,()=>service.learnMove(p.instanceId,p.moveId,Number(el('move-slot').value)),locked);addButton(el('pending'),'포기',()=>service.learnMove(p.instanceId,p.moveId),locked)}
  if(snapshot){
   const active=snapshot.party[snapshot.active],enemy=snapshot.opponents[snapshot.enemyActive];
   el('battle').textContent=`${snapshot.engine} · ${snapshot.outcome??snapshot.phase}\n${catalog.getDisplayName(active.speciesId)} HP ${active.hp}/${battleStats(catalog,active).hp}\n${catalog.getDisplayName(enemy.speciesId)} Lv.${enemy.level} HP ${enemy.hp}/${battleStats(catalog,enemy).hp}\n${snapshot.background.assetId}`;
   const usable=active.moves.filter(m=>m.pp>0);for(const move of usable)addButton(el('moves'),`${catalog.getMoveById(move.id).name} (${move.pp})`,()=>act({type:'move',moveId:move.id}),battleLocked||snapshot.phase!=='turn');
   if(!usable.length)addButton(el('moves'),'버티기',()=>act({type:'move',moveId:'SYSTEM_STRUGGLE'}),battleLocked||snapshot.phase!=='turn');
   if(snapshot.bagItems.potion)addButton(el('moves'),'회복약',()=>act({type:'item',transactionId:devRequestId(),itemId:'potion',instanceId:active.instanceId}),battleLocked||snapshot.phase!=='turn');
   if(snapshot.kind==='wild'){
    for(const [id,n] of Object.entries(snapshot.inventory))addButton(el('moves'),`${id} (${n})`,()=>act({type:'capture',ballId:id}),battleLocked||snapshot.phase!=='turn'||n<1);
    addButton(el('moves'),'도망',()=>act({type:'flee'}),battleLocked||snapshot.phase!=='turn');
   }
   snapshot.party.forEach((m,i)=>addButton(el('switches'),`교체 ${catalog.getDisplayName(m.speciesId)}`,()=>act({type:'switch',index:i}),battleLocked||snapshot.phase==='ended'||i===snapshot.active||m.hp<=0));
  }else el('battle').textContent='전투 전 · 최종 PNG 없이도 placeholder 렌더';
  encounterDev?.render();
 }
 function act(action){snapshot=service.actBattle(action);presentation.consume(snapshot);render()}
 el('new').onclick=safe(()=>{let runtime=createCanonicalStoryGame(catalog,{mode:'development',playerName:el('name').value,starterId:el('starter').value});if(new URLSearchParams(location.search).get('encounter')==='1')runtime=activateCanonicalEncounterSave(runtime,catalog);install(runtime);say('스타터는 P02_FIRST_PARTNER에서 지급됩니다. 기존 슬롯은 변경하지 않았습니다.')});
 el('save').onclick=safe(()=>{requireIdle();if(!service)throw Error('세션 없음');slots.save(el('slot').value,service.snapshot());boundSlot=el('slot').value;say(`${boundSlot} 저장 완료. 이후 완료 이벤트/전투 결과는 이 슬롯에 자동 저장합니다.`)});
 el('load').onclick=safe(()=>{requireIdle();const loaded=slots.loadSession(el('slot').value);if(loaded?.runtime.format!==CANONICAL_STORY_SAVE)throw Error('Story v1 슬롯만 열 수 있습니다. legacy/test/battle 저장은 그대로 보존했습니다.');install(loaded.runtime,el('slot').value);say('Stage, 이벤트, 배지, 전투 후 상태 복원 완료')});
 el('retry').onclick=safe(()=>service.retryCommit());el('heal').onclick=safe(()=>service.recoverParty());
 el('advance').onclick=safe(async()=>{const id=service.snapshot().progress.currentStage;await service.completeStage(id);const next=service.contract.stages[id].nextStageId;if(next)await service.enterStage(next);say(`진행 위치: ${service.snapshot().progress.currentStage}`)});
 el('teach').onclick=safe(()=>service.teachTm(service.snapshot().party[0]?.instanceId,el('tm').value,Number(el('move-slot').value)));
 for(const name of ['keydown','keyup'])panel.addEventListener(name,e=>e.stopPropagation());
 encounterDev=installEncounterDeveloperPanel({panel,getService:()=>service,getField:()=>field,onChange:render});
 function draw(now){if(disposed)return;encounterDev?.draw(Math.min(.05,(now-lastFrame)/1000));lastFrame=now;if(snapshot&&presentation){presentation.draw(el('canvas').getContext('2d'),snapshot,now);if(lastBusy!==presentation.busy){lastBusy=presentation.busy;render()}}raf=requestAnimationFrame(draw)}
 render();raf=requestAnimationFrame(draw);window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);presentation?.stop()},{once:true});
 return {panel,getService:()=>service,getField:()=>field};
}
