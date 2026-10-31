import{createWorldDefinition,cellPosition}from'../world/definition.mjs';
import{createWorldHost}from'../world/service.mjs';
import{initialWorldState,syncWorldLocation}from'../world/state.mjs';
const moduleURL=import.meta.url;
export const JANGMOK_FUNDED_FIXTURE_SHA='5221bb8cfb8b9f7cffc227b72d3a87b6926392d9630140dbbe798cfcfa8bacdf';
export async function loadJangmokFundedReviewFixture({adapter,readBytes,signal}={}){
 if(!adapter||adapter.version!=='canonical-20260927'||adapter.releaseProvenance?.policy!=='LATEST_STORY_RETAINED_COMBAT_V1'||typeof readBytes!=='function')throw Error('PINNED_QA_FIXTURE_INPUTS_REQUIRED');
 const check=()=>{if(signal?.aborted)throw Error('QA_FIXTURE_LOAD_CANCELLED')};check();
 const input=await readBytes(new URL('./post-memory-fixture.json',moduleURL),{signal}),bytes=input instanceof ArrayBuffer?new Uint8Array(input.slice(0)):new Uint8Array(input);check();
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');check();if(hash!==JANGMOK_FUNDED_FIXTURE_SHA)throw Error('QA_FIXTURE_PIN_MISMATCH');
 const runtime=JSON.parse(new TextDecoder().decode(bytes)),definition=createWorldDefinition(adapter);
 // Explicit pre-constructor QA location mapping, not a native warp or original journey.
 // Original POST test input has no world ledger. No party/funds/flags/items are changed.
 if(runtime.world!==undefined)throw Error('QA_FIXTURE_UNEXPECTED_WORLD_LEDGER');
 runtime.world=initialWorldState(definition);runtime.position=cellPosition('world:hub:S2',4,12);syncWorldLocation(runtime,createWorldHost(definition,adapter.storyRuntime));return runtime;
}
