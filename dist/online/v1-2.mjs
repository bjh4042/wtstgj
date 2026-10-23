import {sha256} from '../compatibility/codec.mjs';

// Transport independent protocol checks. Call only with verified canonical bytes;
// the Firebase rules still enforce membership and append-only writes server-side.
const ROOM=/^[A-HJ-NP-Z2-9]{8}$/;
const NONCE=/^[0-9a-f]{32}$/;
const HASH=/^[0-9a-f]{64}$/;
const TURN=/^T(00[1-9]|0[1-9][0-9]|[1-9][0-9]{2})$/;
const fail=(code,message=code)=>{const error=Error(message);error.code=code;throw error};
const assert=(ok,code,message)=>{if(!ok)fail(code,message)};
const nameOkay=name=>typeof name==='string'&&name.length<=12&&!/[\u0000-\u001f\u007f<>]/u.test(name);
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const bytesToHex=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');

export function createOnlineV12({master,battleBytes,battle,randomBytes=length=>globalThis.crypto.getRandomValues(new Uint8Array(length))}){
 assert(master?.meta?.protocol_version===1&&master?.scope?.mode==='friend_room_code_1v1_singles','VERSION_MISMATCH');
 assert(typeof battleBytes==='string'&&sha256(battleBytes)===master.meta.battle_master_sha256,'VERSION_MISMATCH','Battle canonical bytes differ from Online v1.2');
 assert(battle?.meta?.version===master.meta.battle_master_version&&battle?.meta?.version===JSON.parse(battleBytes).meta.version,'VERSION_MISMATCH');
 assert(master.scope.party_size.min===1&&master.scope.party_size.max===6&&master.scope.single_player_progress_effect===false&&master.privacy.global_room_listing===false&&master.scope.chat===false,'VERSION_MISMATCH');
 const moveIds=new Set(battle.move_catalog?.map(m=>m.id));
 assert(moveIds.size===117,'VERSION_MISMATCH');
 const version=master.meta.battle_master_version,hash=master.meta.battle_master_sha256;
 function random(length){const bytes=randomBytes(length);assert(bytes instanceof Uint8Array&&bytes.length===length,'PARTY_INVALID','Secure random source required');return bytes}
 function roomCode(){const alphabet=master.privacy.room_code.alphabet;assert(alphabet.length===32,'VERSION_MISMATCH');return [...random(8)].map(b=>alphabet[b&31]).join('')}
 function nonce(){return bytesToHex(random(16))}
 function checkRoom(room){assert(ROOM.test(room),'ROOM_NOT_FOUND');return room}
 function preflight(save,selectedIds,{displayName='탐험가'}={}){
  assert(save?.schemaVersion===3&&save.progress?.completedEvents?.includes('FINAL_CHAMPION')&&save.progress?.flags?.MAIN_STORY_CLEAR===true&&save.progress?.flags?.POST_UNLOCKED===true&&save.progress?.flags?.ONLINE_FRIEND_BATTLE_UNLOCKED===true,'PARTY_INVALID','Online friend battle requires FINAL_CHAMPION and POST unlock');
  assert(nameOkay(displayName),'PARTY_INVALID','Invalid display name');
  assert(Array.isArray(selectedIds)&&selectedIds.length>=1&&selectedIds.length<=6&&new Set(selectedIds).size===selectedIds.length,'PARTY_INVALID');
  const instances=save.creatures?.instances??{},owned=new Set(save.player?.partyInstanceIds??[]);
  return selectedIds.map((id,index)=>{
   const mon=own(instances,id)&&owned.has(id)?instances[id]:null;
   assert(mon&&Number.isInteger(mon.speciesNo)&&mon.speciesNo>=1&&mon.speciesNo<=151&&Number.isInteger(mon.level)&&mon.level>=1&&mon.level<=100,'PARTY_INVALID');
   assert((mon.nickname===null||mon.nickname===undefined||nameOkay(mon.nickname))&&Array.isArray(mon.moves)&&mon.moves.length>=1&&mon.moves.length<=4&&mon.moves.every(m=>moveIds.has(m.moveId)),'PARTY_INVALID');
   return {memberIndex:index,speciesNo:mon.speciesNo,level:mon.level,nickname:mon.nickname??'',moveIds:mon.moves.map(m=>m.moveId)};
  });
 }
 function verifyRoom(roomCode,room,{uid,now}={}){
  checkRoom(roomCode);
  assert(room&&room.protocolVersion===1&&room.battleMasterVersion===version&&room.battleMasterHash===hash,'VERSION_MISMATCH');
  assert(NONCE.test(room.hostNonce)&&(!room.guestUid||NONCE.test(room.guestNonce)),'VERSION_MISMATCH');
  assert(['WAITING','ACTIVE','FINISHED','ABORTED'].includes(room.status),'ROOM_ABORTED');
  assert(typeof uid==='string'&&[room.hostUid,room.guestUid].includes(uid),'AUTH_REQUIRED');
  assert(Number.isFinite(room.expiresAt)&&Number.isFinite(now)&&now<room.expiresAt,'ROOM_EXPIRED');
  return room;
 }
 function roomDraft({uid,displayName='탐험가',code=roomCode(),hostNonce=nonce(),now,ttlMs=600000}){
  checkRoom(code);assert(typeof uid==='string'&&uid.length>0&&nameOkay(displayName)&&NONCE.test(hostNonce),'PARTY_INVALID');
  assert(Number.isSafeInteger(now)&&Number.isSafeInteger(ttlMs)&&ttlMs>0&&ttlMs<=7200000,'ROOM_EXPIRED');
  return {roomCode:code,room:{protocolVersion:1,battleMasterVersion:version,battleMasterHash:hash,status:'WAITING',hostUid:uid,createdAt:now,expiresAt:now+ttlMs,hostNonce,profiles:{[uid]:{role:'host',displayName}}}};
 }
 function canActivate(room){
  assert(room?.status==='WAITING'&&room.hostUid&&room.guestUid&&room.hostUid!==room.guestUid&&NONCE.test(room.hostNonce)&&NONCE.test(room.guestNonce),'READY_LOCKED');
  for(const uid of [room.hostUid,room.guestUid])assert(room.ready?.[uid]===true&&Array.isArray(room.parties?.[uid])&&room.parties[uid].length>=1&&room.parties[uid].length<=6,'READY_LOCKED');
  return true;
 }
 function canResume(room,uid,now){
  assert([room?.hostUid,room?.guestUid].includes(uid)&&Number.isFinite(now),'AUTH_REQUIRED');
  const presence=room.presence?.[uid];
  return !!presence&&Number.isFinite(presence.lastSeenAt)&&now-presence.lastSeenAt<=30000&&now>=presence.lastSeenAt&&room.status==='ACTIVE';
 }
 function seed(roomCode,hostNonce,guestNonce){
  checkRoom(roomCode);assert(NONCE.test(hostNonce)&&NONCE.test(guestNonce),'VERSION_MISMATCH');
  const digest=sha256(`GMON-ONLINE-V1|${roomCode}|${hostNonce}|${guestNonce}|${hash}`);
  return Number.parseInt(digest.slice(0,8),16)>>>0;
 }
 function rng(initialSeed){let state=initialSeed>>>0;assert(Number.isSafeInteger(initialSeed)&&initialSeed>=0&&initialSeed<=0xffffffff,'VERSION_MISMATCH');return Object.freeze({nextU32(){state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0},nextFloat(){return this.nextU32()/4294967296},get stateU32(){return state>>>0}})}
 function canonicalAction(action){
  assert(action&&['move','switch','forfeit'].includes(action.kind)&&Number.isInteger(action.slot),'PARTY_INVALID');
  assert(action.kind==='move'?action.slot>=0&&action.slot<=3:action.kind==='switch'?action.slot>=0&&action.slot<=5:action.slot===-1,'PARTY_INVALID');
  return `{"kind":"${action.kind}","slot":${action.slot}}`;
 }
 function commit(action,actionNonce,roomCode,turnKey){checkRoom(roomCode);assert(TURN.test(turnKey)&&NONCE.test(actionNonce),'INVALID_REVEAL');return sha256(`${canonicalAction(action)}|${actionNonce}|${roomCode}|${turnKey}`)}
 function verifyReveal({action,nonce:actionNonce,roomCode,turnKey,commitHash,bothCommits}){assert(bothCommits===true&&HASH.test(commitHash),'INVALID_REVEAL');assert(commit(action,actionNonce,roomCode,turnKey)===commitHash,'INVALID_REVEAL');return true}
 // Fixed field order is part of protocol v1. No visual names or local state.
 function canonicalState({turnKey,rngStateU32,host,guest,terminal}){
  assert(TURN.test(turnKey)&&Number.isInteger(rngStateU32)&&rngStateU32>=0&&rngStateU32<=0xffffffff,'DESYNC');
  const side=s=>{assert(s&&Number.isInteger(s.activeIndex)&&s.activeIndex>=0&&s.activeIndex<=5&&Array.isArray(s.members)&&s.members.length>=1&&s.members.length<=6&&s.activeIndex<s.members.length,'DESYNC');return {activeIndex:s.activeIndex,members:s.members.map(m=>{assert(Number.isInteger(m.hp)&&m.hp>=0&&Array.isArray(m.pp)&&m.pp.length>=1&&m.pp.length<=4&&m.pp.every(x=>Number.isInteger(x)&&x>=0)&&[null,'poison','bad_poison','burn','paralysis','sleep','freeze'].includes(m.status),'DESYNC');return {hp:m.hp,status:m.status,pp:m.pp}})}};
  return JSON.stringify({turnKey,rngStateU32,host:side(host),guest:side(guest),terminal:terminal??null});
 }
 function stateHash(state){return sha256(canonicalState(state))}
 function verifyAcks({turnKey,hostAck,guestAck,bothReveals,localState}){assert(TURN.test(turnKey)&&bothReveals===true&&HASH.test(hostAck?.stateHash)&&HASH.test(guestAck?.stateHash),'DESYNC');assert(hostAck.stateHash===guestAck.stateHash&&hostAck.stateHash===stateHash(localState),'DESYNC');return true}
 function verifyTurn({roomCode,turnKey,hostUid,guestUid,commits,reveals,acks,localState}){
  assert(hostUid&&guestUid&&hostUid!==guestUid&&commits&&reveals&&acks,'INVALID_REVEAL');
  for(const uid of [hostUid,guestUid])verifyReveal({action:reveals[uid],nonce:reveals[uid]?.nonce,roomCode,turnKey,commitHash:commits[uid],bothCommits:HASH.test(commits[hostUid])&&HASH.test(commits[guestUid])});
  return verifyAcks({turnKey,hostAck:acks[hostUid],guestAck:acks[guestUid],bothReveals:true,localState});
 }
 return Object.freeze({version,hash,roomCode,nonce,checkRoom,preflight,verifyRoom,roomDraft,canActivate,canResume,seed,rng,canonicalAction,commit,verifyReveal,canonicalState,stateHash,verifyAcks,verifyTurn});
}
