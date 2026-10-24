import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createRegionEntryPopup} from '../dist/ui/region-entry-popup.mjs';
import {popupTimers} from './helpers/region-popup-timers.mjs';
import {installNearbySafeBand} from '../docs/nearby-safe-band.mjs';
const {parseHTML}=createRequire(import.meta.url)('linkedom');
const shell=readFileSync(new URL('../docs/assets/mobile-viewport-CKi2spbv.js',import.meta.url),'utf8');
// Execute the exact pinned shell's synchronous install/update path. Rendering and
// element rects are mocked, so this is DOM ownership proof, not visual device QA.
const installShell=Function(shell.slice(0,shell.indexOf('typeof document<'))+';return s;')();
function fixture(html){
 const {document,window}=parseHTML('<html><body>'+html+'</body></html>'),frames=[];
 window.HTMLElement.prototype.getBoundingClientRect=function(){return {width:960,height:this.classList.contains('shared-shell-header')?83:this.classList.contains('shared-shell-dock')?150:640,top:0,left:0,right:960,bottom:640}};
 window.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};window.cancelAnimationFrame=()=>{};window.innerWidth=960;window.innerHeight=800;
 const timers=popupTimers();return {document,window,timers,frames};
}
test('pinned canonical shell owns reparenting; popup uses one header node and never enters the 44px band or scene',async()=>{
 const f=fixture('<main id="canonical-world" class="ordinary-world"><h1>생태몬</h1><p>안내</p><div data-w="location">고현</div><output data-w="status"></output><div class="world-layout"><section class="world-play"><canvas data-w="field"></canvas><section data-w="dialogue" hidden><p>대화</p><button>계속</button></section><div class="world-touch"></div><div data-w="choices"><button>연구소</button></div></section><aside hidden></aside></div></main>');
 const target=f.document.querySelector('[data-w=location]'),popup=createRegionEntryPopup({...f,...f.timers,target});popup.update({key:'world:hub:S4',label:'고현'});const shellOwner=installShell(f.document,f.window),band=installNearbySafeBand(f);
 const root=f.document.getElementById('canonical-world'),header=root.querySelector('.shared-shell-header'),scene=root.querySelector('.shared-shell-scene'),near=root.querySelector('[data-w=choices]');
 assert.equal(target.parentElement,header);assert.equal(near.parentElement,header);assert.equal(near.classList.contains('qa-safe-nearby-band'),true);assert.equal(scene.contains(target),false);assert.equal(near.contains(target),false);assert.equal(root.querySelectorAll('.eco-region-popup').length,1);
 f.timers.advance(3180);assert.equal(target.dataset.regionState,'idle');assert.equal(target.hidden,false);assert.equal(target.parentElement,header);assert.equal(near.querySelector('button').textContent,'연구소');assert.equal(scene.querySelector('canvas').getAttribute('data-w'),'field');
 popup.dispose();band.dispose();shellOwner.destroy();
});
test('pinned opening shell moves the same transient place node out of scene pixels without duplication',()=>{
 const f=fixture('<dialog id="modal" class="opening-screen" open><div id="modal-content"><div class="modal-inner"><h2 id="modal-title">고현 마을</h2><div class="opening-frame opening-world"><canvas id="opening-world"></canvas><span class="opening-place">고현 마을</span><div class="opening-map-controls"></div><button class="opening-help">도움말</button></div></div></div><div class="dialog-controls"></div></dialog>');
 const target=f.document.querySelector('.opening-place'),popup=createRegionEntryPopup({...f,...f.timers,target});popup.update({key:'opening:town',label:'고현 마을'});const owner=installShell(f.document,f.window);assert.equal(target.parentElement.className,'shared-shell-header');assert.equal(target.textContent,'고현 마을');assert.equal(f.document.querySelector('.shared-shell-scene').contains(target),false);assert.equal(f.document.querySelectorAll('.eco-region-popup').length,1);popup.dispose();owner.destroy();
});
test('pinned CSS continues to reserve exactly 44px; popup has no geometry/fit override for the band',()=>{
 const css=readFileSync(new URL('../docs/nearby-safe-band-ordinary.css',import.meta.url),'utf8'),popup=readFileSync(new URL('../dist/ui/region-entry-popup.css',import.meta.url),'utf8');assert.match(css,/height:44px;min-height:44px;max-height:44px/);assert.match(css,/position:relative;inset:auto;transform:none/);assert.doesNotMatch(popup,/--shell-scene|--shell-dock|\.qa-safe-nearby-band\s*\{/);
});
