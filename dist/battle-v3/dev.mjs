import {SpeciesCatalogService} from '../species-catalog-service.mjs';
import {createCanonicalTestGame,createCanonicalCreature,createGameSession,CANONICAL_TEST_SAVE} from '../canonical-session.mjs';
import {activateCanonicalBattleSave,teachTm,learnPendingMove} from './save.mjs';
import {createBattleRules,battleStats} from './rules.mjs';
import {startSessionBattle} from './engine.mjs';
import {createBattlePresentation} from './presentation.mjs';
import {createSaveSlotStore,SAVE_SLOTS} from '../compatibility/save-slots.mjs';
import {BIOMES} from '../presentation/map-presentation.mjs';
/** Separate DEV opt-in. Public New Game, legacy app state and all story/stage/trainer tables remain untouched. */
export function installCanonicalBattleDeveloperTools(adapter){
 if(import.meta.env?.DEV!==true||new URLSearchParams(location.search).get('battle-v3')!=='1')return null;
 const catalog=new SpeciesCatalogService({namespace:'canonical',adapter}),legacyCatalog=new SpeciesCatalogService({namespace:'work-v2'}),rules=createBattleRules(adapter),store=createSaveSlotStore(localStorage,{canonicalCatalog:catalog,legacyCatalog});
 const panel=document.createElement('section');panel.id='canonical-battle-dev';panel.style.cssText='position:fixed;inset:8px 8px 8px auto;z-index:1100;width:min(520px,96vw);overflow:auto;background:#142d3e;color:white;padding:12px;font:14px sans-serif;border:2px solid #83b4ce';
 panel.innerHTML=`<h2>Canonical Battle v3 · DEV</h2><p>독립 canonical-v1 세션 · Story/Stage 비활성 · 공개 New Game 유지</p><label>스타터 <select data-b="starter"></select></label><button data-b="new">새 전투 세션</button><p><label>슬롯 <select data-b="slot">${SAVE_SLOTS.map(s=>`<option ${s==='SLOT_2'?'selected':''}>${s}</option>`).join('')}</select></label><button data-b="save">전투 후 저장</button><button data-b="load">불러오기</button></p><output data-b="identity"></output><p><label>Biome <select data-b="biome">${BIOMES.map(b=>`<option>${b}</option>`).join('')}</select></label><label>야생종 <select data-b="enemy"></select></label><label>상대 레벨 <input data-b="level" type="number" min="1" max="100" value="3" style="width:55px"></label></p><button data-b="wild">야생전 시작</button><button data-b="trainer">트레이너 검사전 (2마리)</button><canvas data-b="canvas" width="432" height="240" style="width:100%;display:block" aria-label="canonical battle canvas"></canvas><pre data-b="state" style="white-space:pre-wrap"></pre><div data-b="moves"></div><div data-b="switches"></div><p><select data-b="ball">${rules.capture.balls.map(id=>`<option value="${id}">${rules.items[id].name}</option>`).join('')}</select><button data-b="capture">포획</button><button data-b="flee">도망</button></p><details><summary>TM / 기술 학습</summary><select data-b="tm">${Object.values(rules.tms).map(t=>`<option value="${t.id}">${t.id} ${t.name}</option>`).join('')}</select><label>교체 칸 <select data-b="move-slot"><option value="0">1</option><option value="1">2</option><option value="2">3</option><option value="3">4</option></select></label><button data-b="grant-tm">DEV TM 지급</button><button data-b="teach">파티 1번에 학습</button><div data-b="pending"></div></details><output data-b="result" role="status"></output><pre data-b="log" style="white-space:pre-wrap;max-height:180px;overflow:auto"></pre>`;
 document.body.append(panel);const get=k=>panel.querySelector(`[data-b="${k}"]`),say=s=>get('result').textContent=s;
 const fill=(select,ids)=>select.replaceChildren(...ids.map(id=>{const o=document.createElement('option');o.value=id;o.textContent=`${catalog.getDisplayName(id)} (${id})`;return o}));
 fill(get('starter'),catalog.starterIds);fill(get('enemy'),catalog.records.filter(s=>catalog.canRandomEncounter(s.id)).map(s=>s.id));
 let session=null,battle=null,presentation=null,snapshot=null,busy=false,raf=0;
 const safe=fn=>()=>{try{fn();render()}catch(error){say(error.message)}};
 const requireIdle=()=>{if(!session)throw Error('세션을 생성하거나 불러오세요.');if(battle&&snapshot.phase!=='ended'||busy)throw Error('현재 전투를 완료하세요.')};
 function render(){
  get('identity').textContent=session?`${session.contentNamespace} / ${session.runtime.format} · ${session.runtime.party.map(m=>m.speciesId).join(', ')}`:'세션 없음';
  for(const key of ['new','save','load','wild','trainer','teach','grant-tm'])get(key).disabled=busy||!!battle&&snapshot.phase!=='ended';
  get('moves').replaceChildren();get('switches').replaceChildren();
  const button=(text,fn,parent,disabled=false)=>{const b=document.createElement('button');b.textContent=text;b.disabled=disabled;b.onclick=safe(fn);parent.append(b)};
  get('capture').disabled=!battle||snapshot.phase!=='turn'||busy||snapshot.kind!=='wild';get('flee').disabled=get('capture').disabled;
  if(snapshot){
   const p=snapshot.party[snapshot.active],e=snapshot.opponents[snapshot.enemyActive];
   get('state').textContent=`${snapshot.kind} · Turn ${snapshot.turn} · ${snapshot.outcome??snapshot.phase}\n${catalog.getDisplayName(p.speciesId)} Lv.${p.level} HP ${p.hp}/${battleStats(catalog,p).hp} ${p.status??''}\n상대 ${catalog.getDisplayName(e.speciesId)} Lv.${e.level} HP ${e.hp}/${battleStats(catalog,e).hp} ${e.status??''}\n${snapshot.background.biomeId} → ${snapshot.background.assetId}\n볼: ${JSON.stringify(snapshot.inventory)}`;
   for(const m of p.moves)button(`${rules.moves[m.id].name} (${m.pp})`,()=>act({type:'move',moveId:m.id}),get('moves'),busy||snapshot.phase!=='turn'||m.pp===0);
   if(p.moves.every(m=>m.pp===0))button('버티기 (PP 소진)',()=>act({type:'move',moveId:'SYSTEM_STRUGGLE'}),get('moves'),busy||snapshot.phase!=='turn');
   snapshot.party.forEach((m,i)=>button(`교체 ${i+1} ${catalog.getDisplayName(m.speciesId)}`,()=>act({type:'switch',index:i}),get('switches'),busy||snapshot.phase==='ended'||i===snapshot.active||m.hp<=0));
   get('log').textContent=snapshot.events.slice(-12).map(e=>JSON.stringify(e)).join('\n');
  }else{get('state').textContent='전투 시작 전';get('log').textContent=''}
  get('pending').replaceChildren();for(const p of session?.runtime.pendingMoves??[]){button(`배우기 ${catalog.getMoveById(p.moveId).name}`,()=>{requireIdle();session.runtime=learnPendingMove(session.runtime,catalog,p.instanceId,p.moveId,Number(get('move-slot').value))},get('pending'),busy||!!battle&&snapshot.phase!=='ended');button('보류 기술 포기',()=>{requireIdle();session.runtime=learnPendingMove(session.runtime,catalog,p.instanceId,p.moveId)},get('pending'),busy||!!battle&&snapshot.phase!=='ended')}
 }
 function start(kind){requireIdle();presentation?.stop();battle=startSessionBattle(session,{kind,map:{id:'canonical-battle-fixture',biomeId:get('biome').value,battleBgmId:'battle.default',battleTransitionSfxId:'battle.transition'},opponents:Array.from({length:kind==='wild'?1:2},()=>({namespace:'canonical',speciesId:get('enemy').value,level:Number(get('level').value)}))},{adapter});snapshot=battle.snapshot();presentation=createBattlePresentation();presentation.consume(snapshot);say('canonical 전투 시작 · 저장은 종료 후 가능합니다.')}
 function act(action){if(busy)throw Error('연출 중입니다.');snapshot=battle.act(action);presentation.consume(snapshot);busy=presentation.busy;if(snapshot.phase==='ended'){session=createGameSession(battle.aftermath(),catalog);say(`전투 종료: ${snapshot.outcome} · 자동 저장하지 않습니다. 원하는 슬롯에 저장하세요.`)}}
 get('new').onclick=safe(()=>{if(session)requireIdle();presentation?.stop();battle=null;snapshot=null;const save=activateCanonicalBattleSave(createCanonicalTestGame(catalog,{mode:'development',starterId:get('starter').value}),catalog);const ally=createCanonicalCreature(catalog,'SPECIES_010',5);save.party.push(ally);save.dex.seen.push(ally.speciesId);save.dex.caught.push(ally.speciesId);session=createGameSession(save,catalog);say('DEV 전용 동료 1마리와 생태볼 5개. 실제 스토리 보상은 활성화하지 않았습니다.')});
 get('wild').onclick=safe(()=>start('wild'));get('trainer').onclick=safe(()=>start('trainer'));
 get('capture').onclick=safe(()=>act({type:'capture',ballId:get('ball').value}));get('flee').onclick=safe(()=>act({type:'flee'}));
 get('save').onclick=safe(()=>{requireIdle();store.save(get('slot').value,session.runtime);say(`${get('slot').value} 저장 완료 · canonical identity 유지`)});
 get('load').onclick=safe(()=>{if(session)requireIdle();const loaded=store.loadSession(get('slot').value);if(!loaded||loaded.contentNamespace!=='canonical-v1')throw Error('canonical 슬롯만 이 패널에서 열 수 있습니다. legacy 슬롯은 변경하지 않았습니다.');if(loaded.runtime.format===CANONICAL_TEST_SAVE)loaded.runtime=activateCanonicalBattleSave(loaded.runtime,catalog);session=loaded;presentation?.stop();battle=null;snapshot=null;busy=false;say('canonical 불러오기 완료. 구 검사 세이브는 메모리에서만 전투 형식으로 승격했습니다.')});
 get('grant-tm').onclick=safe(()=>{requireIdle();const id=get('tm').value;if(!session.runtime.ownedTms.includes(id))session.runtime.ownedTms.push(id);say(`DEV ${id} 지급`)});
 get('teach').onclick=safe(()=>{requireIdle();session.runtime=teachTm(session.runtime,catalog,rules,session.runtime.party[0].instanceId,get('tm').value,Number(get('move-slot').value));say('TM 학습 완료 · TM 유지')});
 for(const event of ['keydown','keyup'])panel.addEventListener(event,e=>e.stopPropagation());
 const c=get('canvas').getContext('2d');function draw(now){if(snapshot){presentation.draw(c,snapshot,now);const next=presentation.busy;if(next!==busy){busy=next;render()}}raf=requestAnimationFrame(draw)}
 render();raf=requestAnimationFrame(draw);window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);presentation?.stop()},{once:true});
 return {panel,getSession:()=>session,getBattle:()=>battle};
}
