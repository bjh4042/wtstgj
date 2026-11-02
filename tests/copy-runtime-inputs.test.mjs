import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,win32} from 'node:path';
import {createHash} from 'node:crypto';
import {copyRuntimeInputs,pathAncestors,containsPath,unsafeOutputOverlap} from '../scripts/copy-runtime-inputs.mjs';
function fixture(){const base=mkdtempSync(join(tmpdir(),'geoje-closure-fixture-')),sourceRoot=join(base,'source'),outputRoot=join(base,'output');mkdirSync(sourceRoot);const files=[['dist/assets/approved-title/tiny.png','approved-media',Buffer.from([137,80,78,71,0,1])],['dist/assets/rc3/fonts/OFL.md','approved-media',Buffer.from('fixture license')],['dist/data/staging-20260927/tiny.csv','runtime-data',Buffer.from('\uFEFFid,name\n1,fixture')],['dist/nearby-safe-band.mjs','shell-snapshot',Buffer.from('export const fixture=true;')],...['offline.html','manifest.webmanifest','icon-192.png','icon-512.png'].map(p=>['dist/pwa/'+p,'pwa',Buffer.from('fixture:'+p)])];const rows=files.map(([source,kind,b])=>{const p=join(sourceRoot,source);mkdirSync(join(p,'..'),{recursive:true});writeFileSync(p,b);return{source,destination:source.slice(5),kind,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}});return{sourceRoot,outputRoot,manifest:{schema:1,selection:'fixture',snapshot:[],rows,explicitExceptions:rows.filter(x=>x.kind!=='approved-media').map(x=>x.source)}};}
test('dry run writes zero; byte-exact apply and reuse preserve BOM/license',()=>{const f=fixture();assert.equal(copyRuntimeInputs(f).writes,0);assert.equal(existsSync(f.outputRoot),false);assert.equal(copyRuntimeInputs({...f,apply:true}).writes,8);for(const r of f.manifest.rows)assert.deepEqual(readFileSync(join(f.sourceRoot,r.source)),readFileSync(join(f.outputRoot,r.destination)));assert.equal(copyRuntimeInputs({...f,apply:true}).reuse,8)});
test('late hash failure makes zero output writes',()=>{const f=fixture();f.manifest.rows.at(-1).sha256='0'.repeat(64);assert.throws(()=>copyRuntimeInputs({...f,apply:true}),/Hash/);assert.equal(existsSync(f.outputRoot),false)});
test('missing file makes zero writes',()=>{const f=fixture();f.manifest.rows.at(-1).source='dist/pwa/missing.png';f.manifest.rows.at(-1).destination='pwa/missing.png';f.manifest.explicitExceptions.push('dist/pwa/missing.png');assert.throws(()=>copyRuntimeInputs({...f,apply:true}),/ENOENT/);assert.equal(existsSync(f.outputRoot),false)});
test('different output collision preserves existing bytes and writes nothing else',()=>{const f=fixture();mkdirSync(join(f.outputRoot,'pwa'),{recursive:true});writeFileSync(join(f.outputRoot,'pwa/icon-512.png'),'collision');assert.throws(()=>copyRuntimeInputs({...f,apply:true}),/Hash/);assert.equal(existsSync(join(f.outputRoot,'assets')),false);assert.equal(readFileSync(join(f.outputRoot,'pwa/icon-512.png'),'utf8'),'collision')});
test('path traversal and private provenance refused',()=>{for(const p of ['dist/../bad','dist/assets/approved-title/provenance.json','dist/private/secret.json']){const f=fixture();f.manifest.rows[0].source=p;f.manifest.rows[0].destination=p.slice(5);assert.throws(()=>copyRuntimeInputs({...f,apply:true}));assert.equal(existsSync(f.outputRoot),false)}});
test('source and destination symlink components refused',()=>{for(const side of ['source','output']){const f=fixture();const link=join(f.sourceRoot,'link');symlinkSync(f.sourceRoot,link);if(side==='source')f.sourceRoot=link;else{symlinkSync(f.sourceRoot,f.outputRoot)}assert.throws(()=>copyRuntimeInputs({...f,apply:true}),/Symlink/)}});
test('source snapshot change rejects old shell manifest',()=>{const f=fixture();f.manifest.snapshot=[{path:'dist/nearby-safe-band.mjs',bytes:1,sha256:'0'.repeat(64)}];assert.throws(()=>copyRuntimeInputs({...f,apply:true}),/Hash/);assert.equal(existsSync(f.outputRoot),false)});

test('win32 native component walk includes junction ancestors and UNC root',()=>{
 assert.deepEqual(pathAncestors('C:\\work\\junction\\game\\build',win32),['C:\\','C:\\work','C:\\work\\junction','C:\\work\\junction\\game','C:\\work\\junction\\game\\build']);
 const p='\\\\server\\share\\dir\\file';assert.deepEqual(pathAncestors(p,win32),['\\\\server\\share\\','\\\\server\\share\\dir',p]);
});
test('win32 containment handles case, drives, siblings and exact dist overlap',()=>{
 assert.equal(containsPath('C:\\GAME','c:\\game\\dist',win32),true);
 assert.equal(containsPath('C:\\game','D:\\game',win32),false);
 assert.equal(containsPath('C:\\game','C:\\game-other',win32),false);
 for(const out of ['C:\\game','C:\\','C:\\game\\dist','C:\\game\\dist\\child'])assert.equal(unsafeOutputOverlap('C:\\game',out,win32),true);
 assert.equal(unsafeOutputOverlap('C:\\game','C:\\game\\build',win32),false);
});
test('exact dist output refused without writing',()=>{const f=fixture();assert.throws(()=>copyRuntimeInputs({...f,outputRoot:join(f.sourceRoot,'dist'),apply:true}),/overlap/)});
