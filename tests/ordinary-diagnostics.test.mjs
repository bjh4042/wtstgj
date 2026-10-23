import test from 'node:test';
import assert from 'node:assert/strict';
import {drawTilePlaceholder,TILE_IDS} from '../dist/tileset-contract.mjs';
import {drawAnimatedTile} from '../dist/presentation/tile-animation.mjs';
const canvas=()=>{const calls=[];return {calls,fillRect(...args){calls.push(['fill',...args])},strokeRect(...args){calls.push(['grid',...args])},save(){},restore(){}}};
test('ordinary static/animated placeholders omit only diagnostic grid; default DEV rendering and terrain remain',()=>{
 for(const draw of [
  (c,grid)=>drawTilePlaceholder(c,TILE_IDS.TALL_GRASS,0,0,32,grid===undefined?undefined:{grid}),
  (c,grid)=>drawAnimatedTile(c,'SEA_ANIM_01',640,0,0,32,grid===undefined?undefined:{grid})
 ]){
  const dev=canvas(),ordinary=canvas();draw(dev);draw(ordinary,false);
  assert.equal(dev.calls.filter(x=>x[0]==='grid').length,1);
  assert.equal(ordinary.calls.filter(x=>x[0]==='grid').length,0);
  assert.deepEqual(ordinary.calls,dev.calls.filter(x=>x[0]!=='grid'));
 }
});
