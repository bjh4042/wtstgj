import {createQAReadyFixture,QA_READY_LABEL} from './nojasan/qa-ready.mjs';
import {mountQAReadyBanner} from './nojasan/qa-ready-banner.mjs';
import {startCanonicalWorld} from '../world/entry.mjs';
import {loadApprovedLatestRuntimeAdapter} from '../compatibility/approved-latest-runtime-adapter.mjs';
import {createWorldDefinition,cellPosition} from '../world/definition.mjs';
import {createWorldHost} from '../world/service.mjs';
import {initialWorldState,syncWorldLocation} from '../world/state.mjs';
import {createNativeSummitAuthority} from '../world/native-summit-authority.mjs';
import {loadSceneInputs} from './nojasan/load.mjs';
import {createSummitSceneBinding,installSummitReviewHost} from './nojasan/main-host.mjs';
export async function startSummitReview(){
 if(!import.meta.env.DEV)throw Error('DEVELOPMENT_ONLY');
 const qaReady=new URLSearchParams(location.search).get('summitQAReady')==='1';
 const closed=new WeakSet(),closeInputs=value=>{for(const image of Object.values(value?.images??{}))if(image&&typeof image==='object'&&!closed.has(image)){closed.add(image);image.close?.();}};
 let disposed=false,inputs=null,lifecycle=null;const cleanup=e=>{if(e?.persisted)return;disposed=true;lifecycle?.dispose();closeInputs(inputs);window.removeEventListener('pagehide',cleanup)};window.addEventListener('pagehide',cleanup);
 try{const loaded=await Promise.all([loadSceneInputs().then(value=>{inputs=value;if(disposed)closeInputs(value);return value}),loadApprovedLatestRuntimeAdapter(),fetch(new URL('./post-memory-fixture.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('QA_FIXTURE_MISSING');return r.text()})]);inputs=loaded[0];if(disposed){cleanup();return;}
 const adapter=loaded[1];let runtime;if(qaReady){runtime=(await createQAReadyFixture({adapter,fixtureText:loaded[2],mode:QA_READY_LABEL})).runtime;if(disposed){cleanup();return;}}else{runtime=JSON.parse(loaded[2]);const definition=createWorldDefinition(adapter);runtime.world=initialWorldState(definition);runtime.position=cellPosition('world:hub:POST',34,8);syncWorldLocation(runtime,createWorldHost(definition,adapter.storyRuntime));}
 const binding=createSummitSceneBinding(),authority=createNativeSummitAuthority({readNative:binding.readNative});
 const next=await startCanonicalWorld({developmentAdapter:adapter,developmentSummitAuthority:authority,developmentFixture:()=>structuredClone(runtime),developmentReview:options=>{const host=installSummitReviewHost({...options,inputs,binding});if(qaReady){const remove=mountQAReadyBanner(options.root),dispose=host.dispose.bind(host);host.dispose=()=>{remove();dispose()}}return host}});if(disposed)next.dispose();else lifecycle=next;
 }catch(e){cleanup();throw e;}
}
