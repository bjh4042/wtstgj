import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {INTRO_ART} from '../dist/art/approved-intro-bindings.mjs';
import {approvedStandingPortrait,approvedDialoguePortrait,approvedMenuArt} from '../dist/art/approved-intro.mjs';
test('approved intro asset bytes match recorded original hashes',()=>{for(const a of Object.values(INTRO_ART)){const bytes=readFileSync(new URL('../dist/'+a.src,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);assert.ok(a.bounds[2]>a.bounds[0]);assert.ok(a.bounds[3]>a.bounds[1]);}});
test('approved intro uses canonical Yoon and does not silently identify Naru as Harin',()=>{assert.match(INTRO_ART.researcher.sourceId,/YOON/);assert.match(approvedStandingPortrait('researcher'),/standing-researcher/);assert.match(approvedStandingPortrait('rival'),/standing-unresolved/);assert.doesNotMatch(approvedStandingPortrait('rival'),/HARIN|하린/);assert.match(approvedDialoguePortrait('boy'),/boy_dialogue.png/);assert.match(approvedMenuArt(),/approved-title/);});
test('intro renderer no longer imports legacy portrait, furniture, or trainer sheets',()=>{const s=readFileSync(new URL('../dist/intro-scene.mjs',import.meta.url),'utf8');assert.doesNotMatch(s,/interior-art|trainer-sprites|guardLegacyImage/);assert.match(s,/drawApprovedIntroWorld/);const css=readFileSync(new URL('../dist/intro.css',import.meta.url),'utf8');assert.doesNotMatch(css,/portraits-v1\.png/);});
