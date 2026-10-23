import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {ASSET_MANIFEST,SPECIES_ASSETS,speciesAssetId,HUMAN_FIELD_CONTRACT} from '../dist/asset-manifest.mjs';
import {resolveAsset,validateFinalImage,validateAlphaPixels,placeholderURL} from '../dist/asset-runtime.mjs';
import {FOLLOWER_ATLAS_CONTRACT,FOLLOWER_METADATA,validateFollowerMetadata,followerPose,followerRect} from '../dist/species-asset-contract.mjs';
import {createFieldFollower,updateFieldFollower} from '../dist/field-follower.mjs';
import {createGoldenField,moveGolden,serializeGolden,interactGolden} from '../dist/golden-field.mjs';
import {coreWalkable,tickFieldCore} from '../dist/field-engine-core.mjs';
import {createFieldAnimation} from '../dist/field-animation.mjs';
import {createSlice,interactAt,walkable} from '../dist/vertical-slice.mjs';
import {artInventory} from '../tools/art-inventory.mjs';
import {inspectSpeciesArt,validateSpeciesPNG,crc32} from '../tools/species-art-gate.mjs';
import {speciesArtMarkup} from '../dist/species-art.mjs';
const party=[{id:1}],player=()=>({x:200,y:200,scene:'test',facing:'right'});
const update=(f,p,extra={})=>updateFieldFollower(f,p,party,1/60,extra);
const slotAssets=id=>{const a=SPECIES_ASSETS[id];return [a.battle.front,a.battle.back,a.ui.icon,a.fieldFollower.atlas]};
function png(w,h,{atlas=false,emptyFrame=-1,opaque=false}={}){
 const chunk=(type,data)=>{const body=Buffer.concat([Buffer.from(type),data]),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(body));return Buffer.concat([size,body,crc])};
 const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;const bytes=Buffer.alloc(h*(w*4+1));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const frame=atlas?Math.floor(y/120)*3+Math.floor(x/96):0;const alpha=opaque?255:frame===emptyFrame?0:(x% (atlas?96:w)>10&&y%(atlas?120:h)>10?255:0);const i=y*(w*4+1)+1+x*4;bytes[i]=90;bytes[i+1]=120;bytes[i+2]=160;bytes[i+3]=alpha}
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(bytes)),chunk('IEND',Buffer.alloc(0))]);
}

test('151 species expose four semantic IDs and preserve old front/back/icon paths',()=>{
 assert.equal(Object.keys(SPECIES_ASSETS).length,151);const paths=new Set();
 for(let id=1;id<=151;id++){const s=SPECIES_ASSETS[id];for(const slot of ['front','back','icon']){const a=ASSET_MANIFEST[speciesAssetId(id,slot)];assert.equal(a.final.src,ASSET_MANIFEST[`species.${id}.${slot}`].final.src);assert.equal(a.speciesId,id)}for(const key of slotAssets(id)){assert.ok(ASSET_MANIFEST[key]);paths.add(ASSET_MANIFEST[key].final.src)}assert.equal(s.fieldFollower.visualScale,FOLLOWER_METADATA[id].visualScale);assert.doesNotThrow(()=>validateFollowerMetadata(s.fieldFollower))}
 assert.equal(paths.size,604);
});
test('follower shares human cell/anchor principles with varied species visual sizes',()=>{
 const c=FOLLOWER_ATLAS_CONTRACT;assert.deepEqual(c.rows,HUMAN_FIELD_CONTRACT.rows);assert.deepEqual(c.frames,HUMAN_FIELD_CONTRACT.frames);assert.equal(c.width,288);assert.equal(c.height,480);assert.equal(c.columns*c.rowCount,12);
 const sizes=new Set(Object.values(FOLLOWER_METADATA).map(m=>m.visualScale));assert.ok(sizes.size>=3);
 for(const m of Object.values(FOLLOWER_METADATA)){const r=followerRect(100,200,m);assert.equal(r.x+m.footAnchorX*m.visualScale,100+m.renderOffsetX*m.visualScale);assert.equal(r.y+m.footAnchorY*m.visualScale,200+m.renderOffsetY*m.visualScale)}
});
for(const slot of ['battle.front','battle.back','ui.icon','fieldFollower.atlas'])test(`${slot} fallback works for all 151 missing assets, including placeholder decode failure`,async()=>{
 for(let id=1;id<=151;id++){const result=await resolveAsset(speciesAssetId(id,slot),{loader:async()=>{throw Error('missing')},available:new Set()});assert.equal(result.status,'placeholder');assert.ok(result.image.width&&result.image.height)}
});
test('semantic battle front/back and UI icon markup select independent slots',()=>{
 for(const [side,slot] of [['front','battle.front'],['back','battle.back'],['icon','ui.icon']])assert.match(speciesArtMarkup(1,64,side),new RegExp(`data-asset-id="species.1.${slot}"`));
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');assert.match(app,/side==='ally'\?speciesArtMarkup\(mon,230,'back'\)/);
});
test('valid imported files replace placeholders by ID without code changes',async()=>{
 for(const id of slotAssets(1)){const a=ASSET_MANIFEST[id],result=await resolveAsset(id,{loader:async src=>({naturalWidth:a.final.width,naturalHeight:a.final.height}),available:new Set([a.final.src])});assert.equal(result.status,'final');assert.equal(result.src,a.final.src)}
});
test('empty party removes follower; party slot 1 swap is immediate and never edits party',()=>{
 const f=createFieldFollower(),p=player(),members=[{id:1},{id:151}],original=JSON.stringify(members);updateFieldFollower(f,p,members,0);assert.equal(f.speciesId,1);updateFieldFollower(f,p,[members[1],members[0]],0,{paused:true});assert.equal(f.speciesId,151);assert.equal(f.visible,true);assert.equal(JSON.stringify(members),original);updateFieldFollower(f,p,[],0);assert.equal(f.speciesId,null);assert.equal(f.visible,false);assert.equal(f.history.length,0);
});
test('player movement follows sampled corner path with a gap, then settles to Idle',()=>{
 const f=createFieldFollower(),p=player();update(f,p);for(let i=0;i<20;i++){p.x+=4;update(f,p)}assert.ok(Math.abs(f.x-(p.x-48))<.001);assert.equal(f.y,200);
 p.facing='down';for(let i=0;i<12;i++){p.y+=4;update(f,p);assert.equal(f.y,200)}
 for(let i=0;i<20;i++){p.y+=4;update(f,p);assert.equal(f.x,280)}assert.equal(f.facing,'down');assert.equal(f.y,p.y-48);update(f,p);assert.equal(f.moving,false);assert.equal(followerPose(f.facing,f.moving,f.walk).frame,0);
});
test('narrow right-angle passage follows history without cutting through walls',()=>{
 const canOccupy=(_s,x,y)=>(Math.abs(y-200)<.01&&x>=140&&x<=280)||(Math.abs(x-280)<.01&&y>=200&&y<=400),f=createFieldFollower(),p=player();update(f,p,{canOccupy});
 for(let i=0;i<50;i++){if(i<20)p.x+=4;else {p.facing='down';p.y+=4}update(f,p,{canOccupy});assert.equal(canOccupy('',f.x,f.y),true)}assert.equal(f.relocations,1);assert.equal(f.y,p.y-48);
});
test('four directions use WalkA / WalkB while moving and matching direction Idle at rest',()=>{
 for(const [row,dir] of ['down','right','left','up'].entries()){const frames=new Set();for(let walk=0;walk<64;walk++){const pose=followerPose(dir,true,walk);assert.equal(pose.row,row);frames.add(pose.frame)}assert.deepEqual([...frames],[1,2]);assert.deepEqual(followerPose(dir,false,99).source,[0,row*120,96,120]);for(let i=0;i<3;i++)assert.equal(followerPose(dir,false,0,i).frame,i)}
 const svg=decodeURIComponent(placeholderURL('species.151.fieldFollower.atlas',288,480));assert.equal((svg.match(/<g /g)??[]).length,12);assert.match(svg,/151/);
});
test('actual QA map warp relocates within walkable area, discarding old-map history',()=>{
 const s=createGoldenField(null,{qa:true,scenario:'connection'}),f=createFieldFollower(),opts={canOccupy:(_scene,x,y)=>coreWalkable(s,x,y)};s.x=1247;s.y=800;update(f,s,opts);moveGolden(s,'right',1/60);update(f,s,opts);assert.equal(s.scene,'qa_b');assert.equal(f.scene,'qa_b');assert.equal(f.reason,'warp');assert.ok(Math.hypot(f.x-s.x,f.y-s.y)<=48);assert.ok(coreWalkable(s,f.x,f.y));assert.ok(f.history.length<=2);
});
test('real door entry and exit hide during transition and recover near the player',()=>{
 const s=createGoldenField({scene:'outdoor',x:765,y:410,facing:'up'}),f=createFieldFollower(),a=createFieldAnimation(),opts=()=>({transition:!!s.transition,canOccupy:(_scene,x,y)=>coreWalkable(s,x,y)});update(f,s,opts());assert.equal(interactGolden(s),'transition');update(f,s,opts());assert.equal(f.visible,false);
 for(let i=0;i<90;i++){moveGolden(s,null,1/60);tickFieldCore(s,1/60,a);update(f,s,opts())}assert.equal(s.scene,'interior');assert.equal(f.visible,true);assert.ok(coreWalkable(s,f.x,f.y));
 s.x=s.doorX;s.y=890;s.facing='down';interactGolden(s);for(let i=0;i<90;i++){moveGolden(s,null,1/60);tickFieldCore(s,1/60,a);update(f,s,opts())}assert.equal(s.scene,'outdoor');assert.equal(f.scene,s.scene);
});
test('actual ledge sequence hides follower then recovers to a valid landing',()=>{
 const s=createGoldenField(null,{qa:true,scenario:'ledge'}),f=createFieldFollower(),a=createFieldAnimation(),opts=()=>({jumping:s.core.sequence?.kind==='ledge',canOccupy:(_scene,x,y)=>coreWalkable(s,x,y)});update(f,s,opts());for(let i=0;i<7;i++)moveGolden(s,'down',1/60);update(f,s,opts());assert.equal(f.visible,false);for(let i=0;i<40;i++){tickFieldCore(s,1/60,a);update(f,s,opts())}assert.equal(s.y,744);assert.equal(f.visible,true);assert.ok(coreWalkable(s,f.x,f.y));assert.ok(Math.hypot(f.x-s.x,f.y-s.y)<=48);
});
test('slice stairs and saved return location reinitialize follower in the destination',()=>{
 const s=createSlice(),f=createFieldFollower();s.scene='interior';s.x=480;s.y=490;const options=()=>({gap:24,canOccupy:(_scene,x,y)=>walkable(s,x,y)});update(f,s,options());assert.equal(interactAt(s).type,'exit');update(f,s,options());assert.equal(f.scene,'outdoor');assert.ok(walkable(s,f.x,f.y));
});
test('follower is never a collision blocker or serialized field state',()=>{
 const s=createGoldenField(null,{qa:true,scenario:'npc'}),f=createFieldFollower(),before=serializeGolden(s),npcs=JSON.stringify(s.core.npcs);s.follower=f;update(f,s,{canOccupy:(_scene,x,y)=>coreWalkable(s,x,y)});assert.deepEqual(serializeGolden(s),before);assert.equal(JSON.stringify(s.core.npcs),npcs);assert.equal(coreWalkable(s,f.x,f.y),true);const x=s.x;moveGolden(s,'right',1/60);assert.ok(s.x>x);
});
test('new obstacles recover safely; huge displacement and pause cannot break movement',()=>{
 const f=createFieldFollower(),p=player();update(f,p);const x=f.x;p.x+=10;update(f,p,{paused:true});assert.equal(f.x,x);p.x=1000;update(f,p);assert.equal(f.reason,'warp');assert.ok(Math.abs(f.x-p.x)<=48);p.x+=10;const blockedX=f.x;for(let i=0;i<40;i++)update(f,p,{canOccupy:(_s,x)=>x>blockedX+1});assert.equal(f.visible,true);assert.ok(f.x>blockedX);
});
test('bounded history survives prolonged movement without an unbounded queue',()=>{
 const f=createFieldFollower(),p=player();for(let i=0;i<12000;i++){p.x+=.05;update(f,p)}assert.ok(f.history.length<=256);assert.ok(Number.isFinite(f.x));assert.equal(f.relocations,1);
});
test('import gate validates PNG dimensions, 12 occupied transparent cells, CRC and metadata',()=>{
 const a=ASSET_MANIFEST[SPECIES_ASSETS[1].fieldFollower.atlas],valid=png(288,480,{atlas:true});assert.equal(validateSpeciesPNG(a,valid),true);assert.throws(()=>validateSpeciesPNG(a,png(96,120)),/size/);assert.throws(()=>validateSpeciesPNG(a,png(288,480,{atlas:true,emptyFrame:11})),/frame 3:2/);assert.throws(()=>validateSpeciesPNG(a,png(288,480,{opaque:true})),/transparent/);
 const corrupt=Buffer.from(valid);corrupt[50]^=1;assert.throws(()=>validateSpeciesPNG(a,corrupt),/CRC/);assert.throws(()=>validateSpeciesPNG({...a,metadata:{...a.metadata,footAnchorX:97}},valid),/anchor/);assert.throws(()=>validateSpeciesPNG({...a,contract:{...a.contract,columns:4}},valid),/12-frame/);assert.throws(()=>validateSpeciesPNG({...a,speciesId:152},valid),/Unknown species/);assert.throws(()=>validateSpeciesPNG({...a,final:{...a.final,src:'../bad.png'}},valid),/path/);
});
test('partially imported species reports required front/back/icon/follower; absent species stay allowed',()=>{
 const root=mkdtempSync(join(tmpdir(),'geoje-species-'));try{assert.equal(inspectSpeciesArt(root).failures.length,0);assert.equal(inspectSpeciesArt(root,[1]).failures.length,4);const slots=slotAssets(1);for(const id of slots){const a=ASSET_MANIFEST[id],path=join(root,a.final.src);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,png(a.final.width,a.final.height,{atlas:a.kind==='follower'}))}assert.equal(inspectSpeciesArt(root,[1]).failures.length,0);assert.equal(inspectSpeciesArt(root).present.length,4);assert.equal(inspectSpeciesArt(root,[152]).failures[0].error,'Unknown species ID');rmSync(join(root,ASSET_MANIFEST[slots[2]].final.src));assert.equal(inspectSpeciesArt(root).failures.length,1)}finally{rmSync(root,{recursive:true,force:true})}
});
test('a malformed slot falls back without affecting another valid slot',async()=>{
 const a=ASSET_MANIFEST[SPECIES_ASSETS[1].fieldFollower.atlas];assert.throws(()=>validateFinalImage({...a,metadata:{...a.metadata,visualScale:NaN}},{naturalWidth:288,naturalHeight:480}),/finite/);
 const bad=await resolveAsset(a.id,{loader:async()=>({naturalWidth:96,naturalHeight:120})});assert.equal(bad.status,'placeholder');const good=await resolveAsset(SPECIES_ASSETS[1].battle.front,{loader:async()=>({naturalWidth:256,naturalHeight:256})});assert.equal(good.status,'final');
 const transparent=new Uint8ClampedArray(288*480*4);assert.throws(()=>validateAlphaPixels(a,transparent,288,480),/Visible pixels/);
});

test('automatic inventory excludes only invalid species files, preserving valid sibling slots',()=>{
 const root=mkdtempSync(join(tmpdir(),'geoje-inventory-'));try{for(const id of slotAssets(1)){const a=ASSET_MANIFEST[id],path=join(root,a.final.src);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,a.kind==='follower'?Buffer.from('bad PNG'):png(a.final.width,a.final.height))}const inventory=artInventory(root);assert.equal(inventory.paths.length,3);assert.equal(inventory.rejected.length,1);assert.equal(inventory.rejected[0].path,ASSET_MANIFEST[SPECIES_ASSETS[1].fieldFollower.atlas].final.src)}finally{rmSync(root,{recursive:true,force:true})}
});
