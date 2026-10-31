import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coastalScopeVerdict} from './scope-guard.mjs';
const cfg=JSON.parse(readFileSync(new URL('./CANDIDATE.json',import.meta.url)));
const originalSafe=readFileSync(new URL('./original_safe49.u8',import.meta.url));
const newSafe=readFileSync(new URL('./new_safe49.u8',import.meta.url));
const verdict=(from,to)=>coastalScopeVerdict({from,to,width:5120,height:1536,originalSafe,newSafe});
test('west centre-support edge is scope boundary before raw polygon edge',()=>{
 assert.equal(verdict([1289,1375],[1288,1375]),'OUTSIDE_VERIFIED_SCOPE');
});
test('original supported destination wins even outside new candidate',()=>{
 assert.equal(verdict([1572,1440],[1572,1470]),'ALLOW_ORIGINAL_SUPPORT');
});
test('new doorway approach supported',()=>assert.equal(verdict([1572,1376],[1572,1375]),'ALLOW_NEW_CANDIDATE_SUPPORT'));
test('invalid/fractional input is not silently rounded',()=>assert.throws(()=>verdict([1572,1375],[1572.5,1375]),TypeError));
