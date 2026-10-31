import {startCanonicalWorld} from '../../world/entry.mjs';
import {loadApprovedLatestRuntimeAdapter} from '../../compatibility/approved-latest-runtime-adapter.mjs';
import {createWorldDefinition,cellPosition} from '../../world/definition.mjs';
import {createWorldHost} from '../../world/service.mjs';
import {initialWorldState,syncWorldLocation} from '../../world/state.mjs';
import {loadCenterVisuals} from '../center/center-visual-loader.mjs';
import {mountS4FixedPairWithMain} from './main-mount.mjs';
import {installS4FixedPairReviewHost} from './main-host.mjs';
const assetModuleURL=import.meta.url;
export async function startGohyeonPairReview(){
 if(import.meta.env?.DEV!==true||new URLSearchParams(location.search).get('gohyeonPair')!=='1')throw Error('DEVELOPMENT_ONLY');
 let disposed=false,preparing=false,epoch=0,lifecycle=null,activeHost=null,storage=null,visuals=null,note=null;const controller=new AbortController(),decoded=new Set();
 const releaseVisuals=()=>{for(const image of decoded)image.close?.();decoded.clear();visuals=null};
 const cleanup=e=>{if(e?.persisted||disposed)return;disposed=true;epoch++;try{controller.abort()}finally{try{lifecycle?.dispose()}finally{releaseVisuals();window.removeEventListener('pagehide',cleanup)}}};window.addEventListener('pagehide',cleanup);
 const check=()=>{if(disposed||controller.signal.aborted){const e=Error('S4_ENTRY_ABORTED');e.name='AbortError';throw e}};
 try{
  const [adapter,runtime]=await Promise.all([loadApprovedLatestRuntimeAdapter(),(async()=>{const r=await fetch(new URL('../post-memory-fixture.json',assetModuleURL),{signal:controller.signal});if(!r.ok)throw Error('QA_FIXTURE_MISSING');const bytes=new Uint8Array(await r.arrayBuffer()).slice();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!=='5221bb8cfb8b9f7cffc227b72d3a87b6926392d9630140dbbe798cfcfa8bacdf')throw Error('QA_FIXTURE_PIN_MISMATCH');return JSON.parse(new TextDecoder().decode(bytes))})(),loadCenterVisuals({read:async url=>{check();const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('CENTER_ART_LOAD_FAILED');return new Uint8Array(await r.arrayBuffer()).slice()},decode:async bytes=>{const image=await createImageBitmap(new Blob([bytes]));if(disposed){image.close?.();check()}decoded.add(image);return image}}).then(v=>{if(disposed){releaseVisuals();check()}visuals=v},e=>{releaseVisuals();throw e})]);check();
  const definition=createWorldDefinition(adapter);runtime.world=initialWorldState(definition);runtime.position=cellPosition('world:hub:S4',4,12);syncWorldLocation(runtime,createWorldHost(definition,adapter.storyRuntime));
  async function mount(restore){
   check();if(preparing)throw Error('S4_RESTORE_ALREADY_PENDING');if(restore){const w=lifecycle?.getWorld(),o=lifecycle?.owner;if(w?.field?.menu!==undefined&&w.field.menu!==null)throw Error('메뉴를 닫은 뒤 복원해 주세요.');if(!o||o.pending||o.phase!=='idle'||o.conflict||w?.busy||w?.inputLocked||!o.getScene()?.readNative?.())throw Error('S4_RESTORE_BUSY_OR_LOCAL_HOUSE_HOLD')}
   preparing=true;const mine=++epoch,old=lifecycle,oldHost=activeHost;oldHost?.pause();let next;
   try{next=await mountS4FixedPairWithMain({startCanonicalWorld,visuals,signal:controller.signal,preparationOptions:{adapter,initialRuntime:runtime,initialHubState:'OPEN',storage,restore,signal:controller.signal,scratchFactory:(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c}},replacePrevious:()=>{check();if(mine!==epoch)throw Error('STALE_S4_RESTORE');old?.dispose();lifecycle=null;activeHost=null},hostFactory:options=>{
     check();if(mine!==epoch)throw Error('STALE_S4_HOST');const banner=document.createElement('section'),text=document.createElement('p'),button=document.createElement('button');text.textContent='QA_S4_LOCATION_NO_USER_STORAGE · 초기 S4(4,12)/OPEN 지정. 원래 여정 해금 인증 아님. 원래 target NPC·역사·관찰·조우 미연결. 사용자 저장 슬롯 변경 없음.';banner.style.cssText='background:#ffe69a;color:#241b00;padding:12px';button.textContent='개발 메모리 복원';banner.append(text,button);options.root.prepend(banner);note=text;
     const host=installS4FixedPairReviewHost(options),dispose=host.dispose.bind(host);activeHost=host;button.onclick=async()=>{if(disposed||activeHost!==host)return;try{await mount(true)}catch(e){if(!disposed&&activeHost===host&&note===text)text.textContent='메모리 복원 보류: '+e.message}};host.dispose=()=>{try{dispose()}finally{banner.remove();if(activeHost===host)activeHost=null;if(note===text)note=null}};return host;
   }});if(disposed||mine!==epoch){next.dispose();check();throw Error('STALE_S4_MAIN_MOUNT')}lifecycle=next;storage=next.storage;if(restore&&note)note.textContent='QA_S4_LOCATION_NO_USER_STORAGE · 검증된 개발 메모리 복원 완료. 사용자 저장 슬롯 변경 없음. NPC·역사·관찰·조우 미연결.';return next;
   }catch(e){if(!disposed&&lifecycle===old)oldHost?.resume();throw e}finally{if(mine===epoch)preparing=false}
  }
  await mount(false);return{dispose:cleanup,getWorld:()=>lifecycle?.getWorld()};
 }catch(e){const show=!disposed;cleanup();if(show){const alert=document.createElement('p');alert.setAttribute('role','alert');alert.textContent='고현 지도 검토를 준비하지 못했습니다. 저장은 변경하지 않았습니다. 페이지를 새로고침해 다시 시도해 주세요. ('+String(e?.code??e?.message??'INITIALIZATION_FAILED').slice(0,120)+')';alert.style.cssText='background:#ffe69a;color:#241b00;padding:16px';document.body.append(alert)}throw e}
}
