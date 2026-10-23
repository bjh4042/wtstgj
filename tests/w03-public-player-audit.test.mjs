import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {drawTrainer} from '../dist/trainer-sprites.mjs';
test('actual player cannot fall back to legacy art while approval asset is unavailable',()=>{
 for(const gender of ['boy','girl']){const calls=[];drawTrainer({drawImage:(...a)=>calls.push(a)},{width:1086,height:1448},{gender,x:100,y:200,player:true});assert.equal(calls.length,0)}
});
test('generic trainer drawing retains legacy-compatible behavior',()=>{
 for(const gender of ['boy','girl']){const calls=[];drawTrainer({drawImage:(...a)=>calls.push(a)},{width:1086,height:1448},{gender,x:100,y:200});assert.equal(calls.length,1)}
});
test('local HTML uses official project title',()=>{assert.match(readFileSync('dist/index.html','utf8'),/<title>생태몬스터:거제도<\/title>/)});
