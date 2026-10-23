import {coverBackgroundRect} from './integrated-battle-layout.mjs';
import {APPROVED_BATTLE_BACKGROUNDS} from './approved-battle-background-bindings.mjs';
import {browserImageLoader} from '../asset-runtime.mjs';
export {APPROVED_BATTLE_BACKGROUNDS};
const images=new Map(),pending=new Map();
export function approvedBattleBackground(background={}){const byId=Object.values(APPROVED_BATTLE_BACKGROUNDS).find(a=>a.assetId===background.assetId);return byId??APPROVED_BATTLE_BACKGROUNDS[background.biomeId]??null;}
export async function loadApprovedBattleBackground(background,loader=browserImageLoader){const entry=approvedBattleBackground(background);if(!entry)return false;if(!pending.has(entry.assetId))pending.set(entry.assetId,(async()=>{try{const image=await loader(entry.src);if(image.naturalWidth!==entry.width||image.naturalHeight!==entry.height)return false;images.set(entry.assetId,image);return true}catch{return false}})());return pending.get(entry.assetId);}
/** Draw selected original only. Caller must not restore a legacy background on false.
 * Returns false during loading/unavailable. Exact 9:5 artwork is never stretched. */
export function drawApprovedBattleBackground(c,background,width=432,height=240,{fit='contain'}={}){const entry=approvedBattleBackground(background);if(!entry)return false;const image=images.get(entry.assetId);if(!image){if(typeof document!=='undefined')void loadApprovedBattleBackground(background);return false}const scale=Math.min(width/entry.width,height/entry.height),w=entry.width*scale,h=entry.height*scale;c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';if(fit==='cover'){const r=coverBackgroundRect(entry.width,entry.height,width,height);c.drawImage(image,...r.source,...r.destination)}else c.drawImage(image,(width-w)/2,(height-h)/2,w,h);c.restore();return true;}
