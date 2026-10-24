import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createRegionEntryPopup} from '../dist/ui/region-entry-popup.mjs';
import {createIntroWorld,moveIntroWorld,inspectIntroWorld,INTRO_SCENE_LABELS} from '../dist/intro-scene.mjs';
import {createDirectionInput,clearDirections,pressDirection,releaseDirection} from '../dist/movement.mjs';
import {popupTimers} from './helpers/region-popup-timers.mjs';
const require=createRequire(import.meta.url),{parseHTML}=require('linkedom'),ts=require('typescript');
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),parsed=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['startHomeScene','renderOpeningWorld','openingMoveDirection','openingInspect','clearOpeningInput','releaseOpeningInput','showOpeningScreen','showHelp','closeHelp','cancelCanonicalStarterSelection'];
const actual=names.map(name=>{const fn=parsed.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(fn,name);return fn.getText(parsed)}).join('\n');
function fixture(){
 const {document,window}=parseHTML('<html><body><dialog id="modal"></dialog><dialog id="help-modal"></dialog><button id="install-app"></button></body></html>');
 let visibility='visible';Object.defineProperty(document,'visibilityState',{get:()=>visibility});window.HTMLElement.prototype.focus=function(){};
 for(const d of document.querySelectorAll('dialog')){d.open=false;d.showModal=()=>d.open=true;d.close=()=>d.open=false}
 const timers=popupTimers(),frames=[],bindings={document,window,createRegionEntryPopup:options=>createRegionEntryPopup({...options,...timers,reducedMotion:()=>false}),createIntroWorld,moveIntroWorld,inspectIntroWorld,INTRO_SCENE_LABELS,createDirectionInput,clearDirections,pressDirection,releaseDirection,
  drawIntroWorld(){},performance:{now:()=>timers.now},requestAnimationFrame:fn=>frames.push(fn),clearInterval(){},clearTimeout(){},toast(){}};
 const state=`const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)],esc=v=>String(v);
 const modal=$('#modal');let ordinaryNew=true,gender='boy',playerName='누리',openingWorld=null,openingRegionPopup=null,openingMoving=false,openingQueuedDirection=null,openingHeldDirection=null,openingAdvance=null,openingBack=null,openingTyping=null,bootTimer=null,backAction=null,helpFocus=null,helpReturn=null,goldenField=null,state=null,moveTarget=null;
 const directionInput=createDirectionInput(),openingDirectionInput=createDirectionInput();
 function showModal(title,body){modal.innerHTML=body;modal.open=true}
 function setupStarter(){showOpeningScreen('첫 파트너','<button>파트너 선택</button>','starter')}
 `;
 const app=Function(...Object.keys(bindings),state+'\n'+actual+`\nreturn {start:startHomeScene,render:renderOpeningWorld,move:openingMoveDirection,inspect:openingInspect,clear:clearOpeningInput,showScreen:showOpeningScreen,help:showHelp,closeHelp,backFromStarter:cancelCanonicalStarterSelection,
 advance:()=>openingAdvance?.(),get world(){return openingWorld},get popup(){return openingRegionPopup},setPosition(x,y){Object.assign(openingWorld,{x,y})}};`)(...Object.values(bindings));
 return {app,timers,document,window,phase:()=>document.querySelector('.opening-place')?.dataset.regionState,text:()=>document.querySelector('.opening-place')?.textContent,
  visibility(value){visibility=value;document.dispatchEvent(new window.Event('visibilitychange'))},event(type,persisted){const e=new window.Event(type);e.persisted=persisted;window.dispatchEvent(e)},flushFrame(){const batch=frames.splice(0);timers.advance(200);for(const fn of batch)fn(timers.now)}};
}

test('actual opening entry and room/home/town/lab transitions use their authored labels once',()=>{
 const f=fixture();f.app.start();assert.equal(f.phase(),'visible');assert.equal(f.text(),INTRO_SCENE_LABELS.room);
 f.timers.advance(2700);f.app.advance();assert.equal(f.phase(),'visible');assert.equal(f.timers.all.size,1,'arrival dialogue dismissal must not restart timer');f.timers.advance(480);assert.equal(f.phase(),'idle');
 for(const [x,y,dir,scene] of [[7,7,'down','home'],[7,7,'down','town'],[7,4,'up','lab']]){f.app.setPosition(x,y);f.app.move(dir);assert.equal(f.app.world.scene,scene);assert.equal(f.phase(),'visible');assert.equal(f.text(),INTRO_SCENE_LABELS[scene]);f.app.advance()}
 f.app.setPosition(7,8);f.app.move('down');assert.equal(f.app.world.scene,'town');assert.equal(f.text(),'고현 마을');assert.equal(f.phase(),'visible');f.app.clear();assert.equal(f.timers.pending.size,0);
});
test('actual same-place inspection hides without repeating and ordinary movement does not renew',()=>{
 const f=fixture();f.app.start();f.app.advance();const initial=f.timers.all.size;f.app.move('down');f.flushFrame();assert.equal(f.timers.all.size,initial);f.app.inspect();assert.equal(f.phase(),'idle');f.app.advance();assert.equal(f.phase(),'idle');f.app.render();assert.equal(f.phase(),'idle');f.app.clear();
});
test('actual Help and starter/menu Back do not resurrect old labels',()=>{
 const f=fixture();f.app.start();f.app.advance();f.app.help();assert.equal(f.phase(),'idle');f.app.closeHelp();f.app.render();assert.equal(f.phase(),'idle');
 f.app.showScreen('메뉴','<p>메뉴</p>','menu');f.app.render();assert.equal(f.phase(),'idle');
 f.app.setPosition(7,7);f.app.move('down');f.app.advance();f.app.setPosition(7,7);f.app.move('down');f.app.advance();f.app.setPosition(7,4);f.app.move('up');f.app.advance();assert.equal(f.app.world.scene,'lab');f.app.setPosition(7,5);f.app.inspect();assert.equal(f.phase(),undefined);assert.equal(f.app.backFromStarter(),true);assert.equal(f.phase(),'idle');f.app.clear();
});
test('opening visibility, BFCache Back, title reset and final pagehide clear all timers',()=>{
 const f=fixture();f.app.start();const stale=[...f.timers.all.values()][0].fn;f.visibility('hidden');f.visibility('visible');f.app.render();assert.equal(f.phase(),'idle');f.event('pagehide',true);f.event('pageshow',true);f.app.render();assert.equal(f.phase(),'idle');stale();assert.equal(f.phase(),'idle');
 f.app.clear();f.app.start();assert.equal(f.phase(),'visible');f.event('pagehide',false);stale();assert.equal(f.phase(),'idle');assert.equal(f.timers.pending.size,0);f.app.clear();
});
