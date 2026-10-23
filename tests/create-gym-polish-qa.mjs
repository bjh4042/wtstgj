import {readFileSync,writeFileSync} from 'node:fs';
import {gymWorld} from './helpers/gym-polish-fixture.mjs';
import {createSaveSlotStore,encodeSlot} from '../dist/compatibility/save-slots.mjs';
import {isolatedStorage} from './helpers/enhanced-league-fixture.mjs';
// Actual game entry and ordinary renderer, with in-memory fixture slots only.
// No new demo renderer, browser-state injection, user storage, battles or growth run.
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
for(const n of [2,8]){
 const w=gymWorld(n),memory=isolatedStorage(),store=createSaveSlotStore(memory,{canonicalCatalog:w.catalog});
 store.save('SLOT_3',w.snapshot());const raw=encodeSlot(store.load('SLOT_3')),key=store.keys('SLOT_3').primary;w.dispose();
 const seed=`<script>
 function fixtureStorage(initial){const data=new Map(Object.entries(initial));return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),clear:()=>data.clear(),key:i=>[...data.keys()][i]??null,get length(){return data.size}}}
 Object.defineProperty(window,'localStorage',{value:fixtureStorage(${JSON.stringify({[key]:raw})})});
 Object.defineProperty(window,'sessionStorage',{value:fixtureStorage({'geoje.monsters.ordinary-launch.v1':'{"slot":"SLOT_3","namespace":"canonical-v1"}'})});
 document.documentElement.dataset.qaFixture='gym-polish-${n}-geometry-only';
 </script>`;
 writeFileSync(new URL('../dist/__gym-polish-qa-'+n+'.html',import.meta.url),html.replace('<script type="module"',seed+'<script type="module"'));
}
console.log('Temporary /__gym-polish-qa-2.html and /__gym-polish-qa-8.html; delete after browser QA.');
