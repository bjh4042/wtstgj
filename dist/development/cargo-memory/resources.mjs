import{RESOURCE_PINS}from'../../development/cargo-native/resource-pins.mjs';
import{createEightSceneRegistry,createRescueSelectedMaterial}from'../../world/cargo-eight-scene-geometry.mjs';
import{createSelectedSceneMaterial}from'../../world/cargo-three-scene-geometry.mjs';
import{createNextSelectedSceneMaterial}from'../../world/cargo-five-scene-geometry.mjs';
import{createLastSelectedSceneMaterial}from'../../world/cargo-seven-scene-geometry.mjs';
import{loadCargoChestPhysics,disposeCargoChestPhysics}from'../../development/cargo-native/cargo-chest-physics.mjs';
import{loadEngineUpperLayer,disposeEngineUpperLayer}from'../../development/cargo-native/engine-upper-layer.mjs';
import{loadRoomApproach}from'../../development/cargo-native/room-approach.mjs';
import{loadPortApproach}from'../../development/cargo-native/port-approach.mjs';
import{createCargoEnvelopeCodec}from'./native-envelope.mjs';
const registeredCapabilities=new WeakMap();
export function cargoSaveResourceCapability(token){const r=registeredCapabilities.get(token);if(!r)throw Error('CARGO_SAVE_RESOURCE_CAPABILITY');return r}
export async function loadCargoSaveResources({readBytes,decodeMask,decodeArt,signal,pageCache}){
 const teardownErrors=[],clean=fn=>{try{fn()}catch(e){teardownErrors.push(String(e.message??e))}};const supplemental={};let active=true,doors={},chestPhysics,engineUpperLayer;const materials=new Map();
 const check=()=>{if(!active||signal?.aborted)throw Error('CARGO_RESOURCE_CANCELLED')};
 const read=async p=>{check();const selectedPin=RESOURCE_PINS[p]??supplemental[p];if(pageCache){const b=await pageCache.readVerified(p,selectedPin,readBytes);check();return b}const raw=await readBytes(p);check();const x=raw instanceof ArrayBuffer?new Uint8Array(raw.slice(0)):new Uint8Array(raw),pin=RESOURCE_PINS[p]??supplemental[p];if(!pin||(pin.bytes!==undefined&&x.length!==pin.bytes)||[...new Uint8Array(await crypto.subtle.digest('SHA-256',x))].map(v=>v.toString(16).padStart(2,'0')).join('')!==pin.sha256)throw Error('CARGO_RESOURCE_PIN:'+p);check();return x};
 const contract=JSON.parse(new TextDecoder().decode(await read('SHIP_BINDING_CANDIDATE.json'))),registry=createEightSceneRegistry(JSON.parse(new TextDecoder().decode(await read('registry.json'))));
 for(const spec of Object.values(registry.scenes))for(const pin of [spec.art,...Object.values(spec.geometry.states)])supplemental[pin.path]=pin;
 for(const[scene,prefix,manifest]of[['ship_deck_a','two-scene-r1','SELECTED_TWO_SCENE_RUNTIME_MANIFEST.json'],['ship_deck_b','next-two-r1','SELECTED_NEXT_TWO_RUNTIME_MANIFEST.json'],['ship_cabins','last-two-r1','SELECTED_LAST_TWO_RUNTIME_MANIFEST.json']]){const g=registry.scenes[scene].geometry;supplemental[prefix+'/ROOT_SELECTION.json']={sha256:g.selectionSHA};supplemental[prefix+'/'+manifest]={sha256:g.manifestSHA}}
 const decodeOriginal=decodeMask;if(pageCache)decodeMask=b=>pageCache.decodeSupport(b,decodeOriginal);
 const factory=id=>['ship_bridge','ship_rescue'].includes(id)?createRescueSelectedMaterial:['ship_deck_a','ship_hold_b'].includes(id)?createSelectedSceneMaterial:['ship_deck_b','ship_hold_a'].includes(id)?createNextSelectedSceneMaterial:createLastSelectedSceneMaterial;
 const load=async(spec,readDoors)=>{check();const m=await factory(spec.sceneId)({spec,readBytes:read,decodeMask,decodeArt,readDoors});try{check();return m}catch(e){m.dispose();throw e}};
 const dispose=()=>{if(!active)return;active=false;for(const m of materials.values())clean(()=>m.dispose());materials.clear();if(chestPhysics)clean(()=>disposeCargoChestPhysics(chestPhysics));if(engineUpperLayer)clean(()=>disposeEngineUpperLayer(engineUpperLayer))};
 try{chestPhysics=await loadCargoChestPhysics({readBytes:read});engineUpperLayer=await loadEngineUpperLayer({readBytes:read,decodeMask});const roomApproach=await loadRoomApproach({readBytes:read}),portApproach=await loadPortApproach({readBytes:read});for(const s of Object.values(registry.scenes))materials.set(s.sceneId,await load(s,()=>doors));
 const withDoors=(next,fn)=>{const old=doors;doors=structuredClone(next);try{return fn()}finally{doors=old}};
 const capability=Object.freeze({});registeredCapabilities.set(capability,{contract,registry,materials,withDoors,chestPhysics,engineUpperLayer});const codec=createCargoEnvelopeCodec(capability);
 return{teardownDiagnostics:()=>[...teardownErrors],readBytes:read,readJSON:async p=>JSON.parse(new TextDecoder().decode(await read(p))),contract,registry,codec,chestPhysics,engineUpperLayer,roomApproach,portApproach,load,withDoors,material:id=>materials.get(id),dispose};
 }catch(e){dispose();throw e}
}
