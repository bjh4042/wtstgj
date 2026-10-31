import{createBossDoorOwner}from'../../development/cargo-native/boss-door-owner.mjs';
import {isRoomApproach,allowsRoomSwitch} from '../../development/cargo-native/room-approach.mjs';
import {createPortAdapter} from './port-adapter.mjs';
import {CargoRoomInteractions,evaluateBossGate} from '../../development/cargo-native/room-interactions.mjs';
import {createDoorState,toggleDoor,tickDoor} from '../../development/cargo-native/door-state.mjs';
const clone=x=>structuredClone(x);
const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const near=(a,b)=>point(a)&&point(b)&&a.every((v,i)=>Math.abs(v-b[i])<=8);

/** One development session: port owns native presentation/clock, puzzle owns records.
 * All browser actions must use this boundary, not the two raw controllers separately. */
export function createPortRoomSession({contract,registry,initial,initialMaterial,loadScene,portApproach=null,engineUpperLayer=null,chestPhysics=null,rescueAccess=null,bossDoorAuthority=null,roomApproach=null,roomState=null,restoredDoors=null,onReleaseMovement=()=>{}}) {
  if(roomApproach!==null&&!isRoomApproach(roomApproach))throw Error('UNREGISTERED_ROOM_APPROACH');
  const puzzle=new CargoRoomInteractions(contract,roomState,roomApproach);
  const doors=Object.fromEntries(contract.rooms.map(r=>[r.roomId,createDoorState()]));
  const bossDoor=createBossDoorOwner({authority:bossDoorAuthority,contract,puzzle});doors[contract.bossGate.gateId]=bossDoor.update(0);
  if(restoredDoors!==null){
    const keys=[...contract.rooms.map(r=>r.roomId),contract.bossGate.gateId];
    if(Object.keys(restoredDoors).length!==keys.length||keys.some(k=>!Object.hasOwn(restoredDoors,k)||!['open','closed'].includes(restoredDoors[k]?.phase)||restoredDoors[k].progress!==(restoredDoors[k].phase==='open'?1:0)))throw Error('RESTORE_STABLE_DOORS_REQUIRED');
    for(const r of contract.rooms)doors[r.roomId]=clone(restoredDoors[r.roomId]);
    for(let i=0;i<5;i++)doors[contract.bossGate.gateId]=bossDoor.update(100);
    if(JSON.stringify(doors[contract.bossGate.gateId])!==JSON.stringify(restoredDoors[contract.bossGate.gateId]))throw Error('RESTORE_BOSS_DERIVATION_MISMATCH');
  }
  let port,hidden=false,active=true,uiMode=null,fixture=null,epoch=0;
  const disposed=new WeakSet();
  function dispose(material){if(material&&typeof material==='object'&&!disposed.has(material)){disposed.add(material);try{material.dispose?.();}catch{}}}
  function release(){puzzle.cancelContext();uiMode=null;onReleaseMovement();}
  const build=(start,material)=>createPortAdapter({registry,initial:start,initialMaterial:material,loadScene,portApproach,engineUpperLayer,chestPhysics,rescueAccess,releaseMovement:release});
  port=build(initial,initialMaterial);
  function idle(){const s=port.snapshot();return active&&!hidden&&!fixture&&!s.pending&&!s.clock.paused;}
  function canAct(){return idle()&&uiMode===null;}
  function occupied(r,scene,foot){const[x,y,w,h]=r.door.safetyFootCenterForbidden;return r.mapId===scene&&foot[0]>=x&&foot[0]<=x+w&&foot[1]>=y&&foot[1]<=y+h;}
  function blocked(scene,foot){return contract.rooms.some(r=>doors[r.roomId].progress!==1&&occupied(r,scene,foot));}
  function cancelFixture(){if(fixture){fixture.controller.abort();fixture=null;epoch++;}}
  function cancelContext(reason='SESSION_CANCEL'){cancelFixture();port.cancel(reason);port.blur();release();}
  function snapshot(){return {native:port.snapshot(),rooms:puzzle.snapshot(),notebook:puzzle.notebook(),draft:puzzle.draft,uiMode,hidden,active,fixturePending:!!fixture,doors:clone(doors),gate:evaluateBossGate(puzzle,contract),bossDoor:bossDoor.diagnostic()};}
  return {
    snapshot,canAct,cancelContext,
    notebook:()=>puzzle.notebook(),
    roomSnapshot:()=>puzzle.snapshot(),
    doorSnapshot:()=>clone(doors),
    directions:()=>port.directions(),
    inputUp:token=>port.inputUp(token),
    async requestPort(id,input){
      if(!idle())return {ok:false,reason:fixture?'FIXTURE_PENDING':hidden?'HIDDEN':!active?'DISPOSED':port.snapshot().clock.paused?'PAUSED':'BUSY'};
      release();return port.request(id,input);
    },
    recordMovement({to,facing,roomId=null}){
      if(!canAct()||!point(to))return false;
      const before=port.snapshot();
      if(Math.hypot(to[0]-before.foot[0],to[1]-before.foot[1])>8||blocked(before.sceneId,to))return false;
      if(!port.setFoot(to,facing??before.facing))return false;
      if(roomId){const r=contract.rooms.find(r=>r.roomId===roomId&&r.mapId===before.sceneId);if(r)puzzle.recordMovement({roomId,mapId:before.sceneId,from:before.foot,to,doorProgress:doors[roomId].progress});}
      return true;
    },
    toggleRoom(roomId){
      if(!canAct())return 'INTERACTION_LOCKED';
      const s=port.snapshot(),r=contract.rooms.find(r=>r.roomId===roomId&&r.mapId===s.sceneId);
      release();
      if(!r||!(roomApproach?allowsRoomSwitch(roomApproach,roomId,s.sceneId,s.foot):r.door.switchInteractionPadCenters.some(p=>near(p,s.foot))))return 'NOT_AT_SWITCH_PAD';
      return toggleDoor(doors[roomId],occupied(r,s.sceneId,s.foot));
    },
    requestRead(roomId){
      if(!canAct())return null;
      const s=port.snapshot();release();
      const result=puzzle.requestRead({roomId,mapId:s.sceneId,foot:s.foot,explicitInteract:true});
      if(result)uiMode='read';return result;
    },
    acknowledgeDisplayed({token,text,roomId}){
      if(!idle()||uiMode!=='read')return false;
      const s=port.snapshot();return puzzle.acknowledgeDisplayed({token,text,roomId,mapId:s.sceneId,foot:s.foot});
    },
    confirmRead({token,roomId}){
      if(!idle()||uiMode!=='read')return {ok:false,reason:'INTERACTION_LOCKED'};
      const s=port.snapshot(),result=puzzle.confirmRead({token,roomId,mapId:s.sceneId,foot:s.foot});
      if(result.ok)uiMode=null;return result;
    },
    cancelRead(){release();},
    openNotebook(){if(!canAct())return false;release();uiMode='notebook';return true;},
    closeNotebook(){release();},
    selectCard(id){return idle()&&uiMode==='notebook'?puzzle.selectCard(id):false;},
    undoCard(){return idle()&&uiMode==='notebook'?puzzle.undoCard():undefined;},
    clearCards(){if(idle()&&uiMode==='notebook')puzzle.clearCards();},
    submitCards(){
      if(!idle()||uiMode!=='notebook')return {ok:false,reason:'INTERACTION_LOCKED'};
      const s=port.snapshot(),result=puzzle.submitCards({mapId:s.sceneId,foot:s.foot,explicitInteract:true});doors[contract.bossGate.gateId]=bossDoor.update(0);return result;
    },
    frame(now){const dt=fixture?0:port.frame(now);doors[contract.bossGate.gateId]=bossDoor.update(dt);if(dt){const s=port.snapshot();for(const r of contract.rooms)tickDoor(doors[r.roomId],dt,occupied(r,s.sceneId,s.foot));}return dt;},
    setClockMinutes:minutes=>port.setClockMinutes(minutes),
    setOption:(key,value)=>port.setOption(key,value),
    setPaused(value){if(value)cancelContext('PAUSED_CANCEL');port.setPaused(value);},
    setHidden(value){hidden=!!value;if(hidden)cancelContext('HIDDEN_CANCEL');port.setHidden(hidden);},
    blur(){cancelContext('BLUR_CANCEL');port.blur();},
    async selectFixture(start){
      if(!active||hidden||port.snapshot().clock.paused)return {ok:false,reason:'FIXTURE_LOCKED'};
      cancelContext('FIXTURE_SELECT');const ticket={epoch:++epoch,controller:new AbortController()};fixture=ticket;
      let material=null,abortListener;
      try{
        const spec=registry.scenes[start.sceneId];if(!spec)throw Error('UNKNOWN_SCENE');
        const {signal}=ticket.controller,loading=Promise.resolve().then(()=>loadScene(spec,{signal}));
        loading.then(m=>{if(signal.aborted)dispose(m);},()=>{});
        const aborted=new Promise((_,reject)=>{abortListener=()=>reject(Error('ABORTED'));signal.addEventListener('abort',abortListener,{once:true});if(signal.aborted)abortListener();});
        material=await Promise.race([loading,aborted]);
        if(!active||fixture!==ticket||signal.aborted){dispose(material);material=null;return {ok:false,reason:'STALE_FIXTURE'};}
        const current=port.snapshot(),next=build({...start,clock:current.clock,options:current.options},material);material=null;
        const old=port;port=next;fixture=null;old.destroy();port.setHidden(hidden);
        return {ok:true,reason:'DEVELOPMENT_FIXTURE_SELECTED'};
      }catch(error){dispose(material);return {ok:false,reason:ticket.controller.signal.aborted?'FIXTURE_CANCELLED':'FIXTURE_LOAD_FAILED'};}
      finally{ticket.controller.signal.removeEventListener('abort',abortListener);if(fixture===ticket)fixture=null;}
    },
    loadCheckpoint(raw){
      if(!canAct())return false;
      const position=port.snapshot();if(contract.rooms.some(r=>occupied(r,position.sceneId,position.foot)))return false;
      // Validation occurs before transient cancellation; malformed data cannot replace progress.
      const valid=new CargoRoomInteractions(contract,raw).snapshot();
      cancelContext('CHECKPOINT_LOAD');puzzle.load(valid);
      for(const r of contract.rooms)doors[r.roomId]=createDoorState();return true;
    },
    reset(){if(!canAct())return false;const position=port.snapshot();if(contract.rooms.some(r=>occupied(r,position.sceneId,position.foot)))return false;cancelContext('RESET');puzzle.reset();for(const r of contract.rooms)doors[r.roomId]=createDoorState();return true;},
    destroy(){if(!active)return;cancelContext('DISPOSED');active=false;bossDoor.dispose();port.destroy();}
  };
}
