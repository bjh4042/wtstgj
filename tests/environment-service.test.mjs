import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnvironmentService,createMockEnvironment,TIME_STATES,WEATHER_STATES,geojeTimeState,environmentVisuals,drawEnvironment} from '../dist/environment-service.mjs';

test('MOCK supports every time/weather combination and sound hooks unsubscribe cleanly',()=>{
 const s=createEnvironmentService(),events=[];const unsubscribe=s.subscribe((state,v)=>events.push([state,v.sound]));
 for(const time of TIME_STATES)for(const weather of WEATHER_STATES){s.setMock({time,weather});assert.deepEqual(s.getState(),{time,weather});const v=environmentVisuals(s.getState());assert.ok(v.opacity>=0&&v.opacity<=1);assert.equal(v.rain>0,weather.includes('RAIN'));}
 assert.equal(events.length,16);assert.equal(events.at(-1)[1],'weather.rain.heavy');unsubscribe();s.setMock({weather:'CLEAR'});assert.equal(events.length,16);assert.throws(()=>s.setMock({weather:'SNOW'}));s.stop();
});
test('Korea timezone controls four time boundaries independent of host timezone',()=>{
 for(const [utc,expected] of [['2026-09-20T20:00Z','DAWN'],['2026-09-20T23:00Z','DAY'],['2026-09-21T09:00Z','EVENING'],['2026-09-21T11:00Z','NIGHT'],['2026-09-21T19:59Z','NIGHT']])assert.equal(geojeTimeState(new Date(utc)),expected);
});
test('DAY/CLEAR changes zero pixels; rain draws particles without modifying gameplay',()=>{
 let draws=0;const c=new Proxy({}, {get:()=>()=>draws++,set:()=>true});drawEnvironment(c,{time:'DAY',weather:'CLEAR'},0,960,540);assert.equal(draws,0);drawEnvironment(c,{time:'NIGHT',weather:'HEAVY_RAIN'},100,960,540);assert.ok(draws>180);
});
test('provider replacement ignores stale responses and maintains last valid state on failure',async()=>{
 let release;const s=createEnvironmentService({name:'slow',read:()=>new Promise(resolve=>release=resolve)});const old=s.refresh();await Promise.resolve();await s.setProvider({name:'new',read:()=>({time:'NIGHT',weather:'RAIN'})});release({time:'DAWN',weather:'CLEAR'});await old;assert.deepEqual(s.getState(),{time:'NIGHT',weather:'RAIN'});
 await s.setProvider({name:'offline',read:()=>{throw Error('offline')}});assert.deepEqual(s.getState(),{time:'NIGHT',weather:'RAIN'});assert.match(s.getStatus().error,/offline/);s.stop();
});
test('hung or malformed providers cannot block rendering or reset the environment',async()=>{
 const s=createEnvironmentService(createMockEnvironment(),{timeoutMs:10});s.setMock({time:'EVENING',weather:'RAIN'});
 await s.setProvider({name:'hung',read:()=>new Promise(()=>{})});assert.match(s.getStatus().error,/timeout/);assert.equal(s.getState().weather,'RAIN');await s.setProvider({name:'bad',read:()=>({time:'INVALID',weather:'CLEAR'})});assert.match(s.getStatus().error,/Invalid/);assert.equal(s.getState().time,'EVENING');s.stop();
});
