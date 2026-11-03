import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright-core';
import {ORIGIN,classifyRequest,footFromStatus,assertSandboxCommand,sandboxEvidence} from './guards.mjs';
assert(process.getuid?.()!==0,'Runner must not be root');
let browser,server;const report={kind:'bounded-real-Chrome-smoke',ordinary:'not-run',walk:[],optionalExternalBlocked:0,unexpectedExternalBlocked:0,consoleErrors:0,pageErrors:0,requiredNetworkFailures:0};
const failures=[];let serverTail='';
const guard=setTimeout(()=>{console.error('SMOKE_TIMEOUT');process.exitCode=1;browser?.close().catch(()=>{});server?.kill('SIGTERM')},240000);
async function canvasProof(page,selector){return page.locator(selector).evaluate(c=>{const g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data,colors=new Set();let opaque=0;for(let i=0;i<d.length;i+=64){if(d[i+3])opaque++;colors.add([d[i],d[i+1],d[i+2]].join(','))}return{width:c.width,height:c.height,opaque,colors:colors.size}})}
async function ready(page,map){await page.waitForFunction(m=>document.querySelector('#status')?.textContent.startsWith(m+' 이동 검수 · 발 위치 '),map,{timeout:45000});const t=await page.locator('#status').innerText();return footFromStatus(t,map)}
try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:['ignore','pipe','pipe']});server.on('error',e=>failures.push('server:'+e.code));for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{serverTail=(serverTail+b).slice(-2000)});
 let available=false;for(let n=0;n<100;n++){if(server.exitCode!==null)throw Error('Vite exited');try{const r=await fetch(ORIGIN+'/wtstgj/');if(r.ok){available=true;break}}catch{}await sleep(100)}assert(available,'Local server unavailable');
 browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true,args:['--enable-automation']});
 const session=await browser.newBrowserCDPSession();const command=await session.send('Browser.getBrowserCommandLine');assertSandboxCommand(command.arguments);await session.detach();
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:false});
 const sandbox=await context.newPage();await sandbox.goto('chrome://sandbox');assert(sandboxEvidence(await sandbox.locator('body').innerText()),'Chrome sandbox proof unavailable');await sandbox.close();report.sandbox='namespace-or-suid AND seccomp-bpf active';report.browserVersion=browser.version();
 await context.route('**/*',async route=>{const q=route.request(),kind=classifyRequest(q.url(),q.method());if(kind==='local'||kind==='inline')return route.continue();if(kind==='optional-weather-blocked')report.optionalExternalBlocked++;else{report.unexpectedExternalBlocked++;failures.push('Unexpected external request blocked')}return route.abort('blockedbyclient')});
 await context.routeWebSocket('**/*',socket=>{const u=new URL(socket.url());if(u.hostname==='127.0.0.1'&&u.port==='4173')socket.connectToServer();else{report.unexpectedExternalBlocked++;failures.push('External websocket blocked');socket.close()}});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',()=>{report.pageErrors++;failures.push('Uncaught page error')});
 page.on('console',msg=>{if(msg.type()==='error'){report.consoleErrors++;failures.push('Browser console error')}});
 page.on('response',r=>{if(new URL(r.url()).origin===ORIGIN&&r.status()>=400){report.requiredNetworkFailures++;failures.push('Local HTTP '+r.status()+' '+new URL(r.url()).pathname)}});
 page.on('requestfailed',r=>{if(classifyRequest(r.url(),r.method())==='local'){report.requiredNetworkFailures++;failures.push('Local request failed '+new URL(r.url()).pathname)}});
 await page.goto(ORIGIN+'/wtstgj/',{waitUntil:'load'});
 await page.locator('#title-start').click();await page.locator('#new-start').click();await page.locator('[data-slot="SLOT_1"]').click();await page.locator('#help-close').click();
 for(let i=0;i<20&&!await page.locator('#avatar-next').isVisible();i++){await page.locator('.opening-frame').click();await sleep(80)}
 await page.locator('[data-gender="girl"]').click();await page.locator('#avatar-next').click();await page.locator('#name-input').fill('SMOKE');await page.locator('#name-submit').click();
 for(let i=0;i<4&&!await page.locator('#opening-world').isVisible();i++){await page.locator('.opening-frame').click();await sleep(80)}
 await page.locator('#opening-world').waitFor({state:'visible'});const intro=await canvasProof(page,'#opening-world');assert(intro.opaque>100&&intro.colors>20,'Ordinary opening canvas blank');assert.equal(await page.locator('#name-error').count(),0);report.ordinary={phase:'real menu/empty slot/girl/name/opening room render',canvas:intro,fullStory:false,canonicalPartnerCreation:false};
 await page.goto(ORIGIN+'/wtstgj/native-walk.html',{waitUntil:'load'});
 for(const map of ['S7','S8']){const started=performance.now();if(map==='S8')await page.locator('#map').selectOption('S8');const start=await ready(page,map);const selectionMs=performance.now()-started;const pixels=await canvasProof(page,'#view');assert(pixels.opaque>100&&pixels.colors>20,'Walk canvas blank');await page.locator('#view').focus();let moved=false;
  for(const key of ['ArrowLeft','ArrowRight','ArrowDown','ArrowUp']){await page.keyboard.down(key);await sleep(160);await page.keyboard.up(key);await sleep(80);if(JSON.stringify(await ready(page,map))!==JSON.stringify(start)){moved=true;break}}assert(moved,map+' real keyboard input did not move');
  const released=await ready(page,map);await sleep(250);assert.deepEqual(await ready(page,map),released,'Movement continued after key release');await page.locator('#reset').click();await page.waitForFunction(({map,start})=>document.querySelector('#status')?.textContent.includes(map+' 이동 검수 · 발 위치 '+start.join(', ')),{map,start});assert.deepEqual(await ready(page,map),start);report.walk.push({map,selectionMs,metric:'map-selection preparation, NOT canonical warp',keyboardMoved:true,keyReleaseStopped:true,reset:true,canvas:pixels});
 }
 assert.equal(failures.length,0,failures.join('; '));report.result='PASS';console.log(JSON.stringify(report));
}catch(e){report.result='FAIL';report.reason=String(e.message).slice(0,700);report.failures=failures;console.error(JSON.stringify(report));process.exitCode=1}
finally{clearTimeout(guard);await browser?.close();if(server&&server.exitCode===null){server.kill('SIGTERM');await Promise.race([once(server,'exit'),sleep(3000)]);if(server.exitCode===null)server.kill('SIGKILL')}}
