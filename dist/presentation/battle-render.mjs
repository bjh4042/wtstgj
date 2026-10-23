import {drawApprovedBattleSpecies} from '../approved-species.mjs';
import {assetDescriptor} from '../asset-manifest.mjs';
import {loadAsset,peekAsset} from '../asset-runtime.mjs';
import {speciesSlot} from '../species-asset-resolver.mjs';
import {battleSpriteRect,applyBattleSpriteDisplay} from './battle-display.mjs';
export function battleDisplayFor(reference,side){const assetId=speciesSlot(reference,'battle.'+side);return {assetId,metadata:assetDescriptor(assetId).battleDisplay??{}}}
export function applyCurrentBattleDisplay(element,reference,side,overrides={}){return applyBattleSpriteDisplay(element,reference,side,{...battleDisplayFor(reference,side).metadata,...overrides})}
export function drawBattleSpecies(c,reference,side,x,y,{size=128,metadata={}}={}){
 const approved=drawApprovedBattleSpecies(c,reference,side,x,y,{size});if(approved)return approved;
 const resolved=battleDisplayFor(reference,side),rect=battleSpriteRect(reference,side,{x,y,size,metadata:{...resolved.metadata,...metadata}}),art=peekAsset(resolved.assetId);
 if(resolved.assetId&&typeof Image!=='undefined')loadAsset(resolved.assetId);
 c.save();c.imageSmoothingEnabled=false;
 if(art)c.drawImage(art.image,...art.source,rect.x,rect.y,rect.width,rect.height);else{c.fillStyle='#829ba5';c.fillRect(rect.x,rect.y,rect.width,rect.height);c.fillStyle='#fff';c.font='11px monospace';c.fillText(reference.speciesId,rect.x+4,rect.y+18)}
 c.restore();return {...rect,assetId:resolved.assetId,status:art?.status??'placeholder'};
}
