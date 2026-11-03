import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const PREFIX='geoje.dev.selected-native-v1.DEV_ORIGINAL_WORLD_S7_S8_GYM8_V1.3d8d3dc127dc0bebd0342e1e3ca85a0d9b2ce5fab5aecd69cf3635428affb66f.';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function ready(page){await page.waitForFunction(()=>{return document.querySelector('#save')?.disabled===false},{},{timeout:90000});return JSON.parse(await page.locator('#status').textContent())}
export async function exported(page){await page.locator('#export').click();await ready(page);const e=JSON.parse(await page.locator('#exchange').inputValue());assert.equal(e.format,'GEOJE_SELECTED_NATIVE_EXPERIMENT_EXPORT');assert.equal(e.version,1);assert.equal(e.payload.completedSnapshot.developmentOnly,true);return e.payload.completedSnapshot}
export async function pixels(page,selector){const p=await page.locator(selector).evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();let opaque=0;for(let i=0;i<a.length;i+=64){if(a[i+3])opaque++;colors.add(a[i]+','+a[i+1]+','+a[i+2])}return{width:c.width,height:c.height,opaque,colors:colors.size}});assert(p.opaque>100&&p.colors>8,'Required rendered canvas is blank');return p}
export async function storage(page){const values=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));assert(Object.keys(values).every(k=>k.startsWith(PREFIX)),'Unexpected storage namespace');return values}
const URL='http://127.0.0.1:5189/native_world_selected_browser_r1/index.html';
const cadence=async page=>JSON.parse(await page.locator('#cadence-state').textContent());
async function flushed(page){await page.waitForFunction(()=>{try{const c=JSON.parse(document.querySelector('#cadence-state').textContent);return !c.liveUnsaved&&!c.pendingFlush&&!c.heldCodes.length&&!c.inputBlocked&&!c.paused&&document.querySelector('#save').disabled===false}catch{return false}},{},{timeout:15000});return ready(page)}
async function hold(page,key,ms){await page.keyboard.down(key);try{await page.waitForTimeout(ms)}finally{await page.keyboard.up(key)}return flushed(page)}
const portSelector=id=>'[data-port="'+id+'"]';
const inside=(p,b)=>p.x>=b[0]&&p.y>=b[1]&&p.x<b[2]&&p.y<b[3];
// Selected-capability corridor proof: S7 y770 exact; S8 smallest orthogonal margin6.
// Current cadence clamps50ms at nominal192, at most9 accepted pixels per sample; final ports use original eligibility.
async function walk(page,map,points,report,{port=null,region=null,tolerance=6}={}){
 const started=performance.now(),samples=[];let steps=0,lastProgress=started,best=Infinity;
 for(let index=0;index<points.length;index++){
  const target=points[index];best=Infinity;lastProgress=performance.now();
  while(true){
   const s=await ready(page),p=s.position;assert.equal(s.map,map);assert.equal(p.scene,map);if(map==='world:hub:S7')assert.equal(p.y,770,'Exact S7 corridor y required');
   if(port&&index===points.length-1&&inside(p,region)&&await page.locator(portSelector(port)).isEnabled())break;
   const dx=target[0]-p.x,dy=target[1]-p.y;if(!(port&&index===points.length-1)&&Math.abs(dx)<=tolerance&&Math.abs(dy)<=tolerance)break;
   const now=performance.now();const distanceToTarget=Math.abs(dx)+Math.abs(dy);if(distanceToTarget<best){best=distanceToTarget;lastProgress=now;}
   samples.push({index,target,position:p,elapsedMs:now-started});if(samples.length>20)samples.shift();
   assert(now-started<180000&&now-lastProgress<8000&&steps++<1200,'APPROACH_BOUND '+JSON.stringify(samples));
   const horizontal=Math.abs(dx)>tolerance,key=horizontal?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowDown':'ArrowUp'),distance=horizontal?Math.abs(dx):Math.abs(dy);
   await hold(page,key,distance>120?500:distance>40?150:40);
  }
 }
 report.timings.push({label:'native-keyboard-route',map,elapsedMs:performance.now()-started,steps,scope:'actual-keyboard-through-durable-flush-not-nominal-speed'});
}
async function warp(page,id,from,to,arrival,report,region){const before=await ready(page);assert.equal(before.map,from);if(region)assert(inside(before.position,region),'Wrong port region');assert(await page.locator(portSelector(id)).isEnabled(),'Original port not eligible');const t=performance.now();await page.locator(portSelector(id)).click();const after=await ready(page);assert.equal(after.map,to);assert.equal(after.position.scene,to);assert.equal(after.position.x,arrival[0]);assert.equal(after.position.y,arrival[1]);assert(after.revision>before.revision);await pixels(page,'#field');report.milestones.push({kind:'original-authority-port',id,from,to,arrival:after.position,elapsedMs:performance.now()-t,scope:'click-through-visible-ready-not-physical-paint'});return after}
export async function originalWorldFlow({newPage,report}){
 let page=await newPage();await page.goto(URL);assert.deepEqual(await storage(page),{});await page.locator('#start').click();let s=await ready(page);assert.equal(s.map,'world:hub:S6');assert.equal((await cadence(page)).storagePrefix,PREFIX);await pixels(page,'#field');
 await warp(page,'route:S6:S7','world:hub:S6','world:hub:S7',[96,770],report);
 await page.locator('#field').click();const initial=await ready(page),t=performance.now();s=await hold(page,'ArrowRight',200);const delta=s.position.x-initial.position.x;assert(delta>0&&delta<=192&&s.position.y===770);await page.waitForTimeout(200);assert.deepEqual((await ready(page)).position,s.position);report.milestones.push({kind:'held-release-flush',acceptedDistance:delta,elapsedMs:performance.now()-t,nominalSpeedGuarantee:false});
 const prior=await exported(page);await page.locator('#save').click();await ready(page);const ordinal=(await ready(page)).ownerOrdinal;await hold(page,'ArrowRight',100);assert.notDeepEqual((await ready(page)).position,prior.position);const saved=await exported(page);await page.locator('#load').click();s=await ready(page);assert(s.ownerOrdinal>ordinal);assert.deepEqual(await exported(page),saved);const stored=await storage(page);report.milestones.push({kind:'off-anchor-exact-new-owner-load',digest:digest(saved)});
 await page.close();page=await newPage();await page.goto(URL);assert.deepEqual(await storage(page),stored);await page.locator('#cold-load').click();s=await ready(page);assert.deepEqual(await exported(page),saved);assert.deepEqual(await storage(page),stored);await pixels(page,'#field');report.milestones.push({kind:'fresh-page-explicit-native-load',digest:digest(saved),storageChanged:false});await page.locator('#field').click();
 await walk(page,'world:hub:S7',[[4030,770]],report,{port:'route:S7:S8',region:[4018,758,4043,783]});
 await warp(page,'route:S7:S8','world:hub:S7','world:hub:S8',[2310,1470],report,[4018,758,4043,783]);
 await walk(page,'world:hub:S8',[[2310,1476],[2229,1476],[2229,804],[429,804],[429,600]],report,{port:'gym-entry:8',region:[405,584,454,617]});
 await warp(page,'gym-entry:8','world:hub:S8','world:gym:8',[690,965],report,[405,584,454,617]);
 await warp(page,'gym-entry:8:return','world:gym:8','world:hub:S8',[429,660],report,[666,949,715,982]);
 await walk(page,'world:hub:S8',[[429,804],[2229,804],[2229,1476],[2433,1476]],report,{port:'route:S7:S8:return',region:[2424,1458,2449,1483]});
 await warp(page,'route:S7:S8:return','world:hub:S8','world:hub:S7',[4000,770],report,[2424,1458,2449,1483]);
 await walk(page,'world:hub:S7',[[24,770]],report,{port:'route:S6:S7:return',region:[15,754,49,787]});
 await warp(page,'route:S6:S7:return','world:hub:S7','world:hub:S6',[984,1032],report,[15,754,49,787]);
 const grid=await exported(page);await page.locator('#save').click();await ready(page);await page.locator('#load').click();await ready(page);assert.deepEqual(await exported(page),grid);assert.equal(report.milestones.filter(x=>x.kind==='original-authority-port').length,6);report.milestones.push({kind:'six-ports-grid-return-save-load',digest:digest(grid)});await page.close();
}
