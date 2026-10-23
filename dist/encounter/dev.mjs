import {simulateDistribution} from './simulation.mjs';
import {attachCanonicalEncounterField} from './field-bridge.mjs';
import {drawGoldenField,moveGolden,updateGoldenCore} from '../golden-field.mjs';
import {mapPresentation} from '../presentation/map-presentation.mjs';
/** DEV-only UI hosted by the existing Story session, not a second mutable game state. */
export function installEncounterDeveloperPanel({panel,getService,getField,onChange}){
 if(import.meta.env?.DEV!==true||new URLSearchParams(location.search).get('encounter')!=='1')return null;
 const root=document.createElement('details');root.open=true;root.innerHTML=`<summary>Canonical Encounter / Fishing / Acquisition · DEV</summary><p>기존 필드의 조우 타일을 선택한 canonical area metadata에 연결하는 검증용 배치입니다.</p><select data-e="area"></select><select data-e="method"></select><button data-e="enter">지역 연결</button><pre data-e="context" style="white-space:pre-wrap"></pre><button data-e="force">강제 조우 (gate 유지)</button><button data-e="simulate">종 분포 10,000회</button><select data-e="rod"><option>basic_rod</option><option>good_rod</option><option>super_rod</option></select><button data-e="fish">낚시</button><button data-e="fish-sim">낚시 분포 10,000회</button><pre data-e="distribution" style="white-space:pre-wrap"></pre><div data-e="events"></div><button data-e="compass">POST 나침반 조립</button><div data-e="evolve"></div><canvas data-e="field" tabindex="0" aria-label="Canonical field preview: focus and use arrow keys" width="1536" height="1024" style="width:100%;border:1px solid #888"></canvas><p>필드 캔버스 선택 후 방향키로 이동. 낚시는 버튼으로 실행.</p><output data-e="status" role="status"></output>`;panel.append(root);
 const el=id=>root.querySelector(`[data-e="${id}"]`),say=x=>el('status').textContent=x;
 let boundService=null,bridge=null,direction=null;
 const options=()=>({map:mapPresentation(getField().scene)});
 const safe=fn=>async()=>{try{await fn();say('완료')}catch(error){say(error.message)}finally{render();onChange()}};
 const button=(parent,text,fn,disabled=false)=>{const b=document.createElement('button');b.textContent=text;b.disabled=disabled;b.onclick=safe(fn);parent.append(b)};
 function methods(){const c=getService()?.catalog.encounterContract,areaId=el('area').value,excluded=Object.values(c?.policyExcludedTables??{}).filter(t=>t.areaId===areaId);el('method').replaceChildren(...[...(c?.areas[areaId]?.methods??[]),...excluded.map(t=>t.method)].map(id=>{const o=document.createElement('option');o.value=id;o.textContent=id+(excluded.some(t=>t.method===id)?' · 승인 정책: 랜덤 조우 없음':'');return o}))}
 el('area').onchange=methods;
 el('enter').onclick=safe(()=>getService().enterArea(el('area').value,el('method').value||null));
 el('force').onclick=safe(()=>getService().forceEncounter({...options(),mode:'development'}));
 el('fish').onclick=safe(()=>getService().fish(el('rod').value,options()));
 const sim=fishing=>{const s=getService(),c=s.catalog.encounterContract,state=s.snapshot().encounter,method=fishing?c.rodMethods[el('rod').value]:state.method,id=`${state.areaId}:${method}`,t=c.tables[id];if(c.policyExcludedTables?.[id]){el('distribution').textContent='승인 정책 A: 랜덤 조우 없음';return}if(!t)throw Error('테이블 없음');el('distribution').textContent=JSON.stringify(simulateDistribution(t,10000),null,2)};
 el('simulate').onclick=safe(()=>sim(false));el('fish-sim').onclick=safe(()=>sim(true));el('compass').onclick=safe(()=>getService().assembleCompass());
 el('field').onkeydown=e=>{const d={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key];if(d){direction=d;e.preventDefault();e.stopPropagation()}};
 el('field').onkeyup=e=>{direction=null;e.stopPropagation()};el('field').onblur=()=>{direction=null};
 function render(){
  const s=getService(),runtime=s?.snapshot(),enabled=!!runtime?.encounterVersion,locked=!enabled||s.busy||s.pendingCommit;
  for(const b of root.querySelectorAll('button,select'))b.disabled=locked;
  el('events').replaceChildren();el('evolve').replaceChildren();if(!enabled){el('context').textContent='새 STEP 7 세션을 생성하거나 STEP 7 슬롯을 여세요. 기존 저장은 자동 변경하지 않습니다.';return}
  const c=s.catalog.encounterContract;
  if(boundService!==s){bridge?.dispose();boundService=s;bridge=attachCanonicalEncounterField(getField(),s,{onResult:r=>{say(r.triggered?`야생전 종료: ${r.outcome}`:'eligible step 확인');onChange()},onError:error=>say(error.message)});el('area').replaceChildren(...Object.values(c.areas).map(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=`${a.id} · ${a.label}`;return o}));el('area').value=runtime.encounter.areaId??'P_ECO_CENTER_EDGE';methods()}
  el('context').textContent=JSON.stringify(s.encounterContext(),null,2);
  for(const e of Object.values(c.events).filter(e=>e.areaId===runtime.encounter.areaId&&e.id!=='STARTER_CHOICE_PROLOGUE')){
   if(e.requirements.includes('story_evening_survey'))button(el('events'),'저녁 조사 (실제 시각 무관)',()=>s.surveyAcquisition(e.id),locked);
   if(e.mode==='npc_trade'){
    const choices=[...runtime.party,...runtime.box].filter(m=>m.speciesId===e.requiredSpeciesId);
    for(const mon of choices)button(el('events'),`${e.id} · ${mon.instanceId.slice(0,8)} 교환`,()=>s.acquire(e.id,{...options(),tradeInstanceId:mon.instanceId}),locked||!s.acquisitionAvailable(e.id));
    if(!choices.length){const p=document.createElement('p');p.textContent=`${e.id}: ${e.requiredSpeciesId} 필요`;el('events').append(p)}
   }else button(el('events'),e.id,()=>s.acquire(e.id,options()),locked||!s.acquisitionAvailable(e.id));
  }
  for(const mon of [...runtime.party,...runtime.box]){const species=s.catalog.getSpeciesById(mon.speciesId);if(species.evo&&mon.level>=species.evoLevel)button(el('evolve'),`${s.catalog.getDisplayName(mon.speciesId)} 진화`,()=>s.evolve(mon.instanceId),locked)}
 }
 function draw(dt){const s=getService(),f=getField();if(!s?.snapshot().encounterVersion||!f)return;if(!s.busy&&!s.pendingCommit){moveGolden(f,direction,dt);updateGoldenCore(f,dt)}drawGoldenField(el('field').getContext('2d'),f)}
 return {render,draw,dispose:()=>bridge?.dispose()};
}
