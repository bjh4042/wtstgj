import test from 'node:test';import assert from 'node:assert/strict';
import {createMonster,moveKeys,moveInfo,addExperience,evolve,stats,validateSave,freshState} from '../dist/model.mjs';
test('levels unlock moves, evolution and later training strengthen damage without spending PP',()=>{
 for(const id of [139,67,70]){const m=createMonster(id,5),initial=moveKeys(m).length,pp=[...m.pp],power=moveInfo(m,moveKeys(m)[0]).power;addExperience(m,10000);assert.ok(moveKeys(m).length>initial);assert.deepEqual(m.pp,pp);m.level=24;assert.ok(moveInfo(m,moveKeys(m)[0]).power>power);evolve(m,id+1);assert.equal(moveKeys(m).length,4);m.level=36;assert.ok(moveInfo(m,moveKeys(m)[0]).power>=power+50)}
});
test('existing plant and bird collections remain loadable with partially used PP',()=>{
 const state=freshState(139,'boy');state.box=[createMonster(115,25),createMonster(139,25)];state.seen=[139,115];state.caught=[139,115];state.box[1].pp=[17,4,12,13];assert.deepEqual(validateSave(state).box[1].pp,[17,4,12,13]);
});
