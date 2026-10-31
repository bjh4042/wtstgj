import {startCanonicalWorld} from '../../world/entry.mjs';
import {loadApprovedLatestRuntimeAdapter} from '../../compatibility/approved-latest-runtime-adapter.mjs';
import {createWorldDefinition,cellPosition} from '../../world/definition.mjs';
import {createGohyeonHealBinding} from '../../world/gohyeon-heal-binding.mjs';
import {createGohyeonPurchaseBinding} from '../../world/gohyeon-purchase-binding.mjs';
import {loadCenterVisuals} from '../center/center-visual-loader.mjs';
import {CanonicalWorld,createWorldHost} from '../../world/service.mjs';
import {initialWorldState,syncWorldLocation} from '../../world/state.mjs';
import {loadGohyeonInputs} from './native_candidate/load.mjs';
import {installGohyeonReviewHost} from './native_candidate/main-host.mjs';
const assetModuleURL=import.meta.url;
export async function startGohyeonReview(){
 if(!import.meta.env.DEV||new URLSearchParams(location.search).get('gohyeonNative')!=='1')throw Error('DEVELOPMENT_ONLY');
 let disposed=false,inputs=null,lifecycle=null,visuals=null,currentWorld=null,currentScene=null;
 const healBinding=createGohyeonHealBinding({getWorld:()=>currentWorld,getScene:()=>currentScene}),shopBinding=createGohyeonPurchaseBinding({getWorld:()=>currentWorld,getScene:()=>currentScene});
 const decoded=new Set();const releaseVisuals=()=>{for(const image of decoded)image.close?.();decoded.clear();visuals=null;};
 const cleanup=e=>{if(e?.persisted)return;disposed=true;lifecycle?.dispose();healBinding.dispose();shopBinding.dispose();currentWorld=null;currentScene=null;inputs?.dispose();releaseVisuals();window.removeEventListener('pagehide',cleanup)};window.addEventListener('pagehide',cleanup);
 try{
  const loaded=await Promise.all([loadGohyeonInputs().then(value=>{inputs=value;if(disposed)value.dispose();return value}),loadApprovedLatestRuntimeAdapter(),fetch(new URL('../post-memory-fixture.json',assetModuleURL)).then(async r=>{if(!r.ok)throw Error('QA_FIXTURE_MISSING');const bytes=await r.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!=='5221bb8cfb8b9f7cffc227b72d3a87b6926392d9630140dbbe798cfcfa8bacdf')throw Error('QA_FIXTURE_PIN_MISMATCH');return JSON.parse(new TextDecoder().decode(bytes))}),loadCenterVisuals({read:async url=>{const r=await fetch(url);if(!r.ok)throw Error('CENTER_ART_LOAD_FAILED');return new Uint8Array(await r.arrayBuffer())},decode:async bytes=>{const image=await createImageBitmap(new Blob([bytes]));if(disposed){image.close?.();return image;}decoded.add(image);return image;}}).then(value=>{visuals=value;if(disposed)releaseVisuals();return value},error=>{releaseVisuals();throw error})]);
  if(disposed){cleanup();return;}
  const adapter=loaded[1],runtime=loaded[2],definition=createWorldDefinition(adapter);
  // Explicit QA location fixture only. No claim of original S4 journey/unlock completion.
  runtime.world=initialWorldState(definition);runtime.position=cellPosition('world:hub:S4',4,12);syncWorldLocation(runtime,createWorldHost(definition,adapter.storyRuntime));
  const next=await startCanonicalWorld({developmentAdapter:adapter,developmentWorldFactory:options=>{const next=new CanonicalWorld({...options,nativeSelectedHealAuthority:healBinding.authority,nativeSelectedPurchaseAuthority:shopBinding.authority});currentScene=null;currentWorld=next;return next;},developmentFixture:()=>structuredClone(runtime),developmentReview:options=>{
   const note=document.createElement('p');note.textContent='QA 위치 검토 · 고현 S4 초기 위치를 지정한 메모리 전용 fixture입니다. 원래 진입 여정·나머지 7개 기능·사용자 저장은 검증하지 않습니다. 센터 회복/마트 구매는 현재 파티·가방에 실제 반영됩니다.';note.style.cssText='background:#ffe69a;color:#241b00;padding:12px;font-weight:bold';options.root.prepend(note);
   const host=installGohyeonReviewHost({...options,inputs,selectedServices:{healBinding,shopBinding,visuals},onSceneReady:(scene,previous)=>{if(scene||currentScene===previous)currentScene=scene;},scratchFactory:(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c}}),dispose=host.dispose.bind(host);host.dispose=()=>{dispose();note.remove()};return host;
  }});if(disposed)next.dispose();else lifecycle=next;
 }catch(e){cleanup();throw e;}
}
