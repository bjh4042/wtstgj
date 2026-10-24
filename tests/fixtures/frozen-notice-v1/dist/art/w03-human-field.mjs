import {W03_FIELD_ATLASES} from './w03-field-atlases.mjs';
import {W03_PLAYER_ATLASES} from './w03-player-field.mjs';
const lockedAssets=[...W03_FIELD_ATLASES,...W03_PLAYER_ATLASES];

// Immutable named-character and player-only cells. Shared generic/trainer slots
// retain their legacy anchor, scaling and animation. Historical unique IDs stay loaded.
export const W03_SOURCE_CONTRACT=Object.freeze({cellWidth:96,cellHeight:120,
 width:288,height:480,columns:3,rows:['FRONT','RIGHT','LEFT','BACK'],
 frames:['Idle','WalkA','WalkB'],anchor:[48,103],bottomBoundaryY:104,renderScale:1});
const rows=Object.freeze({down:0,right:1,left:2,up:3});
const cycle=Object.freeze([1,0,2,0]);
const byAsset=Object.freeze(Object.fromEntries(lockedAssets.map(a=>[a.assetId,a])));
export const w03FieldMetadata=id=>byAsset[id]??null;
export const W03_FIELD_DESCRIPTORS=Object.freeze(Object.fromEntries(lockedAssets.map(a=>[a.assetId,{
 id:a.assetId,kind:'human',final:{src:a.runtimePath,width:288,height:480,source:[0,0,288,480]},
 legacy:null,alpha:true,contract:W03_SOURCE_CONTRACT,w03:{...a,sourceAnchorX:48,sourceAnchorY:103,renderScale:1}
}])));
export function w03HumanDraw(assetId,{facing='down',moving=false,walk=0,x,y,cameraY=0}){
 if(!byAsset[assetId])return null;
 if(!Object.hasOwn(rows,facing))throw Error('Invalid W03 direction '+facing);
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(cameraY))throw Error('Invalid W03 ground position');
 const row=rows[facing],frame=moving?cycle[Math.floor(Math.max(0,walk)/26)%4]:0;
 return {row,frame,source:[frame*96,row*120,96,120],destination:[Math.round(x)-48,Math.round(y-cameraY)-103,96,120],
  sourceAnchorX:48,sourceAnchorY:103,runtimeOriginX:0,runtimeOriginY:0,drawOffsetX:-48,drawOffsetY:-103,renderScale:1};
}
export function drawW03Human(c,art,actor,cameraY=0){
 if(art?.status!=='final')return false;
 const pose=w03HumanDraw(art.id,{...actor,cameraY});if(!pose)return false;
 c.save();c.imageSmoothingEnabled=false;c.drawImage(art.image,...pose.source,...pose.destination);c.restore();return true;
}
