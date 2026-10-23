import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldPresentation} from '../dist/field-presentation.mjs';
import {loadFieldBitmapFont,fieldTextWidth} from '../dist/field-bitmap-text.mjs';
import {readFileSync} from 'node:fs';

test('required viewports retain 3:2 with integer CSS bounds and a physical-pixel framebuffer',()=>{
 for(const [w,h] of [[1920,1080],[1366,768],[1280,720],[1024,768],[390,844],[844,390],[412,915],[915,412]]){
  for(const dpr of [1,1.25,1.5,2,2.625,3]){
   const p=fieldPresentation(w,h,w<1000,dpr);
   assert.equal(p.width*2,p.height*3);
   for(const v of [p.width,p.height,p.left,p.top,p.backingWidth,p.backingHeight])assert.ok(Number.isInteger(v));
   assert.equal(p.backingWidth,p.width*dpr);assert.equal(p.backingHeight,p.height*dpr);
   assert.equal(Math.round(p.left*dpr),p.left*dpr);assert.equal(Math.round(p.top*dpr),p.top*dpr);
   assert.ok(p.left+p.width<=w);assert.ok(p.top+p.height<=h);
   if(p.touch&&!p.landscape)assert.ok(p.top+p.height+208<=h);
   if(p.landscape)assert.ok(p.left>=132&&w-p.left-p.width>=110);
  }
 }
});
test('shipped BDF glyph metrics fit the actual menu, signs and dialogue panels',async()=>{
 const data=JSON.parse(readFileSync(new URL('../dist/assets/golden-living-v1/font.json',import.meta.url)));
 const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>data});
 try{await loadFieldBitmapFont()}finally{globalThis.fetch=previous}
 assert.ok(Object.keys(data.glyphs).length<1200);
 for(const name of ['도감','생태친구','가방','탐험가','저장','설정'])assert.ok(fieldTextWidth(name,5)<=280);
 assert.ok(fieldTextWidth('거제 생태센터',3,-3)<=240);
 assert.ok(fieldTextWidth('장승포 해안길',2,-1)<=159);
 assert.ok(fieldTextWidth('함께하는',2,-2)<=88);
 assert.ok(fieldTextWidth('함께 다니는 생태친구를 확인합니다.',4)<=1400);
 // Hangul, uppercase Latin and digits have the same ink baseline.
 for(const ch of ['거','제','A','0','1'])assert.equal(data.glyphs[ch].box[3],0);
});
