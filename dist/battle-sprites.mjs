import {assetLegacyPath} from './asset-manifest.mjs';
export const STARTER_BACK_ART=Object.freeze({
 'legacy:1':Object.freeze({src:assetLegacyPath('legacy.battle-back-dongbi'),width:1254,height:1254,source:Object.freeze([189,86,816,1075])}),
 'legacy:4':Object.freeze({src:assetLegacyPath('legacy.battle-back-mangulchi'),width:1254,height:1254,source:Object.freeze([143,241,974,878])}),
 'legacy:7':Object.freeze({src:assetLegacyPath('legacy.battle-back-sorong'),width:1254,height:1254,source:Object.freeze([191,128,872,1016])})
});
export function battleArt(monOrId,side='enemy'){const id=monOrId?.id??monOrId,art=side==='ally'?STARTER_BACK_ART[id]:undefined;return art?{kind:'back',id,...art}:{kind:'atlas',id}}
export function battleBackMarkup(monOrId,side='ally'){const art=battleArt(monOrId,side);if(art.kind!=='back')return '';const [sx,sy,sw,sh]=art.source;return `<span class="battle-mon ${side} battle-mon-back" data-battle-art="${art.id}" aria-hidden="true"><span class="battle-art-crop" style="aspect-ratio:${sw}/${sh}"><img src="${art.src}" alt="" style="width:${art.width/sw*100}%;height:${art.height/sh*100}%;left:${-sx/sw*100}%;top:${-sy/sh*100}%"></span></span>`}
