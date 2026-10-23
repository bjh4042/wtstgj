import {SpeciesCatalogService} from './species-catalog-service.mjs';
import {createCanonicalTestGame,createGameSession,setCanonicalLead} from './canonical-session.mjs';
import {createSaveSlotStore,SAVE_SLOTS} from './compatibility/save-slots.mjs';
import {assetMarkup} from './asset-runtime.mjs';
import {createFieldFollower,updateFieldFollower} from './field-follower.mjs';
import {drawFieldFollower} from './follower-render.mjs';
import {followerPose} from './species-asset-contract.mjs';
/** Separate DEV/TEST surface. Never sets app.js state, global BY_ID, or the default New Game. */
export function installCanonicalDeveloperTools(adapter){
 if(import.meta.env?.DEV!==true||new URLSearchParams(location.search).get('catalog')!=='1')return null;
 const catalogs={canonical:new SpeciesCatalogService({namespace:'canonical',adapter}),'work-v2':new SpeciesCatalogService({namespace:'work-v2'})};
 const store=createSaveSlotStore(localStorage,{canonicalCatalog:catalogs.canonical,legacyCatalog:catalogs['work-v2']});
 const panel=document.createElement('details');panel.id='canonical-dev';panel.open=true;panel.style.cssText='position:fixed;z-index:1010;right:8px;top:8px;width:min(460px,96vw);max-height:96vh;overflow:auto;padding:12px;background:#142d3e;color:white;font:14px sans-serif;border:2px solid #83b4ce';
 panel.innerHTML=`<summary>Canonical catalog 개발 검사</summary><p>독립 테스트 세션 · 전투/스토리 비활성</p><label>슬롯 <select data-c="slot">${SAVE_SLOTS.map(s=>`<option ${s==='SLOT_2'?'selected':''}>${s}</option>`).join('')}</select></label> <button data-c="load">불러오기</button> <button data-c="save">저장</button><p><label>스타터 <select data-c="starter"></select></label> <button data-c="new">Canonical 테스트 새 게임</button></p><output data-c="namespace"></output><p><label>species <select data-c="species"></select></label> <button data-c="lead">파티 1번 설정</button></p><pre data-c="info" style="white-space:pre-wrap"></pre><div data-c="art" style="display:flex;gap:8px"></div><p><label>방향 <select data-c="facing"><option value="down">FRONT</option><option value="right">RIGHT</option><option value="left">LEFT</option><option value="up">BACK</option></select></label> <label>프레임 <select data-c="frame"><option value="auto">이동에 따름</option><option value="0">Idle</option><option value="1">WalkA</option><option value="2">WalkB</option></select></label></p><canvas data-c="field" width="432" height="240" tabindex="0" aria-label="canonical follower 이동 검사" style="width:100%;background:#35505b;touch-action:none"></canvas><div><button data-dir="up">↑</button><button data-dir="left">←</button><button data-dir="down">↓</button><button data-dir="right">→</button> <button data-c="warp">Warp 검사</button> <button data-c="ledge">턱 복구 검사</button></div><p>캔버스를 누른 후 방향키/WASD로 이동. 화살표 버튼은 터치 지원. 점 = 테스트 플레이어 발 위치.</p><output data-c="result" role="status"></output>`;
 document.body.append(panel);const get=k=>panel.querySelector(`[data-c="${k}"]`),say=s=>get('result').textContent=s;
 let session=null,catalog=catalogs.canonical,follower=createFieldFollower(),held=null,jumpUntil=0,raf=0,lastTime=0;
 const selectableId=()=>catalog.namespace==='canonical'?get('species').value:(get('species').value.startsWith('legacy:')?get('species').value:Number(get('species').value));
 function fillSpecies(){get('species').replaceChildren(...catalog.records.map(s=>{const option=document.createElement('option');option.value=String(s.id);option.textContent=`${s.number??'legacy'} · ${s.name} · ${s.id}`;return option}))}
 get('starter').replaceChildren(...catalogs.canonical.starterIds.map(id=>{const o=document.createElement('option');o.value=id;o.textContent=catalogs.canonical.getDisplayName(id)+' · '+id;return o}));
 function inspect(){
  const id=selectableId(),s=catalog.getSpeciesById(id);if(!s)return;
  get('namespace').textContent=`${session?.contentNamespace??catalog.contentNamespace} / ${catalog.contentVersion}`;
  const reference=catalog.reference(id),chain=catalog.getEvolutionChain(id).map(x=>`${x.id} ${x.name}`).join(' → ');
  get('info').textContent=`${JSON.stringify(reference)}\n${chain}\nstats: ${catalog.getBaseStats(id).join(' / ')}\ntypes: ${catalog.getTypes(id).join(' / ')}\nparty: ${JSON.stringify(session?.runtime.party.map(m=>m.speciesId??m.id)??[])}\nseen/caught: ${session?.runtime.dex?.seen.length??'legacy'}/${session?.runtime.dex?.caught.length??'legacy'}`;
  get('art').innerHTML=[['front',catalog.resolveBattleFront(id)],['back',catalog.resolveBattleBack(id)],['icon',catalog.resolveIcon(id)],['follower',catalog.resolveFollowerAsset(id)]].map(([label,asset])=>`<div style="width:94px">${label}${asset?assetMarkup(asset,label):'<span>legacy 슬롯 없음</span>'}</div>`).join('');
  get('lead').disabled=catalog.namespace!=='canonical';get('save').disabled=!session||catalog.namespace!=='canonical';
 }
 const action=fn=>()=>{try{fn()}catch(e){say(e.message)}};
 get('new').onclick=action(()=>{catalog=catalogs.canonical;session=createGameSession(createCanonicalTestGame(catalog,{mode:'development',starterId:get('starter').value}),catalog);follower=createFieldFollower();fillSpecies();get('species').value=session.runtime.party[0].speciesId;inspect();say('canonical 테스트 세션 생성. 아직 슬롯에는 기록하지 않았습니다.')});
 get('lead').onclick=action(()=>{if(!session||catalog.namespace!=='canonical')throw Error('canonical 테스트 새 게임을 먼저 생성하세요.');session.runtime=setCanonicalLead(session.runtime,catalog,selectableId());updateFieldFollower(follower,session.runtime.position,session.runtime.party,0);inspect();say('파티 1번 canonical ID 변경')});
 get('save').onclick=action(()=>{if(session?.contentNamespace!=='canonical-v1')throw Error('기존 저장은 이 검사 화면에서 읽기 전용입니다.');session.runtime.revision++;session.runtime.updatedAt=Date.now();store.save(get('slot').value,session.runtime);say(`${get('slot').value} 저장 · ${session.runtime.party[0].speciesId}`)});
 get('load').onclick=action(()=>{const loaded=store.loadSession(get('slot').value);if(!loaded)throw Error('빈 슬롯입니다.');session=loaded;catalog=loaded.catalog;follower=createFieldFollower();fillSpecies();get('species').value=String(session.runtime.party[0].speciesId??session.runtime.party[0].id);inspect();say(`불러오기 완료 · ${session.contentNamespace} · ${session.runtime.party[0].speciesId??session.runtime.party[0].id}`)});
 get('species').onchange=inspect;
 get('warp').onclick=action(()=>{if(catalog.namespace!=='canonical'||!session)throw Error('canonical 세션이 필요합니다.');const p=session.runtime.position;p.scene=p.scene==='canonical-test'?'canonical-test-b':'canonical-test';p.x=240;p.y=140;updateFieldFollower(follower,p,session.runtime.party,0);say('Warp: '+follower.reason)});
 get('ledge').onclick=action(()=>{if(catalog.namespace!=='canonical'||!session)throw Error('canonical 세션이 필요합니다.');jumpUntil=performance.now()+240;updateFieldFollower(follower,session.runtime.position,session.runtime.party,0,{jumping:true});session.runtime.position.y=Math.min(220,session.runtime.position.y+24);say('턱 점프 후 재정렬')});
 const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.target===get('field')&&keys[e.key]){e.preventDefault();held=keys[e.key]}});panel.addEventListener('keyup',e=>{e.stopPropagation();if(keys[e.key])held=null});
 for(const button of panel.querySelectorAll('[data-dir]')){button.style.touchAction='none';button.onpointerdown=e=>{e.preventDefault();held=button.dataset.dir;button.setPointerCapture(e.pointerId)};button.onpointerup=button.onpointercancel=()=>held=null}
 const resetInput=()=>held=null;window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',resetInput);
 const c=get('field').getContext('2d');
 function draw(now){const dt=Math.min(.05,(now-lastTime)/1000||0);lastTime=now;c.clearRect(0,0,432,240);
  if(session){const canonical=catalog.namespace==='canonical',p=canonical?session.runtime.position:{scene:'legacy-preview',x:216,y:160,facing:get('facing').value};
   if(canonical&&held&&!document.hidden){const v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[held];p.x=Math.max(12,Math.min(420,p.x+v[0]*140*dt));p.y=Math.max(12,Math.min(228,p.y+v[1]*140*dt));p.facing=held}
   updateFieldFollower(follower,p,session.runtime.party,dt,{paused:document.hidden,jumping:now<jumpUntil,canOccupy:(_scene,x,y)=>x>=0&&x<=432&&y>=0&&y<=240});
   c.fillStyle='#ffe680';c.fillRect(p.x-4,p.y-4,8,8);const frame=get('frame').value;drawFieldFollower(c,follower,{unitScale:.65,pose:frame==='auto'?undefined:{facing:get('facing').value,frame:Number(frame)}});
   const pose=followerPose(follower.facing,follower.moving,follower.walk);get('field').dataset.speciesId=String(follower.speciesId);get('field').dataset.pose=`${pose.row}:${pose.frame}`;
  }
  raf=requestAnimationFrame(draw);
 }
 fillSpecies();inspect();raf=requestAnimationFrame(draw);window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);window.removeEventListener('blur',resetInput);document.removeEventListener('visibilitychange',resetInput)},{once:true});
 return {panel,getSession:()=>session,getFollower:()=>follower};
}
