import {approvedAtlasFrame} from './approved-atlas-runtime.mjs';
import {APPROVED_SPECIES_DATA} from './approved-species-data.mjs';
export {APPROVED_SPECIES_DATA};
const images=new Map();
export function approvedSpeciesArt(reference,side='front'){
 if(side!=='front'&&side!=='back')return null;
 const valid=reference?.namespace==='canonical'&&/^SPECIES_\d{3}$/.test(reference.speciesId)||reference?.namespace==='npc_preview_species'&&/^EDNA_0[1-6]$/.test(reference.speciesId);
 const art=valid?APPROVED_SPECIES_DATA.records[reference.speciesId]?.[side]??null:null;if(!art||art.status==='user-deferred')return art;const packed=approvedAtlasFrame('species',`${reference.speciesId}.${side}`);return packed?{...art,src:packed.atlas.src,width:packed.atlas.width,height:packed.atlas.height,source:packed.frame.source,sha256:packed.atlas.sha256,derivativeSha256:art.sha256,atlasId:packed.frame.atlas}:art;
}
/** Full alpha bounds, no distortion, same maximum display extent, bottom-center anchor. */
export function approvedSpeciesRect(art,{x=0,y=0,size=128}={}){
 const [,,sw,sh]=art?.source??[0,0,1,1],scale=size/Math.max(sw,sh),width=sw*scale,height=sh*scale;
 return {x:x-width/2,y:y-height,width,height,scale,anchorX:.5,anchorY:1};
}
/** Called only for currently displayed species. No roster-wide preload or precache. */
export function loadApprovedSpeciesArt(art,{ImageClass=globalThis.Image}={}){
 if(!art?.src||!ImageClass)return null;
 if(images.has(art.src))return images.get(art.src);
 const entry={status:'loading',image:new ImageClass()};images.set(art.src,entry);
 entry.image.onload=()=>{entry.status=entry.image.naturalWidth===art.width&&entry.image.naturalHeight===art.height?'final':'unavailable'};
 entry.image.onerror=()=>{entry.status='unavailable'};entry.image.src=art.src;return entry;
}
export function approvedSpeciesCacheSize(){return images.size}
export function drawApprovedBattleSpecies(c,reference,side,x,y,{size=128}={}){
 const art=approvedSpeciesArt(reference,side);if(!art)return null;
 const rect=approvedSpeciesRect(art,{x,y,size}),loaded=loadApprovedSpeciesArt(art);
 const deferred=art.status==='user-deferred',label=deferred?'후면 준비 중':loaded?.status==='unavailable'?'이미지 불러오기 실패':'이미지 준비 중';
 c.save();c.imageSmoothingEnabled=true;if('imageSmoothingQuality' in c)c.imageSmoothingQuality='high';
 if(loaded?.status==='final')c.drawImage(loaded.image,...art.source,rect.x,rect.y,rect.width,rect.height);
 else { // Deliberately generic UI marker, never substituted front/dot/species artwork.
  c.fillStyle='#647781';c.fillRect(x-size*.28,y-size*.48,size*.56,size*.3);
  c.fillStyle='#eef4f5';c.font='10px sans-serif';c.textAlign='center';c.fillText(label,x,y-size*.08);
 }
 c.restore();return {...rect,assetId:`approved.${reference.speciesId}.${side}`,status:deferred?'user-deferred':loaded?.status??'loading',sourceSha256:art.sourceSha256??null,derivativeSha256:art.derivativeSha256??art.sha256??null,accessibleLabel:loaded?.status==='final'?null:label};
}
