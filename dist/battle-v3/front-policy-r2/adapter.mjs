// Additive presentation-only policy. Battle rules/save/species identity are untouched.
import{approvedSpeciesArt,approvedSpeciesRect,loadApprovedSpeciesArt}from'../../approved-species.mjs';
import{drawBattleSpecies as originalDrawBattleSpecies}from'../../presentation/battle-render.mjs';
export function resolveFrontOnlyArt(reference,side='front'){
 if(!['front','back'].includes(side))return null;
 const known=reference?.namespace==='canonical'&&/^SPECIES_\d{3}$/.test(reference.speciesId)||reference?.namespace==='npc_preview_species'&&/^EDNA_0[1-6]$/.test(reference.speciesId);if(!known)return null;
 const art=approvedSpeciesArt(reference,'front');if(!art?.src||art.status==='user-deferred')return null;
 const [sx,sy,sw,sh]=art.source??[];if(![sx,sy,sw,sh,art.width,art.height].every(Number.isFinite)||sx<0||sy<0||sw<=0||sh<=0||sx+sw>art.width||sy+sh>art.height)return null;
 return Object.freeze({...art,source:Object.freeze([...art.source]),src:new URL(art.src,new URL(import.meta.env?.BASE_URL??'../../',import.meta.url)).href,requestedSide:side,selectedSide:'front',mirrored:false});
}
/** Same positional interface as drawBattleSpecies. Bind only in a NEW presentation successor. */
export function createFrontOnlyBattleRenderer({loadArt=loadApprovedSpeciesArt,fallback=originalDrawBattleSpecies}={}){
 return function drawBattleSpecies(c,reference,side,x,y,options={}){
  const size=options.size??128,art=resolveFrontOnlyArt(reference,side);if(!art)return fallback(c,reference,side,x,y,options);
  if(!Number.isFinite(size)||size<=0||!Number.isFinite(x)||!Number.isFinite(y))throw Error('FRONT_POLICY_RECT');
  const rect=approvedSpeciesRect(art,{x,y,size}),loaded=loadArt(art);let label=null;
  c.save();try{c.imageSmoothingEnabled=true;if('imageSmoothingQuality'in c)c.imageSmoothingQuality='high';
   if(loaded?.status==='final')c.drawImage(loaded.image,...art.source,rect.x,rect.y,rect.width,rect.height);
   else{label=loaded?.status==='unavailable'?'이미지 불러오기 실패':'이미지 준비 중';c.fillStyle='#647781';c.fillRect(x-size*.28,y-size*.48,size*.56,size*.3);c.fillStyle='#eef4f5';c.font='10px sans-serif';c.textAlign='center';c.fillText(label,x,y-size*.08)}
  }finally{c.restore()}
  return{...rect,assetId:`approved.${reference.speciesId}.front`,status:loaded?.status??'loading',requestedSide:side,selectedSide:'front',mirrored:false,sourceSha256:art.sourceSha256,derivativeSha256:art.derivativeSha256,atlasSha256:art.sha256,accessibleLabel:label};
 };
}
