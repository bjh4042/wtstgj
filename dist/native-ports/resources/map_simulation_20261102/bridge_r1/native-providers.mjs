// Genuine provider preparation only; not invoked by pure / isolated Map-storage tests.
import{loadS7FeedbackAdapter}from'../ground_contact_r3/s7-leaf.mjs';
import{loadSelectedS8R2Adapter}from'../ground_s8_r1/s8-resource.mjs';
import{isSimulationMapAdapter}from'../ground_contact_r2/map-adapter.mjs';
export const NATIVE_PINS=Object.freeze({
 'world:hub:S7':Object.freeze({state:'OPEN',width:4096,height:1792,imageSHA256:'72751f4ffa8e719a3a500d59dda6ae777ebb33022120563e237ac354e61a55b9',supportSHA256:'140f146eef80cd3227ee3ce2e6c31a407f6693da62d3b92129b65ec02c5ffe18'}),
 'world:hub:S8':Object.freeze({state:'CLOSED',width:3840,height:1728,imageSHA256:'f602c93bdee4c4bd7d08f87d9951b34515d9ffbb34769aea28a4331ffb8b5e06',supportSHA256:'617a378432d8c7ac710c767d370635b3f23ee6c9cfdae20cdbcad3728dce002d'})
});
export function validateNativeAdapter(a,id){const pin=NATIVE_PINS[id],i=a?.identity;return !!pin&&isSimulationMapAdapter(a)&&i.mapId===id&&i.gameAuthority===false&&i.contactPolicy==='NEW_COMMON_FOOT_IDLE30_DEPTH8'&&i.footWidth===30&&i.footHeight===8&&Object.entries(pin).every(([k,v])=>i[k]===v)}
export function validateNativeBundle(b,row){return !!b&&validateNativeAdapter(b.source,row.source)&&validateNativeAdapter(b.target,row.target)}
export async function prepareNativeBundle({source,target,signal}){if(source===target||!NATIVE_PINS[source]||!NATIVE_PINS[target])throw Error('BRIDGE_NATIVE_FIXED_PAIR');const owned=[];const load=async id=>{const a=await(id==='world:hub:S7'?loadS7FeedbackAdapter(signal):loadSelectedS8R2Adapter(signal));owned.push(a);if(signal?.aborted||!validateNativeAdapter(a,id))throw Error('BRIDGE_NATIVE_PIN');return a};const errors=[];let dead=false;const dispose=()=>{if(dead)return;dead=true;for(const a of owned)try{a.dispose()}catch(e){errors.push(String(e?.message??e))}};try{const a=await load(source),b=await load(target);return Object.freeze({source:a,target:b,dispose,get cleanupErrors(){return Object.freeze([...errors])}})}catch(e){dispose();throw e}}
