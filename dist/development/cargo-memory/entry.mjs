import{createCargoPageCache}from'./page-cache.mjs';
// DEV-only separate entry candidate. Does not alter the ordinary or Cargo R29 entry.
import{startCanonicalWorld}from'../../world/entry.mjs';
import{loadApprovedLatestRuntimeAdapter}from'../../compatibility/approved-latest-runtime-adapter.mjs';
import{createCargoQAInitialFixture}from'../../development/cargo-native/qa-initial-fixture.mjs';
import{selectCargoOfficerQACheckpoint}from'../../development/cargo-native/qa-officer-checkpoint.mjs';
import{createWorldDefinition,cellPosition}from'../../world/definition.mjs';
import{stableJSON}from'../../compatibility/codec.mjs';
import{preloadCargoMemoryOwner}from'./session-owner.mjs';
import{createCargoMemoryStorage}from'./memory-storage.mjs';
import{prepareCargoMemoryReviewInputs,installCargoReviewHost}from'./cargo-memory-host.mjs';
const assetModuleURL=import.meta.url;
const rootURL=new URL('../../development/cargo-native/',assetModuleURL);
export async function startCargoMemoryReview(){
 if(!import.meta.env.DEV)throw Error('DEVELOPMENT_ONLY');
 const query=new URLSearchParams(location.search),one=k=>{const v=query.getAll(k);if(v.length!==1||v[0]!=='1')throw Error('CARGO_MEMORY_QUERY');},optional=k=>{const v=query.getAll(k);if(v.length>1||v.length===1&&v[0]!=='1')throw Error('CARGO_MEMORY_QUERY');return v.length===1};
 one('cargoMemory');one('cargoQAReady');if(["cargoNative", "finalGame", "gohyeonGameplay", "gohyeonNative", "gohyeonPair", "jungleNative", "nativeMemory", "pairedNative", "postNative", "prologueNative", "summitNative", "world"].some(key=>query.has(key)))throw Error('CARGO_MEMORY_QUERY');const postBoss=optional('cargoQAPostBoss'),officers=optional('cargoQAOfficers');if(postBoss&&officers)throw Error('CARGO_MEMORY_QUERY');
 const pageCache=createCargoPageCache(),storage=createCargoMemoryStorage(),abort=new AbortController();let dead=false,lifecycle=null,owner=null,restarting=false;
 const cleanup=()=>{if(dead)return;dead=true;abort.abort();lifecycle?.dispose();owner?.dispose();pageCache.dispose();window.removeEventListener('pagehide',cleanup)};window.addEventListener('pagehide',cleanup);
 try{const adapter=await loadApprovedLatestRuntimeAdapter();if(dead)return;const generated=await createCargoQAInitialFixture({adapter,signal:abort.signal,postBoss});if(dead)return;const prepared=officers?selectCargoOfficerQACheckpoint(generated):generated;
 const entry=createWorldDefinition(adapter).points['ship-entry:S9'];if(entry.targetMapId!=='world:ship:S9'||stableJSON(entry.target)!=='[3,12]')throw Error('SOURCE_SHIP_ENTRY_DRIFT');prepared.runtime.position=cellPosition(entry.targetMapId,...entry.target);prepared.runtime.world.mapId=entry.targetMapId;if(!prepared.runtime.world.visitedMaps.includes(entry.targetMapId))prepared.runtime.world.visitedMaps.push(entry.targetMapId);
 const readBytes=async p=>{const response=await fetch(new URL(p,rootURL),{signal:abort.signal});if(!response.ok)throw Error('CARGO_HTTP_'+response.status);return new Uint8Array(await response.arrayBuffer())};
 const decodeArt=b=>createImageBitmap(new Blob([b],{type:'image/png'})),decodeMask=async b=>{const image=await decodeArt(b);try{const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);return{width:image.width,height:image.height,data:ctx.getImageData(0,0,image.width,image.height).data}}finally{image.close()}};
 async function mount(restore=false){if(dead||restarting)throw Error('CARGO_MEMORY_LIFECYCLE_BUSY');restarting=true;try{
  // Tear down old main first. There is never a second live world/consumer to bypass a gate.
  lifecycle?.dispose();lifecycle=null;owner?.dispose();owner=null;
  const next=await preloadCargoMemoryOwner({featureGate:'CARGO_DEV_ATOMIC_MEMORY_ONLY',storage,slot:'SLOT_1',adapter,runtime:prepared.runtime,restore,readBytes,decodeMask,decodeArt,pageCache,signal:abort.signal});if(dead){next.dispose();return}owner=next;const inputs=prepareCargoMemoryReviewInputs(owner);let bound=false;
  const main=await startCanonicalWorld({developmentAdapter:adapter,developmentFixture:()=>owner.initialRuntime(),developmentWorldFactory:options=>{if(bound||stableJSON(options.runtime)!==stableJSON(owner.initialRuntime()))throw Error('CARGO_MEMORY_WORLD_FACTORY_DRIFT');bound=true;return owner.bindWorld(options)},developmentReview:options=>{const heading=options.root.querySelector('h1');if(heading)heading.textContent='Cargo DEV 원자 기억 저장 · 사용자 슬롯 아님';const banner=document.createElement('p');banner.textContent='DEV 격리 기억 저장 · 원래 행동으로 준비한 Lv100 QA · 사용자 슬롯 변경 없음 · 탭을 닫으면 기억 저장 소멸 · 미확정 수첩/문 이동 중에는 저장 대기';options.root.prepend(banner);const host=installCargoReviewHost({...options,inputs,onRestoreRequested:()=>mount(true)});return Object.create(host,{dispose:{value:()=>{host.dispose();banner.remove()}}})}});if(dead)main.dispose();else lifecycle=main;
 }catch(error){if(!dead){const notice=document.createElement('p');notice.textContent='DEV 기억 복원 보류: '+error.message+' · 저장 원문 유지 / 자동 위치 이동 없음';notice.setAttribute('role','alert');document.body.replaceChildren(notice)}throw error}finally{restarting=false}}
 await mount();return Object.freeze({dispose:cleanup});
 }catch(error){if(dead)return;cleanup();throw error}
}
