import {loadApprovedLatestRuntimeAdapter} from '../../compatibility/approved-latest-runtime-adapter.mjs';
import {startS5JunglePairReview} from './main_ui_candidate/entry.mjs';
const assetModuleURL=import.meta.url;
export async function startJungleReview(){
 const search=location.search,query=new URLSearchParams(search),freshRequested=query.has('freshPrologueQAReady'),earlyRequested=query.has('streamFirstActionQAReady'),pairRequested=query.has('prologuePairQAReady'),gymRequested=query.has('gym5FirstBattleQAReady');if(gymRequested&&(query.getAll('jungleNative').length!==1||query.get('jungleNative')!=='1'||query.getAll('jungleQAReady').length!==1||query.get('jungleQAReady')!=='1'||query.getAll('gym5FirstBattleQAReady').length!==1||query.get('gym5FirstBattleQAReady')!=='1'||pairRequested||query.has('jungleExhibitQAReady')))throw Error('GYM5_FIRST_BATTLE_QA_QUERY_REJECTED');if(pairRequested&&(query.getAll('jungleNative').length!==1||query.get('jungleNative')!=='1'||query.getAll('jungleQAReady').length!==1||query.get('jungleQAReady')!=='1'||query.getAll('prologuePairQAReady').length!==1||query.get('prologuePairQAReady')!=='1'||query.has('jungleExhibitQAReady')))throw Error('PROLOGUE_PAIR_QA_QUERY_REJECTED');
 if(freshRequested){const keys=['jungleNative','jungleQAReady','freshPrologueQAReady'];if([...query.keys()].some(k=>!keys.includes(k))||keys.some(k=>query.getAll(k).length!==1||query.get(k)!=='1'))throw Error('FRESH_PROLOGUE_QUERY_REJECTED');}
 if(earlyRequested){const keys=['jungleNative','jungleQAReady','streamFirstActionQAReady'];if([...query.keys()].some(k=>!keys.includes(k))||keys.some(k=>query.getAll(k).length!==1||query.get(k)!=='1'))throw Error('EARLY_STREAM_QUERY_REJECTED');}
 if(!import.meta.env.DEV||query.get('jungleQAReady')!=='1')throw Error('JUNGLE_QA_READY_QUERY_REQUIRED');
 let disposed=false,lifecycle=null;const abort=new AbortController(),cleanup=e=>{if(e?.persisted||disposed)return;disposed=true;abort.abort();lifecycle?.dispose();window.removeEventListener('pagehide',cleanup)};window.addEventListener('pagehide',cleanup);
 try{
  if(freshRequested){const adapter=await loadApprovedLatestRuntimeAdapter();if(disposed)return;const {prepareFreshPrologueQAStorage,FRESH_PROLOGUE_QA_BANNER}=await import('./main_ui_candidate/session-owner.mjs');const prepared=await prepareFreshPrologueQAStorage({adapter,signal:abort.signal,search});if(disposed)return;const next=await startS5JunglePairReview({adapter,storage:prepared.storage,restore:true,bannerText:FRESH_PROLOGUE_QA_BANNER});if(disposed)next.dispose();else lifecycle=next;return;}
  if(earlyRequested){const adapter=await loadApprovedLatestRuntimeAdapter();if(disposed)return;const {prepareEarlyStreamQAStorage,EARLY_STREAM_QA_BANNER}=await import('./main_ui_candidate/session-owner.mjs');if(disposed)return;const prepared=await prepareEarlyStreamQAStorage({adapter,signal:abort.signal,search});if(disposed)return;const next=await startS5JunglePairReview({adapter,storage:prepared.storage,restore:true,bannerText:EARLY_STREAM_QA_BANNER+' · 주민 제보 및 두 선택 대결은 모두 최초 미완료 · 일반 새게임 인증 아님'});if(disposed)next.dispose();else lifecycle=next;return;}
  const [adapter,bytes]=await Promise.all([loadApprovedLatestRuntimeAdapter(),fetch(new URL('./main_ui_candidate/QA_S5_BEFORE_FOOD_MEMORY.json',assetModuleURL),{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('JUNGLE_QA_FIXTURE_MISSING');return r.arrayBuffer()})]);if(disposed)return;
  const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(sha!=='6e9691675544f1a58d82da600e312a7f6c3be5cf475e323e07223b4b2e01388b')throw Error('JUNGLE_QA_FIXTURE_PIN_MISMATCH');if(disposed)return;
  const initialRuntime=JSON.parse(new TextDecoder().decode(bytes));
  if(gymRequested){const {prepareGym5FirstBattleQAStorage,GYM5_FIRST_BATTLE_QA_BANNER}=await import('./main_ui_candidate/gym5-first-battle-qa-ready.mjs');if(disposed)return;const prepared=await prepareGym5FirstBattleQAStorage({adapter,signal:abort.signal,search});if(disposed)return;const next=await startS5JunglePairReview({adapter,storage:prepared.storage,restore:true,bannerText:GYM5_FIRST_BATTLE_QA_BANNER+' · 원래 선행 행동을 거쳐 준비 · 하급 트레이너/관장 최초 대결 미완료'});if(disposed)next.dispose();else lifecycle=next;return;}
  if(pairRequested){
   const {prepareProloguePairQAStorage,PROLOGUE_PAIR_QA_BANNER}=await import('./main_ui_candidate/prologue-pair-qa-ready.mjs');if(disposed)return;
   const prepared=await prepareProloguePairQAStorage({adapter,initialRuntime,signal:abort.signal,search});if(disposed)return;
   const next=await startS5JunglePairReview({adapter,storage:prepared.storage,restore:true,bannerText:PROLOGUE_PAIR_QA_BANNER+' · 숲길/해안길 출입 검수용 · 준비 전투는 자동 QA이며 직접 전투 인증 아님'});if(disposed)next.dispose();else lifecycle=next;return;
  }
  if(query.get('jungleExhibitQAReady')==='1'){
   const {prepareExhibitQAStorage}=await import('./main_ui_candidate/exhibit-qa-ready.mjs');if(disposed)return;
   const prepared=await prepareExhibitQAStorage({adapter,initialRuntime,signal:abort.signal});if(disposed)return;
   const next=await startS5JunglePairReview({adapter,storage:prepared.storage,restore:true,bannerText:'완료 준비 QA 시드 · 원래 보행/A·B·C 및 정상 저장으로 준비 · 전시대 변경부 검수용, 전체 플레이 인증 아님 · 실제 사용자 저장소 변경 없음'});if(disposed)next.dispose();else lifecycle=next;return;
  }
  const next=await startS5JunglePairReview({adapter,initialRuntime,bannerText:'수동 QA fixture · S5 먹이그물 사건 직전 상태로 준비했습니다. 과거 전체 여정 인증 아님 · 실제 FOOD/입장/A·B·C/보상은 원래 경로 · 메모리 저장만, 사용자 저장 변경 없음'});if(disposed)next.dispose();else lifecycle=next;
 }catch(error){if(disposed)return;cleanup();throw error}
}
