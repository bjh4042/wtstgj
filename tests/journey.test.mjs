import test from 'node:test';
import assert from 'node:assert/strict';
import {STARTERS,freshState,validateSave} from '../dist/model.mjs';
import {REGIONS,REGION_BY_ID,BADGES,ADMIN_AREAS} from '../dist/regions.mjs';
test('old v1 saves gain a journey without losing party or garden badge',()=>{const s=freshState(STARTERS[0],'girl');delete s.journey;s.badges=['garden'];const clean=validateSave(s);assert.equal(clean.party[0].uid,s.party[0].uid);assert.equal(clean.journey.region,'gohyeon');assert.deepEqual(clean.badges,['garden'])});
test('8 distinct badges and 18 distinct administrative areas',()=>{assert.equal(new Set(BADGES).size,8);assert.equal(new Set(ADMIN_AREAS).size,18);const s=freshState(STARTERS[0],'boy');s.badges=[...BADGES];s.journey.champion=true;assert.deepEqual(validateSave(s).badges,BADGES)});
test('all mainland hubs have reciprocal routes and are connected from Gohyeon',()=>{const seen=new Set(['gohyeon']);const queue=['gohyeon'];for(const id of queue)for(const n of REGION_BY_ID[id].neighbors){assert.ok(REGION_BY_ID[n]);if(id!=='island')assert.ok(REGION_BY_ID[n].neighbors.includes(id));if(!seen.has(n)){seen.add(n);queue.push(n)}}assert.equal(seen.size,9);assert.equal(REGIONS.length,10)});
test('journey validates enums, arrays, time and strips unknown fields',()=>{const s=freshState(STARTERS[2],'boy');s.journey.realName='not exported';assert.ok(!JSON.stringify(validateSave(s)).includes('not exported'));s.journey.region='unknown';assert.throws(()=>validateSave(s));s.journey.region='gohyeon';s.journey.playSeconds=-1;assert.throws(()=>validateSave(s))});
