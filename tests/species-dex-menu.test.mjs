import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {SpeciesCatalogService} from '../dist/species-catalog-service.mjs';
import {createMonster,stats} from '../dist/model.mjs';
import {dexRecord,selectDexRecords,dexDetailMarkup,DEX_STAT_FIELDS} from '../dist/ui/species-dex.mjs';
import {DEX_METADATA} from '../dist/ui/species-dex-data.mjs';
import {installOrdinaryMenu,ORDINARY_MENU_ITEMS} from '../dist/ui/ordinary-menu.mjs';
const require=createRequire(import.meta.url),{parseHTML}=require('linkedom');
const read=f=>readFileSync(new URL('../'+f,import.meta.url)),json=f=>JSON.parse(read(f));
const adapter=await loadCanonicalRuntimeAdapter({readText:async f=>String(read('dist/data/canonical-handoff-v1/'+f))});
const catalog=new SpeciesCatalogService({namespace:'canonical',adapter}),legacy=new SpeciesCatalogService({namespace:'work-v2'});
const source=json('dist/data/canonical-handoff-v1/geoje_species_151_v3_final.json'),battle=json('dist/data/canonical-handoff-v1/geoje_battle_collection_master_v3.json');
const fullDex={seen:catalog.records.map(s=>s.id),caught:catalog.records.map(s=>s.id)};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

test('151 exact stable IDs remain separate from 157 art records; no art-only registry expansion',()=>{
 assert.equal(catalog.records.length,151);assert.equal(Object.keys(DEX_METADATA.records).length,151);
 for(let n=152;n<=157;n++)assert.equal(dexRecord(catalog,fullDex,`SPECIES_${n}`),null);
});
test('151 × 6 base stats map exactly hp/atk/def/spa/spd/spe to canonical battle source, no level scaling',()=>{
 for(const raw of battle.species){const r=dexRecord(catalog,fullDex,`SPECIES_${raw.dex_no}`);assert.deepEqual(r.stats.map(s=>s.field),DEX_STAT_FIELDS);assert.deepEqual(r.stats.map(s=>s.value),DEX_STAT_FIELDS.map(k=>raw.base_stats[k]));assert.equal(r.stats.reduce((a,s)=>a+s.value,0),raw.bst)}
 const mon=createMonster(1,5),r=dexRecord(legacy,{seen:[1],caught:[]},1);assert.deepEqual(r.stats.map(s=>s.value),legacy.getBaseStats(1));assert.notDeepEqual(r.stats.map(s=>s.value),stats(mon));
});
test('151 motif mappings and game summaries retain exact authoritative identity, taxon, type and chain',()=>{
 for(const raw of source.species){const r=dexRecord(catalog,fullDex,`SPECIES_${raw.dex_no}`);assert.equal(r.name,raw.name);assert.equal(r.motif,raw.motif);assert.equal(r.motifKind,raw.motif_kind);assert.equal(r.taxonGroup,raw.taxon_group);assert.deepEqual(r.types,raw.type_names_ko);assert.deepEqual(r.chainNames,raw.chain_names);assert.equal(r.descriptionKind,'canonical-field-summary');assert.ok(r.description.includes(raw.motif));assert.ok(!r.description.includes('준비 중'));assert.equal(r.ecology,null)}
 assert.equal(DEX_METADATA.sourceSha256,digest(read('dist/data/canonical-handoff-v1/'+DEX_METADATA.sourceFile)));
 assert.equal(DEX_METADATA.battleSourceSha256,digest(read('dist/data/canonical-handoff-v1/'+DEX_METADATA.battleSourceFile)));
});
test('140 real motifs, 7 landform and 4 symbolic motifs never mislabel a rock or original symbol as an animal',()=>{
 const rows=selectDexRecords(catalog,fullDex);assert.equal(rows.filter(r=>r.motifKind==='actual_living_organism').length,140);assert.equal(rows.filter(r=>r.motifKind==='natural_landform').length,7);assert.equal(rows.filter(r=>r.motifKind==='original_fantasy').length,4);
 assert.match(dexDetailMarkup(rows.find(r=>r.number===104)),/모티프 자연지형/);assert.match(dexDetailMarkup(rows.find(r=>r.number===151)),/오리지널 상징/);
});
test('seen gate hides name, motif, details and base stats, including caught-only inconsistent records',()=>{
 const dex={seen:['SPECIES_001'],caught:['SPECIES_001','SPECIES_002']};const unseen=dexRecord(catalog,dex,'SPECIES_002');assert.equal(unseen.name,'???');assert.deepEqual(unseen.stats,[]);assert.equal(unseen.motif,null);assert.doesNotMatch(dexDetailMarkup(unseen),/솔삵이|삵|종족값<|70/);
 assert.deepEqual(dexRecord(catalog,dex,'SPECIES_001').chainNames,['점삵이','???','???']);
 assert.equal(selectDexRecords(catalog,dex,{query:'솔삵이'}).length,0);assert.equal(selectDexRecords(catalog,dex,{query:'002'}).length,1);assert.equal(selectDexRecords(catalog,dex,{query:'삵'}).length,1);
});
test('missing or stale display metadata never creates ecology or scientific names',()=>{
 const r=dexRecord(catalog,fullDex,'SPECIES_001',{metadata:{}});assert.equal(r.motif,'삵');assert.equal(r.description,null);assert.equal(r.ecology,null);assert.match(dexDetailMarkup(r),/설명 준비 중/);
 const changed=structuredClone(DEX_METADATA.records);changed.SPECIES_001.name='오염';changed.SPECIES_001.motif='가짜';assert.equal(dexRecord(catalog,fullDex,'SPECIES_001',{metadata:changed}).motif,'삵');
});
test('all original balance, registry, save, source-data bytes remain frozen',()=>{
 for(const f of ['dist/model.mjs','dist/species-catalog-service.mjs','dist/compatibility/species-registry.mjs','dist/compatibility/canonical-adapter.mjs','dist/compatibility/save-slots.mjs','dist/ordinary/slots.mjs','dist/story/save.mjs','dist/world/save-store.mjs','dist/data/canonical-handoff-v1/geoje_species_151_v3_final.json','dist/data/canonical-handoff-v1/geoje_battle_collection_master_v3.json'])assert.equal(digest(read(f)),json('tests/fixtures/dex-menu-v3/BASELINE_FINGERPRINTS.json').files.find(row=>row.path===f)?.sha256,f);
});
function fixture(){
 const {document,window}=parseHTML('<html><body><main><aside><section aria-label="저장 메뉴"><button data-save>저장</button></section><pre data-w="state"></pre><section data-w="party"><button data-party>기존 진화</button></section><details><summary>안내</summary><div data-w="guide"></div></details></aside></main></body></html>');
 let active=document.body;Object.defineProperty(document,'activeElement',{get:()=>active});window.HTMLElement.prototype.focus=function(){active=this};window.HTMLElement.prototype.scrollIntoView=function(){};
 let exits=0,saves=0;const root=document.querySelector('main');root.querySelector('[data-save]').onclick=()=>saves++;
 const menu=installOrdinaryMenu({root,onExit:()=>exits++});const snapshot={player:{name:'검수'},dex:{seen:['SPECIES_001','SPECIES_020'],caught:['SPECIES_001']},inventory:{ecology_ball:5},progress:{items:{}}};
 menu.update(snapshot,{catalog,open:true});return {document,window,root,menu,snapshot,get exits(){return exits},get saves(){return saves},click:q=>root.querySelector(q).click(),key(key,extra={}){const event=new window.Event('keydown',{bubbles:true,cancelable:true});Object.assign(event,{key,...extra});active.dispatchEvent(event);return event}};
}
test('ordinary menu drill-down/back restores selected entry, filters, original nodes and does not mutate saves',()=>{
 const f=fixture(),before=JSON.stringify(f.snapshot);assert.equal(f.root.querySelectorAll('[data-menu-page]').length,6);assert.deepEqual(ORDINARY_MENU_ITEMS.map(x=>x[0]),['dex','party','bag','explorer','save','settings']);
 f.click('[data-menu-page="dex"]');assert.equal(f.root.querySelectorAll('[data-dex-id]').length,151);f.click('[data-dex-id="SPECIES_001"]');assert.equal(f.root.querySelectorAll('[data-stat]').length,6);assert.equal(f.menu.selectedSpeciesId,'SPECIES_001');assert.equal(f.menu.back(),true);assert.equal(f.document.activeElement.dataset.dexId,'SPECIES_001');assert.equal(f.menu.back(),true);assert.equal(f.document.activeElement.dataset.menuPage,'dex');assert.equal(f.menu.back(),false);
 f.click('[data-menu-page="save"]');assert.equal(f.root.querySelector('[aria-label="저장 메뉴"]').hidden,false);f.click('[data-save]');assert.equal(f.saves,1);assert.equal(JSON.stringify(f.snapshot),before);f.menu.dispose();
});
test('menu repeated open/close, locked selection, input query, settings, keyboard and focus remain bounded',()=>{
 const f=fixture();f.key('z');assert.equal(f.menu.page,'dex');f.click('[data-dex-id="SPECIES_002"]');assert.equal(f.menu.selectedSpeciesId,null);
 const input=f.root.querySelector('[data-dex-search]');input.value='동백';input.onchange();assert.equal(f.root.querySelectorAll('[data-dex-id]').length,1);f.menu.back();f.click('[data-menu-page="dex"]');assert.equal(f.root.querySelector('[data-dex-search]').value,'동백');
 f.menu.update(f.snapshot,{catalog,open:false});f.menu.update(f.snapshot,{catalog,open:true});assert.equal(f.menu.page,'main');f.click('[data-menu-page="settings"]');const box=f.root.querySelector('[data-large-text]');box.checked=true;box.onchange({target:box});assert.equal(f.root.querySelector('aside').dataset.largeText,'true');f.key('Escape');assert.equal(f.menu.page,'main');f.key('Escape');assert.equal(f.exits,1);f.menu.dispose();
});
test('rendered 151 details have six legible semantic rows and escape data',()=>{
 for(const record of selectDexRecords(catalog,fullDex)){const {document}=parseHTML(dexDetailMarkup(record));assert.equal(document.querySelectorAll('[data-stat]').length,6);assert.equal(document.querySelectorAll('.eco-dex-detail').length,1)}
 const r=dexRecord(catalog,fullDex,'SPECIES_001');r.description='<script>alert(1)</script>';assert.ok(dexDetailMarkup(r).includes('&lt;script&gt;'));assert.ok(!dexDetailMarkup(r).includes('<script>'));
});

test('V2 Tab and Shift+Tab stay inside settings even when final control is a checkbox',()=>{
 const f=fixture();f.click('[data-menu-page="settings"]');const checkbox=f.root.querySelector('[data-large-text]'),back=f.root.querySelector('[data-menu-focus="back"]');checkbox.focus();
 assert.equal(f.key('Tab').defaultPrevented,true);assert.equal(f.document.activeElement,back);
 assert.equal(f.key('Tab',{shiftKey:true}).defaultPrevented,true);assert.equal(f.document.activeElement,checkbox);
 assert.equal(f.key(' ').defaultPrevented,false,'Space keeps native checkbox toggle behavior');
 assert.equal(f.key('ArrowUp').defaultPrevented,true);assert.equal(f.document.activeElement,back);
 checkbox.focus();f.key('x');assert.equal(f.menu.page,'main');assert.equal(f.document.activeElement.dataset.menuPage,'settings');
 f.click('[data-menu-page="settings"]');f.root.querySelector('[data-large-text]').focus();f.key('m');assert.equal(f.exits,1);f.menu.dispose();
});
test('V2 all-unseen Dex select traps Tab but retains native arrows and Enter selection',()=>{
 const f=fixture();f.snapshot.dex={seen:[],caught:[]};f.menu.update(f.snapshot,{catalog,open:true});f.click('[data-menu-page="dex"]');const select=f.root.querySelector('[data-dex-filter]');select.focus();
 assert.equal(f.key('ArrowDown').defaultPrevented,false);assert.equal(f.document.activeElement,select);assert.equal(f.key('Enter').defaultPrevented,false);
 assert.equal(f.key('Tab').defaultPrevented,true);assert.equal(f.document.activeElement.dataset.menuFocus,'back');
 assert.equal(f.key('Tab',{shiftKey:true}).defaultPrevented,true);assert.equal(f.document.activeElement,select);
 f.key('Escape');assert.equal(f.menu.page,'main');assert.equal(f.document.activeElement.dataset.menuPage,'dex');f.menu.dispose();
});
test('V2 rebuild retains search draft, exact selection/caret and filter focus by stable logical identity',()=>{
 const f=fixture();f.click('[data-menu-page="dex"]');let search=f.root.querySelector('[data-dex-search]');search.focus();search.value='동백xm';search.oninput();search.selectionStart=1;search.selectionEnd=3;search.selectionDirection='backward';
 f.window.HTMLElement.prototype.setSelectionRange=function(start,end,direction){Object.assign(this,{selectionStart:start,selectionEnd:end,selectionDirection:direction})};
 f.menu.update(f.snapshot,{catalog,open:true});const replacement=f.document.activeElement;assert.notEqual(replacement,search);assert.equal(replacement.isConnected,true);assert.equal(replacement.dataset.menuFocus,'dex-search');assert.equal(replacement.value,'동백xm');assert.equal(replacement.selectionStart,1);assert.equal(replacement.selectionEnd,3);assert.equal(replacement.selectionDirection,'backward');
 for(const key of ['x','m','z','ArrowLeft','ArrowRight','ArrowDown',' ']){assert.equal(f.key(key).defaultPrevented,false);assert.equal(f.menu.page,'dex');assert.equal(f.document.activeElement,replacement)}
 assert.equal(f.exits,0);assert.equal(f.key('Enter').defaultPrevented,true);assert.equal(f.document.activeElement.dataset.menuFocus,'dex-search');assert.equal(f.document.activeElement.selectionStart,1);
 const select=f.root.querySelector('[data-dex-filter]');select.querySelector('[value="seen"]').selected=true;select.focus();select.onchange();assert.equal(f.document.activeElement.dataset.menuFocus,'dex-filter');assert.equal(f.document.activeElement.value,'seen');assert.equal(f.document.activeElement.isConnected,true);
 f.menu.update(f.snapshot,{catalog,open:true});assert.equal(f.document.activeElement.dataset.menuFocus,'dex-filter');assert.equal(f.document.activeElement.value,'seen');f.menu.dispose();
});
test('V2 outer party replacement restores exact logical action or a safe modal fallback if removed',()=>{
 const f=fixture();f.click('[data-menu-page="party"]');const party=f.root.querySelector('[data-w="party"]'),old=party.querySelector('button');old.dataset.menuFocus='item-use:instance-a';old.focus();const focusState=f.menu.captureFocus();party.innerHTML='<button data-menu-focus="item-use:instance-b">다른 친구</button><button data-menu-focus="item-use:instance-a">원래 친구</button>';
 f.menu.update(f.snapshot,{catalog,open:true,focusState});assert.equal(f.document.activeElement.dataset.menuFocus,'item-use:instance-a');assert.notEqual(f.document.activeElement,old);assert.equal(f.document.activeElement.isConnected,true);
 const removed=f.menu.captureFocus();party.replaceChildren();f.menu.update(f.snapshot,{catalog,open:true,focusState:removed});assert.equal(f.document.activeElement.id,'eco-menu-heading');f.document.body.focus();const event=new f.window.Event('keydown',{cancelable:true});Object.assign(event,{key:'ArrowDown'});assert.equal(f.menu.handleKeydown(event),true);assert.equal(event.defaultPrevented,true);assert.equal(f.document.activeElement.dataset.menuFocus,'back');f.menu.dispose();
});
test('V2 select restoration uses logical item option rather than stale array index',()=>{
 const f=fixture();f.click('[data-menu-page="party"]');const party=f.root.querySelector('[data-w="party"]');party.innerHTML='<select data-menu-focus="item-choice:a"><option value="0" data-menu-option="potion">물약</option><option value="1" data-menu-option="ether" selected>회복제</option></select>';party.querySelector('select').focus();const focusState=f.menu.captureFocus();
 party.innerHTML='<select data-menu-focus="item-choice:a"><option value="0" data-menu-option="ether">회복제</option><option value="1" data-menu-option="new">새 도구</option></select>';f.menu.update(f.snapshot,{catalog,open:true,focusState});assert.equal(f.document.activeElement.value,'0');assert.equal(f.document.activeElement.querySelector('option:checked').dataset.menuOption,'ether');f.menu.dispose();
});

test('V3 modal native buttons suppress held Enter/Space but retain one-shot native activation',()=>{
 const f=fixture();const button=f.root.querySelector('[data-menu-page="dex"]');button.focus();
 for(const key of ['Enter',' ']){assert.equal(f.key(key,{repeat:true}).defaultPrevented,true);assert.equal(f.menu.page,'main');assert.equal(f.key(key,{repeat:false}).defaultPrevented,false);assert.equal(f.menu.page,'main','controller must not synthesize a duplicate native click')}
 f.click('[data-menu-page="dex"]');const search=f.root.querySelector('[data-dex-search]');search.focus();assert.equal(f.key(' ',{repeat:true}).defaultPrevented,false);const select=f.root.querySelector('[data-dex-filter]');select.focus();assert.equal(f.key('Enter',{repeat:true}).defaultPrevented,false);f.menu.dispose();
});
