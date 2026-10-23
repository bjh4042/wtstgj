import {APPROVED_ATLAS_DATA} from '../dist/approved-atlas-data.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {APPROVED_PLAYER_FRAMES} from '../dist/art/approved-player-bindings.mjs';
import {approvedPlayerPose,approvedPlayerIdentity,APPROVED_PLAYER_HEIGHT} from '../dist/art/approved-player-field.mjs';
test('all24 player web derivatives retain verified SHA and dimensions',()=>{
 assert.equal(Object.keys(APPROVED_PLAYER_FRAMES).length,24);
 for(const [key,frame] of Object.entries(APPROVED_PLAYER_FRAMES)){const packed=APPROVED_ATLAS_DATA.frames.player[key];assert.equal(packed.derivativeSha256,frame.sha256);assert.equal(packed.sourceSha256,frame.sourceSha256);assert.equal(packed.width,frame.width);assert.equal(packed.height,frame.height)}
});
test('approved players preserve ground anchor, aspect and original cadence',()=>{
 for(const appearance of ['boy','girl'])for(const facing of ['up','down','left','right'])for(const walk of [0,26,52,78]){
  const pose=approvedPlayerPose({appearance,facing,moving:true,walk,x:312.4,y:250.3,cameraY:48});const [x,y,w,h]=pose.destination;
  assert.equal(h,APPROVED_PLAYER_HEIGHT);assert.ok(Math.abs(y+h-202)<1e-9);assert.ok(Math.abs(x+w/2-312)<1e-9);assert.ok(Math.abs(w/h-pose.source[2]/pose.source[3])<1e-9);
 }
 assert.deepEqual([0,26,52,78].map(walk=>approvedPlayerPose({x:0,y:0,moving:true,walk}).frame.pose),['A','IDLE','B','IDLE']);assert.equal(approvedPlayerIdentity('girl'),'PLAYER_FEMALE');
});
test('presentation has no storage writes, original-source replacement or legacy-art fallback',()=>{
 const code=readFileSync('dist/art/approved-player-field.mjs','utf8');assert.doesNotMatch(code,/localStorage|setItem|writeFile|player-walk-atlas/);assert.match(code,/imageSmoothingEnabled=true/);
});
