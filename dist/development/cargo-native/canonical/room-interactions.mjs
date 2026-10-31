// Isolated development adapter. No canonical save, battle, inventory or actor ownership.
import {CODE_CARDS, CODE_ORDER, ORDER_HINT} from './content.mjs';

export const DEV_NAMESPACE = 'geoje.dev.cargo-room-interactions.1411';
export const BOSS_EVENT = 'BLACKNET_HWIGYEONG_FINAL';
export const BOSS_FLAG = 'S9_BLACKNET_BOSS_DEFEATED';
export const RESCUE_EVENT = 'S9_RELEASE_RESCUED';
export const RESCUE_FLAG = 'S9_FINAL_RESCUE_COMPLETE';
const copy = x => structuredClone(x);
const point = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const same = (a,b) => point(a) && point(b) && a.every((v,i) => v === b[i]);
const near = (a,b) => point(a) && point(b) && a.every((v,i) => Math.abs(v-b[i]) <= 8);
const ordered = ids => Array.isArray(ids) && ids.length === CODE_ORDER.length && ids.every((id,i) => id === CODE_ORDER[i]);
const fresh = () => ({namespace:DEV_NAMESPACE, version:1, visitedRoomIds:[], readClueIds:[], acceptedCardOrder:null});

export class CargoRoomInteractions {
  #contract; #state; #pending=null; #armed=null; #sequence=0; #draft=[];
  constructor(contract, state=null) {
    this.#contract=copy(contract);
    if (contract.rooms.length!==15 || new Set(contract.rooms.map(r=>r.roomId)).size!==15 ||
        new Set(contract.rooms.map(r=>r.clue.id)).size!==15 || !ordered(contract.gateRequirements.correctCardOrder)) throw Error('Contract mismatch');
    for(const card of CODE_CARDS) for(const id of card.rooms) {
      const r=contract.rooms.find(r=>r.roomId===id);
      if(!r || r.clue.content.cardId!==card.id || r.clue.content.clueId!==r.clue.id) throw Error('Clue/card mismatch');
    }
    this.#state=this.#validate(state);
  }
  #validate(raw) {
    if(raw===null || raw===undefined) return fresh();
    const expected=Object.keys(fresh());
    if(!raw || Object.keys(raw).length!==expected.length || Object.keys(raw).some(k=>!expected.includes(k)) ||
       raw.namespace!==DEV_NAMESPACE || raw.version!==1) throw Error('Invalid development checkpoint namespace/schema');
    const rooms=this.#contract.rooms, ids=rooms.map(r=>r.roomId), clues=rooms.map(r=>r.clue.id);
    for(const [key,allowed] of [['visitedRoomIds',ids],['readClueIds',clues]]) {
      if(!Array.isArray(raw[key]) || new Set(raw[key]).size!==raw[key].length || raw[key].some(id=>!allowed.includes(id))) throw Error('Invalid development checkpoint IDs');
    }
    if(rooms.some(r=>raw.readClueIds.includes(r.clue.id) && !raw.visitedRoomIds.includes(r.roomId))) throw Error('Read without visited room');
    if(raw.acceptedCardOrder!==null && (!ordered(raw.acceptedCardOrder) || raw.visitedRoomIds.length!==15 || raw.readClueIds.length!==15)) throw Error('Accepted answer without complete evidence');
    return copy(raw);
  }
  snapshot(){return copy(this.#state);}
  get pending(){return !!this.#pending;}
  get draft(){return [...this.#draft];}
  get passwordAccepted(){return ordered(this.#state.acceptedCardOrder);}
  room(roomId,mapId){return this.#contract.rooms.find(r=>r.roomId===roomId && r.mapId===mapId);}
  cancelContext(){this.#pending=null;this.#armed=null;this.#draft=[];this.#sequence++;}
  reset(){this.cancelContext();this.#state=fresh();}
  load(raw){const next=this.#validate(raw);this.cancelContext();this.#state=next;}

  // 1px route consumers may sample the exact threshold. Keep only a continuous
  // outside -> on-line -> inside crossing, not a teleport, room selection or arrival.
  recordMovement({roomId,mapId,from,to,doorProgress}) {
    const r=this.room(roomId,mapId);
    if(!r || !point(from) || !point(to) || doorProgress!==1 || Math.hypot(to[0]-from[0],to[1]-from[1])>8) {this.#armed=null;return false;}
    const d=r.door, axis=d.asset==='side'?0:1, other=1-axis;
    const sign=Math.sign(d.switchInteractionPadCenters[0][axis]-d.pivotWorld[axis]);
    const a=(from[axis]-d.pivotWorld[axis])*sign, b=(to[axis]-d.pivotWorld[axis])*sign;
    const clear=d.clearWidth/2-(axis===0?18:24);
    if([from,to].some(p=>Math.abs(p[other]-d.pivotWorld[other])>clear)) {this.#armed=null;return false;}
    if(this.#armed && (this.#armed.roomId!==roomId || !same(this.#armed.last,from))) this.#armed=null;
    let crossed=a<0 && b>0;
    if(a<0 && b===0) this.#armed={roomId,from:[...from],last:[...to]};
    else if(a===0 && b===0 && this.#armed) this.#armed.last=[...to];
    else if(a===0 && b>0 && this.#armed) {
      crossed=Math.hypot(to[0]-this.#armed.from[0],to[1]-this.#armed.from[1])<=96;
      this.#armed=null;
    } else this.#armed=null;
    if(!crossed || this.#state.visitedRoomIds.includes(roomId)) return false;
    this.#state.visitedRoomIds.push(roomId);return true;
  }
  requestRead({roomId,mapId,foot,explicitInteract}) {
    const r=this.room(roomId,mapId);
    if(this.#pending || !r || explicitInteract!==true || !this.#state.visitedRoomIds.includes(roomId) || !near(foot,r.clue.approach)) return null;
    const token=++this.#sequence, content=copy(r.clue.content);
    this.#pending={token,roomId,mapId,displayed:false};
    return {token,roomId,mapId,clueId:r.clue.id,content,alreadyRead:this.#state.readClueIds.includes(r.clue.id)};
  }
  acknowledgeDisplayed({token,text,roomId,mapId,foot}) {
    const p=this.#pending,r=this.room(roomId,mapId);
    if(!p || token!==p.token || p.roomId!==roomId || p.mapId!==mapId || !r || !near(foot,r.clue.approach) || text!==r.clue.content.text) return false;
    p.displayed=true;return true;
  }
  confirmRead({token,roomId,mapId,foot}) {
    const p=this.#pending,r=this.room(roomId,mapId);
    if(!p || !p.displayed || token!==p.token || p.roomId!==roomId || p.mapId!==mapId || !r || !near(foot,r.clue.approach)) return {ok:false,reason:'DISPLAY_CONFIRMATION_REQUIRED'};
    const duplicate=this.#state.readClueIds.includes(r.clue.id);
    if(!duplicate) this.#state.readClueIds.push(r.clue.id);
    this.#pending=null;return {ok:true,duplicate};
  }
  cancelRead(){this.#pending=null;this.#sequence++;}
  readyForCode(){return this.#contract.rooms.every(r=>this.#state.visitedRoomIds.includes(r.roomId) && this.#state.readClueIds.includes(r.clue.id));}
  notebook() {
    const s=this.#state;
    return {visited:s.visitedRoomIds.length,read:s.readClueIds.length,total:15,orderHint:ORDER_HINT,
      cards:CODE_CARDS.map(card=>{
        const fragments=card.rooms.map(id=>this.#contract.rooms.find(r=>r.roomId===id)).sort((a,b)=>a.clue.content.fragmentOffset-b.clue.content.fragmentOffset);
        const available=fragments.every(r=>s.readClueIds.includes(r.clue.id));
        return {id:card.id,role:card.role,available,label:fragments.map(r=>s.readClueIds.includes(r.clue.id)?r.clue.content.answer:'□').join('')};
      }),entries:this.#contract.rooms.map(r=>({roomId:r.roomId,clueId:r.clue.id,name:r.name,visited:s.visitedRoomIds.includes(r.roomId),read:s.readClueIds.includes(r.clue.id),content:s.readClueIds.includes(r.clue.id)?copy(r.clue.content):null}))};
  }
  selectCard(id) {
    if(this.pending || this.#draft.length>=6 || this.#draft.includes(id) || !this.notebook().cards.find(c=>c.id===id)?.available) return false;
    this.#draft.push(id);return true;
  }
  undoCard(){return this.pending?undefined:this.#draft.pop();}
  clearCards(){this.#draft=[];}
  submitCards({mapId,foot,explicitInteract}={}) {
    if(this.pending) return {ok:false,reason:'READ_DIALOG_PENDING'};
    if(explicitInteract!==true || mapId!==this.#contract.bossGate.mapId || !near(foot,this.#contract.bossGate.switchInteractionPadCenters[0])) return {ok:false,reason:'BOSS_TERMINAL_APPROACH_REQUIRED'};
    if(!this.readyForCode()) return {ok:false,reason:'ALL_15_READS_REQUIRED'};
    if(!ordered(this.#draft)) return {ok:false,reason:'WRONG_CARD_ORDER'};
    const duplicate=this.passwordAccepted;
    this.#state.acceptedCardOrder=[...this.#draft];return {ok:true,duplicate};
  }
}

// Read-only future integration boundary, deliberately unbound in the development UI.
// Booleans supplied by a caller are not independent proof of a production save.
export function evaluateBossGate(puzzle,contract,host=null) {
  const result={ready:false,location:'BOSS_APPROACH_NOT_BRIDGE_MAP_ENTRY',writesCanonicalState:false,
    bossEvent:BOSS_EVENT,bossFlag:BOSS_FLAG,rescueEvent:RESCUE_EVENT,rescueFlag:RESCUE_FLAG};
  if(!puzzle.readyForCode()) return {...result,reason:'ALL_15_VISITS_AND_READS_REQUIRED'};
  if(!puzzle.passwordAccepted) return {...result,reason:'EXACT_SIX_CARD_ORDER_REQUIRED'};
  if(puzzle.pending) return {...result,reason:'READ_DIALOG_PENDING'};
  if(!host || typeof host.readCommittedContext!=='function' || typeof host.trainerAvailable!=='function') return {...result,reason:'HOLD_HOST_UNBOUND'};
  let context;
  try{context=host.readCommittedContext();}catch{return {...result,reason:'HOLD_HOST_READ_FAILED'};}
  if(!context || typeof context.sessionId!=='string' || !context.sessionId || !Number.isSafeInteger(context.revision) || context.revision<0 || context.validated!==true || context.durable!==true || context.busy!==false || context.pendingCommit!==false) return {...result,reason:'HOLD_UNCOMMITTED_HOST_CONTEXT'};
  const missingFlags=contract.gateRequirements.existingFlags.filter(id=>context.snapshot?.progress?.flags?.[id]!==true);
  if(missingFlags.length) return {...result,reason:'EXISTING_FOUR_FLAGS_REQUIRED',missingFlags};
  let available=false;
  try{available=host.trainerAvailable(BOSS_EVENT,context.sessionId,context.revision)===true;}catch{return {...result,reason:'HOLD_HOST_READ_FAILED'};}
  if(!available) return {...result,reason:'HOST_TRAINER_UNAVAILABLE'};
  return {...result,ready:true,reason:'HOST_BOUND_GATE_ELIGIBLE',sessionId:context.sessionId,revision:context.revision};
}
