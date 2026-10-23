import {guardLegacyImage} from './asset-runtime.mjs';
import {assetLegacyPath} from './asset-manifest.mjs';
export const TOWN_PROP_CROPS={"house": [105, 59, 320, 376], "lab": [498, 87, 332, 336], "tree": [938, 71, 325, 363], "grass": [1398, 213, 271, 210], "sign": [123, 551, 253, 231], "flowers": [527, 611, 258, 188], "center": [901, 491, 372, 319], "gym": [1332, 480, 382, 336]};
let atlas;export function drawTownProp(ctx,key,x,y,w,h){if(!TOWN_PROP_CROPS[key]||typeof Image==='undefined')return false;if(!atlas){atlas=guardLegacyImage(new Image());atlas.src=new URL(assetLegacyPath('legacy.v12.town-props'),import.meta.url).href}if(!atlas.complete||!atlas.naturalWidth)return false;ctx.imageSmoothingEnabled=false;ctx.drawImage(atlas,...TOWN_PROP_CROPS[key],x,y,w,h);return true}

export function onTownPropsReady(callback){if(typeof Image==='undefined')return;if(!atlas){atlas=guardLegacyImage(new Image());atlas.src=new URL(assetLegacyPath('legacy.v12.town-props'),import.meta.url).href}if(!atlas.complete)atlas.addEventListener('load',callback,{once:true})}
