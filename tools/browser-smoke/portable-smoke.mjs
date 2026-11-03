import assert from 'node:assert/strict';import{spawn}from'node:child_process';import{setTimeout as sleep}from'node:timers/promises';import{chromium}from'playwright-core';import{assertSandboxCommand,sandboxEvidence}from'./guards.mjs';
const ORIGIN='http://127.0.0.1:5189',report={kind:'PORTABLE_R9_SYNTHETIC_DEV_CHROME',ordinaryGame:false,checkpointSupported:false,volatileMemoryOnly:true,physicalPaintClaim:false,crossFeatures:[],warps:[],errors:[]};let browser,server;
const deadline=setTimeout(()=>{report.errors.push('TOTAL_TIMEOUT');browser?.close().catch(()=>{});server?.kill();process.exitCode=1},480000);
const observe=async page=>JSON.parse(await page.locator('[data-dev-observer]').textContent());
const unchangedMechanics=(a,b)=>{assert.equal(typeof a.mechanicsDigest,'string');assert(a.mechanicsDigest.length>0);assert.equal(typeof b.mechanicsDigest,'string');for(const key of ['mechanicsDigest','money','inventory','items','receiptIds','journalCount']){assert(Object.hasOwn(a,key)&&Object.hasOwn(b,key),'Required observer field missing: '+key);assert.deepEqual(a[key],b[key],key+' changed during read-only operation')}};
async function memoryRoundTrip(page,{moveProof}){
 const saved=await observe(page);assert.equal(saved.ui.phase,'field');
 await page.locator('[data-checkpoint-save]').click();
 await page.waitForFunction(()=>document.querySelector('[data-checkpoint-status]')?.textContent.includes('DEV 메모리 저장 반영 완료'));
 assert(await page.locator('[data-checkpoint-load]').isEnabled());
 const afterSave=await observe(page);assert.deepEqual(afterSave.pose,saved.pose);unchangedMechanics(afterSave,saved);
 await moveProof();const moved=await observe(page);assert.notDeepEqual(moved.pose.foot,saved.pose.foot);
 await page.locator('[data-checkpoint-load]').click();
 await page.waitForFunction(()=>document.querySelector('[data-checkpoint-status]')?.textContent.includes('새 소유자로 복원 완료'));
 const restored=await observe(page);assert.notEqual(restored.ownerOrdinal,saved.ownerOrdinal);assert.equal(restored.ui.phase,'field');assert.deepEqual(restored.pose,saved.pose);unchangedMechanics(restored,saved);
 const canvas=await pixels(page);assert(canvas.opaque>100&&canvas.colors>20,'Restored destination blank');
 return {canvas,kind:'volatile-dev-memory-round-trip',savedOwner:saved.ownerOrdinal,restoredOwner:restored.ownerOrdinal,map:saved.pose.mapId,exactPose:true,exactMechanics:true,reloadDurabilityClaim:false};
}
async function visibleDialogue(page,{lines,speaker,open='keyboard'}){
 const before=await observe(page);assert.equal(before.ui.phase,'field');assert(await page.locator('[data-npc-talk]').isEnabled());
 if(open==='keyboard'){await page.locator('[data-native-view]').focus();await page.keyboard.press('e')}else await page.locator('[data-npc-talk]').click();
 await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('[data-dev-observer]').textContent).ui.phase==='conversation'}catch{return false}});
 assert.equal(await page.locator('.native-dialogue-speaker').innerText(),speaker);assert.deepEqual(await page.locator('.native-dialogue-lines p').allTextContents(),lines);
 for(const selector of ['[data-checkpoint-save]','[data-checkpoint-load]','[data-native-action="open-shop"]','[data-native-action="close"]','[data-warp-go]'])assert(await page.locator(selector).isDisabled(),selector+' must be disabled during conversation');
 const locked=await observe(page);await page.keyboard.down('ArrowRight');try{await sleep(200)}finally{await page.keyboard.up('ArrowRight')}
 const still=await observe(page);assert.deepEqual(still.pose,locked.pose);unchangedMechanics(still,before);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('[data-dev-observer]').textContent).ui.phase==='field'}catch{return false}});
 const closed=await observe(page);assert.deepEqual(closed.pose,before.pose);unchangedMechanics(closed,before);assert.equal(closed.ownerOrdinal,before.ownerOrdinal);assert(await page.locator('.native-dialogue-panel').isHidden());
 await sleep(150);assert.deepEqual((await observe(page)).pose,closed.pose);
 return {kind:'visible-readonly-dialogue',speaker,lines,ownerOrdinal:closed.ownerOrdinal,open,keyboardLocked:true,backgroundControlsDisabled:true,mechanicsUnchanged:true,keyReleaseStops:true};
}
// Each waypoint declares its verified tolerance. Narrow corners may require exact observed coordinates.
// Failure to reach by genuine key input is a test failure, never permission to snap or alter terrain.
async function walkVisibleWaypoints(page,{waypoints,mapId,tolerance=6,maxMs=45000}){
 const start=performance.now(),trace=[];await page.locator('[data-native-view]').focus();
 for(const waypoint of waypoints){const target=Array.isArray(waypoint)?waypoint:waypoint.foot, margin=Array.isArray(waypoint)?tolerance:waypoint.tolerance;let reached=false;
  for(let n=0;n<180;n++){
   assert(performance.now()-start<maxMs,'NPC approach deadline');const s=await observe(page);assert.equal(s.pose.mapId,mapId);assert.equal(s.ui.phase,'field');
   const dx=target[0]-s.pose.foot[0],dy=target[1]-s.pose.foot[1];if(Math.abs(dx)<=margin&&Math.abs(dy)<=margin){trace.push({target,actual:s.pose.foot});reached=true;break}
   const xAxis=Math.abs(dx)>margin,key=xAxis?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowDown':'ArrowUp'),distance=Math.abs(xAxis?dx:dy);
   // Conservative bounded visible input; owner still validates each traversed foot.
   const hold=Math.max(8,Math.min(100,(distance-margin)*1000/192/2));
   await page.keyboard.down(key);try{await sleep(hold)}finally{await page.keyboard.up(key)}await sleep(35);
  }
  assert(reached,'NPC waypoint not reached '+JSON.stringify(target));
 }
 const final=await observe(page);await sleep(150);assert.deepEqual((await observe(page)).pose.foot,final.pose.foot);return {trace,durationMs:performance.now()-start,normalKeyboardOnly:true};
}

const regions={S7_S6:[15,754,49,787],S6_S7:[856,5254,905,5287],S8_GYM8:[405,584,454,617],GYM8_S8:[666,949,715,982]},targets={S7_S6:'world:hub:S6',S6_S7:'world:hub:S7',S8_GYM8:'world:gym:8',GYM8_S8:'world:hub:S8'};
const inside=(foot,r)=>foot[0]>=r[0]&&foot[0]<r[2]&&foot[1]>=r[1]&&foot[1]<r[3];
function assertTiming(record,fromMap,toMap){
 assert.equal(record.scope,'native-dev-warp');assert.equal(record.fromMap,fromMap);assert.equal(record.toMap,toMap);assert.equal(record.appearance,'girl');assert.equal(record.outcome,'succeeded');assert.equal(record.measurementValid,true);
 const values=[record.requestAtMs,...['resourcesReady','atomicCommitted','firstRendered','inputReady'].map(k=>record.stages?.[k]),record.terminalAtMs];
 assert(values.every(v=>Number.isFinite(v)&&v>=0),'Invalid timing mark');for(let i=1;i<values.length;i++)assert(values[i]>=values[i-1],'Nonmonotonic timing');
 assert(Number.isFinite(record.durationMs)&&record.durationMs>=0,'Invalid duration');assert.equal(record.terminalAtMs,record.stages.inputReady);assert.equal(record.durationMs,record.terminalAtMs-record.requestAtMs);
}
function summarizeVisits(warps){return Object.fromEntries(['first-visit','repeat-visit'].map(visit=>{const samples=warps.filter(x=>x.visit===visit).map(x=>x.timingRecord.durationMs);return[visit,{samples:samples.length,averageMs:samples.reduce((a,b)=>a+b,0)/samples.length,maxMs:Math.max(...samples)}]}))}
async function pulse(page,key){await page.locator('[data-native-view]').focus();await page.keyboard.down(key);try{await sleep(35)}finally{await page.keyboard.up(key)}await sleep(35)}
async function approach(page,id){const r=regions[id];for(let n=0;n<50;n++){const s=await observe(page);if(inside(s.pose.foot,r)){await page.locator('[data-warp-port]').selectOption(id);assert(await page.locator('[data-warp-go]').isEnabled(),'Region admitted button must enable');return s}const[x,y]=s.pose.foot;await pulse(page,x<r[0]?'ArrowRight':x>=r[2]?'ArrowLeft':y<r[1]?'ArrowDown':'ArrowUp')}throw Error('Normal keyboard approach failed '+id)}
async function moveProof(page,key){const before=await observe(page);for(let n=0;n<8;n++){await pulse(page,key);const after=await observe(page);if(JSON.stringify(after.pose.foot)!==JSON.stringify(before.pose.foot)){await sleep(150);assert.deepEqual((await observe(page)).pose.foot,after.pose.foot,'Key release must stop');return after}}throw Error('Destination keyboard did not move')}
async function pixels(page){return page.locator('[data-native-view]').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();let opaque=0;for(let i=0;i<a.length;i+=64){if(a[i+3])opaque++;colors.add(a[i]+','+a[i+1]+','+a[i+2])}return{width:c.width,height:c.height,opaque,colors:colors.size}})}
try{
 assert(process.getuid?.()!==0,'Runner must not be root');server=spawn(process.execPath,['tools/portable-native/serve.mjs'],{stdio:['ignore','pipe','pipe']});server.on('error',e=>report.errors.push('SERVER:'+e.code));let available=false;for(let i=0;i<100;i++){try{if((await fetch(ORIGIN)).ok){available=true;break}}catch{}await sleep(100)}assert(available,'Server unavailable');
 browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true,args:['--enable-automation']});const cdp=await browser.newBrowserCDPSession();assertSandboxCommand((await cdp.send('Browser.getBrowserCommandLine')).arguments);await cdp.detach();
 const proof=await browser.newContext();const diagnostic=await proof.newPage();await diagnostic.goto('chrome://sandbox');const body=await diagnostic.locator('body').innerText();assert(sandboxEvidence(body),'Sandbox proof failed');report.sandbox={version:browser.version(),body};await proof.close();
 for(const map of ['S7','S8']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',acceptDownloads:false,reducedMotion:'reduce'});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===ORIGIN||u.protocol==='data:'||u.protocol==='blob:')return route.continue();report.errors.push('EXTERNAL_BLOCKED:'+u.origin+u.pathname);return route.abort('blockedbyclient')});await context.routeWebSocket('**/*',s=>{report.errors.push('WEBSOCKET_BLOCKED');s.close()});
  context.on('page',page=>{page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push('PAGE:'+e.message.slice(0,400)));page.on('console',m=>{if(m.type()==='error')report.errors.push('CONSOLE:'+m.text().slice(0,400))});page.on('response',r=>{if(new URL(r.url()).origin===ORIGIN&&r.status()>=400)report.errors.push('HTTP:'+r.status()+':'+new URL(r.url()).pathname)});page.on('requestfailed',r=>report.errors.push('REQUEST:'+new URL(r.url()).pathname))});
  const page=await context.newPage();await page.goto(ORIGIN);assert.notEqual(await page.locator('#native-root').getAttribute('data-ready'),'true');assert.equal(await page.locator('[data-checkpoint-save],[data-checkpoint-load]').count(),2);await page.locator('#qa-map').selectOption(map);await page.locator('#qa-appearance').selectOption('girl');await page.locator('#qa-consent').check();await page.locator('#start-qa').click();await page.locator('#native-root[data-ready="true"]').waitFor({timeout:180000});assert((await page.locator('#bootstrap-status').innerText()).includes('레벨100'));assert.equal((await observe(page)).checkpointSupported,false);
  const sequence=map==='S7'?['S7_S6','S6_S7','S7_S6','S6_S7']:['S8_GYM8','GYM8_S8','S8_GYM8','GYM8_S8'];
  // Enter the first port with genuine off-anchor keyboard movement, never pose mutation.
  await moveProof(page,'ArrowRight');
  for(let i=0;i<sequence.length;i++){
   const id=sequence[i],before=await approach(page,id),start=performance.now();await page.locator('[data-warp-go]').click();await page.waitForFunction(target=>{const e=document.querySelector('[data-dev-observer]');try{return JSON.parse(e.textContent).pose.mapId===target&&document.querySelector('[data-warp-status]').textContent.includes('도착 화면과 이동 입력 준비 완료')}catch{return false}},targets[id]);
   const readyWallMs=performance.now()-start,after=await observe(page);assert.equal(after.ownerOrdinal,before.ownerOrdinal);assert.equal(after.resourceGeneration,before.resourceGeneration+1);assert.equal(after.journalCount,before.journalCount+1);assert.equal(after.checkpointSupported,false);assert.equal(after.ui.phase,'field');const canvas=await pixels(page);assert(canvas.opaque>100&&canvas.colors>20,'Destination blank');
   const rafMs=await page.evaluate(()=>new Promise(resolve=>{const t=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-t)))}));
   const timing=JSON.parse(await page.locator('[data-warp-timing]').textContent()),record=timing.records.at(-1);assertTiming(record,before.pose.mapId,targets[id]);assert.equal(timing.physicalDisplayTimingClaim,false);
   const inputKey=id==='S7_S6'?'ArrowDown':id==='S6_S7'?'ArrowLeft':id==='S8_GYM8'?'ArrowRight':'ArrowUp';await moveProof(page,inputKey);
   report.warps.push({id,visit:i<2?'first-visit':'repeat-visit',cacheClaim:'none; static server Cache-Control no-store',sourceFoot:before.pose.foot,targetFoot:after.pose.foot,readyWallMs,timingRecord:record,twoAnimationFramesMs:rafMs,physicalPaintClaim:false,keyboardInput:true,keyReleaseStops:true,sameOwner:true,canvas});
  }
  report.crossFeatures.push(await memoryRoundTrip(page,{moveProof:()=>moveProof(page,'ArrowRight')}));
  if(map==='S7'){
   report.crossFeatures.push(await walkVisibleWaypoints(page,{mapId:'world:hub:S7',waypoints:[{foot:[780,770],tolerance:6},{foot:[780,1278],tolerance:6},{foot:[714,1278],tolerance:6},{foot:[714,1322],tolerance:5}]}));
   const npc={speaker:'조사 보조원',lines:['절벽 쪽 둥지가 걱정돼요.','무슨 일이 있는지 살펴보고 있어요.']};
   report.crossFeatures.push(await visibleDialogue(page,npc));
   report.crossFeatures.push(await memoryRoundTrip(page,{moveProof:()=>moveProof(page,'ArrowUp')}));
   report.crossFeatures.push(await visibleDialogue(page,{...npc,open:'mobile-click'}));
  }
  await page.locator('#stop-qa').click();assert.equal(await page.locator('#native-root').getAttribute('data-ready'),'false');await context.close();
 }
 assert.equal(report.errors.length,0,report.errors.join(';'));report.result='PASS';report.performance={scope:'DEV click through CPU destination draw/input-ready; rAF not physical paint',samples:report.warps.length,averageMs:report.warps.reduce((a,x)=>a+x.timingRecord.durationMs,0)/report.warps.length,maxMs:Math.max(...report.warps.map(x=>x.timingRecord.durationMs)),guarantee:false,byVisit:summarizeVisits(report.warps)};console.log(JSON.stringify(report));
}catch(e){report.result='FAIL';report.reason=String(e.message).slice(0,1000);console.error(JSON.stringify(report));process.exitCode=1}finally{clearTimeout(deadline);await browser?.close().catch(()=>{});server?.kill('SIGTERM')}
