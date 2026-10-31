import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preRivalGuidance,PRE_RIVAL_GUIDANCE,LOSS_RECOVERY_GUIDANCE} from '../dist/ordinary/preparation-guidance.mjs';
test('optional preparation copy appears only after partner before first rival',()=>{const s={progress:{completedEvents:['P02_FIRST_PARTNER'],defeatedTrainers:[]}},before=JSON.stringify(s);assert.equal(preRivalGuidance(s,'world:hub:PROLOGUE'),PRE_RIVAL_GUIDANCE);assert.equal(JSON.stringify(s),before);assert.equal(preRivalGuidance(s,'world:hub:S1'),'');assert.equal(preRivalGuidance({progress:{completedEvents:[],defeatedTrainers:[]}},'world:hub:PROLOGUE'),'');s.progress.defeatedTrainers.push('RIVAL_00');assert.equal(preRivalGuidance(s,'world:hub:PROLOGUE'),'');assert.equal(preRivalGuidance(null,'world:hub:PROLOGUE'),'');assert.match(LOSS_RECOVERY_GUIDANCE,/무료/)});
import {verifyEvolutionCallbacks} from './helpers/baseline-entry-semantics.mjs';
test('actual evolution callback commits before presentation and rejects readonly/stale lease and failed save',async()=>{const src=readFileSync(new URL('../dist/world/entry.mjs',import.meta.url),'utf8');assert.ok(src.includes('if(active()&&!evolutionVisual.busy)el(command).click()'));await verifyEvolutionCallbacks()});
