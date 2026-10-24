import {BIOMES,BIOME_PLACEHOLDER_COLORS} from './presentation/map-presentation.mjs';
import {TILE_ANIMATIONS} from './presentation/tile-animation.mjs';
import {VFX_FAMILIES} from './presentation/battle-vfx.mjs';
import {battleDisplayMetadata} from './presentation/battle-display.mjs';
export {AUDIO_MANIFEST} from './presentation/audio-hooks.mjs';
import {CANONICAL_ASSET_DESCRIPTORS} from './canonical-species-assets.mjs';
export {CANONICAL_SPECIES_ASSETS} from './canonical-species-assets.mjs';
import {FOLLOWER_ATLAS_CONTRACT,FOLLOWER_METADATA} from './species-asset-contract.mjs';
import {LEGACY_ASSETS} from './art/legacy-assets.mjs';
import {SPECIES_ART_BY_ID} from './art/species-crops.mjs';
import {FIELD_BINDINGS,LEGACY_FIELD_KEYS} from './art/field-bindings.mjs';
import {W03_FIELD_DESCRIPTORS} from './art/w03-human-field.mjs';
export {LEGACY_FIELD_KEYS};
export const HUMAN_FIELD_CONTRACT=Object.freeze({version:1,cellWidth:96,cellHeight:120,columns:3,rows:['FRONT','RIGHT','LEFT','BACK'],frames:['Idle','WalkA','WalkB'],anchor:[49,120],width:288,height:480,alpha:true});
export const HUMAN_ROSTER=Object.freeze([
 ['player-boy','주인공 남'],['player-girl','주인공 여'],['harin','하린'],['kangmin','강민'],['youngjin','영진'],['jeongui','정의'],['jinseong','진성'],['myeongju','명주'],['juhyeok','주혁'],['usang','우상'],['dr-chae','닥터 채'],['hwigyeong','휘경'],['bomi','보미'],['junseok','준석'],['yunwoo','윤우'],['siyun','시윤'],['eunmi','은미'],['junho','준호'],['dr-yun','윤 박사'],['yeji','예지']
].map(([id,name])=>Object.freeze({id,name})));
export function legacySpeciesArt(id,side='front'){
 const facing=side==='back'?'back':'front';
 const fire=[[75,80,328,309],[620,76,315,313],[75,469,394,395],[586,469,370,395],[57,918,455,502],[542,921,429,511]];
 if(id>=70&&id<=72)return {id,side:facing,...LEGACY_ASSETS['legacy.v12.fire-cats'],source:fire[(id-70)*2+(facing==='back'?1:0)]};
 const art=SPECIES_ART_BY_ID[id]?.[facing];return art?{id,side:facing,...art}:null;
}
const manifest={};
function add(id,kind,path,width,height,legacy=null,extra={}){manifest[id]={id,kind,final:{src:'assets/final/'+path,width,height,source:[0,0,width,height]},legacy, ...extra};}
for(const [id,art] of Object.entries(LEGACY_ASSETS))manifest[id]={id,kind:'legacy',legacy:art};
for(const person of [...HUMAN_ROSTER,...['investigator','fisherman','researcher'].map(id=>({id,name:id}))]){
 const legacy=person.id==='player-boy'?LEGACY_ASSETS['legacy.golden-field-v2.player.player-atlas']:person.id==='investigator'?LEGACY_ASSETS['legacy.character-npc-v1.investigator-atlas']:null;
 add('human.'+person.id+'.field','human',`humans/${person.id}/field.png`,288,480,legacy,{contract:HUMAN_FIELD_CONTRACT,alpha:true});
 for(const slot of ['portrait','battle-idle','battle-throw'])add(`human.${person.id}.${slot}`,'portrait',`humans/${person.id}/${slot}.png`,256,256,null,{alpha:true});
}
for(let id=1;id<=151;id++)for(const slot of ['front','back','icon']){const n=String(id).padStart(3,'0'),size=slot==='icon'?32:256;add(`species.${id}.${slot}`,'species',`species/${n}/${slot}.png`,size,size,legacySpeciesArt(id,slot),{alpha:true});}
// New semantic slots share the existing PNG paths. Old flat IDs remain compatible.
Object.assign(manifest,W03_FIELD_DESCRIPTORS);
const speciesAssets={};
for(let id=1;id<=151;id++){
 const front=`species.${id}.battle.front`,back=`species.${id}.battle.back`,icon=`species.${id}.ui.icon`,atlas=`species.${id}.fieldFollower.atlas`;
 for(const [key,slot] of [[front,'front'],[back,'back'],[icon,'icon']])manifest[key]={...manifest[`species.${id}.${slot}`],id:key,legacy:null,speciesId:id,slot:slot==='icon'?'ui.icon':`battle.${slot}`};
 add(atlas,'follower',`species/${String(id).padStart(3,'0')}/follower.png`,288,480,null,{speciesId:id,slot:'fieldFollower.atlas',contract:FOLLOWER_ATLAS_CONTRACT,metadata:FOLLOWER_METADATA[id],alpha:true});
 speciesAssets[id]=Object.freeze({battle:Object.freeze({front,back}),ui:Object.freeze({icon}),fieldFollower:Object.freeze({atlas,...FOLLOWER_METADATA[id]})});
}
export const SPECIES_ASSETS=Object.freeze(speciesAssets);
export function speciesAssetId(id,slot='front'){const s=SPECIES_ASSETS[id];return slot==='front'||slot==='battle.front'?s?.battle.front:slot==='back'||slot==='battle.back'?s?.battle.back:slot==='icon'||slot==='ui.icon'?s?.ui.icon:slot==='follower'||slot==='fieldFollower.atlas'?s?.fieldFollower.atlas:undefined;}
for(const [id,legacyId] of Object.entries(FIELD_BINDINGS)){
 const legacy=LEGACY_ASSETS[legacyId];if(!legacy)throw Error('Unregistered legacy asset '+legacyId);
 const kind=id.startsWith('field.objects.')?'building':id.startsWith('field.ui.')?'ui':'field';
 const path=kind==='building'?`buildings/${id.slice(14)}.png`:kind==='ui'?`ui/${id.slice(9)}.png`:`field/${id.slice(6).replaceAll('.','/')}.png`;
 add(id,kind,path,legacy.width,legacy.height,legacy);
}
add('tileset.field.v1','tileset','tilesets/field-v1.png',512,32,null,{tileSize:32,columns:16});
for(const [i,id] of ['lab','grass','coast','boat'].entries())add('battle.'+id,'background',`battle/${id}.png`,960,540,{...LEGACY_ASSETS['legacy.v12.battle-places'],source:[i%2*915.5,Math.floor(i/2)*429.5,915.5,429.5]});
add('ui.title','ui','ui/title.png',1536,1024,LEGACY_ASSETS['legacy.title-art-clean']);
for(const name of ['ecocenter','house','laboratory']){const a=LEGACY_ASSETS['legacy.rc3.buildings.'+name];add('building.'+name,'building',`buildings/${name}-32.png`,a.width,a.height,a);}
Object.assign(manifest,CANONICAL_ASSET_DESCRIPTORS);
for(const biome of BIOMES){const old={COAST:'coast',GRASSLAND:'grass',INDOOR:'lab'}[biome];add('battle.biome.'+biome,'background',`battle/biomes/${biome}.png`,960,540,old?manifest['battle.'+old].legacy:null,{biomeId:biome,placeholderColor:BIOME_PLACEHOLDER_COLORS[biome]})}
for(const definition of Object.values(TILE_ANIMATIONS))for(const [index,id] of definition.frames.entries())add(id,'tile-animation',`tilesets/animations/${definition.family}/${index}.png`,32,32,null,{alpha:true});
for(const family of VFX_FAMILIES)add('vfx.'+family,'vfx',`vfx/${family}.png`,256,256,null,{alpha:true});
for(const [id,asset] of Object.entries(manifest))if(asset.slot==='battle.front'||asset.slot==='battle.back')manifest[id]={...asset,battleDisplay:battleDisplayMetadata({namespace:asset.namespace??'work-v2',speciesId:asset.speciesId})};

export const ASSET_MANIFEST=Object.freeze(Object.fromEntries(Object.entries(manifest).map(([id,asset])=>[id,Object.freeze(asset)])));
export const FIELD_ASSET_IDS=Object.freeze(Object.keys(FIELD_BINDINGS));
export function assetDescriptor(id){return ASSET_MANIFEST[id]??{id,kind:'unknown'};}
export function assetPath(id){const a=assetDescriptor(id);return a.final?.src??a.legacy?.src??'';}
export function humanPose(facing='down',moving=false,walk=0,{legacy=false}={}){
 const rows=legacy?['down','left','right','up']:['down','right','left','up'];
 const row=Math.max(0,rows.indexOf(facing));const frame=moving?(legacy?[1,3,2,3]:[1,0,2,0])[Math.floor(Math.max(0,walk)/26)%4]:0;
 return {row,frame,source:[frame*96,row*120,96,120],anchor:[49,120]};
}

export const assetLegacyPath=id=>LEGACY_ASSETS[id]?.src??'';
export const SLICE_ASSET_IDS={"grass": "legacy.rc3.tiles.grass-0", "dirt": "legacy.rc3.tiles.dirt-0", "tall": "legacy.rc3.tiles.tall-grass-0", "sand": "legacy.rc3.tiles.sand-0", "water": "legacy.rc3.tiles.shallow-0", "tree": "legacy.rc3.tiles.tree", "bush": "legacy.rc3.tiles.bush", "flowers": "legacy.rc3.tiles.flowers", "sign": "legacy.rc3.tiles.sign", "ecocenter": "building.ecocenter", "house": "building.house", "laboratory": "building.laboratory", "boy_front": "legacy.rc3.players.boy_front", "boy_back": "legacy.rc3.players.boy_back", "boy_left": "legacy.rc3.players.boy_left", "boy_right": "legacy.rc3.players.boy_right", "girl_front": "legacy.rc3.players.girl_front", "girl_back": "legacy.rc3.players.girl_back", "girl_left": "legacy.rc3.players.girl_left", "girl_right": "legacy.rc3.players.girl_right", "floor": "legacy.rc3.interior-sample.floor", "wall": "legacy.rc3.interior-sample.wall", "table": "legacy.rc3.interior-sample.table", "shelf": "legacy.rc3.interior-sample.shelf", "chair": "legacy.rc3.interior-sample.chair", "stairs": "legacy.rc3.interior-sample.stairs"};
export const LEGACY_PATH_IDS=Object.freeze(Object.fromEntries(Object.entries(LEGACY_ASSETS).map(([id,a])=>[a.src,id])));

export const FIELD_HUMAN_IDS=Object.freeze({npc_left:'investigator',npc_fishing:'fisherman',researcher:'researcher'});
