import{selectCargoOfficerQACheckpoint}from'./qa-officer-checkpoint.mjs';
import {startCanonicalWorld} from '../../world/entry.mjs';
import {createWorldDefinition,cellPosition} from '../../world/definition.mjs';
import {CanonicalWorld} from '../../world/service.mjs';
import {loadApprovedLatestRuntimeAdapter} from '../../compatibility/approved-latest-runtime-adapter.mjs';
import {prepareCargoReviewInputs,installCargoReviewHost} from './cargo-main-host.mjs';
import {createCargoQAInitialFixture} from './qa-initial-fixture.mjs';
export async function startCargoReview(){
 if(!import.meta.env.DEV)throw Error('DEVELOPMENT_ONLY');
 const query=new URLSearchParams(location.search),ready=query.getAll('cargoQAReady'),post=query.getAll('cargoQAPostBoss');if(ready.length!==1||ready[0]!=='1')throw Error('CARGO_QA_READY_QUERY_REQUIRED');if(post.length>1||(post.length===1&&post[0]!=='1'))throw Error('CARGO_QA_POSTBOSS_QUERY_REQUIRED');const officer=query.getAll('cargoQAOfficers');if(officer.length>1||(officer.length===1&&officer[0]!=='1')||(officer.length===1&&post.length===1))throw Error('CARGO_QA_OFFICER_QUERY_REQUIRED');const officerCheckpoint=officer.length===1;const postBoss=post.length===1;
 const preparationAbort=new AbortController();let disposed=false,lifecycle=null;const cleanup=e=>{if(e?.persisted||disposed)return;disposed=true;preparationAbort.abort();lifecycle?.dispose();window.removeEventListener('pagehide',cleanup)};window.addEventListener('pagehide',cleanup);
 try{
  const [inputs,adapter]=await Promise.all([prepareCargoReviewInputs(),loadApprovedLatestRuntimeAdapter()]);if(disposed)return;
  const generated=await createCargoQAInitialFixture({adapter,signal:preparationAbort.signal,postBoss});if(disposed)return;const prepared=officerCheckpoint?selectCargoOfficerQACheckpoint(generated):generated;
  // QA initial location only: use the source ship-entry landing, not the captain sight line.
  const originalEntry=createWorldDefinition(adapter).points['ship-entry:S9'];if(originalEntry.targetMapId!=='world:ship:S9'||JSON.stringify(originalEntry.target)!=='[3,12]')throw Error('SOURCE_SHIP_ENTRY_DRIFT');prepared.runtime.position=cellPosition(originalEntry.targetMapId,...originalEntry.target);if(officerCheckpoint){prepared.runtime.world.mapId=originalEntry.targetMapId;if(!prepared.runtime.world.visitedMaps.includes(originalEntry.targetMapId))prepared.runtime.world.visitedMaps.push(originalEntry.targetMapId)}
  const next=await startCanonicalWorld({developmentAdapter:adapter,developmentFixture:()=>structuredClone(prepared.runtime),developmentWorldFactory:options=>new CanonicalWorld({...options,hooks:inputs.wrapPresentationHooks(options.hooks),nativeCargoAuthority:inputs.authority,nativeCargoSupplyAuthority:inputs.supplyAuthority,nativeCargoRescueAuthority:inputs.rescueAuthority,nativeCargoOfficerAuthority:inputs.officerAuthority,nativeCargoZoneAuthority:inputs.zoneAuthority}),developmentReview:options=>{
   const banner=document.createElement('p');banner.textContent=(prepared.evidence.officerCheckpoint?'OFFICER_START_QA · 원래 Zone1 이전 체크포인트 · 보미/준석/휘경 미완료 · ':prepared.evidence.postBossFixture?'POST_BOSS_QA · 원래 보스 BattleV3 승리 완료 · ':'PRE_BOSS_QA · 원래 최종 보스 전 · ')+'QA_READY · 원래 화물선 입구 좌표 초기 fixture + Lv100 검수 파티 · 원래 story/BattleV3로 조건 준비 · 실제 사용자 저장 없음 · 일반 진입/전체 여정/난이도 인증 아님';banner.style.cssText='background:#ffe69a;color:#241b00;padding:12px;font-weight:bold';options.root.prepend(banner);
   const host=installCargoReviewHost({...options,inputs});return Object.create(host,{dispose:{value:()=>{host.dispose();banner.remove()},enumerable:true}});
  }});if(disposed)next.dispose();else lifecycle=next;
 }catch(error){if(disposed)return;cleanup();throw error}
}
