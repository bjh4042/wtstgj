import {GohyeonV3Host} from '../gohyeon_outdoor_lighting_r1/upstream/Gohyeon_V3_StrictNativeHost_DevSourceQA/host.mjs';
import {step as originalInteriorStep,transfer as originalStairTransfer} from '../home_closeout_lane4/unpacked/Gohyeon_House3_Compact_Selected_TwoFloor_MapOnly_SourceQA_R1/logic.mjs';
const copy=x=>structuredClone(x),same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===2&&b.length===2&&a.every((n,i)=>n===b[i]);
const vector={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
export class NativeHouseEntrySession{
 constructor({contract,exteriorContract,interiorContract,masks,loadScene=async target=>({sha256:contract.sources[target].sha256})}){this.c=copy(contract);this.inside=copy(interiorContract);this.outside=new GohyeonV3Host(exteriorContract);this.masks=Object.fromEntries(Object.entries(masks).map(([k,v])=>[k,v.slice()]));this.loader=loadScene;this.epoch=0;this.disposed=false;this.reset()}
 reset(){if(this.disposed)return {ok:false,reason:'DISPOSED'};this.epoch++;this.scene='exterior';this.foot=[...this.c.exteriorDoor.arrival];this.facing='up';this.mapState='OPEN';this.doorState='CLOSED';this.pending=false;this.actionHeld=false;this.armed=true;this.portalTransfers=0;this.stairTransfers=0;this.error=null;this.receipts=[]}
 snapshot(){return copy({disposed:this.disposed,scene:this.scene,sceneId:this.c.sceneIds[this.scene],foot:this.foot,facing:this.facing,mapState:this.mapState,doorState:this.doorState,pending:this.pending,actionHeld:this.actionHeld,armed:this.armed,epoch:this.epoch,portalTransfers:this.portalTransfers,stairTransfers:this.stairTransfers,error:this.error,receipts:this.receipts,worldConnected:false,saveConnected:false,canonicalMapBinding:null,newAuthored:true})}
 safe(scene,foot){if(!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isInteger))return false;const[x,y]=foot;return scene==='exterior'?this.outside.safe(foot,this.mapState):['1F','2F'].includes(scene)&&x>=0&&y>=0&&x<696&&y<464&&this.masks[scene]?.[y*696+x]===1}
 meta(){return {revision:this.inside.revision,sourceSHA:this.inside.floors[this.scene]?.sourceSHA,verified:true,enabled:true}}
 triggerAt(){if(this.scene==='exterior')return same(this.foot,this.c.exteriorDoor.readFoot);return same(this.foot,this.inside.floors[this.scene].endpoint)||(this.scene==='1F'&&same(this.foot,this.c.interiorDoor.returnFoot))}
 rearm(){if(this.disposed)return;if(!this.actionHeld&&!this.triggerAt())this.armed=true}
 releaseAction(){if(this.disposed)return;this.actionHeld=false;this.rearm()}
 stop(){if(this.disposed)return;this.actionHeld=false;this.rearm()}
 cancel(){if(this.disposed)return;this.epoch++;this.pending=false;this.error=null;this.stop()}
 setDoorState(state){if(this.disposed)return {ok:false,reason:'DISPOSED'};if(!this.c.exteriorDoor.allowedAccessStates.includes(state))return {ok:false,reason:'INVALID_DOOR_STATE'};this.cancel();this.doorState=state;return {ok:true}}
 setMapState(state){if(this.disposed)return {ok:false,reason:'DISPOSED'};if(!['OPEN','CLOSED'].includes(state))return {ok:false,reason:'INVALID_MAP_STATE'};this.cancel();this.mapState=state;return {ok:true}}
 face(direction){if(this.disposed||this.pending)return {ok:false,reason:'INPUT_LOCKED'};if(!vector[direction])return {ok:false,reason:'INVALID_DIRECTION'};this.facing=direction;return {ok:true}}
 move(direction){if(this.disposed||this.pending)return {ok:false,reason:'INPUT_LOCKED'};const v=vector[direction];if(!v)return {ok:false,reason:'INVALID_DIRECTION'};this.facing=direction;const target=this.foot.map((n,i)=>n+v[i]);if(!this.safe(this.scene,this.foot)||!this.safe(this.scene,target))return {ok:false,reason:'EXISTING_SUPPORT_BLOCKED'};
  if(this.scene==='exterior')this.foot=target;else{const s={floor:this.scene,foot:this.foot,transfers:this.stairTransfers};const next=originalInteriorStep(s,...v,this.meta(),this.inside,this.masks[this.scene]);if(next===s)return {ok:false,reason:'EXISTING_INTERIOR_STEP_BLOCKED'};this.foot=next.foot}this.rearm();return {ok:true}}
 async action(){if(this.disposed)return {ok:false,reason:'DISPOSED'};if(this.pending)return {ok:false,reason:'BUSY'};if(this.actionHeld||!this.armed)return {ok:false,reason:'RELEASE_AND_LEAVE_TRIGGER_REQUIRED'};this.actionHeld=true;if(!this.safe(this.scene,this.foot))return {ok:false,reason:'SOURCE_FOOT_UNSUPPORTED'};
  let target,foot,facing,kind;
  if(this.scene==='exterior'&&same(this.foot,this.c.exteriorDoor.readFoot)&&this.facing===this.c.exteriorDoor.readFacing){if(this.doorState!=='OPEN')return {ok:false,reason:'DOOR_'+this.doorState};target='1F';foot=this.c.interiorDoor.arrival;facing=this.c.interiorDoor.arrivalFacing;kind='enter'}
  else if(this.scene==='1F'&&same(this.foot,this.c.interiorDoor.returnFoot)&&this.facing===this.c.interiorDoor.returnFacing){if(this.doorState!=='OPEN')return {ok:false,reason:'DOOR_'+this.doorState};target='exterior';foot=this.c.exteriorDoor.arrival;facing=this.c.exteriorDoor.arrivalFacing;kind='return'}
  else if(['1F','2F'].includes(this.scene)){const state={floor:this.scene,foot:this.foot,transfers:this.stairTransfers},other=this.scene==='1F'?'2F':'1F',next=originalStairTransfer(state,this.meta(),this.inside,this.masks[this.scene],this.masks[other]);if(next===state)return {ok:false,reason:'EXACT_SUPPORTED_PORT_REQUIRED'};target=next.floor;foot=next.foot;facing=this.facing;kind='stairs'}
  else return {ok:false,reason:'EXACT_SUPPORTED_PORT_REQUIRED'};
  const sourceKey=target==='exterior'?'exterior:'+this.mapState:target,token=++this.epoch;this.pending=true;this.error=null;this.armed=false;
  try{const loaded=await this.loader(sourceKey);if(token!==this.epoch||this.disposed)return {ok:false,reason:'STALE'};if(loaded?.sha256!==this.c.sources[sourceKey].sha256)throw Error('TARGET_SOURCE_PIN_MISMATCH');if(!this.safe(target,foot))throw Error('TARGET_FOOT_UNSUPPORTED');this.scene=target;this.foot=[...foot];this.facing=facing;if(kind==='stairs')this.stairTransfers++;else this.portalTransfers++;this.receipts.push({kind,target,foot:[...foot],epoch:token,newAuthored:kind!=='stairs'});this.receipts=this.receipts.slice(-30);return {ok:true,kind,scene:target}}
  catch(e){if(token===this.epoch)this.error=e.message;return {ok:false,reason:token!==this.epoch?'STALE':e.message}}
  finally{if(token===this.epoch){this.pending=false;this.rearm()}}
 }
 dispose(){if(this.disposed)return;this.cancel();this.disposed=true}
}
