import{isS4OwnedCenterHealBinding}from'../s4-progression-native/center-heal-binding.mjs';
import {isCenterInteriorHealBinding} from '../center-interior/heal-binding.mjs';
import{isS5HealBinding}from'../jungle-native/main_ui_candidate/s5-heal-binding.mjs';
import {isJangmokHealBinding} from '../../world/jangmok-service-bindings.mjs';
import {isGohyeonHealBinding} from '../../world/gohyeon-heal-binding.mjs';
import {HealingPreview, DURATION} from './approved-animation/healing.mjs';
import {validateCanonicalStorySave} from '../../story/save.mjs';
import {canonicalHp} from '../../canonical-session.mjs';
import {FIELD_MODES} from '../../field-behavior.mjs';
import {pointDistance} from '../../world/definition.mjs';

const leases = new WeakMap();
const stable = value => JSON.stringify(value);
const freeze = value => {if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value)}return value};
const fingerprint = s => stable({sessionId:s.sessionId, revision:s.revision, position:s.position, party:s.party, box:s.box});
const fail = code => { throw new Error(code); };

/** Development-only binding. All mutations still belong to CanonicalWorld.interact.
 * No save adapter, storage API, HP formula, economy rule or party-count selector here.
 * The field lease blocks other world operations during the visual sequence. */
export function createCanonicalCenterHost(world,pointId,options={}) {return createHost(world,pointId,{nativePost:options.nativePost??false});}
export function createSelectedCenterHost(world,binding) {if(!(isCenterInteriorHealBinding(binding)||isS4OwnedCenterHealBinding(binding)||isGohyeonHealBinding(binding)||isJangmokHealBinding(binding)||isS5HealBinding(binding))||!binding.canHeal())fail('SELECTED_HEAL_BINDING_REQUIRED');return createHost(world,binding.pointId,{selected:binding,selection:binding.capture(world)});}
function createHost(world, pointId, {nativePost=false,selected=null,selection=null}={}) {
  let committedTransactionId=null;
  if(nativePost && (pointId!=='heal:POST'||typeof world?.interactNative!=='function'))fail('NATIVE_POST_HEAL_REQUIRED');
  if (!world?.story || !world?.field?.core || typeof world.interact !== 'function') fail('CANONICAL_WORLD_REQUIRED');
  function check(snapshot, {ownedLease = null} = {}) {
    const point = world.definition.points[pointId];
    if (!point || point.kind !== 'heal') fail('CENTER_POINT_REQUIRED');
    if(selected){if(!selected.isCurrent(selection,world))fail('SELECTED_HEAL_SESSION_CHANGED');}else if(nativePost){if(snapshot.position.scene!=='world:hub:POST'||snapshot.world?.mapId!=='world:hub:POST')fail('NATIVE_POST_SCENE_REQUIRED');}else if (pointDistance(snapshot.position, point) > 1) fail('CENTER_OUT_OF_RANGE');
    if (snapshot.enhancedLeague?.phase === 'active') fail('CENTER_LEAGUE_LOCKED');
    if (world.busy) fail('WORLD_BUSY');
    if (world.field.menu !== null) fail('WORLD_MENU_OPEN');
    if (ownedLease) {
      if (leases.get(world) !== ownedLease || world.field.core.lock !== ownedLease.token) fail('CENTER_LEASE_LOST');
      if (world.field.core.mode!==FIELD_MODES.SCRIPTED || world.field.core.sequence || world.field.core.pendingBattle || world.field.transition || world.field.dialogue.length) fail('WORLD_INPUT_LOCKED');
    } else if (world.inputLocked || leases.has(world)) fail('WORLD_INPUT_LOCKED');
  }
  return {
    snapshot: () => world.snapshot(),
    validate: s => validateCanonicalStorySave(s, world.catalog),
    check,
    acquire() {
      if (leases.has(world) || world.inputLocked) fail('WORLD_INPUT_LOCKED');
      const previous = world.field.core.lock, previousMode = world.field.core.mode;
      const lease = {token:Symbol('center-service-visual-lease'), released:false};
      lease.release = () => {
        if (lease.released) return;
        lease.released = true;
        // Never erase a lock acquired by another scene/operation.
        if (world.field.core.lock === lease.token) {world.field.core.lock = previous;world.field.core.mode=previousMode;world.field.moving=false;}
        if (leases.get(world) === lease) leases.delete(world);
      };
      leases.set(world, lease);
      world.field.core.lock = lease.token;
      world.field.core.mode=FIELD_MODES.SCRIPTED;world.field.moving=false;
      return lease;
    },
    commit({transactionId, lease}) {
      // No await between releasing our visual lease and entering the existing
      // operation lock: interact() enters operation() synchronously.
      if(selected&&!selected.isCurrent(selection,world))fail('SELECTED_HEAL_SESSION_CHANGED');
      lease.release();
      committedTransactionId=transactionId;if(selected)return selected.heal(transactionId);return nativePost?world.interactNative(pointId,{type:'heal',transactionId}):world.interact(pointId, {type:'heal', transactionId});
    },
    verifyCommitted({result, before}) {
      // A fulfilled Promise is not proof of a heal. In particular a duplicate
      // transaction may resolve without applying its action to a damaged party.
      if(Object.hasOwn(before.economy?.transactions??{},committedTransactionId))fail('HEAL_TRANSACTION_REPLAY');
      if(!result || typeof result!=='object' || result.ok===false)fail('HEAL_RESULT_NOT_A_COMMITTED_SNAPSHOT');
      const returned=validateCanonicalStorySave(result,world.catalog);
      const current=validateCanonicalStorySave(world.snapshot(),world.catalog);
      if(stable(returned)!==stable(current))fail('HEAL_RESULT_NOT_CURRENT');
      if(stable(current.position)!==stable(before.position))fail('HEAL_POSITION_CHANGED');
      if(world.story.pendingCommit)fail('HEAL_COMMIT_PENDING');
      if(current.sessionId!==before.sessionId || current.revision<=before.revision)fail('HEAL_COMMIT_NOT_OBSERVED');
      for(const key of ['progress','inventory'])if(stable(current[key])!==stable(before[key]))fail('HEAL_UNRELATED_STATE_CHANGED');
      if(stable(current.box)!==stable(before.box))fail('HEAL_BOX_CHANGED');
      if(current.party.length!==before.party.length)fail('HEAL_PARTY_CHANGED');
      for(let i=0;i<before.party.length;i++) {
        const old=before.party[i],mon=current.party[i];
        if(mon.instanceId!==old.instanceId || mon.hp!==canonicalHp(world.catalog,mon.speciesId,mon.level) || mon.status!==null || mon.statusState!==undefined)fail('HEAL_PARTY_NOT_RECOVERED');
        if(mon.moves.some(m=>m.pp!==world.catalog.getMoveById(m.id).pp))fail('HEAL_PP_NOT_RECOVERED');
        // Compare all non-recovery fields without modifying either snapshot.
        const omitRecovery=m=>{const {hp,status,statusState,moves,...rest}=m;return {...rest,moves:moves.map(({pp,...move})=>move)}};
        if(stable(omitRecovery(mon))!==stable(omitRecovery(old)))fail('HEAL_PARTY_IDENTITY_CHANGED');
      }
      return true;
    },
    pendingCommit: () => !!world.story.pendingCommit
  };
}

/** One run = immutable validated party snapshot -> unmodified R4 animation ->
 * one canonical service call. The R4 preview's 3900ms demo callback is NOT a
 * gameplay hook: commit happens only after retrieval at 5200ms. */
export class CenterServiceAdapter {
  constructor({host, acquireControls=()=>()=>{}, onChange=()=>{}, onHealed=()=>{}, transactionIdFactory=()=>`center-${globalThis.crypto.randomUUID()}`}={}) {
    if (!host || ['snapshot','validate','check','acquire','commit','verifyCommitted'].some(k=>typeof host[k]!=='function')) fail('CENTER_HOST_REQUIRED');
    this.host=host;this.acquireControls=acquireControls;this.onChange=onChange;this.onHealed=onHealed;this.transactionIdFactory=transactionIdFactory;
    this.preview=new HealingPreview();this.state='idle';this.run=null;this.disposed=false;this.lastResult=null;this.warnings=[];
  }
  get busy() { return !!this.run; }
  snapshot() { return {state:this.state,busy:this.busy,disposed:this.disposed,animation:this.preview.snapshot(),result:this.lastResult}; }
  notify() { if(this.disposed)return;try{this.onChange(this.snapshot())}catch(e){this.warnings.push({hook:'onChange',message:e.message})} }
  start() {
    if(this.disposed)return {accepted:false,reason:'DISPOSED'};
    if(this.run)return {accepted:false,reason:'BUSY'};
    const run={lease:null,releaseControls:null,settled:false,committed:false,notified:false};
    this.run=run;
    run.completion=new Promise(resolve=>run.resolve=resolve);
    try {
      const raw=this.host.snapshot();
      // Reject empty/malformed values without selecting box members or truncating >6.
      if(!Array.isArray(raw?.party))fail('INVALID_PARTY');
      if(raw.party.length===0)fail('EMPTY_PARTY');
      if(raw.party.length>6)fail('INVALID_PARTY_SIZE');
      const snapshot=this.host.validate(raw);
      this.host.check(snapshot);
      run.snapshot=freeze(structuredClone(snapshot));run.fingerprint=fingerprint(snapshot);
      run.transactionId=this.transactionIdFactory();
      if(typeof run.transactionId!=='string'||!run.transactionId)fail('TRANSACTION_ID_REQUIRED');
      run.lease=this.host.acquire();
      run.releaseControls=this.acquireControls();
      if(typeof run.releaseControls!=='function')fail('CONTROL_RELEASE_REQUIRED');
      this.state='animating';this.lastResult=null;
      this.preview.start(snapshot.party.length); // HP=0 belongs to the party, too.
      this.notify();
      return {accepted:true,completion:run.completion};
    } catch(error) {
      this.finish(run,{status:'rejected',reason:error.message,healed:false});
      return {accepted:false,reason:error.message,completion:run.completion};
    }
  }
  tick(timestamp) {
    const run=this.run;if(!run||this.state!=='animating')return this.snapshot();
    try {
      this.preview.tick(timestamp);
      if(this.preview.elapsed>=DURATION) {
        const current=this.host.validate(this.host.snapshot());
        if(fingerprint(current)!==run.fingerprint)fail('SESSION_CHANGED_DURING_ANIMATION');
        this.host.check(current,{ownedLease:run.lease});
        this.state='committing';run.committed=true;
        // Set state before invocation; even a synchronous callback cannot commit twice.
        Promise.resolve(this.host.commit({transactionId:run.transactionId,lease:run.lease,snapshot:run.snapshot}))
          .then(result=>{run.serviceResolved=true;if(this.host.verifyCommitted({result,before:run.snapshot})!==true)fail('HEAL_COMPLETION_UNVERIFIED');this.finish(run,{status:'succeeded',healed:true,transactionId:run.transactionId,result})})
          .catch(error=>this.finish(run,{status:'failed',healed:false,reason:error.message,requiresReconciliation:run.serviceResolved===true||this.host.pendingCommit?.()===true,completionVerified:false}));
      }
      this.notify();
    } catch(error) {this.finish(run,{status:'failed',reason:error.message,healed:false,requiresReconciliation:this.host.pendingCommit?.()===true})}
    return this.snapshot();
  }
  cancel(reason='cancelled') {
    if(!this.run)return {accepted:false,reason:'NOT_RUNNING'};
    // Existing service/persist has no abort API. Never report an in-flight commit
    // as cancelled, never retry it, and never claim its effect was undone.
    if(this.state==='committing')return {accepted:false,reason:'COMMIT_IN_PROGRESS',completion:this.run.completion};
    this.finish(this.run,{status:'cancelled',reason,healed:false});
    return {accepted:true};
  }
  finish(run,result) {
    if(run.settled)return;
    run.settled=true;
    try {run.lease?.release()}catch(e){this.warnings.push({hook:'lease-release',message:e.message})}
    try {run.releaseControls?.()}catch(e){this.warnings.push({hook:'control-release',message:e.message})}
    this.preview.cancel();this.run=null;this.state=result.status;this.lastResult=result;
    if(result.healed&&!run.notified&&!this.disposed){run.notified=true;try{this.onHealed(result)}catch(e){this.warnings.push({hook:'onHealed',message:e.message})}}
    run.resolve(result);this.notify();
  }
  dispose() {
    const result=this.cancel('disposed');this.disposed=true;
    // A commit already accepted by the canonical service continues to settlement;
    // finish() still releases controls, but does not call detached UI callbacks.
    return result;
  }
}

export function bindCenterLifecycle(adapter,{documentTarget=document,windowTarget=window}={}) {
  const hidden=()=>{if(documentTarget.hidden)adapter.cancel('hidden')};
  const pagehide=()=>adapter.cancel('pagehide');
  const keydown=e=>{if(e.key==='Escape'){e.preventDefault();adapter.cancel('escape')}};
  documentTarget.addEventListener('visibilitychange',hidden);
  windowTarget.addEventListener('pagehide',pagehide);
  windowTarget.addEventListener('keydown',keydown);
  return ()=>{documentTarget.removeEventListener('visibilitychange',hidden);windowTarget.removeEventListener('pagehide',pagehide);windowTarget.removeEventListener('keydown',keydown);adapter.dispose()};
}
