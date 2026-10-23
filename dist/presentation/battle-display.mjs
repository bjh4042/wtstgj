import {CANONICAL_IDENTITIES} from '../compatibility/species-registry.mjs';
const defaults={battleVisualScaleFront:1,battleVisualScaleBack:1,battleAnchorFrontX:.5,battleAnchorFrontY:1,battleAnchorBackX:.5,battleAnchorBackY:1,battleOffsetFrontX:0,battleOffsetFrontY:0,battleOffsetBackX:0,battleOffsetBackY:0};
export const BATTLE_DISPLAY_DEFAULTS=Object.freeze(defaults);
/** Normalized anchors (0..1); offsets are pixels in a 256px reference sprite. No follower metadata is modified. */
export const BATTLE_DISPLAY_METADATA=Object.freeze(Object.fromEntries((/** @type {ReadonlyArray<{id:string,chainLength:number,chainPosition:number}>} */(CANONICAL_IDENTITIES)).map(s=>{const scale=s.chainLength===1?1:({1:.65,2:.85,3:1.05}[s.chainPosition]??1);return [s.id,Object.freeze({...defaults,battleVisualScaleFront:scale,battleVisualScaleBack:scale})]})));
export function battleDisplayMetadata(reference,overrides={}){
 const data={...defaults,...(reference?.namespace==='canonical'?BATTLE_DISPLAY_METADATA[reference.speciesId]:{}),...overrides},result={};
 for(const [key,fallback] of Object.entries(defaults)){const n=data[key],valid=Number.isFinite(n)&&(key.includes('Scale')?n>0&&n<=3:key.includes('Anchor')?n>=0&&n<=1:Math.abs(n)<=256);result[key]=valid?n:fallback}return Object.freeze(result);
}
export function battleSpriteRect(reference,side='front',{x=0,y=0,size=256,metadata={}}={}){
 const m=battleDisplayMetadata(reference,metadata),s=side==='back'?'Back':'Front',scale=m['battleVisualScale'+s],width=size*scale;
 return {x:x-width*m['battleAnchor'+s+'X']+m['battleOffset'+s+'X']*size/256,y:y-width*m['battleAnchor'+s+'Y']+m['battleOffset'+s+'Y']*size/256,width,height:width,scale,anchorX:m['battleAnchor'+s+'X'],anchorY:m['battleAnchor'+s+'Y']};
}
export function applyBattleSpriteDisplay(element,reference,side='front',overrides={}){
 const child=element?.firstElementChild;if(!child)return false;const m=battleDisplayMetadata(reference,overrides),s=side==='back'?'Back':'Front',scale=m['battleVisualScale'+s];
 child.style.transformOrigin='0 0';child.style.transform=`translate(${(0.5-m['battleAnchor'+s+'X']*scale+m['battleOffset'+s+'X']/256)*100}%,${(1-m['battleAnchor'+s+'Y']*scale+m['battleOffset'+s+'Y']/256)*100}%) scale(${scale})`;return true;
}
