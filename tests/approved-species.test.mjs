import {APPROVED_ATLAS_DATA} from '../dist/approved-atlas-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {APPROVED_SPECIES_DATA,approvedSpeciesArt,approvedSpeciesRect,drawApprovedBattleSpecies,loadApprovedSpeciesArt,approvedSpeciesCacheSize} from '../dist/approved-species.mjs';
import {CANONICAL_ASSET_DESCRIPTORS} from '../dist/canonical-species-assets.mjs';
const ref=id=>({namespace:'canonical',speciesId:id});
test('312 selected original derivatives have exact SHA, bounded dimensions, complete identity coverage',()=>{
 assert.equal(Object.keys(APPROVED_SPECIES_DATA.records).length,157);let front=0,back=0;
 for(const [id,sides] of Object.entries(APPROVED_SPECIES_DATA.records))for(const [side,a] of Object.entries(sides)){
  if(!a.src){assert.equal(side,'back');assert.ok(['SPECIES_004','SPECIES_132'].includes(id));continue}
  side==='front'?front++:back++;const packed=APPROVED_ATLAS_DATA.frames.species[`${id}.${side}`];
  assert.equal(packed.derivativeSha256,a.sha256);assert.equal(packed.sourceSha256,a.sourceSha256);assert.match(a.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(a.width<=514&&a.height<=514);assert.equal(packed.width,a.width);assert.equal(packed.height,a.height);
  assert.ok(a.sourcePath.startsWith(side==='front'?'01_ORIGINAL_FRONT/':'02_ORIGINAL_BACK/'));assert.ok(!a.sourcePath.includes('DOT'));
 }
 assert.equal(front,157);assert.equal(back,155);
 for(let n=1;n<=151;n++)assert.equal(approvedSpeciesArt(ref('SPECIES_'+String(n).padStart(3,'0'))).sourceId,'GM'+String(n).padStart(3,'0'));
 for(let n=1;n<=6;n++)assert.equal(approvedSpeciesArt({namespace:'npc_preview_species',speciesId:'EDNA_0'+n}).sourceId,'YEJI_EDNA_0'+n);
 assert.equal(approvedSpeciesArt({namespace:'work-v2',speciesId:1}),null);
});
test('aspect ratio, full subject bounds, and bottom center stay correct at battle sizes and DPR',()=>{
 for(const sides of Object.values(APPROVED_SPECIES_DATA.records))for(const a of Object.values(sides))if(a.src)for(const size of [110,125,220,250,330,375]){
  const r=approvedSpeciesRect(a,{x:320,y:228,size});assert.ok(Math.abs(r.width/r.height-a.source[2]/a.source[3])<1e-9);assert.equal(r.y+r.height,228);assert.equal(r.x+r.width/2,320);assert.equal(Math.max(r.width,r.height),size);
 }
});
test('deferred backs never load front, dot or unapproved art and have explicit readable fallback',()=>{
 const c={save(){},restore(){},fillRect(){},fillText(){},drawImage(){throw Error('Deferred must not draw art')}};
 for(const id of ['SPECIES_004','SPECIES_132']){const a=approvedSpeciesArt(ref(id),'back');assert.equal(a.src,null);const r=drawApprovedBattleSpecies(c,ref(id),'back',115,228);assert.equal(r.status,'user-deferred');assert.equal(r.accessibleLabel,'후면 준비 중');assert.equal(CANONICAL_ASSET_DESCRIPTORS[`canonical.${id}.battle.back`].approvedOriginalStatus,'user-deferred')}
});
test('lazy image loader requests one selected source once and never preloads roster',()=>{
 let requested=[];class MockImage {set src(value){requested.push(value)}}
 const a=approvedSpeciesArt(ref('SPECIES_079'),'back'),before=approvedSpeciesCacheSize();loadApprovedSpeciesArt(a,{ImageClass:MockImage});loadApprovedSpeciesArt(a,{ImageClass:MockImage});assert.deepEqual(requested,[a.src]);assert.equal(approvedSpeciesCacheSize(),before+1);
 assert.equal(a.sourceId,'GM079');assert.equal(approvedSpeciesArt(ref('SPECIES_080'),'back').sourceId,'GM080');
});
test('actual central renderer uses selected front/back crop with smoothing and no stretch',async()=>{
 const {drawBattleSpecies}=await import('../dist/presentation/battle-render.mjs');
 const before=globalThis.Image;let draws=[];const c={save(){},restore(){},fillRect(){},fillText(){},drawImage(...args){draws.push(args)}};
 class ReadyImage {set src(value){const a=Object.values(APPROVED_ATLAS_DATA.atlases).find(a=>a.src===value);this.naturalWidth=a.width;this.naturalHeight=a.height;this.onload()}}
 globalThis.Image=ReadyImage;
 try {for(const side of ['front','back']){const a=approvedSpeciesArt(ref('SPECIES_034'),side),r=drawBattleSpecies(c,ref('SPECIES_034'),side,320,145,{size:110});assert.equal(r.status,'final');assert.equal(c.imageSmoothingEnabled,true);assert.deepEqual(draws.at(-1).slice(1,5),a.source);assert.equal(r.sourceSha256,a.sourceSha256);assert.ok(Math.abs(r.width/r.height-a.source[2]/a.source[3])<1e-9)}}finally{globalThis.Image=before}
});
