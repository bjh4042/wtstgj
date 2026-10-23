import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOnlineV12} from '../dist/online/v1-2.mjs';

const dir=new URL('../dist/data/staging-20260927/',import.meta.url);
const master=JSON.parse(readFileSync(new URL('geoje_online_battle_master_v1_2.json',dir),'utf8'));
const battleBytes=readFileSync(new URL('geoje_battle_collection_master_v3_2.json',dir),'utf8');
const battle=JSON.parse(battleBytes),moveId=battle.move_catalog[0].id;
const service=()=>createOnlineV12({master,battleBytes,battle,randomBytes:n=>new Uint8Array(n).fill(13)});
const save=()=>({schemaVersion:3,progress:{completedEvents:['FINAL_CHAMPION'],flags:{MAIN_STORY_CLEAR:true,POST_UNLOCKED:true,ONLINE_FRIEND_BATTLE_UNLOCKED:true}},player:{partyInstanceIds:['owned']},creatures:{instances:{owned:{speciesNo:148,level:72,nickname:'바다',moves:[{moveId,ppCurrent:0}],currentHp:1,status:'burn'}}}});
const bad=(fn,code)=>assert.throws(fn,e=>e.code===code);

test('online preflight binds exact Battle bytes/version and produces only public party snapshot',()=>{
 const p=service();assert.equal(p.hash,master.meta.battle_master_sha256);
 assert.deepEqual(p.preflight(save(),['owned']),[{memberIndex:0,speciesNo:148,level:72,nickname:'바다',moveIds:[moveId]}]);
 bad(()=>p.preflight(save(),['owned','owned']),'PARTY_INVALID');bad(()=>p.preflight(save(),['unknown']),'PARTY_INVALID');
 const s=save();s.progress.completedEvents=[];bad(()=>p.preflight(s,['owned']),'PARTY_INVALID');
 s.progress.completedEvents=['FINAL_CHAMPION'];s.creatures.instances.owned.moves=[{moveId:'OLD_MOVE'}];bad(()=>p.preflight(s,['owned']),'PARTY_INVALID');
 bad(()=>createOnlineV12({master,battleBytes:battleBytes+' ',battle}),'VERSION_MISMATCH');
 bad(()=>createOnlineV12({master,battleBytes,battle:{...battle,meta:{version:'old'}}}),'VERSION_MISMATCH');
});

test('secret room protocol, deterministic seed and append-only phase preconditions',()=>{
 const p=service(),{roomCode,room}=p.roomDraft({uid:'host',now:1000});
 assert.match(roomCode,/^[A-HJ-NP-Z2-9]{8}$/);assert.equal(room.battleMasterHash,p.hash);
 assert.equal(p.verifyRoom(roomCode,room,{uid:'host',now:2000}),room);
 bad(()=>p.verifyRoom(roomCode,room,{uid:'stranger',now:2000}),'AUTH_REQUIRED');
 bad(()=>p.verifyRoom(roomCode,room,{uid:'host',now:room.expiresAt}),'ROOM_EXPIRED');
 bad(()=>p.verifyRoom('INVALID!',room,{uid:'host',now:2000}),'ROOM_NOT_FOUND');
 bad(()=>p.canActivate(room),'READY_LOCKED');
 room.guestUid='guest';room.guestNonce='b'.repeat(32);room.parties={host:[{}],guest:[{}]};room.ready={host:true,guest:true};assert.equal(p.canActivate(room),true);
 room.status='ACTIVE';room.presence={guest:{connected:false,lastSeenAt:2000}};assert.equal(p.canResume(room,'guest',32000),true);assert.equal(p.canResume(room,'guest',32001),false);
 const host='a'.repeat(32),guest='b'.repeat(32),a=p.seed(roomCode,host,guest),b=p.seed(roomCode,host,guest);
 assert.equal(a,b);assert.deepEqual([p.rng(a).nextU32(),p.rng(a).nextU32()],[p.rng(b).nextU32(),p.rng(b).nextU32()]);
 const action={kind:'move',slot:0},digest=p.commit(action,host,roomCode,'T001');
 assert.equal(p.verifyReveal({action,nonce:host,roomCode,turnKey:'T001',commitHash:digest,bothCommits:true}),true);
 bad(()=>p.verifyReveal({action:{kind:'move',slot:1},nonce:host,roomCode,turnKey:'T001',commitHash:digest,bothCommits:true}),'INVALID_REVEAL');
 bad(()=>p.verifyReveal({action,nonce:host,roomCode,turnKey:'T001',commitHash:digest,bothCommits:false}),'INVALID_REVEAL');
 bad(()=>p.commit(action,host,roomCode,'T000'),'INVALID_REVEAL');
});

test('state hash ACK requires both reveals and equal local, host and guest hashes',()=>{
 const p=service(),state={turnKey:'T001',rngStateU32:1,host:{activeIndex:0,members:[{hp:12,status:null,pp:[5]}]},guest:{activeIndex:0,members:[{hp:9,status:'burn',pp:[2]}]},terminal:null};
 const hash=p.stateHash(state),args={turnKey:'T001',hostAck:{stateHash:hash},guestAck:{stateHash:hash},bothReveals:true,localState:state};
 assert.equal(p.verifyAcks(args),true);
 bad(()=>p.verifyAcks({...args,bothReveals:false}),'DESYNC');
 bad(()=>p.verifyAcks({...args,guestAck:{stateHash:'0'.repeat(64)}}),'DESYNC');
 bad(()=>p.verifyAcks({...args,localState:{...state,rngStateU32:2}}),'DESYNC');
 assert.equal(p.stateHash({...state,displayName:'irrelevant'}),hash);
 const code='ABCDEFGH',nonce='a'.repeat(32),action={kind:'move',slot:0,nonce},commit=p.commit(action,nonce,code,'T001');
 assert.equal(p.verifyTurn({roomCode:code,turnKey:'T001',hostUid:'h',guestUid:'g',commits:{h:commit,g:commit},reveals:{h:action,g:action},acks:{h:{stateHash:hash},g:{stateHash:hash}},localState:state}),true);
});
