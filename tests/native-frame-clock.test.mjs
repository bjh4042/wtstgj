import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeFrameDelta} from '../dist/world/native-runtime-policy.mjs';
const entry=fs.readFileSync(new URL('../dist/world/entry.mjs',import.meta.url),'utf8');
const expression=entry.match(/const dt=([^;]+);lastFrame=now;/)?.[1];
const elapsed=new Function('now','lastFrame',`return ${expression}`);
test('actual main frame clamps initial/resumed RAF timestamps before performance baseline to zero',()=>{assert(expression);for(const [now,last,want] of [[100,100.8,0],[100,1016,0],[100,100,0],[116,100,.016],[300,100,.05]]){const dt=nativeFrameDelta(elapsed(now,last)*1000);assert.equal(dt,want*1000);assert(Number.isFinite(dt)&&dt>=0)}});
test('existing battle/dialogue zero-delta and upper cap remain unchanged',()=>{assert.equal(nativeFrameDelta(elapsed(200,100)*1000,{battle:true}),0);assert.equal(nativeFrameDelta(elapsed(200,100)*1000,{dialogue:true}),0);assert.equal(nativeFrameDelta(elapsed(10000,100)*1000),50)});
