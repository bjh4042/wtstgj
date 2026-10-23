import {peekAsset,loadAsset,assetMarkup} from './asset-runtime.mjs';
import {humanPose} from './asset-manifest.mjs';
import {playerFieldAssetId} from './art/w03-player-field.mjs';
import {drawW03Human} from './art/w03-human-field.mjs';
import {assetLegacyPath} from './asset-manifest.mjs';
export const TRAINER_SHEETS=Object.freeze({
 boy:Object.freeze({
  src:assetLegacyPath('legacy.trainer-boy-walk'),width:1086,height:1448,
  frames:Object.freeze([
   Object.freeze([[80,48,211,326],[439,48,210,327],[784,48,215,325]]),
   Object.freeze([[79,402,213,324],[435,402,213,324],[777,402,223,323]]),
   Object.freeze([[63,741,218,326],[418,743,223,323],[779,746,220,325]]),
   Object.freeze([[78,1089,222,327],[437,1091,228,322],[807,1091,229,323]])
  ])
 }),
 girl:Object.freeze({
  src:assetLegacyPath('legacy.trainer-girl-walk'),width:1086,height:1448,
  frames:Object.freeze([
   Object.freeze([[88,48,252,309],[452,50,245,306],[795,51,241,305]]),
   Object.freeze([[66,399,227,305],[422,399,227,305],[772,398,220,308]]),
   Object.freeze([[64,731,263,301],[420,734,261,297],[773,732,253,300]]),
   Object.freeze([[50,1067,260,303],[408,1063,258,306],[761,1063,259,307]])
  ])
 })
});

export const TRAINER_DIRECTIONS=Object.freeze(['down','up','left','right']);

export function trainerFrame(gender='boy',facing='down',frame=0){
 const sheet=TRAINER_SHEETS[gender]??TRAINER_SHEETS.boy;
 const row=Math.max(0,TRAINER_DIRECTIONS.indexOf(facing));
 const column=((Math.trunc(frame)%3)+3)%3;
 return {sheet,source:sheet.frames[row][column],row,column};
}

/** Draw one independently cropped frame with x centered and y on the sole baseline. */
export function drawTrainer(ctx,image,{gender='boy',x,y,height=66,facing='down',frame=0,player=false}={}){
 if(!ctx||typeof ctx.drawImage!=='function')throw new TypeError('drawTrainer requires a 2D canvas context');
 if(!image||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(height)||height<=0)throw new TypeError('drawTrainer requires an image, finite x/y, and positive height');
 if(player){const id=playerFieldAssetId(gender);if(typeof Image!=='undefined')loadAsset(id);drawW03Human(ctx,peekAsset(id),{x,y,facing,moving:frame!==0,walk:frame===2?52:0});return;}
 const key=`human.player-${gender==='girl'?'girl':'boy'}.field`,art=peekAsset(key);if(typeof Image!=='undefined')loadAsset(key);if(art&&art.status!=='legacy'){const p=humanPose(facing,frame!==0,frame===2?52:0);const scale=height/120;ctx.drawImage(art.image,...p.source,x-p.anchor[0]*scale,y-p.anchor[1]*scale,96*scale,120*scale);return;}
 const {source:[sx,sy,sw,sh]}=trainerFrame(gender,facing,frame),width=height*sw/sh;
 ctx.drawImage(image,sx,sy,sw,sh,x-width/2,y-height,width,height);
}

export function trainerPortrait(gender,height=100){
 const key=`human.player-${gender==='girl'?'girl':'boy'}.portrait`;if(peekAsset(key)?.status==='final')return assetMarkup(key);if(typeof Image!=='undefined')loadAsset(key);
 const {sheet,source:[sx,sy,sw,sh]}=trainerFrame(gender,'down',0);
 return `<span class="trainer-portrait" style="aspect-ratio:${sw}/${sh};--portrait-height:${height}px" aria-hidden="true"><img src="${sheet.src}" alt="" style="width:${sheet.width/sw*100}%;height:${sheet.height/sh*100}%;left:${-sx/sw*100}%;top:${-sy/sh*100}%"></span>`;
}
