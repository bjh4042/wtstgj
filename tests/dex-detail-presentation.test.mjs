import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {SpeciesCatalogService} from '../dist/species-catalog-service.mjs';
const require=createRequire(import.meta.url),{parseHTML}=require('linkedom'),cssom=require('cssom');
const base=process.env.DEX_PRESENTATION_BASE?pathToFileURL(resolve(process.env.DEX_PRESENTATION_BASE)+'/'):new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
const {installOrdinaryMenu}=await import(new URL('dist/ui/ordinary-menu.mjs',base));
const adapter=await loadCanonicalRuntimeAdapter({readText:async p=>read('dist/data/canonical-handoff-v1/'+p)});
const catalog=new SpeciesCatalogService({namespace:'canonical',adapter});
function fixture(){
 const {document,window}=parseHTML('<html><body><main id="canonical-world" class="ordinary-world shared-game-shell"><div class="world-layout shared-shell-auxiliary"><aside><section aria-label="저장 메뉴"><button data-save>저장</button></section><pre data-w="state"></pre><section data-w="party"></section><details><summary>안내</summary><div data-w="guide"></div></details></aside></div></main></body></html>');
 const root=document.querySelector('main'),aside=root.querySelector('aside'),calls=[];
 let active=document.body;
 Object.defineProperty(document,'activeElement',{get:()=>active});
 // Linkedom has no layout engine. Model the observed browser's sticky-heading
 // scroll, and separately require preventScroll rather than accepting a reset
 // that still allows focus to move the panel or its scrolling ancestors.
 window.HTMLElement.prototype.focus=function(options){active=this;calls.push({node:this,options});if(this.id==='eco-menu-heading'&&!options?.preventScroll)aside.scrollTop=116};
 window.HTMLElement.prototype.scrollIntoView=function(){};
 window.HTMLElement.prototype.setSelectionRange=function(start,end,direction){Object.assign(this,{selectionStart:start,selectionEnd:end,selectionDirection:direction})};
 const snapshot={player:{name:'검수'},dex:{seen:['SPECIES_001','SPECIES_020'],caught:['SPECIES_001']},inventory:{},progress:{items:{}}};
 const menu=installOrdinaryMenu({root,onExit(){throw Error('Unexpected close')}});
 menu.update(snapshot,{catalog,open:true});
 const click=q=>{const node=root.querySelector(q);assert.ok(node,q);node.focus();node.click()};
 const key=k=>{const event=new window.Event('keydown',{bubbles:true,cancelable:true});Object.assign(event,{key:k});active.dispatchEvent(event);return event};
 return {document,root,aside,calls,snapshot,menu,click,key};
}
const luminance=hex=>hex.match(/[\da-f]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const [light,dark]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(light+.05)/(dark+.05)};

test('menu title declares readable light ink rather than inheriting the pinned shared-shell dark ink (source contrast contract)',()=>{
 const rules=cssom.parse(read('dist/ui/species-dex.css')).cssRules;
 const title=[...rules].find(r=>r.selectorText==='.eco-menu-top h2');
 const panel=[...rules].find(r=>r.selectorText==='.eco-menu-top');
 assert.ok(title?.style.color,'h2 must own its text color; article color cannot reach its sibling menu header');
 assert.equal(title.style.color,'#edf5fa');assert.equal(panel.style.background,'#1b3c50');
 assert.ok(contrast(title.style.color,panel.style.background)>=7);
 assert.ok(contrast('#173e56',panel.style.background)<1.1,'negative observed shared-shell inheritance reproduces near-invisible title');
 assert.match(read('docs/assets/ui-preview-WMU7-lXW.css'),/--shell-ink:#173e56/);
});
test('each actual detail entry starts at scrollTop zero and retains accessible heading focus with preventScroll',()=>{
 const f=fixture(),before=JSON.stringify(f.snapshot);f.click('[data-menu-page="dex"]');
 for(const id of ['SPECIES_001','SPECIES_020','SPECIES_001']){
  f.aside.scrollTop=116;f.calls.length=0;f.click(`[data-dex-id="${id}"]`);
  assert.equal(f.menu.selectedSpeciesId,id);assert.equal(f.aside.scrollTop,0);
  assert.equal(f.document.activeElement.id,'eco-menu-heading');assert.equal(f.document.activeElement.tabIndex,-1);
  const headingCalls=f.calls.filter(c=>c.node.id==='eco-menu-heading');assert.equal(headingCalls.length,1);assert.equal(headingCalls[0].options?.preventScroll,true);
  assert.equal(f.root.querySelectorAll('[data-stat]').length,6);
  f.aside.scrollTop=320;f.menu.update(f.snapshot,{catalog,open:true});
  assert.equal(f.aside.scrollTop,320,'a passive detail rebuild must not jump while reading');
  assert.equal(f.document.activeElement.id,'eco-menu-heading');
  f.document.body.focus();f.menu.update(f.snapshot,{catalog,open:true});
  assert.equal(f.document.activeElement.id,'eco-menu-heading');assert.equal(f.aside.scrollTop,320,'passive BODY fallback must not scroll either');assert.equal(f.calls.at(-1).options?.preventScroll,true);
  f.key('Escape');assert.equal(f.menu.selectedSpeciesId,null);assert.equal(f.document.activeElement.dataset.dexId,id);
 }
 assert.equal(JSON.stringify(f.snapshot),before);f.menu.dispose();
});
test('detail Back retains selected row, query/filter and restored search caret and select focus',()=>{
 const f=fixture();f.click('[data-menu-page="dex"]');
 let search=f.root.querySelector('[data-dex-search]');search.focus();search.value='001';search.oninput();search.onchange();
 let select=f.root.querySelector('[data-dex-filter]');select.querySelector('[value="seen"]').selected=true;select.focus();select.onchange();
 assert.equal(f.document.activeElement.dataset.menuFocus,'dex-filter');
 f.click('[data-dex-id="SPECIES_001"]');assert.equal(f.aside.scrollTop,0);f.click('[data-menu-focus="back"]');
 assert.equal(f.document.activeElement.dataset.dexId,'SPECIES_001');
 assert.equal(f.root.querySelector('[data-dex-search]').value,'001');assert.equal(f.root.querySelector('[data-dex-filter]').value,'seen');
 search=f.root.querySelector('[data-dex-search]');search.focus();search.selectionStart=1;search.selectionEnd=2;search.selectionDirection='backward';f.aside.scrollTop=46;
 f.menu.update(f.snapshot,{catalog,open:true});
 assert.equal(f.document.activeElement.dataset.menuFocus,'dex-search');assert.equal(f.document.activeElement.value,'001');assert.equal(f.document.activeElement.selectionStart,1);assert.equal(f.document.activeElement.selectionEnd,2);assert.equal(f.document.activeElement.selectionDirection,'backward');assert.equal(f.aside.scrollTop,46);assert.equal(f.calls.at(-1).options?.preventScroll,true);
 select=f.root.querySelector('[data-dex-filter]');select.focus();f.menu.update(f.snapshot,{catalog,open:true});assert.equal(f.document.activeElement.dataset.menuFocus,'dex-filter');assert.equal(f.document.activeElement.value,'seen');assert.equal(f.calls.at(-1).options?.preventScroll,true);
 f.menu.dispose();
});
test('heading focus keeps Tab traversal and native held-key guard without opening unseen detail',()=>{
 const f=fixture();f.click('[data-menu-page="dex"]');const unseen=f.root.querySelector('[data-dex-id="SPECIES_002"]');unseen.onclick();assert.equal(f.menu.selectedSpeciesId,null);
 f.click('[data-dex-id="SPECIES_001"]');assert.equal(f.key('Tab').defaultPrevented,true);assert.equal(f.document.activeElement.dataset.menuFocus,'back');
 for(const key of ['Enter',' ']){const event={key,repeat:true,preventDefault(){this.prevented=true},stopPropagation(){}};f.menu.handleKeydown(event);assert.equal(event.prevented,true);assert.equal(f.menu.selectedSpeciesId,'SPECIES_001')}
 f.key('Escape');assert.equal(f.document.activeElement.dataset.dexId,'SPECIES_001');f.menu.dispose();
});
