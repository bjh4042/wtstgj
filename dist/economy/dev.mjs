import {candidateAdapter} from './candidate.mjs';
import {CANDIDATE_ID,quotePurchase} from './contract.mjs';
import {createEconomyGame} from './session.mjs';
import {createCandidateStore} from './candidate-store.mjs';
import {ECONOMY_TEST_PLACEMENT as host} from './dev-placement.mjs';
import {SpeciesCatalogService} from '../species-catalog-service.mjs';
import {StoryProgressionService} from '../story/progression-service.mjs';
import {createBattlePresentation} from '../battle-v3/presentation.mjs';
import {devRequestId} from './dev-request-id.mjs';
/** Separate explicit selection, separate storage. QA geometry, never final world placement. */
export function installEconomyDeveloperTools(source){
 if(import.meta.env?.DEV!==true||new URLSearchParams(location.search).get('economy')!=='1')return null;
 const adapter=candidateAdapter(source,{mode:'development',policyId:CANDIDATE_ID}),catalog=new SpeciesCatalogService({namespace:'canonical',adapter}),store=createCandidateStore(localStorage,catalog);
 const panel=document.createElement('section');panel.style.cssText='position:fixed;inset:8px 8px 8px auto;width:min(600px,95vw);overflow:auto;background:#182a37;color:white;padding:16px;z-index:1500;font:14px sans-serif';
 panel.innerHTML='<h2>경제·포획 후보 검증</h2><p>승인 대기 · 일반 세션 적용 안 됨 · STEP 2 QA 지도 배치 · 별도 실험 저장</p><div data-ui="new"></div><div data-ui="fixed"></div><output role="status"></output><pre data-ui="state" style="white-space:pre-wrap"></pre><div data-ui="actions"></div><canvas width="432" height="240" style="width:100%"></canvas><div data-ui="battle"></div>';
 document.body.append(panel);const q=id=>panel.querySelector(`[data-ui="${id}"]`),say=v=>panel.querySelector('output').textContent=v;
 let service=null,presentation=createBattlePresentation(),battle=null,raf,disposed=false,lastBusy=false;
 const safe=fn=>async()=>{try{await fn();say('완료')}catch(e){say(e.message)}finally{render()}};
 function button(where,label,fn,disabled=false){const b=document.createElement('button');b.textContent=label;b.style.color='#182a37';b.disabled=disabled;b.onclick=safe(fn);q(where).append(b)}
 function install(runtime){service=new StoryProgressionService({runtime,catalog,adapter,economyHost:host,persist:s=>store.save(s),hooks:{battleReady:s=>{presentation.stop();presentation=createBattlePresentation();battle=s;presentation.consume(s);render()},battleFinished:()=>{battle=null;render()}}})}
 function command(type,data={}){return service.economyCommand({type,transactionId:devRequestId(),hubId:'TEST_CENTER',...data})}
 button('new','명시적으로 후보 새 게임 시작',()=>{if(service?.busy||service?.pendingCommit)throw Error('현재 처리를 완료하세요.');const s=createEconomyGame(catalog,{mode:'development',starterId:'SPECIES_001'});s.position=structuredClone(host.hubs.TEST_CENTER.position);install(s);store.save(s)});
 button('fixed','후보 저장',()=>store.save(service.snapshot()));button('fixed','후보 불러오기',()=>{if(service?.busy||service?.pendingCommit)throw Error('현재 처리를 완료하세요.');const s=store.load();if(!s)throw Error('후보 저장 없음');install(s)});button('fixed','저장 재시도',()=>service.retryCommit());
 function render(){
  q('actions').replaceChildren();q('battle').replaceChildren();if(!service)return;
  const s=service.snapshot(),locked=service.busy||service.pendingCommit;
  q('state').textContent=JSON.stringify({policy:s.economy.policyId,approval:s.economy.approvalStatus,money:s.economy.money,balls:s.inventory,items:s.progress.items,party:s.party.map(m=>({speciesId:m.speciesId,level:m.level,hp:m.hp})),stage:s.progress.currentStage,position:s.position,quest:s.economy.quest,recovery:s.economy.recovery},null,2);
  for(const [label,dx,dy] of [['위',0,-48],['아래',0,48],['왼쪽',-48,0],['오른쪽',48,0]])button('actions',label,()=>command('walk',{position:{...s.position,x:s.position.x+dx,y:s.position.y+dy}}),locked);
  for(const id of ['ecology_ball','affinity_ball','resonance_ball']){let price;try{price=quotePurchase(s,catalog.itemContract,id,1).unitPrice}catch(e){price=e.message}button('actions',`${id}: ${price}`,()=>command('purchase',{itemId:id,quantity:1}),locked)}
  button('actions','센터 무료 회복',()=>command('heal'),locked);button('actions','센터 볼 지원',()=>command('ball-aid'),locked);button('actions','회복약 사용',()=>command('use-item',{itemId:'potion',instanceId:s.party[0]?.instanceId}),locked);
  button('actions','의뢰 수락',()=>command('research-accept'),locked);for(const [id,p] of Object.entries(host.points))button('actions',`${id} (${p.position.x},${p.position.y}) 관찰`,()=>command('observe',{pointId:id,round:s.economy.quest.round}),locked);button('actions','센터 보고 (384,384)',()=>command('research-report',{round:s.economy.quest.round}),locked);
  for(const e of Object.values(service.contract.events))if(service.eventAvailable(e.id))button('actions',e.id,()=>service.runEvent(e.id),locked);
  for(const t of Object.values(service.contract.trainers))if(!t.eventId&&service.trainerAvailable(t.id))button('actions',t.id,()=>service.runTrainer(t.id),locked);
  button('actions','Stage 완료/다음',async()=>{await service.completeStage();const next=service.contract.stages[s.progress.currentStage].nextStageId;if(next)await service.enterStage(next)},locked);
  button('actions','현재 Stage 조우 지역 선택',()=>{const a=Object.values(catalog.encounterContract.tables).find(t=>t.stageId===s.progress.currentStage&&!t.rod);if(!a)throw Error('이 Stage의 일반 조우표 없음');return service.enterArea(a.areaId,a.method)},locked);
  button('actions','조우 (승인 표·게이트 유지)',()=>service.forceEncounter({mode:'development'}),locked);button('actions','지정 튜토리얼 포획',()=>service.runTutorialCapture(),locked);
  if(battle&&battle.phase!=='ended'){
   const mon=battle.party[battle.active],act=a=>{battle=service.actBattle(a);presentation.consume(battle)};
   const turn=battle.phase==='turn'&&!presentation.busy;
   for(const m of mon.moves.filter(m=>m.pp>0))button('battle',catalog.getMoveById(m.id).name,()=>act({type:'move',moveId:m.id}),!turn);
   if(mon.moves.every(m=>m.pp===0))button('battle','버티기',()=>act({type:'move',moveId:'SYSTEM_STRUGGLE'}),!turn);
   button('battle','전투 회복약',()=>act({type:'item',itemId:'potion',instanceId:mon.instanceId,transactionId:devRequestId()}),!turn);
   battle.party.forEach((m,i)=>button('battle',`교체 ${m.speciesId}`,()=>act({type:'switch',index:i}),m.hp<=0||i===battle.active));
   if(battle.kind==='wild'){for(const id of Object.keys(battle.inventory))button('battle',id,()=>act({type:'capture',ballId:id}),!turn);button('battle','도망',()=>act({type:'flee'}),!turn)}
  }
 }
 for(const type of ['keydown','keyup'])panel.addEventListener(type,e=>e.stopPropagation());
 function draw(now){if(disposed)return;if(battle)presentation.draw(panel.querySelector('canvas').getContext('2d'),battle,now);if(lastBusy!==presentation.busy){lastBusy=presentation.busy;render()}raf=requestAnimationFrame(draw)}raf=requestAnimationFrame(draw);
 window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);presentation.stop()},{once:true});return {panel,getService:()=>service};
}
