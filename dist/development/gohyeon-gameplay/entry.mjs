import{createS4GameplayQAInitialFixture}from'./qa-initial-fixture.mjs';
import {startCanonicalWorld} from '../../world/entry.mjs';
import {loadApprovedLatestRuntimeAdapter} from '../../compatibility/approved-latest-runtime-adapter.mjs';
import {createWorldDefinition,cellPosition} from '../../world/definition.mjs';
import {createWorldHost} from '../../world/service.mjs';
import {initialWorldState,syncWorldLocation} from '../../world/state.mjs';
import {loadCenterVisuals} from '../center/center-visual-loader.mjs';
import {mountS4FixedPairWithMain} from './main-mount.mjs';
import {installS4FixedPairReviewHost} from '../gohyeon-pair/main-host.mjs';
const assetModuleURL=import.meta.url;
export async function startGohyeonGameplayReview(){
 const capturedQuery=new URLSearchParams(location.search);if(import.meta.env?.DEV!==true||capturedQuery.getAll('gohyeonGameplay').length!==1||capturedQuery.get('gohyeonGameplay')!=='1'||['gohyeonPair','gohyeonNative','prologueNative','jungleNative','cargoNative','pairedNative','summitNative','nativeMemory','postNative','finalGame','world'].some(k=>capturedQuery.has(k)))throw Error('DEVELOPMENT_ONLY');
 let disposed=false,preparing=false,epoch=0,lifecycle=null,activeHost=null,storage=null,visuals=null,note=null;const controller=new AbortController(),decoded=new Set();
 const releaseVisuals=()=>{for(const image of decoded)image.close?.();decoded.clear();visuals=null};
 const cleanup=e=>{if(e?.persisted||disposed)return;disposed=true;epoch++;try{controller.abort()}finally{try{lifecycle?.dispose()}finally{releaseVisuals();window.removeEventListener('pagehide',cleanup)}}};window.addEventListener('pagehide',cleanup);
 const check=()=>{if(disposed||controller.signal.aborted){const e=Error('S4_ENTRY_ABORTED');e.name='AbortError';throw e}};
 try{
  const adapter=await loadApprovedLatestRuntimeAdapter();check();const seed=await createS4GameplayQAInitialFixture({adapter,signal:controller.signal});check();const runtime=seed.runtime;visuals=await loadCenterVisuals({read:async url=>{check();const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('CENTER_ART_LOAD_FAILED');return new Uint8Array(await r.arrayBuffer()).slice()},decode:async bytes=>{const image=await createImageBitmap(new Blob([bytes]));if(disposed){image.close?.();check()}decoded.add(image);return image}});check();
  async function mount(restore){
   check();if(preparing)throw Error('S4_RESTORE_ALREADY_PENDING');if(restore){const w=lifecycle?.getWorld(),o=lifecycle?.owner;if(w?.field?.menu!==undefined&&w.field.menu!==null)throw Error('메뉴를 닫은 뒤 복원해 주세요.');if(!o||o.pending||o.phase!=='idle'||o.conflict||w?.busy||w?.inputLocked||!o.getScene()?.readNative?.())throw Error('S4_RESTORE_BUSY_OR_LOCAL_HOUSE_HOLD')}
   preparing=true;const mine=++epoch,old=lifecycle,oldHost=activeHost;oldHost?.pause();let next;
   try{next=await mountS4FixedPairWithMain({startCanonicalWorld,visuals,signal:controller.signal,preparationOptions:{adapter,initialRuntime:runtime,initialHubState:'OPEN',storage,restore,signal:controller.signal,scratchFactory:(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c}},replacePrevious:()=>{check();if(mine!==epoch)throw Error('STALE_S4_RESTORE');old?.dispose();lifecycle=null;activeHost=null},hostFactory:options=>{
     check();if(mine!==epoch)throw Error('STALE_S4_HOST');const banner=document.createElement('section'),text=document.createElement('p'),button=document.createElement('button');text.textContent='QA_S4_GAMEPLAY_NO_USER_STORAGE · 공식 준비 행동으로 S4 직전까지 준비·초기 S4(4,12)/OPEN 지정. 기존 고레벨 QA 파티이며 전체 여정·난이도 인증 아님. 사용자 저장 슬롯 변경 없음.';banner.style.cssText='background:#ffe69a;color:#241b00;padding:12px';button.textContent='개발 메모리 복원';banner.append(text,button);options.root.prepend(banner);note=text;
     const host=installS4FixedPairReviewHost(options),dispose=host.dispose.bind(host);activeHost=host;button.onclick=async()=>{if(disposed||activeHost!==host)return;try{await mount(true)}catch(e){if(!disposed&&activeHost===host&&note===text)text.textContent='메모리 복원 보류: '+e.message}};host.dispose=()=>{try{dispose()}finally{banner.remove();if(activeHost===host)activeHost=null;if(note===text)note=null}};return host;
   }});if(disposed||mine!==epoch){next.dispose();check();throw Error('STALE_S4_MAIN_MOUNT')}lifecycle=next;storage=next.storage;if(restore&&note)note.textContent='QA_S4_GAMEPLAY_NO_USER_STORAGE · 검증된 개발 메모리 복원 완료. 사용자 저장 슬롯 변경 없음. 원래 전투·관찰·조우 연결 개발 검토.';return next;
   }catch(e){if(!disposed&&lifecycle===old)oldHost?.resume();throw e}finally{if(mine===epoch)preparing=false}
  }
  await mount(false);return{dispose:cleanup,getWorld:()=>lifecycle?.getWorld()};
 }catch(e){const show=!disposed;cleanup();if(show){const alert=document.createElement('p');alert.setAttribute('role','alert');alert.textContent='고현 지도 검토를 준비하지 못했습니다. 저장은 변경하지 않았습니다. 페이지를 새로고침해 다시 시도해 주세요. ('+String(e?.code??e?.message??'INITIALIZATION_FAILED').slice(0,120)+')';alert.style.cssText='background:#ffe69a;color:#241b00;padding:16px';document.body.append(alert)}throw e}
}
