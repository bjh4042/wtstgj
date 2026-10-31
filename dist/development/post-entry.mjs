import {createPostShopAuthority} from '../world/post-shop-authority.mjs';
import {loadCenterVisuals} from './center/center-visual-loader.mjs';
import {startCanonicalWorld} from '../world/entry.mjs';
import {loadApprovedLatestRuntimeAdapter} from '../compatibility/approved-latest-runtime-adapter.mjs';
import {createWorldDefinition,cellPosition} from '../world/definition.mjs';
import {createWorldHost} from '../world/service.mjs';
import {initialWorldState,syncWorldLocation} from '../world/state.mjs';
import {createPostHealAuthority} from '../world/post-heal-authority.mjs';
import {loadPostNativeHost} from './post-map/post-native-host.mjs';
import {installPostReviewHost} from './post-review-host.mjs';
export async function startPostReview(){
 if(!import.meta.env.DEV)throw Error('DEVELOPMENT_ONLY');
 const read=async url=>{const r=await fetch(url);if(!r.ok)throw Error('POST_INPUT_UNAVAILABLE');return r.arrayBuffer()},canvasFactory=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
 const [host,adapter,raw,visuals]=await Promise.all([loadPostNativeHost({read,decode:b=>createImageBitmap(new Blob([b])),canvasFactory}),loadApprovedLatestRuntimeAdapter(),read(new URL('./post-memory-fixture.json',import.meta.url)),loadCenterVisuals({read,decode:b=>createImageBitmap(new Blob([b]))})]);
 const runtime=JSON.parse(new TextDecoder().decode(raw)),definition=createWorldDefinition(adapter);runtime.world=initialWorldState(definition);runtime.position=cellPosition('world:hub:POST',10,12);syncWorldLocation(runtime,createWorldHost(definition,adapter.storyRuntime));for(const m of runtime.party){m.hp=1;for(const move of m.moves)move.pp=0;}
 const authority=createPostHealAuthority({readNative:host.readNative});
 try{return await startCanonicalWorld({developmentAdapter:adapter,developmentAuthority:authority,developmentShopAuthority:createPostShopAuthority({readNative:host.readNative}),developmentFixture:()=>structuredClone(runtime),developmentReview:options=>installPostReviewHost({...options,host,visuals})})}catch(e){host.dispose();throw e}
}
