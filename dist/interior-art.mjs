import {guardLegacyImage} from './asset-runtime.mjs';
import {assetLegacyPath} from './asset-manifest.mjs';
import {drawTownProp,onTownPropsReady} from './prop-art-v12.mjs';
// Alpha bounds of the original furniture sheet; object placement is in logical pixels.
export const INTERIOR_CROPS=Object.freeze({
 bed:[63,51,182,252],desk:[350,60,241,237],bookcase:[692,39,190,264],stairs:[1002,74,199,215],
 capsuleTable:[39,404,234,183],workstation:[345,374,252,231],cabinet:[677,356,218,248],plant:[998,356,199,241],
 sofa:[31,704,249,178],diningTable:[334,663,273,253],refrigerator:[714,675,139,231],window:[985,680,225,192],
 chair:[97,987,113,190],rug:[334,991,274,185],mat:[688,1037,196,104],satchel:[983,1007,231,152]
});
let sheet=null,fieldSheet=null;
const pending=new Set();
if(typeof Image!=='undefined'){
 sheet=guardLegacyImage(new Image());sheet.src=new URL(assetLegacyPath('legacy.intro.interior-props-v2'),import.meta.url).href;
 fieldSheet=guardLegacyImage(new Image());fieldSheet.src=new URL(assetLegacyPath('legacy.field.gba-field-props'),import.meta.url).href;
 for(const image of [sheet,fieldSheet])image.onload=()=>{const callbacks=[...pending];pending.clear();for(const callback of callbacks)callback()};
}
export function onInteriorArtReady(callback){onTownPropsReady(callback);if(sheet?.complete&&fieldSheet?.complete)return;pending.add(callback)}
export function interiorProp(ctx,key,x,y,width,height){
 const crop=INTERIOR_CROPS[key];if(!crop||!sheet?.naturalWidth)return;
 ctx.drawImage(sheet,...crop,Math.round(x),Math.round(y),Math.round(width),Math.round(height));
}
const FIELD_CROPS={lab:[326,90,214,193],house:[886,50,205,237],tree:[627,874,157,204],flowers:[350,936,163,132],sign:[919,627,153,197],ranger:[370,665,122,144]};
export function introFieldProp(ctx,key,x,y,width,height){
 if(drawTownProp(ctx,key,x,y,width,height))return;
 if(!fieldSheet?.naturalWidth||!FIELD_CROPS[key])return;
 ctx.drawImage(fieldSheet,...FIELD_CROPS[key],Math.round(x),Math.round(y),Math.round(width),Math.round(height));
}
function rect(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function roomShell(ctx,lab=false){
 rect(ctx,0,0,240,160,'#172629');
 // Repeating floor tiles and a front-facing wall stay aligned to the 16px grid.
 for(let y=16;y<144;y+=16)for(let x=16;x<224;x+=16){
  rect(ctx,x,y,16,16,lab?'#e0e4df':'#c8b85f');
  rect(ctx,x,y,16,1,lab?'#c0c9c4':'#a29646');rect(ctx,x,y,1,16,lab?'#f5f6ec':'#e3d17b');
  if(lab){rect(ctx,x+1,y+14,14,1,'#c9d2ca');rect(ctx,x+14,y+1,1,13,'#c9d2ca')}
  else {rect(ctx,x+7,y+1,1,15,'#afa151');rect(ctx,x+1,y+7,6,1,'#e8d583')}
 }
 rect(ctx,16,0,208,14,lab?'#dbe0c8':'#dbd4a5');rect(ctx,16,13,208,2,'#779b9b');
 rect(ctx,16,15,208,2,'#49596a');rect(ctx,13,0,3,144,'#778474');rect(ctx,224,0,3,144,'#778474');
 rect(ctx,16,144,208,4,'#56665b');
}
export function drawFurnishedRoom(ctx,scene){
 roomShell(ctx,scene==='lab');
 if(scene==='room'){
  interiorProp(ctx,'rug',80,62,80,54);interiorProp(ctx,'desk',32,15,48,34);
  interiorProp(ctx,'bookcase',160,12,48,37);interiorProp(ctx,'bed',16,78,32,49);
  interiorProp(ctx,'plant',180,92,28,34);interiorProp(ctx,'stairs',108,127,24,18);
  interiorProp(ctx,'window',103,1,32,23);
 }else if(scene==='home'){
  interiorProp(ctx,'rug',40,66,64,43);interiorProp(ctx,'sofa',24,36,48,29);
  interiorProp(ctx,'diningTable',160,56,48,36);interiorProp(ctx,'refrigerator',190,17,20,34);
  interiorProp(ctx,'cabinet',145,15,36,32);interiorProp(ctx,'window',37,1,32,24);
  interiorProp(ctx,'stairs',108,16,24,29);interiorProp(ctx,'mat',108,128,24,15);
 }else{
  interiorProp(ctx,'workstation',17,12,40,24);interiorProp(ctx,'cabinet',58,10,34,27);
  interiorProp(ctx,'bookcase',145,8,33,30);interiorProp(ctx,'bookcase',178,8,33,30);
  // Three work benches share the same blocked 11x2 tile footprint.
  interiorProp(ctx,'workstation',32,47,47,33);interiorProp(ctx,'capsuleTable',92,37,56,44);
  interiorProp(ctx,'workstation',161,47,47,33);
  interiorProp(ctx,'rug',82,97,77,42);interiorProp(ctx,'cabinet',16,111,46,25);
  interiorProp(ctx,'cabinet',177,111,46,25);interiorProp(ctx,'mat',108,139,24,9);
  introFieldProp(ctx,'ranger',39,77,15,21);introFieldProp(ctx,'ranger',181,77,15,21);
 }
}
export function drawIntroTownArt(ctx){
 rect(ctx,0,0,240,160,'#83c89d');
 for(let y=3;y<160;y+=8)for(let x=4;x<240;x+=9){rect(ctx,x,y,1,1,(x+y)%3?'#a9dfb2':'#65b58e')}
 rect(ctx,40,128,100,16,'#b9e5c6');rect(ctx,100,0,40,160,'#b9e5c6');rect(ctx,16,64,208,16,'#b9e5c6');
 for(let y=0;y<160;y+=6){rect(ctx,106,y,1,1,'#eff8cf');rect(ctx,128,y+3,1,1,'#eff8cf')}
 for(let x=0;x<240;x+=16){introFieldProp(ctx,'tree',x-3,-9,24,30);introFieldProp(ctx,'tree',x-3,142,24,30)}
 for(let y=13;y<142;y+=19){introFieldProp(ctx,'tree',-6,y,25,31);introFieldProp(ctx,'tree',221,y,25,31)}
 introFieldProp(ctx,'lab',78,9,84,56);
 introFieldProp(ctx,'house',24,81,64,47);introFieldProp(ctx,'house',160,81,64,47);
 for(const x of [24,76,173,196])introFieldProp(ctx,'flowers',x,128,13,10);
 introFieldProp(ctx,'sign',145,61,10,14);
}
