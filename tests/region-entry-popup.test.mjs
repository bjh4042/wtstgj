import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createRegionEntryPopup,REGION_POPUP_HOLD_MS,REGION_POPUP_FADE_MS} from '../dist/ui/region-entry-popup.mjs';
import {popupTimers} from './helpers/region-popup-timers.mjs';
import {createWorldDefinition} from '../dist/world/definition.mjs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {loadCanonical20260927Adapter} from '../dist/compatibility/canonical-20260927-adapter.mjs';
import {mergeApprovedGameplayRelease} from '../dist/compatibility/approved-latest-runtime-adapter.mjs';
import {INTRO_SCENE_LABELS} from '../dist/intro-scene.mjs';
const {parseHTML}=createRequire(import.meta.url)('linkedom');
function fixture({reduced=false}={}){
 const {document,window}=parseHTML('<html><body><header><div id="location"></div></header></body></html>');
 let visibility='visible';Object.defineProperty(document,'visibilityState',{get:()=>visibility});
 const target=document.getElementById('location'),timers=popupTimers(),popup=createRegionEntryPopup({target,document,window,...timers,reducedMotion:()=>reduced});
 return {target,timers,popup,document,window,update:(key='room',label='내 방',fieldVisible=true)=>popup.update({key,label,fieldVisible}),phase:()=>target.dataset.regionState,
  visibility(value){visibility=value;document.dispatchEvent(new window.Event('visibilitychange'))},event(type,persisted){const e=new window.Event(type);e.persisted=persisted;window.dispatchEvent(e)}};
}

test('three-second hold then bounded fade; hidden state retains target content and geometry hook',()=>{
 const f=fixture();assert.equal(REGION_POPUP_HOLD_MS,3000);assert.equal(REGION_POPUP_FADE_MS,180);assert.equal(f.update(),true);
 assert.equal(f.phase(),'visible');assert.equal(f.target.textContent,'내 방');assert.equal(f.target.hidden,false);
 f.timers.advance(2999);assert.equal(f.phase(),'visible');f.timers.advance(1);assert.equal(f.phase(),'fading');
 f.timers.advance(179);assert.equal(f.phase(),'fading');f.timers.advance(1);assert.equal(f.phase(),'idle');assert.equal(f.target.hidden,false);assert.equal(f.target.textContent,'내 방');assert.equal(f.timers.pending.size,0);f.popup.dispose();
});
test('movement, interaction and rerender in same map never restart its timer',()=>{
 const f=fixture();f.update();f.timers.advance(2100);for(let i=0;i<50;i++)assert.equal(f.update(),false);
 assert.equal(f.timers.all.size,1);f.timers.advance(900);assert.equal(f.phase(),'fading');f.popup.dispose();
});
test('rapid map transitions cancel timers and late callbacks cannot hide the newest place',()=>{
 const f=fixture();f.update();const old=[...f.timers.all.values()][0].fn;f.timers.advance(700);f.update('home','우리 집 1층');
 assert.equal(f.timers.pending.size,1);old();assert.equal(f.phase(),'visible');assert.equal(f.target.textContent,'우리 집 1층');
 f.timers.advance(3000);const staleFade=[...f.timers.all.values()].at(-1).fn;assert.equal(f.phase(),'fading');f.update('town','고현 마을');staleFade();assert.equal(f.phase(),'visible');assert.equal(f.target.textContent,'고현 마을');f.popup.dispose();
});
test('same label in distinct maps is still a real entry; repeated same map is not',()=>{
 const f=fixture();f.update('a','거제 생태센터');assert.equal(f.update('b','거제 생태센터'),true);assert.equal(f.update('b','거제 생태센터'),false);f.popup.dispose();
});
test('menu/dialogue/battle suppression consumes changed keys and never replays on close',()=>{
 const f=fixture();f.update();f.update('room','내 방',false);assert.equal(f.phase(),'idle');assert.equal(f.timers.pending.size,0);
 f.update('room','내 방',true);assert.equal(f.phase(),'idle');f.update('lab','거제 생태 연구소',false);f.update('lab','거제 생태 연구소');assert.equal(f.phase(),'idle');
 f.update('town','고현 마을');assert.equal(f.phase(),'visible');f.popup.dispose();
});
test('tab hiding clears without replay, and hidden entries do not become stale on resume',()=>{
 const f=fixture();f.update();f.visibility('hidden');assert.equal(f.phase(),'idle');assert.equal(f.timers.pending.size,0);f.update('lab','거제 생태 연구소');f.visibility('visible');f.update('lab','거제 생태 연구소');assert.equal(f.phase(),'idle');f.update('town','고현 마을');assert.equal(f.phase(),'visible');f.popup.dispose();
});
test('BFCache Back cancels without disposing, final pagehide disposes idempotently',()=>{
 const f=fixture();f.update();const stale=[...f.timers.all.values()][0].fn;f.event('pagehide',true);f.event('pageshow',true);f.update();stale();assert.equal(f.phase(),'idle');f.update('town','고현 마을');assert.equal(f.phase(),'visible');f.event('pagehide',false);f.event('pageshow',false);assert.equal(f.update('lab','거제 생태 연구소'),false);assert.equal(f.phase(),'idle');f.popup.dispose();assert.equal(f.timers.pending.size,0);
});
test('reset intentionally begins a new game session, rather than reviving an old timer',()=>{
 const f=fixture();f.update();const stale=[...f.timers.all.values()][0].fn;f.popup.reset();assert.equal(f.update(),true);stale();assert.equal(f.phase(),'visible');f.popup.dispose();
});
test('new opening DOM target inherits the remaining duration, not a fresh notice',()=>{
 const f=fixture();f.update();f.timers.advance(2800);const next=f.document.createElement('span');f.target.replaceWith(next);
 assert.equal(f.popup.update({key:'room',label:'내 방',target:next}),false);assert.equal(next.dataset.regionState,'visible');assert.equal(f.target.dataset.regionState,'idle');
 f.timers.advance(200);assert.equal(next.dataset.regionState,'fading');f.popup.dispose();
});
test('reduced motion preserves three-second readability and omits fade',()=>{
 const f=fixture({reduced:true});f.update();f.timers.advance(2999);assert.equal(f.phase(),'visible');f.timers.advance(1);assert.equal(f.phase(),'idle');assert.equal(f.timers.all.size,1);f.popup.dispose();
});
test('polite, atomic announcement with no focusable controls or alerts',()=>{
 const f=fixture();f.update();assert.equal(f.target.getAttribute('role'),'status');assert.equal(f.target.getAttribute('aria-live'),'polite');assert.equal(f.target.getAttribute('aria-atomic'),'true');assert.equal(f.target.getAttribute('aria-hidden'),'false');assert.equal(f.target.querySelector('button,a,input,[tabindex]'),null);f.popup.dismiss();assert.equal(f.target.getAttribute('aria-hidden'),'true');f.popup.dispose();
});
test('missing labels and raw IDs fail closed; markup is never interpreted',()=>{
 const f=fixture();for(const label of ['',undefined,'world:hub:PROLOGUE']){assert.equal(f.popup.update({key:'bad',label}),false);assert.equal(f.phase(),'idle')}
 f.update('good','<img src=x> 고현');assert.equal(f.target.querySelector('img'),null);assert.equal(f.target.textContent,'<img src=x> 고현');f.popup.dispose();
});
test('external shared-shell help clears the notice and closing cannot reshow it',()=>{
 const f=fixture();f.update();const help=f.document.createElement('details');help.className='shared-shell-help';f.target.parentElement.append(help);help.open=true;
 help.dispatchEvent(new f.window.Event('toggle',{bubbles:true}));assert.equal(f.phase(),'idle');help.open=false;help.dispatchEvent(new f.window.Event('toggle',{bubbles:true}));f.update();assert.equal(f.phase(),'idle');f.popup.dispose();
});
test('all four opening and fifty-six canonical titles are authored Korean; no species registry edits',async()=>{
 const read=dir=>p=>readFileSync(new URL('../dist/data/'+dir+'/'+p,import.meta.url),'utf8');
 const historical=await loadCanonicalRuntimeAdapter({readText:read('canonical-handoff-v1')}),staged=await loadCanonical20260927Adapter({readStaging:read('staging-20260927')});
 const adapter=mergeApprovedGameplayRelease(historical,staged),definition=createWorldDefinition(adapter),maps=Object.values(definition.maps),f=fixture();assert.equal(maps.length,56);assert.equal(Object.keys(INTRO_SCENE_LABELS).length,4);assert.equal(adapter.species.length,151);
 for(const [id,label] of [...Object.entries(INTRO_SCENE_LABELS),...maps.map(m=>[m.id,m.label])]){assert.equal(f.update(id,label),true,id);assert.equal(f.target.textContent,label);assert.doesNotMatch(f.target.textContent,/world:|SPECIES_/)}f.popup.dispose();
});
test('CSS retains a measured header footprint, original 44px band, touch pass-through and reduced motion',()=>{
 const css=readFileSync(new URL('../dist/ui/region-entry-popup.css',import.meta.url),'utf8');assert.match(css,/\.shared-shell-header>\.eco-region-popup/);assert.match(css,/margin-inline-start:auto/);assert.match(css,/pointer-events:none/);assert.match(css,/visibility:hidden/);assert.doesNotMatch(css,/display\s*:\s*none|position\s*:\s*fixed|\.qa-safe-nearby-band\s*\{/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/forced-colors:active/);
});


test('persistently open Help consumes later map entries even without another toggle event',()=>{
 const f=fixture();f.target.parentElement.classList.add('shared-shell-header');f.update();const help=f.document.createElement('details');help.className='shared-shell-help';help.setAttribute('open','');f.target.parentElement.append(help);
 assert.equal(f.update('lab','거제 생태 연구소'),false);assert.equal(f.phase(),'idle');assert.equal(f.timers.pending.size,0);help.removeAttribute('open');assert.equal(f.update('lab','거제 생태 연구소'),false);assert.equal(f.phase(),'idle');assert.equal(f.update('town','고현 마을'),true);f.popup.dispose();
});
