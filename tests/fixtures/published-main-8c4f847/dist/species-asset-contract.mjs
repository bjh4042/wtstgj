import {CANONICAL_SPECIES_RECORDS} from './species-data.mjs';
/** Additive contract: retained human and tile contracts are unchanged. */
export const FOLLOWER_ATLAS_CONTRACT=Object.freeze({version:1,cellWidth:96,cellHeight:120,columns:3,rowCount:4,width:288,height:480,rows:Object.freeze(['FRONT','RIGHT','LEFT','BACK']),frames:Object.freeze(['Idle','WalkA','WalkB']),alpha:true});
export const FOLLOWER_DEFAULT_METADATA=Object.freeze({visualScale:1,footAnchorX:49,footAnchorY:120,renderOffsetX:0,renderOffsetY:0});
/** Provisional display sizes, not biological heights or final art approval. Override per species here. */
const overrides={};
export const FOLLOWER_METADATA=Object.freeze(Object.fromEntries(CANONICAL_SPECIES_RECORDS.map(s=>[s.no,Object.freeze({...FOLLOWER_DEFAULT_METADATA,visualScale:s.chain_length===1?1:({1:.65,2:.85,3:1.05}[s.chain_position]??1),...overrides[s.no]})])));
export function validateFollowerMetadata(m){
 if(!m||!['visualScale','footAnchorX','footAnchorY','renderOffsetX','renderOffsetY'].every(k=>Number.isFinite(m[k])))throw Error('Follower metadata must contain finite numeric values');
 if(m.visualScale<.125||m.visualScale>4)throw Error('Follower visualScale must be 0.125–4');
 if(m.footAnchorX<0||m.footAnchorX>96||m.footAnchorY<0||m.footAnchorY>120)throw Error('Follower anchor is outside its cell');
 if(Math.abs(m.renderOffsetX)>96||Math.abs(m.renderOffsetY)>120)throw Error('Follower render offset is outside contract bounds');
 return m;
}
export function followerMetadata(id,override){const m={...(FOLLOWER_METADATA[id]??FOLLOWER_DEFAULT_METADATA),...override};try{return validateFollowerMetadata(m)}catch{return {...FOLLOWER_DEFAULT_METADATA}}}
export function followerPose(facing='down',moving=false,walk=0,frameOverride=null){
 const row=Math.max(0,['down','right','left','up'].indexOf(facing));
 const frame=Number.isInteger(frameOverride)&&frameOverride>=0&&frameOverride<3?frameOverride:moving?[1,2][Math.floor(Math.max(0,walk)/16)%2]:0;
 return {row,frame,source:[frame*96,row*120,96,120]};
}
export function followerRect(x,y,metadata,unitScale=1){const m=followerMetadata(null,metadata),scale=m.visualScale*unitScale;return {x:x+(m.renderOffsetX-m.footAnchorX)*scale,y:y+(m.renderOffsetY-m.footAnchorY)*scale,width:96*scale,height:120*scale};}
