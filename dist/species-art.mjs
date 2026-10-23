import {SPECIES_ART_BY_ID} from './art/species-crops.mjs';
export {SPECIES_ART_BY_ID};
import {assetMarkup,peekAsset,loadAsset} from './asset-runtime.mjs';
import {legacySpeciesArt,speciesAssetId} from './asset-manifest.mjs';
function speciesId(value){
 if(typeof value==='number'&&Number.isInteger(value))return value;
 if(value&&typeof value==='object'){const id=Number(value.id??value.no);return Number.isInteger(id)?id:null}
 return null;
}

export function speciesArt(monOrId,side='front'){
 const id=speciesId(monOrId),facing=side==='back'?'back':'front';
 if(id===null||id<1||id>151)return null;
 return legacySpeciesArt(id,facing);
}

export function speciesArtMarkup(monOrId,w,side='front'){
 const art=speciesArt(monOrId,side);if(!art)return null;
 return `<span class="species-art species-art-${side}" data-species-art="${art.id}" style="display:inline-block;width:${Number(w)||70}px">${assetMarkup(speciesAssetId(art.id,side), '생태몬 '+art.id)}</span>`;
}
export function drawSpecies(ctx,monOrId,x,y,options={}){
 const art=speciesArt(monOrId,options.side??'front');if(!art)return null;
 const id=speciesAssetId(art.id,options.side??'front'), loaded=peekAsset(id);loadAsset(id);
 const width=Number(options.width)||48;
 if(!loaded){ctx.save();ctx.fillStyle='#7896a5';ctx.fillRect(x-width/2,y-width,width,width);ctx.restore();return true}
 const [sx,sy,sw,sh]=loaded.source, height=width*sh/sw;
 const smoothing=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
 ctx.drawImage(loaded.image,sx,sy,sw,sh,x-width/2,y-height,width,height);ctx.imageSmoothingEnabled=smoothing;return true;
}
