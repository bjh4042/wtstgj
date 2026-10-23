import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BY_ID} from '../dist/model.mjs';
import {STARTER_BACK_ART,battleArt,battleBackMarkup} from '../dist/battle-sprites.mjs';
import {SPECIES_ART_BY_ID,speciesArt,speciesArtMarkup} from '../dist/species-art.mjs';
import {TRAINER_DIRECTIONS,TRAINER_SHEETS,drawTrainer} from '../dist/trainer-sprites.mjs';

function assetUrl(src){return new URL('../dist/'+src,import.meta.url)}
function pngHasAlpha(src){const bytes=readFileSync(assetUrl(src));return bytes.subarray(1,4).toString()==='PNG'&&[4,6].includes(bytes[25])}
function overlap(a,b){return a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3]}
function pngInfo(src){const bytes=readFileSync(assetUrl(src));return {signature:bytes.subarray(1,4).toString(),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),colorType:bytes[25]}}

test('trainer sheets use 12 independent alpha crops and one 66px sole baseline',{skip:"Historical raster fixture excluded from public distribution; selected original source integrity is tested in approved-player/npc/species suites."},()=>{
 for(const [gender,sheet] of Object.entries(TRAINER_SHEETS)){
  assert.equal(sheet.frames.length,4);assert.ok(pngHasAlpha(sheet.src),`${gender} sheet has real alpha`);
  const rects=sheet.frames.flat();assert.equal(rects.length,12);
  rects.forEach(([x,y,w,h])=>{assert.ok(w>0&&h>0);assert.ok(x>=0&&y>=0&&x+w<=sheet.width&&y+h<=sheet.height)});
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++)assert.equal(overlap(rects[i],rects[j]),false,`${gender} source frames ${i}/${j} do not overlap`);
  for(const facing of TRAINER_DIRECTIONS)for(const frame of [0,1,2]){
   let args;drawTrainer({drawImage(...values){args=values}},{},{gender,facing,frame,x:100,y:200,height:66});
   assert.equal(args.length,9);assert.equal(args[6]+args[8],200,`${gender} ${facing}/${frame} ends on the same sole baseline`);assert.equal(args[8],66);
  }
 }
});

test('only unevolved starter allies receive approved alpha back art',{skip:"Historical raster fixture excluded from public distribution; selected original source integrity is tested in approved-player/npc/species suites."},()=>{
 const legacyStarterIds=['legacy:1','legacy:4','legacy:7'];
 assert.deepEqual(Object.keys(STARTER_BACK_ART),legacyStarterIds);
 for(const id of Object.keys(BY_ID)){
  const ally=battleArt(id,'ally'),enemy=battleArt(id,'enemy');
  assert.equal(ally.kind,legacyStarterIds.includes(id)?'back':'atlas',`ally ${id}`);
  assert.equal(enemy.kind,'atlas',`enemy ${id}`);
 }
 for(const id of legacyStarterIds){const art=battleArt(id,'ally');assert.ok(pngHasAlpha(art.src));assert.match(battleBackMarkup(id,'ally'),new RegExp(`battle-art="${id}"`))}
 for(const id of [1,4,7]){assert.equal(battleArt(id,'ally').kind,'atlas',`canonical ${id} must not reuse legacy back art`);assert.equal(battleBackMarkup(id,'ally'),'')}
});

test('all 151 canonical species have separate in-bounds RGBA front and back crops',{skip:"Historical raster fixture excluded from public distribution; selected original source integrity is tested in approved-player/npc/species suites."},()=>{
 assert.deepEqual(Object.keys(SPECIES_ART_BY_ID).map(Number),Array.from({length:151},(_,index)=>index+1));
 const exactCrops=new Set();
 for(let id=1;id<=151;id++)for(const side of ['front','back']){
  const art=speciesArt(id,side);assert.ok(art,`No.${id} ${side}`);
  if(id>=70&&id<=72)assert.equal(art.src,'assets/v12/fire-cats.png');else assert.match(art.src,new RegExp(`^assets/species/species-${side}-\\d{3}-\\d{3}\\.png$`));
  const image=pngInfo(art.src);assert.equal(image.signature,'PNG');assert.equal(image.colorType,6,`${art.src} is RGBA`);
  assert.equal(art.width,image.width);assert.equal(art.height,image.height);
  const [x,y,width,height]=art.source;assert.ok([x,y,width,height].every(Number.isInteger));assert.ok(x>=0&&y>=0&&width>0&&height>0);assert.ok(x+width<=image.width&&y+height<=image.height,`No.${id} ${side} crop is in bounds`);
  const key=[side,art.src,...art.source].join(':');assert.equal(exactCrops.has(key),false,`No.${id} ${side} does not duplicate another crop`);exactCrops.add(key);
  assert.match(speciesArtMarkup(id,96,side),new RegExp(`data-species-art="${id}"`));
 }
 assert.equal(speciesArt('legacy:1','front'),null);
});

test('the irregular 021-040 sheet maps its intended 5/5/6/4 figures and excludes the two extras',()=>{
 const rows=[0,0,0,0];
 for(let id=21;id<=40;id++){
  const art=speciesArt(id),centerY=art.source[1]+art.source[3]/2;
  rows[centerY<350?0:centerY<590?1:centerY<850?2:3]++;
 }
 assert.deepEqual(rows,[5,5,6,4]);
 assert.deepEqual(speciesArt(40).source,[711,968,169,138]);
});
