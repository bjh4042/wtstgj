import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {APPROVED_ATLAS_DATA as data} from '../dist/approved-atlas-data.mjs';

test('lossless atlas metadata covers all approved identities and frames',()=>{
 assert.equal(Object.keys(data.atlases).length,214);
 assert.equal(Object.keys(data.frames.npc).length,660);
 assert.equal(Object.keys(data.frames.player).length,24);
 assert.equal(Object.keys(data.frames.species).length,314);
 assert.equal(Object.keys(data.atlases).filter(k=>k.startsWith('npc/')).length,55);
 assert.equal(Object.keys(data.atlases).filter(k=>k.startsWith('player/')).length,2);
 assert.equal(Object.keys(data.atlases).filter(k=>k.startsWith('species/')).length,157);
});
test('all atlas PNGs match manifest hashes, dimensions and safe GPU limits',()=>{
 for(const [id,a] of Object.entries(data.atlases)){
  const bytes=fs.readFileSync(new URL(`../dist/${a.src}`,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256,id);
  assert.equal(bytes.readUInt32BE(16),a.width,id);assert.equal(bytes.readUInt32BE(20),a.height,id);
  assert.ok(Math.max(a.width,a.height)<=2048,id);
  assert.equal(a.columns,id.startsWith('species/')?2:3);assert.equal(a.rows,id.startsWith('species/')?1:4);
 }
});
test('draw rectangles and bottom center anchors preserve source geometry',()=>{
 const deferred=[];
 for(const [family,frames] of Object.entries(data.frames))for(const [key,f] of Object.entries(frames)){
  const a=data.atlases[f.atlas];assert.ok(a,key);
  const [x,y,w,h]=f.rect;
  assert.ok(x>=0&&y>=0&&x+w<=a.width&&y+h<=a.height,key);
  if(f.status==='user-deferred'){assert.equal(f.source,null);assert.equal(f.src,null);assert.equal(f.transparentSlot,true);deferred.push(key);continue;}
  assert.equal(f.width,w);assert.equal(f.height,h);
  assert.match(f.sourceSha256,/^[a-f0-9]{64}$/);assert.match(f.derivativeSha256,/^[a-f0-9]{64}$/);assert.match(f.rgbaSha256,/^[a-f0-9]{64}$/);
  const [sx,sy,sw,sh]=f.source;
  assert.ok(sx>=x&&sy>=y&&sx+sw<=x+w&&sy+sh<=y+h,key);
  assert.deepEqual(f.atlasAnchor,[sx+sw/2,sy+sh]);
  assert.deepEqual(f.anchor,[sx-x+sw/2,sy-y+sh]);
  if(family!=='species')assert.ok(h<=192);
 }
 assert.deepEqual(deferred.sort(),['SPECIES_004.back','SPECIES_132.back']);
});
test('public atlas manifest is standalone and excludes private provenance',()=>{
 const raw=fs.readFileSync(new URL('../dist/assets/approved-atlases/manifest.json',import.meta.url),'utf8');
 assert.deepEqual(JSON.parse(raw),data);
 for(const disallowed of ['/workspace/','/home/','driveArchiveId','sourcePath','W03_W04_FINAL_ASSEMBLY'])assert.ok(!raw.includes(disallowed));
});

// Public-replay test: approved standalone derivative pixels are committed as
// rgbaSha256, so individual source PNG files need not ship in the public build.
import {inflateSync} from 'node:zlib';
function decodeRGBA(bytes){
 assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),stride=width*4;
 assert.equal(bytes[24],8);assert.equal(bytes[25],6);assert.equal(bytes[28],0);
 const chunks=[];
 for(let offset=8;offset<bytes.length;){
  const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);
  if(type==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));
  offset+=12+length;
 }
 const packed=inflateSync(Buffer.concat(chunks));assert.equal(packed.length,(stride+1)*height);
 const pixels=Buffer.alloc(stride*height);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){
  const type=packed[y*(stride+1)];assert.ok(type>=0&&type<=4);
  for(let x=0;x<stride;x++){
   const a=x>=4?pixels[y*stride+x-4]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=4?pixels[(y-1)*stride+x-4]:0;
   const predictor=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][type];
   pixels[y*stride+x]=(packed[y*(stride+1)+1+x]+predictor)&255;
  }
 }
 return {width,height,pixels};
}
function cropRGBA(image,[x,y,w,h]){
 const out=Buffer.alloc(w*h*4);
 for(let row=0;row<h;row++)image.pixels.copy(out,row*w*4,((y+row)*image.width+x)*4,((y+row)*image.width+x+w)*4);
 return out;
}
test('every public atlas cell replays exact approved RGBA and isolated edges',()=>{
 let real=0,deferred=0;
 for(const [id,a] of Object.entries(data.atlases)){
  const image=decodeRGBA(fs.readFileSync(new URL(`../dist/${a.src}`,import.meta.url)));
  for(const frame of Object.values(data.frames[id.split('/')[0]]).filter(f=>f.atlas===id)){
   const crop=cropRGBA(image,frame.rect);
   if(frame.status==='user-deferred'){assert.ok(crop.every(v=>v===0));deferred++;continue;}
   assert.equal(createHash('sha256').update(crop).digest('hex'),frame.rgbaSha256,id);
   const [x,y,w,h]=frame.rect,pad=data.padding;
   // Every external padding pixel must be the nearest old source pixel.
   for(let yy=-pad;yy<h+pad;yy++)for(let xx=-pad;xx<w+pad;xx++){
    if(xx>=0&&xx<w&&yy>=0&&yy<h)continue;
    const clamped=(Math.max(0,Math.min(h-1,yy))*w+Math.max(0,Math.min(w-1,xx)))*4;
    const actual=((y+yy)*image.width+x+xx)*4;
    for(let c=0;c<4;c++)assert.equal(image.pixels[actual+c],crop[clamped+c],`${id} padding`);
   }
   real++;
  }
 }
 assert.equal(real,996);assert.equal(deferred,2);
});
