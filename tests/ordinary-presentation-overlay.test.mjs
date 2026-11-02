import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../dist/'+p,import.meta.url),'utf8');
test('ordinary field and shared shell agree on wide logical geometry',()=>{
 const entry=read('world/entry.mjs'),shell=read('assets/mobile-viewport-CKi2spbv.js');
 assert(entry.includes('data-w="field" width="1280" height="720"'));
 assert.equal((shell.match(/nativeWidth:1280,nativeHeight:720/g)||[]).length,2);
 assert(shell.includes('nativeWidth:960,nativeHeight:640'));
});
test('ordinary battle selects front presentation and pauses entrance with its owner',()=>{
 const entry=read('world/entry.mjs'),presentation=read('battle-v3/presentation.mjs');
 assert(entry.includes("from '../battle-v3/presentation.mjs'"));
 assert(entry.includes('visual?.suspendEntrance?.()'));
 assert(presentation.includes("from './front-policy-r2/adapter.mjs'"));
 assert(presentation.includes("from './entrance.mjs'"));
});
