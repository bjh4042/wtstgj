import {resolveVfxFamily,drawVfxPlaceholder} from './battle-vfx.mjs';
import {loadAsset,peekAsset} from '../asset-runtime.mjs';
/** Optional shared family PNG. A failure falls back only this effect; actors and battle logic are independent. */
export function drawBattleVfx(c,family,elapsedMs,options={}){
 const cfg=resolveVfxFamily(family),art=options.art??peekAsset(cfg.assetId),duration=options.timing?.duration??cfg.timing.duration;
 if(typeof Image!=='undefined')loadAsset(cfg.assetId);
 if(!art||art.status==='placeholder')return drawVfxPlaceholder(c,family,elapsedMs,options);
 const t=Math.max(0,Math.min(1,elapsedMs/duration));if(elapsedMs<0||t>=1)return {done:t>=1,family:cfg.family};
 const from=options.from??{x:70,y:160},to=options.to??{x:330,y:70},target=['HEAL_GLOW','BUFF_AURA'].includes(cfg.family)?from:to,p=Math.min(1,t/.6),size=48+40*t;
 c.save();c.globalAlpha=Math.min(1,(1-t)*3);c.drawImage(art.image,...art.source,from.x+(target.x-from.x)*p-size/2,from.y+(target.y-from.y)*p-size/2,size,size);c.restore();return {done:false,family:cfg.family};
}
