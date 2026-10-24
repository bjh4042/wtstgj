import {approvedSpeciesArt} from './approved-species.mjs';
import {CANONICAL_IDENTITIES} from './compatibility/species-registry.mjs';
import {FOLLOWER_ATLAS_CONTRACT,FOLLOWER_DEFAULT_METADATA} from './species-asset-contract.mjs';
/** Identity-keyed import paths. Never alias a v3 species to a Work numeric art slot. */
const assets={},descriptors={};
/** @type {ReadonlyArray<{id:string,chainLength:number,chainPosition:number}>} */
const identities=/** @type {ReadonlyArray<{id:string,chainLength:number,chainPosition:number}>} */(CANONICAL_IDENTITIES);
for(const species of identities){
 const id=species.id,metadata=Object.freeze({...FOLLOWER_DEFAULT_METADATA,visualScale:species.chainLength===1?1:({1:.65,2:.85,3:1.05}[species.chainPosition]??1)});
 const keys={front:`canonical.${id}.battle.front`,back:`canonical.${id}.battle.back`,icon:`canonical.${id}.ui.icon`,atlas:`canonical.${id}.fieldFollower.atlas`};
 for(const [key,filename,width,height,kind,slot] of [[keys.front,'front',256,256,'species','battle.front'],[keys.back,'back',256,256,'species','battle.back'],[keys.icon,'icon',32,32,'species','ui.icon'],[keys.atlas,'follower',288,480,'follower','fieldFollower.atlas']]){
  const selected=(slot==='battle.front'||slot==='battle.back'||slot==='ui.icon')?approvedSpeciesArt({namespace:'canonical',speciesId:id},slot==='battle.back'?'back':'front'):null;
  descriptors[key]=Object.freeze({id:key,kind,speciesId:id,namespace:'canonical',slot,alpha:true,legacy:null,final:selected?.src?Object.freeze({...selected,source:Object.freeze(selected.source)}):Object.freeze({src:`assets/final/canonical/${id}/${filename}.png`,width,height,source:Object.freeze([0,0,width,height])}),...(selected?{approvedOriginalStatus:selected.status,battleDisplay:Object.freeze({battleVisualScaleFront:1,battleVisualScaleBack:1})}:{}),...(kind==='follower'?{contract:FOLLOWER_ATLAS_CONTRACT,metadata}:{})});
 }
 assets[id]=Object.freeze({battle:Object.freeze({front:keys.front,back:keys.back}),ui:Object.freeze({icon:keys.icon}),fieldFollower:Object.freeze({atlas:keys.atlas,...metadata})});
}
export const CANONICAL_SPECIES_ASSETS=Object.freeze(assets);
export const CANONICAL_ASSET_DESCRIPTORS=Object.freeze(descriptors);
