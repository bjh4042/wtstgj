const assetModuleURL=import.meta.url;
import{ROOT_SELECTION_SHA,PROPOSAL_SHA}from'./pins.mjs';
const sha=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function loadSelectedLampExtensions({fetcher=fetch,lightingManifest}){
 const base=new URL('./',assetModuleURL),read=async(name,pin)=>{const r=await fetcher(new URL(name,base));if(!r.ok)throw Error('LAMP_EXTENSION_INPUT_MISSING');const b=(await r.arrayBuffer()).slice(0);if(await sha(b)!==pin)throw Error('LAMP_EXTENSION_SHA_MISMATCH');return b},json=async(n,p)=>JSON.parse(new TextDecoder().decode(await read(n,p)));
 const selection=await json('ROOT_SELECTION.json',ROOT_SELECTION_SHA),proposal=await json('LAYER_PROPOSAL.json',PROPOSAL_SHA);
 if(selection.status!=='ROOT_SELECTED_SIXTEEN_RENDER_LAYERS_DEVELOPMENT_ONLY'||selection.proposalSHA!==PROPOSAL_SHA||proposal.sourceLightingRevision!==lightingManifest?.revision||['OPEN','CLOSED'].some(k=>proposal.sourceSHAs[k]!==lightingManifest.sourceSHAs[k]))throw Error('LAMP_EXTENSION_IDENTITY_DRIFT');
 if(selection.layers.length!==16||new Set(selection.selectedIds).size!==16||selection.selectedIds.some(id=>['L01','L07','L17','L20','L21','L22'].includes(id)))throw Error('LAMP_EXTENSION_SCOPE');
 const layers=[];
 for(const l of proposal.layers){const source=lightingManifest.fixtureRecords.find(x=>x.id===l.id),s=selection.layers.find(x=>x.id===l.id);
 if(!source||source.kind!=='street_lamp'||!Number.isInteger(source.groundY)||JSON.stringify(source)!==JSON.stringify(l.sourceFixture)||s?.lightingGroundYUnchanged!==source.groundY||s?.maskSHA!==l.maskSHA||s?.depthGroundY!==l.depthGroundY)throw Error('LAMP_EXTENSION_FIXTURE_DRIFT');
 const mask=new Uint8Array(await read(l.maskFile,l.maskSHA)),[a,b,c,d]=l.box;if(mask.length!==(c-a)*(d-b)||!mask.every(x=>x===0||x===1))throw Error('LAMP_EXTENSION_MASK_SHAPE');layers.push(Object.freeze({...l,mask}));}
 return Object.freeze({selection,layers:Object.freeze(layers)});
}
