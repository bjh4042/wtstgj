import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {SPECIES,BY_ID,STARTERS,freshState,stats} from '../dist/model.mjs';
import {dexRecord,dexDetailMarkup,escapeDex} from '../dist/ui/species-dex.mjs';
const require=createRequire(import.meta.url),{parseHTML}=require('linkedom'),ts=require('typescript');
// Run the production app's own menu and Dex handlers. Only DOM rendering, audio
// and unrelated menu branches are stubbed; no duplicated Dex navigation logic.
const path=process.env.LEGACY_DEX_ENTRY_SOURCE??new URL('../dist/app.js',import.meta.url);
const source=readFileSync(path,'utf8'),parsed=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const functionText=name=>{const n=parsed.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(n,name);return n.getText(parsed)};
const variableText=name=>{const d=parsed.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]).find(n=>n.name.getText(parsed)===name);assert.ok(d,name);return `const ${d.getText(parsed)};`};
const actual=['gameMenu','dex','dexLabel'].map(functionText).join('\n')+'\n'+['parseSpeciesId','dataId'].map(variableText).join('\n');
function fixture(){
 const {document,window}=parseHTML('<html><body><dialog id="modal"></dialog></body></html>');
 window.HTMLElement.prototype.focus=function(){};
 const state=freshState(STARTERS[0],'boy'),owned=state.party[0].id,unowned=SPECIES.find(s=>s.id!==owned).id,unseen=SPECIES.find(s=>s.id!==owned&&s.id!==unowned).id;
 state.seen.push(unowned);const messages=[],modal=document.querySelector('#modal');let writes=0;
 const bindings={document,window,state,SPECIES,BY_ID,dexRecord,dexDetailMarkup,esc:escapeDex,modal,
  requireState:()=>true,placeFieldMenu(){},monsterSprite:()=>'<span data-art-stub></span>',toast:text=>messages.push(text),
  showModal(title,body){modal.innerHTML=body;modal.setAttribute('aria-label',title)},
  saveGame(){writes++;throw Error('Dex navigation must not write saves')},
  showMonster(){throw Error('Legacy Dex regressed to individual monster detail')},
  createMonster(){throw Error('Legacy Dex must never create a synthetic level-5 individual')},
  partyPanel(){},bag(){},explorerPanel(){},savePanel(){},settings(){}};
 const app=Function(...Object.keys(bindings),`let goldenField=null,backAction=null,focusedControl=null;const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];\n${actual}\nreturn {menu:gameMenu,dex,back:()=>backAction?.()};`)(...Object.values(bindings));
 return {app,document,modal,state,owned,unowned,unseen,messages,get writes(){return writes},click:q=>{const b=document.querySelector(q);assert.ok(b,q);b.click()}};
}
function assertSpeciesDetail(f,id){
 assert.equal(f.modal.getAttribute('aria-label'),BY_ID[id].name);
 assert.ok(f.document.querySelector(`.eco-legacy-dex [data-dex-detail="${id}"]`));
 assert.deepEqual([...f.document.querySelectorAll('[data-stat] dd')].map(n=>Number(n.textContent)),BY_ID[id].stats);
 assert.equal(f.document.querySelectorAll('[data-stat]').length,6);
 assert.ok(f.modal.textContent.includes(BY_ID[id].real));
 assert.ok(f.modal.textContent.includes(BY_ID[id].fact));
 assert.doesNotMatch(f.modal.textContent,/Lv\.|EXP|HP \d+\/\d+/);
}
test('actual legacy adventure menu -> Dex -> seen unowned detail retains species facts and six unscaled base stats',()=>{
 const f=fixture(),before=JSON.stringify(f.state);f.app.menu();assert.equal(f.document.querySelectorAll('[data-menu]').length,6);
 f.click('[data-menu="dex"]');assert.equal(f.document.querySelectorAll('[data-dex]').length,151);
 f.click(`[data-dex="${f.unowned}"]`);assertSpeciesDetail(f,f.unowned);
 f.app.back();assert.equal(f.document.querySelectorAll('[data-dex]').length,151);
 f.click(`[data-dex="${f.owned}"]`);assertSpeciesDetail(f,f.owned);assert.notDeepEqual(BY_ID[f.owned].stats,stats(f.state.party[0]));
 assert.equal(JSON.stringify(f.state),before);assert.equal(f.writes,0);
});
test('actual legacy Dex search -> detail -> Back preserves query; unseen entry cannot leak details or write saves',()=>{
 const f=fixture(),before=JSON.stringify(f.state);f.app.menu();f.click('[data-menu="dex"]');
 f.click(`[data-dex="${f.unseen}"]`);assert.equal(f.messages.length,1);assert.equal(f.document.querySelector('[data-dex-detail]'),null);
 const input=f.document.querySelector('#dex-search');input.value=BY_ID[f.unowned].name;input.onchange({target:input});
 f.click(`[data-dex="${f.unowned}"]`);assertSpeciesDetail(f,f.unowned);f.app.back();
 assert.equal(f.document.querySelector('#dex-search').value,BY_ID[f.unowned].name);
 assert.ok(f.document.querySelector(`[data-dex="${f.unowned}"]`));assert.equal(JSON.stringify(f.state),before);assert.equal(f.writes,0);
});
test('combined app keeps both Dex imports and popup imports instead of replacing either feature entry',()=>{
 for(const expected of ["import {dexRecord,dexDetailMarkup} from './ui/species-dex.mjs';","import './ui/species-dex.css';","import {createRegionEntryPopup} from './ui/region-entry-popup.mjs';","import './ui/region-entry-popup.css';"])assert.ok(source.includes(expected),expected);
 assert.doesNotMatch(functionText('dex'),/showMonster\(|createMonster\(/);
});
