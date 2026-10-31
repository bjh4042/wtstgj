import{startCanonicalWorld}from'../../world/entry.mjs';
import{CanonicalWorld,createWorldHost}from'../../world/service.mjs';
import{createWorldDefinition,cellPosition}from'../../world/definition.mjs';
import{initialWorldState,syncWorldLocation}from'../../world/state.mjs';
import{loadApprovedLatestRuntimeAdapter}from'../../compatibility/approved-latest-runtime-adapter.mjs';
import{SpeciesCatalogService}from'../../species-catalog-service.mjs';
import{createPostHealAuthority}from'../../world/post-heal-authority.mjs';
import{createPostShopAuthority}from'../../world/post-shop-authority.mjs';
import{createPostEntryAuthority}from'../../world/post-entry-authority.mjs';
import{createNativeSummitAuthority}from'../../world/native-summit-authority.mjs';
import{loadSceneInputs}from'../nojasan/load.mjs';
import{loadCenterVisuals}from'../center/center-visual-loader.mjs';
import{createPostSummitEnvelopeCodec}from'../native-save/native-envelope.mjs';
import{createPostSummitLocationRegistry}from'./registered-locations.mjs';
import{createTransitionMemoryStorage,createTransitionOwner,inspectTransitionMemorySave}from'./transition-owner.mjs';
import{createPairedSceneFactory}from'./scene-adapters.mjs';
import{installPairedReviewHost}from'./paired-review-host.mjs';
const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
export async function startPairedReview(){
 if(!import.meta.env.DEV)throw Error('DEVELOPMENT_ONLY');
 const assetRoot=new URL(import.meta.env.BASE_URL+'development/',location.href),storage=createTransitionMemoryStorage(),sharedImages=new Set(),closed=new WeakSet();
 let disposed=false,generation=0,lifecycle=null,owner=null;
 const close=image=>{if(image&&typeof image==='object'&&!closed.has(image)){closed.add(image);image.close?.()}};
 const cleanup=e=>{if(e?.persisted||disposed)return;disposed=true;generation++;lifecycle?.dispose();owner?.dispose();for(const image of sharedImages)close(image);window.removeEventListener('pagehide',cleanup)};
 window.addEventListener('pagehide',cleanup);
 const read=async url=>{const r=await fetch(url);if(!r.ok)throw Error('PINNED_INPUT_UNAVAILABLE');return r.arrayBuffer()},decode=b=>createImageBitmap(new Blob([b])),sharedDecode=async b=>{const image=await decode(b);sharedImages.add(image);if(disposed)close(image);return image},canvasFactory=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
 try{
 const [adapter,summitInputs,visuals,raw,postRaw]=await Promise.all([loadApprovedLatestRuntimeAdapter(),loadSceneInputs({decode:sharedDecode}),loadCenterVisuals({read,decode:sharedDecode}),read(new URL('post-memory-fixture.json',assetRoot)),read(new URL('post-map/vendor/post_two_scene_native_r2/NATIVE49_INPUTS.json',assetRoot))]);
 if(disposed)return;if(await hash(raw)!=='5221bb8cfb8b9f7cffc227b72d3a87b6926392d9630140dbbe798cfcfa8bacdf'||await hash(postRaw)!=='efd4a2be1a5f968e5746a14dd416ab52da3a506d27e398289a364e0606ad9a3e')throw Error('PAIRED_FIXTURE_OR_MASK_PIN_MISMATCH');
 const input=JSON.parse(new TextDecoder().decode(postRaw)).find(x=>x.mapId==='world:hub:POST'),postMask=new Uint8Array(input.width*input.height);for(let y=0;y<input.height;y++)for(const[a,b]of input.safe49Rows[y])postMask.fill(1,y*input.width+a,y*input.width+b);
 const masks={postMask,summitMask:summitInputs.safeBytes},registry=await createPostSummitLocationRegistry(masks),codec=await createPostSummitEnvelopeCodec(masks),catalog=new SpeciesCatalogService({namespace:'canonical',adapter});
 const runtime=JSON.parse(new TextDecoder().decode(raw)),definition=createWorldDefinition(adapter);runtime.world=initialWorldState(definition);runtime.position=cellPosition('world:hub:POST',10,12);syncWorldLocation(runtime,createWorldHost(definition,adapter.storyRuntime));
 async function mount(restore=false){
  const mine=++generation,saved=restore?inspectTransitionMemorySave({storage,codec,catalog,slot:'SLOT_1'}):null;let nextOwner=null,nextScene=null,replaced=false,reportReady=null;
  const prepareScene=createPairedSceneFactory({registry,getOwner:()=>nextOwner,summitInputs,postOptions:{read,decode,canvasFactory}});
  try{nextScene=await prepareScene(saved?.location??{...registry.describe('world:hub:POST'),foot:[80,570],facing:'right'});if(disposed||mine!==generation){nextScene.dispose();return}if(saved&&inspectTransitionMemorySave({storage,codec,catalog,slot:'SLOT_1'}).raw!==saved.raw)throw Error('STALE_RESTORE');
   const readNative=()=>nextOwner?.getScene()?.readNative()??null,authority=createPostHealAuthority({readNative}),shop=createPostShopAuthority({readNative}),entry=createPostEntryAuthority({readNative}),summit=createNativeSummitAuthority({readNative});
   lifecycle?.dispose();lifecycle=null;owner=null;replaced=true;
   const nextLifecycle=await startCanonicalWorld({developmentAdapter:adapter,developmentFixture:()=>structuredClone(saved?.runtime??runtime),developmentWorldFactory:options=>{nextOwner=createTransitionOwner({worldFactory:({persist,runtime:restored})=>new CanonicalWorld({...options,runtime:restored??options.runtime,persist,nativeInteractionAuthority:authority,nativeShopAuthority:shop,nativePostEntryAuthority:entry,nativeSummitAuthority:summit}),initialScene:nextScene,prepareScene,invokeWarp:(w,id)=>id.endsWith(':return')?w.interactNativeSummit(id,{type:'return'}):w.interactNativePostEntry(id,{type:'warp'}),registry,storage,codec,catalog,slot:'SLOT_1',featureGate:'NATIVE_MEMORY_TRANSITION_ONLY',restoreRaw:saved?.raw??null});owner=nextOwner;return nextOwner.getWorld()},developmentReview:options=>{reportReady=options.onStatus;return installPairedReviewHost({...options,owner:nextOwner,visuals,onRestore:()=>mount(true)})}});
   if(disposed||mine!==generation){nextLifecycle.dispose();return}lifecycle=nextLifecycle;reportReady?.(restore?'메모리 슬롯에서 위치·진행을 복원했습니다. 실제 사용자 저장소 변경 없음.':'POST ↔ 노자산 지도 연결 준비 완료 · 메모리 전용.');
  }catch(error){nextOwner?.dispose();if(!nextOwner)nextScene?.dispose();if(replaced&&!disposed&&mine===generation){const p=document.createElement('p');p.setAttribute('role','alert');p.textContent='개발 메모리 세션 표시 실패: '+error.message+' · 실제 사용자 저장소 변경 없음';document.body.replaceChildren(p)}throw error}
 }
 if(!disposed)await mount();
 }catch(error){cleanup();throw error}
}
