import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {displayTime,simpleDisplayFrame,withSimpleDisplay} from '../dist/presentation/simple-display.mjs';
import {installHelp} from '../dist/pwa/install.mjs';
import {createEnvironmentService,createMockEnvironment} from '../dist/environment-service.mjs';
const date=time=>new Date('2026-10-22T'+time+'Z');
test('Seoul exact day/night boundaries, independent of device timezone',()=>{
 assert.equal(displayTime(date('20:59:59')),'NIGHT');assert.equal(displayTime(date('21:00:00')),'DAY');
 assert.equal(displayTime(date('08:59:59')),'DAY');assert.equal(displayTime(date('09:00:00')),'NIGHT');
});
test('display rain binary adapter preserves observation identity and heavy-rain rules',async()=>{
 const source=createEnvironmentService(createMockEnvironment({time:'EVENING',weather:'HEAVY_RAIN'}));await source.refresh();
 const wrapper=withSimpleDisplay(source,{now:()=>date('21:00:00')});const before=source.getState();const result=wrapper.getFrame({biomeId:'COAST'});
 assert.equal(result.display.time,'DAY');assert.equal(result.weather.density,80);assert.equal(source.getState(),before);assert.equal(wrapper.getEncounterWeather().weather,'HEAVY_RAIN');
 assert.equal(wrapper.getFrame({biomeId:'INDOOR'}).weather.density,0);source.stop();
});
test('cloudy observation is retained while no rain is rendered',()=>{
 const frame={state:{weather:'CLOUDY'},lighting:{profileId:'FOREST'}};const result=simpleDisplayFrame(frame,{date:date('09:00:00')});
 assert.equal(result.state,frame.state);assert.equal(result.display.observedWeather,'CLOUDY');assert.equal(result.weather.density,0);assert.equal(result.lighting.time,'NIGHT');
});
test('install help does not guarantee address-bar or desktop shortcut',()=>{
 assert.match(installHelp('iPhone'),/Safari.*홈 화면/);assert.match(installHelp('Windows'),/브라우저와 운영체제에 따라/);
});
test('manifest scope and full-resolution PNG icon headers',()=>{
 const manifest=JSON.parse(readFileSync('dist/pwa/manifest.webmanifest'));assert.equal(manifest.start_url,'/wtstgj/');assert.equal(manifest.scope,'/wtstgj/');assert.equal(manifest.display,'standalone');
 for(const size of [192,512]){const png=readFileSync(`dist/pwa/icon-${size}.png`);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size)}
});
test('built worker keeps updates off active sessions and never caches game/user content',()=>{
 const worker=readFileSync('build/sw.js','utf8');assert.doesNotMatch(worker,/self\.skipWaiting\(|clients\.claim\(|localStorage|indexedDB|cache\.put/);assert.match(worker,/pwa\/offline.html/);assert.match(worker,/key.startsWith\('wtstgj-shell-'/);
});
