import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const ORIGIN='http://127.0.0.1:5193',base=ORIGIN+'/qa/index.html',hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const stable=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(stable).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
const stateHash=s=>createHash('sha256').update(stable(s)).digest('hex');
const qa=page=>page.locator('#qa-readout').textContent().then(JSON.parse),held=page=>page.locator('#qa-held-status').textContent().then(JSON.parse);
async function ready(page){await page.waitForFunction(()=>!document.querySelector('#step').disabled);assert.equal(await page.locator('.wild-battle-panel').count(),0)}
async function storage(page){return page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)))}
async function exported(page){await ready(page);await page.locator('#export').click();const text=await page.locator('#exchange').inputValue();assert(text.length>1000);return JSON.parse(text).payload.completedSnapshot}
async function canvasPixels(page,selector){return page.locator(selector).evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let opaque=0,unique=new Set();for(let i=0;i<d.length;i+=4){if(d[i+3])opaque++;if(i%1024===0)unique.add(d[i]+','+d[i+1]+','+d[i+2])}return{width:c.width,height:c.height,opaque,colors:unique.size}})}
async function assertBattleLayout(page,label){const layout=await page.locator('.wild-battle-panel').evaluate(panel=>{const b=panel.getBoundingClientRect(),canvas=panel.querySelector('canvas').getBoundingClientRect();return{width:innerWidth,panel:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},canvas:{width:canvas.width,height:canvas.height},cards:[...panel.querySelectorAll('.eco-battle-card')].map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}}),buttons:[...panel.querySelectorAll('.wild-command')].map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,height:r.height,text:e.textContent}})}});assert(layout.panel.left>=0&&layout.panel.right<=layout.width+.5,label+' panel horizontal viewport');assert(layout.canvas.width>=240&&layout.canvas.height>=220);for(const b of layout.buttons){assert(b.left>=layout.panel.left&&b.right<=layout.panel.right+.5,label+' command bounds');assert(b.height>=43,label+' touch height')}for(const c of layout.cards){assert(c.left>=layout.panel.left&&c.right<=layout.panel.right+.5,label+' HUD bounds');assert(c.scrollWidth<=c.clientWidth+1,label+' HUD no horizontal overflow')}const pixels=await canvasPixels(page,'.wild-canvas');assert(pixels.opaque>pixels.width*pixels.height*.98);assert(pixels.colors>20);return{layout,pixels};}
async function focusContained(page){await page.locator('.wild-command:enabled').first().focus();for(let i=0;i<18;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement?.closest('.wild-battle-panel')),'Modal Tab containment')}await page.keyboard.press('Shift+Tab');assert(await page.evaluate(()=>!!document.activeElement?.closest('.wild-battle-panel')));}
async function originalCapturePause(page,label,outputRoot){await page.waitForFunction(()=>document.querySelector('.wild-canvas')?.getAttribute('aria-label')?.includes('포획을 시도'));await page.getByRole('button',{name:'잠시 멈춤',exact:true}).click();await page.waitForFunction(()=>JSON.parse(document.querySelector('#qa-readout').textContent).current.paused);const before=await qa(page),pixels=await page.locator('.wild-canvas').evaluate(c=>c.toDataURL());await page.screenshot({path:outputRoot+'/'+label+'-capture-attempt.png',fullPage:true});await page.waitForTimeout(350);assert.equal(await page.locator('.wild-canvas').evaluate(c=>c.toDataURL()),pixels,'Paused original cue must not advance');assert.equal((await qa(page)).rngCalls,before.rngCalls);assert.equal((await qa(page)).commits.length,before.commits.length);assert.equal(await page.locator('.wild-command:enabled').count(),0);await page.locator('.wild-battle-panel').getByRole('button',{name:'계속하기',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.wild-canvas')?.getAttribute('aria-label')?.includes('포획에 성공'));await page.getByRole('button',{name:'잠시 멈춤',exact:true}).click();await page.screenshot({path:outputRoot+'/'+label+'-capture-success.png',fullPage:true});await page.locator('.wild-battle-panel').getByRole('button',{name:'계속하기',exact:true}).click();}
const expectedRNG={'capture-success':4,'capture-failure':5,flee:3,'no-trigger':1};
const effects=q=>({rngCalls:q.rngCalls,commits:q.commits,battleStarts:q.battleStarts,pendingWrite:q.pendingWrite,lastResult:q.lastResult,errors:q.errors,battle:q.current?.battle});
async function staleClick(page,button,label,report){
 const before=await qa(page),saved=await storage(page);
 const identity=await button.evaluate(b=>({connected:b.isConnected,disabled:b.disabled,action:JSON.parse(b.dataset.action)}));
 assert.equal(identity.connected,false,'Retained original production button must be detached');
 assert.equal(identity.disabled,false,'Retained original handler must not pass only because the DOM button is disabled');
 await button.evaluate(b=>b.click()); // Original production listener; no World, facade or stamp access.
 await page.waitForTimeout(150);
 assert.deepEqual(effects(await qa(page)),effects(before),label+' stale handler must not mutate RNG/commit/battle/party/result/ball');
 assert.deepEqual(await storage(page),saved,label+' stale handler must not write storage');
 report.milestones.push({kind:'stale-production-button-rejected',label,action:identity.action,originalDetachedEnabledButton:true,unchangedRNG:true,unchangedCommits:true,unchangedBattleDigest:true,unchangedStorage:true,unchangedFinalResult:true});
}
function completion(q,initial,scenario){
 assert.equal(q.rngCalls,expectedRNG[scenario],'Exact final RNG count');
 assert.equal(q.battleStarts,scenario==='no-trigger'?0:1);
 assert.equal(q.commits.length,3);
 assert.deepEqual(q.commits.map(x=>x.revision),[initial.revision+1,initial.revision+2,initial.revision+3]);
 assert.deepEqual(q.errors,[],'No source or presentation error occurred');
 assert.equal(q.pendingWrite,false);
 assert.equal(q.current.fieldReady,true);
 assert(q.lastResult,'Final read-only owner result must survive field release');
 assert.equal(q.lastResult.owner,1);
 assert.equal(q.lastResult.sourceSettled,true);
 assert.equal(q.lastResult.visualSettled,true);
 assert.equal(q.lastResult.tailTimedOut,false,'Ordinary presentation tail must finish without timeout');
 assert.equal(q.lastResult.revision,initial.revision+3);
 assert.equal(q.lastResult.outcome,scenario==='capture-success'?'captured':scenario==='no-trigger'?null:'fled');
 assert.deepEqual(q.lastResult.position,{scene:initial.position.scene,x:264,y:456,facing:'up'});
}
export async function wildFlow({context,newPage,report,diagnostics,outputRoot,scenario='capture-success',narrow=false,reducedMotion=false}){
 assert(Object.hasOwn(expectedRNG,scenario));
 const label=scenario+(narrow?'-narrow':'-wide');let page=await newPage(),assetEvidence=null,surface=null;const retained=[];
 diagnostics.mark(page,label+'-source-fixture');await page.goto(base+'?scenario='+scenario);assert.deepEqual(await storage(page),{});
 await page.locator('#start').click();await ready(page);const initial=await exported(page);
 assert.deepEqual(initial.position,{scene:'world:area:S8_JISEPO_HARBOR',x:264,y:504,facing:'right'});
 assert.equal(initial.world.spatialMode.profileRevision,'2c0b77a670e5e9db6050c726344e4bc3a7f55762badaa5970717a7adb6a46c5f');
 assert.equal((await qa(page)).rngCalls,0);assert.equal((await qa(page)).commits.length,0);
 await page.locator('#field').focus();await page.keyboard.down('ArrowUp');
 try{
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#qa-held-status').textContent).accepted===1);
  if(scenario==='no-trigger'){
   await ready(page);const q=await qa(page);assert.equal(q.battleStarts,0);assert.equal(q.rngCalls,1);assert.equal(q.commits.length,3);
  }else{
   await page.waitForFunction(()=>[...document.querySelectorAll('.wild-command')].some(b=>!b.disabled));
   const entered=await qa(page);assert.equal(entered.battleStarts,1);assert.equal(entered.rngCalls,3);assert.equal(entered.commits.length,2);assert.equal(entered.current.battle.phase,'turn');assert.equal(await page.locator('#save').isDisabled(),true);
   await diagnostics.flush();assetEvidence=diagnostics.evidence(page);assert.equal(assetEvidence.verifiedArtwork.length,10,'Exact original party/table/background/portrait closure');
   surface=await assertBattleLayout(page,label);await page.screenshot({path:outputRoot+'/'+label+'-battle.png',fullPage:true});await focusContained(page);
   await page.keyboard.press('ArrowLeft');assert.equal((await qa(page)).commits.length,2);assert.equal((await qa(page)).rngCalls,3);
   // Retain the enabled real capture button, then invalidate its epoch solely through visible pause/resume controls.
   const stale=await page.locator('.wild-command').filter({hasText:'생태볼'}).first().elementHandle();assert(stale);retained.push(stale);
   await page.getByRole('button',{name:'잠시 멈춤',exact:true}).click();
   await page.waitForFunction(()=>JSON.parse(document.querySelector('#qa-readout').textContent).current.paused);
   await page.locator('.wild-battle-panel').getByRole('button',{name:'계속하기',exact:true}).click();
   await page.waitForFunction(()=>[...document.querySelectorAll('.wild-command')].some(b=>!b.disabled&&JSON.parse(b.dataset.action).type==='capture'));
   await staleClick(page,stale,label+'-after-pause-resume',report);
   assert.equal((await qa(page)).rngCalls,3);assert.equal((await qa(page)).commits.length,2);
   if(scenario==='capture-success'||scenario==='capture-failure'){
    const ball=page.locator('.wild-command').filter({hasText:'생태볼'}).first();const used=await ball.elementHandle();assert(used);retained.push(used);
    if(narrow)await ball.tap();else await ball.click();
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#qa-readout').textContent).current.battle.captureEvents.length===1);
    const captured=await qa(page);assert.equal(captured.current.battle.ball,initial.inventory.ecology_ball-1);assert.equal(captured.current.battle.captureEvents[0].success,scenario==='capture-success');assert.equal(await page.locator('.wild-command:enabled').count(),0);
    if(scenario==='capture-success'){
     assert.equal(captured.current.battle.outcome,'captured');if(!reducedMotion)await originalCapturePause(page,label,outputRoot);
     await page.waitForFunction(()=>{const q=JSON.parse(document.querySelector('#qa-readout').textContent);return q.pendingWrite&&q.current.visualSettled},{},{timeout:20000});
     const heldState=await qa(page);assert.equal(heldState.current.sourceSettled,false);assert.equal(heldState.current.fieldReady,false);assert.equal(heldState.current.tailTimedOut,false);assert.deepEqual(heldState.errors,[]);assert.equal(heldState.commits.length,3);assert.equal(heldState.rngCalls,4);assert.equal(await page.locator('#step').isDisabled(),true);assert.equal(await page.locator('#export').isDisabled(),true);
     await staleClick(page,used,label+'-visual-settled-source-ack-held',report);
     await page.locator('.wild-battle-panel [data-qa-release]').click();
    }else{
     await page.waitForFunction(()=>[...document.querySelectorAll('.wild-command')].some(b=>!b.disabled&&JSON.parse(b.dataset.action).type==='flee'));
     const afterEnemy=await qa(page);assert.equal(afterEnemy.rngCalls,5);assert(afterEnemy.current.battle.eventTypes.slice(afterEnemy.current.battle.eventTypes.indexOf('capture')+1).some(t=>['move','damage','miss'].includes(t)),'Original enemy response after failed capture');
     await staleClick(page,used,label+'-after-failed-capture-and-enemy-response',report);
     await page.screenshot({path:outputRoot+'/'+label+'-failed-capture.png',fullPage:true});
     const flee=page.getByRole('button',{name:'도망가기',exact:true});const usedFlee=await flee.elementHandle();assert(usedFlee);retained.push(usedFlee);await flee.click();
    }
   }else{
    const flee=page.getByRole('button',{name:'도망가기',exact:true});const used=await flee.elementHandle();assert(used);retained.push(used);await flee.click();
   }
  }
  // Every scenario, including no-trigger, reaches this common completed-state and persistence path.
  await ready(page);const done=await qa(page);completion(done,initial,scenario);assert.equal((await held(page)).accepted,1);
  assert.equal(await page.locator('#field').evaluate(e=>document.activeElement===e),true,'Field focus after both latches and verified frame');
  const complete=await exported(page);assert.equal(complete.sessionId,initial.sessionId);assert.equal(complete.revision,initial.revision+3);
  assert.deepEqual(complete.position,done.lastResult.position);assert.equal(stateHash(complete),done.commits.at(-1).sha256,'Full committed draft matches completed exported state');
  assert.equal(complete.inventory.ecology_ball,initial.inventory.ecology_ball-(scenario.startsWith('capture')?1:0));assert.equal(complete.party.length,initial.party.length+(scenario==='capture-success'?1:0));
  if(scenario==='capture-success')assert(complete.party.at(-1).instanceId&&!initial.party.some(m=>m.instanceId===complete.party.at(-1).instanceId));
  if(scenario==='no-trigger')assert.deepEqual(complete.party,initial.party);
  for(const [i,button] of retained.entries())await staleClick(page,button,label+'-after-settlement-'+i,report);
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(300);completion(await qa(page),initial,scenario);assert.equal((await held(page)).accepted,1,'Held/repeated key must not move after field return');
  assert.deepEqual(await exported(page),complete,'Stale buttons and held input preserve full completed state');
  report.milestones.push({kind:scenario==='no-trigger'?'real-held-shore-no-trigger':'real-held-shore-wild-source-completion',label,sourceThreeCommits:true,sourceOwnerCount:done.owners,battleStarts:done.battleStarts,rng:done.rngCalls,releaseCount:done.releaseCount,fullStateDigest:stateHash(complete),sessionId:complete.sessionId,assetEvidence,capturedInstanceId:scenario==='capture-success'?complete.party.at(-1).instanceId:null,surface,heldInputCleared:true,finalResult:done.lastResult,ordinaryTailWithoutTimeout:true,noPresentationErrors:true,originalCaptureMotifs:scenario==='capture-success'&&!reducedMotion?'attempt-and-success-canvas-label-and-screenshots':'not asserted in this case',sourceVisualLatch:scenario==='capture-success'?'visual-first-source-held-until-visible-QA-release':'normal-source-and-visual-completion'});
  await page.keyboard.up('ArrowUp');await page.locator('#save').click();await ready(page);completion(await qa(page),initial,scenario);
  await page.locator('#export').click();const text=await page.locator('#exchange').inputValue();assert.deepEqual(JSON.parse(text).payload.completedSnapshot,complete);
  await page.locator('#import').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('별도 슬롯'));completion(await qa(page),initial,scenario);
  await page.locator('#load2').click();await ready(page);assert.deepEqual(await exported(page),complete);completion(await qa(page),initial,scenario);
  assert.equal((await qa(page)).owners,2);
  for(const [i,button] of retained.entries())await staleClick(page,button,label+'-after-original-owner-disposal-'+i,report);
  completion(await qa(page),initial,scenario);assert.deepEqual(await exported(page),complete);
  const saved=await storage(page);for(const button of retained)await button.dispose();retained.length=0;
  await diagnostics.flush();diagnostics.closing(page,label+'-cold-close');await page.close();
  page=await newPage();diagnostics.mark(page,label+'-cold');await page.goto(base+'?scenario='+scenario);assert.deepEqual(await storage(page),saved);
  await page.locator('#cold').click();await ready(page);assert.deepEqual(await exported(page),complete);assert.deepEqual(await storage(page),saved);
  const cold=await qa(page);assert.equal(cold.rngCalls,0);assert.equal(cold.battleStarts,0);assert.equal(cold.commits.length,0);assert.equal(cold.owners,2);assert.deepEqual(cold.errors,[]);assert.equal(cold.lastResult,null);
  report.milestones.push({kind:'whole-save-new-owner-cold-document',label,fullStateDigest:stateHash(complete),rawStorageDigest:hash(saved),exactPreColdRNG:expectedRNG[scenario],zeroColdRNG:true,zeroColdWrites:true,storageUnchanged:true,canonicalExportBytes:text.length,deviceDurability:false});
 }finally{
  for(const button of retained)await button.dispose().catch(()=>{});
  await page.keyboard.up('ArrowUp').catch(()=>{});if(!page.isClosed()){await diagnostics.flush();diagnostics.closing(page,label+'-final-close');await page.close()}
 }
}
