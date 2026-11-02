import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {approvedPublicAsset} from '../tools/approved-public-assets.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
test('runtime copy includes the exact public, approved-only artwork inventory',()=>{
 const bytes=read('dist/art-inventory.json'),inventory=JSON.parse(bytes),manifest=JSON.parse(read('scripts/runtime-inputs-manifest.json'));
 assert.deepEqual(Object.keys(inventory).sort(),['paths','rejected','version']);assert.deepEqual(inventory.rejected,[]);
 assert.equal(inventory.paths.length,214);assert.equal(new Set(inventory.paths).size,214);
 for(const path of inventory.paths){assert(approvedPublicAsset(path));assert(manifest.rows.some(row=>row.destination===path));}
 const row=manifest.rows.filter(row=>row.source==='dist/art-inventory.json');assert.equal(row.length,1);
 assert.deepEqual(row[0],{source:'dist/art-inventory.json',destination:'art-inventory.json',kind:'runtime-data',bytes:10731,sha256:'8ee0f9523dd92d8979b5e95ba3c417ea123bba3217228ac1f44d8dec10f067f5'});
 assert.equal(createHash('sha256').update(bytes).digest('hex'),row[0].sha256);assert(manifest.explicitExceptions.includes(row[0].source));
});
