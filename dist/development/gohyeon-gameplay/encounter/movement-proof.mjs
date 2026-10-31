import{WETLAND_ENCOUNTER as WETLAND_WILD}from'../../hacheong-wetland/encounter-registration.mjs';
import{PROLOGUE_WILD}from'../../prologue-field/wild-registration.mjs';
import{createLabScene,readOwnedLabPose,ownedLabWorld}from'../../lab-interior/lab-scene.mjs';
import{BRACKISH_ENCOUNTER as BRACKISH_WILD}from'../../hacheong-brackish/encounter-registration.mjs';
import {createShopInteriorScene} from '../../shop-interior/shop-interior-scene.mjs';
import {createCenterInteriorScene} from '../../center-interior/center-interior-scene.mjs';
import{createGym4Scene}from'../../gohyeon-gym4/scene.mjs';
import{S4HubScene}from'../../gohyeon-pair/hub-scene.mjs';
import{AnimatedS4TargetScene}from'../../gohyeon-pair/animated-target-scene.mjs';
import{encounterMap}from'./geometry.mjs';
const states=new WeakMap(),authorities=new WeakMap(),grants=new WeakMap(),V=Object.freeze({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]});
const proofFoot=scene=>{const n=scene.getLocation();return n.servicePose?.foot??n.indoorPose?.foot??n.foot};
const same=(a,b)=>a?.[0]===b?.[0]&&a?.[1]===b?.[1];
function reset(s){s.residual=0;s.table=null;s.pending=null}
const totals=w=>{const n=w.snapshot();return[n.world.walkedTiles,n.world.walkedMsEstimate,n.economy?.walkedDistance??0,!!n.economy?.policyId]};
const counterAck=(p,w)=>{const a=totals(w),b=p.baseCounters;return b&&a[0]===b[0]+1&&a[1]===b[1]+w.definition.walkMs&&a[2]===b[2]+(b[3]?48:0)&&a[3]===b[3]};
function credit(s,from,to){s.carry++;const a=s.geo?.tableAt(from),b=s.geo?.tableAt(to);if(!a||a!==b){s.residual=0;s.table=b??null}else{if(s.table!==a){s.residual=0;s.table=a}s.residual++}const counterDue=s.carry===48,encounterDue=s.residual===48;if(counterDue)s.carry=0;if(encounterDue)s.residual=0;if(counterDue||encounterDue){s.pending={id:++s.localSerial,table:encounterDue?a:null,counterDue,encounterDue,distanceCommitted:!counterDue,epoch:s.epoch,foot:[...to],state:'sealed'};return true}return false}

// Sole producer is the actual collision-checked 1px loop. No recordMove/position DTO API.
export class S4EncounterTargetScene extends AnimatedS4TargetScene{
 constructor({encounterGeometry,...options}){const geo=encounterMap(encounterGeometry,options.location?.mapId);if(options.location?.imageSHA!==geo.imageSHA||options.location?.maskSHA!==geo.maskSHA)throw Error('ENCOUNTER_SCENE_PIN_MISMATCH');super({...options,safeMask:geo.safeMask()});const foot=this.location.foot;if(!Array.isArray(foot)||foot.length!==2||foot.some(v=>!Number.isInteger(v))||this.mask[foot[1]*this.row.width+foot[0]]!==1)throw Error('ENCOUNTER_INITIAL_FOOT_UNSUPPORTED');states.set(this,{geo,carry:options.location?.movement?.carry??0,residual:0,table:null,pending:null,localSerial:0,lastFoot:[...foot],epoch:this.sessionEpoch})}
 frame(dt,dir){const s=states.get(this);if(!s)return false;if(!same(s.lastFoot,this.location.foot)||s.epoch!==this.sessionEpoch){reset(s);s.lastFoot=[...this.location.foot];this.stop();return false}if(this.world?.story?.battleSnapshot?.()||this.getGameplaySignal?.()?.aborted){s.residual=0;s.table=null;if(s.pending?.state==='sealed'){if(s.pending.counterDue&&!s.pending.distanceCommitted){s.pending.encounterDue=false;s.pending.table=null}else s.pending=null;}this.stop();return false}if(this.disposed||this.locked||this.world?.inputLocked||this.world?.busy||s.pending||!Number.isFinite(dt)||dt<0||dt>250){this.stop();return false}if(!Object.hasOwn(V,dir)){this.stop();return false}if(this.direction!==dir)this.remainder=0;this.direction=dir;this.location.facing=dir;this.remainder+=dt*.12;const steps=Math.floor(this.remainder);this.remainder-=steps;let moved=false;for(let i=0;i<steps;i++){const from=[...this.location.foot],[dx,dy]=V[dir],to=[from[0]+dx,from[1]+dy];if(to[0]<0||to[1]<0||to[0]>=this.row.width||to[1]>=this.row.height||this.mask[to[1]*this.row.width+to[0]]!==1){this.remainder=0;break}this.location.foot=to;s.lastFoot=[...to];moved=true;if(credit(s,from,to)){this.remainder=0;break}}this.walking=moved;return moved}
 getLocation(){const n=super.getLocation(),s=states.get(this);return s?{...n,movement:{version:1,carry:s.carry}}:n}
 dispose(){const s=states.get(this);if(s)reset(s);states.delete(this);super.dispose()}
}
export function createS4EncounterAuthority({getWorld,getScene}={}){if(typeof getWorld!=='function'||typeof getScene!=='function')throw Error('LIVE_ENCOUNTER_OWNER_REQUIRED');const a=Object.freeze({});authorities.set(a,{getWorld,getScene});return a}
export const isS4EncounterAuthority=a=>authorities.has(a);
function current(a,w){const o=authorities.get(a),scene=o?.getScene(),s=scene&&states.get(scene);if(!o||o.getWorld()!==w||scene?.world!==w||!s||scene.disposed||scene.sessionEpoch!==s.epoch||(!same(proofFoot(scene),s.lastFoot)||(s.nativeFloor!==undefined&&scene.scene?.session.scene!==s.nativeFloor)))return null;const snap=w.snapshot();if(snap.position.scene!==scene.mapId||snap.world.mapId!==scene.mapId)return null;return{scene,s}}
export function mintS4EncounterGrant(a,w){const c=current(a,w),p=c?.s.pending;if(!p||p.state!=='sealed'||!same(p.foot,proofFoot(c.scene)))throw Error('NATIVE_ENCOUNTER_PROOF_REQUIRED');const signal=c.scene.getGameplaySignal?.();if(!(signal instanceof AbortSignal)||signal.aborted)throw Error('NATIVE_ENCOUNTER_LIFECYCLE_REQUIRED');const serial=w.snapshot().encounter.movementSerial+1;if(!Number.isSafeInteger(serial))throw Error('ENCOUNTER_SERIAL_INVALID');p.state='claimed';p.baseSerial=serial-1;p.expectedSerial=p.encounterDue?serial:serial-1;p.attempted=false;p.baseCounters??=totals(w);const g=Object.freeze({});grants.set(g,{a,w,p,scene:c.scene,signal,serial});return g}
export function validateS4EncounterGrant(g,w){const q=grants.get(g),c=q&&current(q.a,w);return !!q&&q.w===w&&c?.scene===q.scene&&c.s.pending===q.p&&q.p.state==='claimed'&&!q.signal.aborted&&q.scene.getGameplaySignal()===q.signal&&same(q.p.foot,proofFoot(q.scene))&&w.snapshot().encounter.movementSerial===q.p.baseSerial}
export function readS4EncounterGrant(g,w){if(!validateS4EncounterGrant(g,w))throw Error('NATIVE_ENCOUNTER_PROOF_DRIFT');const q=grants.get(g),split=q.p.table?.lastIndexOf(':');return Object.freeze({areaId:q.p.table?.slice(0,split)??null,method:q.p.table?.slice(split+1)??null,serial:q.serial,signal:q.signal,areaReady:q.p.areaReady===true,counterDue:q.p.counterDue,distanceCommitted:q.p.distanceCommitted,encounterDue:q.p.encounterDue})}
export function finishS4EncounterGrant(g,w){if(arguments.length!==2)throw Error('NO_CALLER_PENDING_OVERRIDE');const pending=!!w?.story?.pendingCommit;const q=grants.get(g);if(!q||q.w!==w)return false;const s=states.get(q.scene);if(s?.pending===q.p){if(q.p.encounterDue){s.residual=0;s.table=null}if(pending)q.p.state='pending';else s.pending=null}grants.delete(g);return true}
export function reconcileS4EncounterPending(a,w){const c=current(a,w),p=c?.s.pending;if(!p||p.state!=='pending'||w.story.pendingCommit)return false;if(p.distanceAttempted&&!p.distanceCommitted){if(!counterAck(p,w))return false;p.distanceCommitted=true;if(!p.encounterDue){c.s.pending=null;return true}p.state='sealed';return true}const expected=p.attempted?p.expectedSerial:p.baseSerial;const e=w.snapshot().encounter;if(e.movementSerial!==expected)return false;if(!p.attempted){const split=p.table.lastIndexOf(':');if(e.areaId!==p.table.slice(0,split)||e.method!==p.table.slice(split+1))return false;p.areaReady=true;p.state='sealed';c.s.residual=0;c.s.table=null;return true}reset(c.s);return true}
export function encounterProofStatus(scene){const s=states.get(scene);return s?Object.freeze({carry:s.carry,residual:s.residual,table:s.table,pending:s.pending?.state??null,proofSerial:s.localSerial}):null}

export function markS4EncounterAttempt(g,w){readS4EncounterGrant(g,w);grants.get(g).p.attempted=true}
export const hasPendingS4Encounter=scene=>!!states.get(scene)?.pending;
// Production auto-dispatch uses the same main frame, never a new RAF/timer or caller proof DTO.
function autoDispatch(scene){const s=states.get(scene);if(!s||s.inFlight||s.pending?.state!=='sealed'||scene.disposed||scene.world?.busy||scene.world?.inputLocked||scene.world?.story?.pendingCommit)return null;if(typeof scene.world?.interactNativeS4Encounter!=='function')throw Error('ORIGINAL_NATIVE_ENCOUNTER_PIPELINE_REQUIRED');s.error=null;const task=Promise.resolve(scene.world.interactNativeS4Encounter());s.inFlight=task;task.then(()=>{},e=>{if(states.get(scene)===s){s.error=e.message;if(s.pending?.state==='sealed')s.pending=null}}).finally(()=>{if(states.get(scene)===s)s.inFlight=null});return task}
export class AutoS4EncounterTargetScene extends S4EncounterTargetScene{
 frame(dt,dir){const moved=super.frame(dt,dir);autoDispatch(this);return moved}
 resumePendingNativeEncounter(){const s=states.get(this);return s?.pending?.state==='sealed'&&s.pending.areaReady===true?autoDispatch(this):null}
 get encounterNotice(){const s=states.get(this);return s?.pending?.state==='pending'?'조우 기록 저장을 다시 시도해 주세요.':s?.error?'조우 처리를 확인해 주세요.':null}
}

export function markS4DistanceAttempt(g,w){readS4EncounterGrant(g,w);const p=grants.get(g).p;if(!p.counterDue||p.distanceCommitted||p.distanceAttempted)throw Error('DISTANCE_PROOF_ALREADY_CONSUMED');p.distanceAttempted=true}
export function acknowledgeS4Distance(g,w){readS4EncounterGrant(g,w);const p=grants.get(g).p;if(!p.distanceAttempted||!counterAck(p,w))throw Error('DISTANCE_COMMIT_NOT_CONFIRMED');p.distanceCommitted=true}

export class AutoS4DistanceHubScene extends S4HubScene{
 constructor(options){super(options);this.distanceSignal=new AbortController();states.set(this,{geo:null,carry:options.location?.movement?.carry??0,residual:0,table:null,pending:null,localSerial:0,lastFoot:[...(options.location.indoorPose?.foot??options.location.foot)],nativeFloor:options.registry.housePose?(options.location.indoorPose?.floor??'exterior'):undefined,epoch:this.sessionEpoch})}
 getGameplaySignal(){return this.distanceSignal.signal}
 getLocation(){const n=super.getLocation(),s=states.get(this);return s?{...n,movement:{version:1,carry:s.carry}}:n}
 frame(dt,dir){const s=states.get(this),n=this.scene;if(!s||this.disposed)return;if(s.nativeFloor===undefined&&n.session.scene!=='exterior'){super.frame(dt,dir);return}if(s.nativeFloor!==undefined&&n.session.scene!==s.nativeFloor){n.stop();throw Error('HOUSE_DISTANCE_FLOOR_OWNER_DRIFT')}n.setLocked(!!(this.world?.inputLocked||this.world?.busy));if(s.pending){n.stop();autoDispatch(this);return}if(!n.focused||n.locked||n.session.pending||!Number.isFinite(dt)||dt<0||dt>250||!Object.hasOwn(V,dir)){n.stop();return}if(!same(s.lastFoot,n.session.foot)){reset(s);s.lastFoot=[...n.session.foot];n.stop();return}if(dir!==n.direction)n.remainder=0;n.direction=dir;n.session.face(dir);n.remainder+=dt*.12;const steps=Math.floor(n.remainder);n.remainder-=steps;for(let i=0;i<steps;i++){const from=[...n.session.foot],v=V[dir],to=[from[0]+v[0],from[1]+v[1]];if(!n.safe(n.session.scene,to)){n.remainder=0;break}const result=n.session.move(dir);if(!result.ok){n.status=result.reason;n.remainder=0;break}s.lastFoot=[...to];n.status='RECOVERED_SUPPORT_MOVEMENT';if(credit(s,from,to)){n.remainder=0;break}}autoDispatch(this)}
 resumePendingNativeEncounter(){const s=states.get(this);return s?.pending?.state==='sealed'?autoDispatch(this):null}
 dispose(){this.distanceSignal.abort();states.delete(this);super.dispose()}
}

// Fixed Gym4 producer: proof bytes are created only inside the real selected walker callback.
export function createS4DistanceGym4Scene(options){
 let scene;const state={geo:null,carry:options.location?.movement?.carry??0,residual:0,table:null,pending:null,localSerial:0,lastFoot:[...options.location.foot],epoch:options.sessionEpoch};
 scene=createGym4Scene({...options,onSuccessfulPixel:step=>{if(scene.disposed||states.get(scene)!==state||state.epoch!==scene.sessionEpoch||!same(state.lastFoot,step.from)||!same(scene.getLocation().foot,step.to)||step.distance!==1||Math.abs(step.to[0]-step.from[0])+Math.abs(step.to[1]-step.from[1])!==1)throw Error('GYM4_REAL_PIXEL_PROOF_DRIFT');state.lastFoot=[...step.to];return !credit(state,step.from,step.to)}});states.set(scene,state);
 const originalLocation=scene.getLocation.bind(scene),originalFrame=scene.frame.bind(scene),originalPrepare=scene.prepareCommittedLocation.bind(scene),originalDispose=scene.dispose.bind(scene);
 scene.getGameplaySignal=()=>scene.getGym4Signal();scene.getLocation=()=>({...originalLocation(),movement:{version:1,carry:state.carry}});
 scene.prepareCommittedLocation=next=>{if(next.movement?.version!==1||next.movement.carry!==state.carry)throw Error('GYM4_PRIVATE_CARRY_DRIFT');return originalPrepare({...next,movement:originalLocation().movement})};
 scene.frame=(dt,dir)=>{if(scene.disposed||scene.locked||scene.world?.field?.menu!=null||scene.world?.busy||scene.world?.inputLocked){scene.stop();return false}if(state.epoch!==scene.sessionEpoch||!same(state.lastFoot,originalLocation().foot)){scene.stop();throw Error('GYM4_REAL_PIXEL_OWNER_DRIFT')}if(state.pending){scene.stop();autoDispatch(scene);return false}const moved=originalFrame(dt,dir);autoDispatch(scene);return moved};
 scene.resumePendingNativeEncounter=()=>state.pending?.state==='sealed'?autoDispatch(scene):null;
 Object.defineProperty(scene,'encounterNotice',{get:()=>state.pending?.state==='pending'?'이동 기록 저장을 다시 시도해 주세요.':state.error?'이동 기록 처리를 확인해 주세요.':null});
 scene.dispose=()=>{states.delete(scene);originalDispose()};return scene;
}

// Center proof producer is the same private 1px pipeline; no caller-authored distance DTO.
export async function createS4DistanceCenterScene(options){
 let scene;const signal=new AbortController(),state={geo:null,carry:options.retainedExterior?.movement?.carry??0,residual:0,table:null,pending:null,localSerial:0,lastFoot:[...options.retainedExterior.servicePose.foot],epoch:options.epoch};
 scene=await createCenterInteriorScene({...options,onSuccessfulPixel:step=>{if(scene.disposed||states.get(scene)!==state||state.epoch!==scene.sessionEpoch||!same(state.lastFoot,step.from)||!same(scene.getLocation().servicePose.foot,step.to)||step.distance!==1||Math.abs(step.to[0]-step.from[0])+Math.abs(step.to[1]-step.from[1])!==1)throw Error('CENTER_REAL_PIXEL_PROOF_DRIFT');state.lastFoot=[...step.to];return !credit(state,step.from,step.to)}});states.set(scene,state);
 const location=scene.getLocation.bind(scene),frame=scene.frame.bind(scene),dispose=scene.dispose.bind(scene);
 scene.getGameplaySignal=()=>signal.signal;scene.getLocation=()=>({...location(),movement:{version:1,carry:state.carry}});
 scene.frame=(dt,dir)=>{if(scene.disposed||scene.world?.field?.menu!=null||scene.world?.busy||scene.world?.inputLocked){scene.stop();return 0}if(state.epoch!==scene.sessionEpoch||!same(state.lastFoot,location().servicePose.foot)){scene.stop();throw Error('CENTER_REAL_PIXEL_OWNER_DRIFT')}if(state.pending){scene.stop();autoDispatch(scene);return 0}const moved=frame(dt,dir);autoDispatch(scene);return moved};
 scene.resumePendingNativeEncounter=()=>state.pending?.state==='sealed'?autoDispatch(scene):null;
 Object.defineProperty(scene,'encounterNotice',{get:()=>state.pending?.state==='pending'?'이동 기록 저장을 다시 시도해 주세요.':state.error?'이동 기록 처리를 확인해 주세요.':null});
 scene.dispose=()=>{signal.abort();states.delete(scene);dispose()};return scene;
}

// Center proof producer is the same private 1px pipeline; no caller-authored distance DTO.
export async function createS4DistanceShopScene(options){
 let scene;const signal=new AbortController(),state={geo:null,carry:options.retainedExterior?.movement?.carry??0,residual:0,table:null,pending:null,localSerial:0,lastFoot:[...options.retainedExterior.servicePose.foot],epoch:options.epoch};
 scene=await createShopInteriorScene({...options,onSuccessfulPixel:step=>{if(scene.disposed||states.get(scene)!==state||state.epoch!==scene.sessionEpoch||!same(state.lastFoot,step.from)||!same(scene.getLocation().servicePose.foot,step.to)||step.distance!==1||Math.abs(step.to[0]-step.from[0])+Math.abs(step.to[1]-step.from[1])!==1)throw Error('SHOP_REAL_PIXEL_PROOF_DRIFT');state.lastFoot=[...step.to];return !credit(state,step.from,step.to)}});states.set(scene,state);
 const location=scene.getLocation.bind(scene),frame=scene.frame.bind(scene),dispose=scene.dispose.bind(scene);
 scene.getGameplaySignal=()=>signal.signal;scene.getLocation=()=>({...location(),movement:{version:1,carry:state.carry}});
 scene.frame=(dt,dir)=>{if(scene.disposed||scene.world?.field?.menu!=null||scene.world?.busy||scene.world?.inputLocked){scene.stop();return 0}if(state.epoch!==scene.sessionEpoch||!same(state.lastFoot,location().servicePose.foot)){scene.stop();throw Error('SHOP_REAL_PIXEL_OWNER_DRIFT')}if(state.pending){scene.stop();autoDispatch(scene);return 0}const moved=frame(dt,dir);autoDispatch(scene);return moved};
 scene.resumePendingNativeEncounter=()=>state.pending?.state==='sealed'?autoDispatch(scene):null;
 Object.defineProperty(scene,'encounterNotice',{get:()=>state.pending?.state==='pending'?'이동 기록 저장을 다시 시도해 주세요.':state.error?'이동 기록 처리를 확인해 주세요.':null});
 scene.dispose=()=>{signal.abort();states.delete(scene);dispose()};return scene;
}

// Brackish proof producer owns the collision-checked 1px loop. No recordMove/foot DTO issuer.
export function createBrackishEncounterWalker({getWorld,getPose,getProvider,getSignal,commitFoot,initialCarry=0}={}){
 if([getWorld,getPose,getProvider,getSignal,commitFoot].some(f=>typeof f!=='function'))throw Error('BRACKISH_WALK_OWNER_REQUIRED');
 if(!Number.isInteger(initialCarry)||initialCarry<0||initialCarry>47)throw Error('BRACKISH_INITIAL_CARRY');const R=BRACKISH_WILD;let disposed=false;const geo={tableAt:foot=>R.rows.some(([y,a,b])=>foot[1]===y&&foot[0]>=a&&foot[0]<b)?R.table:null};
 const scene={mapId:R.mapId,sessionEpoch:1,get busy(){return !!state.inFlight||!!state.pending},get world(){return getWorld()},get disposed(){return disposed},getGameplaySignal:getSignal,getLocation(){const p=getPose();return p?{...p,foot:[...p.foot]}:null}};
 const state={geo,carry:initialCarry,residual:0,table:null,pending:null,localSerial:0,lastFoot:null,epoch:1};states.set(scene,state);
 const valid=()=>{const p=getPose(),provider=getProvider(),w=getWorld();return !disposed&&p&&w?.snapshot().position.scene===R.mapId&&p.sceneId===R.sceneId&&p.imageSHA===R.imageSHA&&p.maskSHA===R.maskSHA&&provider?.supportPinsVerified&&provider.validate(p)===true&&getSignal() instanceof AbortSignal&&!getSignal().aborted};
 scene.reset=()=>{if(state.inFlight||state.pending)throw Error('BRACKISH_PENDING_MOVE_RESET');reset(state);state.lastFoot=null};
 scene.move=(dx,dy)=>{if(!valid()||!Number.isInteger(dx)||!Number.isInteger(dy)||(dx&&dy)||Math.abs(dx||dy)>240)return 0;const w=getWorld(),p=getPose();if(w.busy||w.inputLocked||w.story.pendingCommit||state.inFlight||state.pending)return 0;if(!state.lastFoot)state.lastFoot=[...p.foot];if(!same(state.lastFoot,p.foot)){reset(state);state.carry=0;state.lastFoot=[...p.foot];return 0}let moved=0;for(let i=0;i<Math.abs(dx||dy);i++){const from=[...getPose().foot],to=[from[0]+Math.sign(dx),from[1]+Math.sign(dy)];if(!getProvider().safe(to))break;commitFoot(to);if(!same(getPose().foot,to))throw Error('BRACKISH_REAL_PIXEL_COMMIT_DRIFT');state.lastFoot=[...to];moved++;if(credit(state,from,to))break}autoDispatch(scene);return moved};
 scene.settled=async()=>{const task=state.inFlight;if(task)try{await task}finally{await Promise.resolve();await Promise.resolve()}};scene.resumePendingNativeEncounter=()=>{if(!state.pending&&!getWorld()?.story.pendingCommit)state.error=null;return state.pending?.state==='sealed'?autoDispatch(scene):null};
 Object.defineProperty(scene,'encounterNotice',{get:()=>state.pending?.state==='pending'?'조우 기록 저장을 다시 시도해 주세요.':state.error?'조우 처리를 확인해 주세요.':null});
 scene.dispose=()=>{disposed=true;reset(state);states.delete(scene)};return Object.freeze(scene);
}

// Lab is indoor distance only: no encounter geometry/table, and no caller-authored step grant.
export async function createLabDistanceScene({initialCarry=0,...options}){
 if(!Number.isInteger(initialCarry)||initialCarry<0||initialCarry>47)throw Error('LAB_INITIAL_CARRY');
 let scene;const signal=new AbortController(),state={geo:null,carry:initialCarry,residual:0,table:null,pending:null,localSerial:0,lastFoot:null,epoch:options.sessionEpoch??0};
 scene=await createLabScene({...options,onSuccessfulPixel:(pose,step)=>{if(scene.disposed||states.get(scene)!==state||state.epoch!==scene.sessionEpoch||!same(state.lastFoot,step.from)||!same(readOwnedLabPose(scene).foot,step.to)||step.distance!==1||Math.abs(step.to[0]-step.from[0])+Math.abs(step.to[1]-step.from[1])!==1)throw Error('LAB_REAL_PIXEL_PROOF_DRIFT');state.lastFoot=[...step.to];return !credit(state,step.from,step.to)}});state.lastFoot=[...readOwnedLabPose(scene).foot];states.set(scene,state);
 const frame=scene.frame.bind(scene),dispose=scene.dispose.bind(scene);Object.defineProperty(scene,'world',{get:()=>ownedLabWorld(scene)});Object.defineProperty(scene,'mapId',{value:'world:hub:PROLOGUE'});scene.getGameplaySignal=()=>signal.signal;scene.getLocation=()=>({...readOwnedLabPose(scene),movement:{version:1,carry:state.carry}});
 scene.frame=(dt,dir)=>{if(scene.disposed||scene.world?.field?.menu!=null||scene.world?.busy||scene.world?.inputLocked){scene.stop();return 0}if(state.epoch!==scene.sessionEpoch||!same(state.lastFoot,readOwnedLabPose(scene).foot)){scene.stop();throw Error('LAB_REAL_PIXEL_OWNER_DRIFT')}if(state.pending){scene.stop();autoDispatch(scene);return 0}const moved=frame(dt,dir);autoDispatch(scene);return moved};
 scene.settled=async()=>{const task=state.inFlight;if(task)try{await task}finally{await Promise.resolve();await Promise.resolve()}};
 scene.resumePendingNativeEncounter=()=>{if(!state.pending&&!scene.world?.story.pendingCommit)state.error=null;return state.pending?.state==='sealed'?autoDispatch(scene):null};
 Object.defineProperty(scene,'distanceBusy',{get:()=>!!state.inFlight||!!state.pending});Object.defineProperty(scene,'encounterNotice',{get:()=>state.pending?.state==='pending'?'이동 기록 저장을 다시 시도해 주세요.':state.error?'이동 기록 처리를 확인해 주세요.':null});
 scene.dispose=()=>{signal.abort();states.delete(scene);dispose()};return scene;
}

// Separate fixed P0 factory: no caller table/mask/DTO proof issuer; original credit/dispatch unchanged.
export function createPrologueAreaEncounterWalker({areaKey,getInputReady,getWorld,getPose,getProvider,getSignal,commitFoot,initialCarry=0}={}){
 if([getInputReady,getWorld,getPose,getProvider,getSignal,commitFoot].some(f=>typeof f!=='function'))throw Error('PROLOGUE_AREA_WALK_OWNER_REQUIRED');
 if(!Number.isInteger(initialCarry)||initialCarry<0||initialCarry>47)throw Error('PROLOGUE_AREA_INITIAL_CARRY');const R=PROLOGUE_WILD[areaKey];if(!R||R.selection!=='ROOT_SELECTED_ORIGINAL_NATIVE_WILD_ZONES')throw Error('PROLOGUE_WILD_SELECTION_REQUIRED');let disposed=false;const geo={tableAt:foot=>R.rows.some(([y,a,b])=>foot[1]===y&&foot[0]>=a&&foot[0]<b)?R.table:null};
 const scene={mapId:R.mapId,sessionEpoch:1,get busy(){return !!state.inFlight||!!state.pending},get world(){return getWorld()},get disposed(){return disposed},getGameplaySignal:getSignal,getLocation(){const p=getPose();return p?{...p,foot:[...p.foot]}:null}};
 const state={geo,carry:initialCarry,residual:0,table:null,pending:null,localSerial:0,lastFoot:null,epoch:1};states.set(scene,state);
 const valid=()=>{const p=getPose(),provider=getProvider(),w=getWorld();return !disposed&&p&&w?.snapshot().position.scene===R.mapId&&p.sceneId===R.sceneId&&p.imageSHA===R.imageSHA&&p.maskSHA===R.maskSHA&&provider?.pinsVerified&&provider.validate(p)===true&&getSignal() instanceof AbortSignal&&!getSignal().aborted};
 scene.reset=()=>{if(state.inFlight||state.pending)throw Error('PROLOGUE_AREA_PENDING_MOVE_RESET');reset(state);state.lastFoot=null};
 scene.move=(dx,dy)=>{if(!getInputReady()||!valid()||!Number.isInteger(dx)||!Number.isInteger(dy)||(dx&&dy)||Math.abs(dx||dy)>240)return 0;const w=getWorld(),p=getPose();if(w.busy||w.inputLocked||w.story.pendingCommit||state.inFlight||state.pending)return 0;if(!state.lastFoot)state.lastFoot=[...p.foot];if(!same(state.lastFoot,p.foot)){reset(state);state.carry=0;state.lastFoot=[...p.foot];return 0}let moved=0;for(let i=0;i<Math.abs(dx||dy);i++){const from=[...getPose().foot],to=[from[0]+Math.sign(dx),from[1]+Math.sign(dy)];if(!getProvider().safe(to))break;commitFoot(to);if(!same(getPose().foot,to))throw Error('PROLOGUE_AREA_REAL_PIXEL_COMMIT_DRIFT');state.lastFoot=[...to];moved++;if(credit(state,from,to))break}autoDispatch(scene);return moved};
 scene.settled=async()=>{const task=state.inFlight;if(task)try{await task}finally{await Promise.resolve();await Promise.resolve()}};scene.resumePendingNativeEncounter=()=>{if(!state.pending&&!getWorld()?.story.pendingCommit)state.error=null;return state.pending?.state==='sealed'?autoDispatch(scene):null};
 Object.defineProperty(scene,'encounterNotice',{get:()=>state.pending?.state==='pending'?'조우 기록 저장을 다시 시도해 주세요.':state.error?'조우 처리를 확인해 주세요.':null});
 scene.dispose=()=>{disposed=true;reset(state);states.delete(scene)};return Object.freeze(scene);
}

// Separate fixed wetland factory: no caller table/mask/DTO proof issuer; original credit/dispatch unchanged.
export function createWetlandEncounterWalker({getInputReady,getWorld,getPose,getProvider,getSignal,commitFoot,initialCarry=0}={}){
 if([getInputReady,getWorld,getPose,getProvider,getSignal,commitFoot].some(f=>typeof f!=='function'))throw Error('WETLAND_WALK_OWNER_REQUIRED');
 if(!Number.isInteger(initialCarry)||initialCarry<0||initialCarry>47)throw Error('WETLAND_INITIAL_CARRY');const R=WETLAND_WILD;if(!R||R.selection!=='ROOT_SELECTED_WETLAND_LOWGRASS_49254')throw Error('WETLAND_SELECTION_REQUIRED');let disposed=false;const geo={tableAt:foot=>R.rows.some(([y,a,b])=>foot[1]===y&&foot[0]>=a&&foot[0]<b)?R.table:null};
 const scene={mapId:R.mapId,sessionEpoch:1,get busy(){return !!state.inFlight||!!state.pending},get world(){return getWorld()},get disposed(){return disposed},getGameplaySignal:getSignal,getLocation(){const p=getPose();return p?{...p,foot:[...p.foot]}:null}};
 const state={geo,carry:initialCarry,residual:0,table:null,pending:null,localSerial:0,lastFoot:null,epoch:1};states.set(scene,state);
 const valid=()=>{const p=getPose(),provider=getProvider(),w=getWorld();return !disposed&&p&&w?.snapshot().position.scene===R.mapId&&p.sceneId===R.sceneId&&p.imageSHA===R.imageSHA&&p.maskSHA===R.maskSHA&&provider?.supportPinsVerified&&provider.validate(p)===true&&getSignal() instanceof AbortSignal&&!getSignal().aborted};
 scene.reset=()=>{if(state.inFlight||state.pending)throw Error('WETLAND_PENDING_MOVE_RESET');reset(state);state.lastFoot=null};
 scene.move=(dx,dy)=>{if(!getInputReady()||!valid()||!Number.isInteger(dx)||!Number.isInteger(dy)||(dx&&dy)||Math.abs(dx||dy)>240)return 0;const w=getWorld(),p=getPose();if(w.busy||w.inputLocked||w.story.pendingCommit||state.inFlight||state.pending)return 0;if(!state.lastFoot)state.lastFoot=[...p.foot];if(!same(state.lastFoot,p.foot)){reset(state);state.carry=0;state.lastFoot=[...p.foot];return 0}let moved=0;for(let i=0;i<Math.abs(dx||dy);i++){const from=[...getPose().foot],to=[from[0]+Math.sign(dx),from[1]+Math.sign(dy)];if(!getProvider().safe(to))break;commitFoot(to);if(!same(getPose().foot,to))throw Error('WETLAND_REAL_PIXEL_COMMIT_DRIFT');state.lastFoot=[...to];moved++;if(credit(state,from,to))break}autoDispatch(scene);return moved};
 scene.settled=async()=>{const task=state.inFlight;if(task)try{await task}finally{await Promise.resolve();await Promise.resolve()}};scene.resumePendingNativeEncounter=()=>{if(!state.pending&&!getWorld()?.story.pendingCommit)state.error=null;return state.pending?.state==='sealed'?autoDispatch(scene):null};
 Object.defineProperty(scene,'encounterNotice',{get:()=>state.pending?.state==='pending'?'조우 기록 저장을 다시 시도해 주세요.':state.error?'조우 처리를 확인해 주세요.':null});
 scene.dispose=()=>{disposed=true;reset(state);states.delete(scene)};return Object.freeze(scene);
}
