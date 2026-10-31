import {startCanonicalWorld} from '../../world/entry.mjs';
import {loadCanonicalRuntimeAdapter} from '../../compatibility/canonical-runtime-adapter.mjs';
import {createJangmokReviewFixture} from '../jangmok-fixture.mjs';
import {createNativeMemoryStorage,createNativeMemorySession} from './native-session-owner.mjs';
import {createNativeEnvelopeCodec} from './native-envelope.mjs';
import {SELECTED_MAP_REVISION} from './native-location.mjs';
import {loadJangmokMemoryView} from './memory-view.mjs';
import {installMemoryReviewHost} from './memory-review-host.mjs';
export async function startNativeMemoryReview(){
 if(!import.meta.env.DEV)throw Error('DEVELOPMENT_ONLY');
 const closedViews=new WeakSet(),closeView=value=>{if(value&&!closedViews.has(value)){closedViews.add(value);value.dispose();}};
 let environment=null,lifecycle=null,owner=null,view=null,disposed=false,generation=0,restoreAbort=null;
 const pagehide=e=>{if(e.persisted)return;disposed=true;generation++;restoreAbort?.abort();lifecycle?.dispose();owner?.dispose();closeView(view);window.removeEventListener('pagehide',pagehide)};
 window.addEventListener('pagehide',pagehide);
 try{
 const storage=createNativeMemoryStorage(),loaded=await Promise.all([loadCanonicalRuntimeAdapter(),loadJangmokMemoryView({getEnvironment:()=>environment}).then(value=>{view=value;if(disposed)closeView(value);return value})]);
 const adapter=loaded[0];view=loaded[1];if(disposed){closeView(view);return;}
 const codec=await createNativeEnvelopeCodec({contract:view.contract,masks:view.masks,mapRevision:SELECTED_MAP_REVISION});if(disposed)return;
 const opts={featureGate:'NATIVE_MEMORY_E2E_ONLY',storage,slot:'SLOT_1',adapter,codec,contract:view.contract,masks:view.masks};
 async function mount(restore=false){
  restoreAbort?.abort();restoreAbort=new AbortController();const epoch=++generation,next=await createNativeMemorySession({...opts,signal:restoreAbort.signal,restore,runtime:restore?null:createJangmokReviewFixture()});
  if(disposed||epoch!==generation){next.dispose();return;}
  lifecycle?.dispose();lifecycle=null;owner=next;
  try{const nextLifecycle=await startCanonicalWorld({developmentAdapter:adapter,developmentFixture:()=>next.getWorld().snapshot(),developmentWorldFactory:options=>{next.bindPresentation(options.hooks);return next.getWorld()},developmentReview:options=>{environment=options.environment;return installMemoryReviewHost({...options,owner:next,view,onRestore:()=>mount(true)})}});
   if(disposed||epoch!==generation){nextLifecycle.dispose();return;}lifecycle=nextLifecycle;
  }catch(e){next.dispose();if(!disposed&&epoch===generation){const message=document.createElement('p');message.setAttribute('role','alert');message.textContent='개발 메모리 세션 시작 실패: '+e.message+' · 사용자 저장소 변경 없음';document.body.replaceChildren(message);}throw e;}
 }
 await mount();
 }catch(e){pagehide({persisted:false});throw e;}
}
