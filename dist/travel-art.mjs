import {guardLegacyImage} from './asset-runtime.mjs';
import {assetLegacyPath} from './asset-manifest.mjs';
export const RIDER_DIRECTIONS=Object.freeze(['down','up','left','right']);

export const RIDER_SHEETS=Object.freeze({
 boy:Object.freeze({
  src:assetLegacyPath('legacy.travel.rider-boy'),width:1086,height:1448,
  frames:Object.freeze([
   Object.freeze([[89,51,200,343],[444,51,199,338],[796,51,198,338]]),
   Object.freeze([[90,402,198,339],[444,402,198,339],[798,402,197,339]]),
   Object.freeze([[51,743,258,323],[412,743,260,323],[776,743,258,323]]),
   Object.freeze([[51,1076,258,325],[412,1077,260,324],[776,1077,258,324]])
  ])
 }),
 girl:Object.freeze({
  src:assetLegacyPath('legacy.travel.rider-girl'),width:1086,height:1448,
  frames:Object.freeze([
   Object.freeze([[93,53,222,319],[448,53,222,319],[804,53,220,319]]),
   Object.freeze([[72,401,202,323],[425,401,204,323],[782,401,200,323]]),
   Object.freeze([[61,747,249,303],[421,746,248,304],[784,746,247,304]]),
   Object.freeze([[52,1074,250,307],[415,1074,251,307],[780,1074,250,307]])
  ])
 })
});

const imageCache=new Map();

export function riderFrame(gender='boy',facing='down',frame=0){
 const sheet=RIDER_SHEETS[gender]??RIDER_SHEETS.boy;
 const row=Math.max(0,RIDER_DIRECTIONS.indexOf(facing));
 const column=((Math.trunc(frame)%3)+3)%3;
 return {sheet,source:sheet.frames[row][column],row,column};
}

function riderImage(sheet){
 if(typeof Image==='undefined')return null;
 let image=imageCache.get(sheet.src);
 if(!image){image=guardLegacyImage(new Image());image.decoding='async';image.src=sheet.src;imageCache.set(sheet.src,image)}
 return image;
}

/** Draw a real bicycle pose centered on x with both wheels on the y baseline. */
export function drawRider(ctx,gender,x,y,{facing='down',frame=0,height=74}={}){
 if(!ctx||typeof ctx.drawImage!=='function')throw new TypeError('drawRider requires a 2D canvas context');
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(height)||height<=0)throw new TypeError('drawRider requires finite x/y and positive height');
 const {sheet,source:[sx,sy,sw,sh]}=riderFrame(gender,facing,frame),image=riderImage(sheet);
 if(!image?.complete||!image.naturalWidth)return false;
 const width=height*sw/sh,smoothing=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
 ctx.drawImage(image,sx,sy,sw,sh,x-width/2,y-height,width,height);ctx.imageSmoothingEnabled=smoothing;
 return true;
}

export function preloadRiderArt(){
 return Object.values(RIDER_SHEETS).map(sheet=>riderImage(sheet)).filter(Boolean);
}
