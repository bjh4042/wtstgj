import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveFrontOnlyArt} from '../dist/battle-v3/front-policy-r2/adapter.mjs';
const source=readFileSync(new URL('../dist/battle-v3/front-policy-r2/adapter.mjs',import.meta.url),'utf8');
const expression=source.match(/src:(new URL\(.+?\)\.href),requestedSide:/)?.[1];
assert(expression,'Front art URL expression must remain inspectable');
const resolveURL=new Function('art','base','moduleURL',`return ${expression.replaceAll('import.meta.env?.BASE_URL','base').replaceAll('import.meta.url','moduleURL')}`);
test('front artwork uses deployment base instead of emitted chunk depth',()=>{
 const art={src:'./assets/approved-atlases/species/SPECIES_001.png'};
 for(const base of ['/wtstgj/','/preview/game/','/']){
  const actual=resolveURL(art,base,`https://example.test${base}assets/entry-hash.js`);
  assert.equal(actual,`https://example.test${base}assets/approved-atlases/species/SPECIES_001.png`);
 }
});
test('source-only Node renderer keeps original dist-relative asset paths',()=>{
 const art=resolveFrontOnlyArt({namespace:'canonical',speciesId:'SPECIES_001'},'back');
 assert(art?.src.startsWith(new URL('../dist/assets/',import.meta.url).href));
 assert.equal(art.selectedSide,'front');
});
