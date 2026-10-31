import {withDoorApproach} from './door_approach_proposal/approach.mjs';
import {NativeHouseEntrySession} from '../house3/House3_Environment_Native_R1/native_house_entry_gohyeon3_env_1456/session.mjs';
const V={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
export class GohyeonNativeScene{
 constructor(inputs){this.inputs=inputs;this.session=new (inputs.doorApproachSelection?withDoorApproach(NativeHouseEntrySession):NativeHouseEntrySession)({contract:inputs.contract,exteriorContract:inputs.exterior,interiorContract:inputs.inside,masks:inputs.masks});this.focused=true;this.locked=false;this.remainder=0;this.direction=null;this.disposed=false;this.status='DEVELOPMENT_SUPPORT_ONLY_DISPATCH_NOT_CONNECTED';}
 snapshot(){return {...this.session.snapshot(),canonicalMapId:'world:hub:S4',sourceDispatchConnected:false,supportPolicy:'OUTSIDE_SUPPORT_IS_UNSURVEYED_NOT_PHYSICAL_WALL'}}
 setFocus(f){if(this.focused===f)return;this.focused=f;this.stop()}
 setLocked(v){if(this.locked===v)return;this.locked=v;this.stop()}
 stop(){this.direction=null;this.remainder=0;this.session.stop()}
 safe(scene,foot){const m=this.inputs.masks[scene==='exterior'?this.session.mapState:scene],w=scene==='exterior'?4294:696,h=scene==='exterior'?2400:464;return Number.isInteger(foot[0])&&Number.isInteger(foot[1])&&foot[0]>=0&&foot[1]>=0&&foot[0]<w&&foot[1]<h&&m[foot[1]*w+foot[0]]===1}
 tick(dt,dir){if(this.disposed||!this.focused||this.locked||this.session.pending||!Number.isFinite(dt)||dt<0||dt>250){this.stop();return}if(!V[dir]){this.direction=null;this.remainder=0;return}if(dir!==this.direction)this.remainder=0;this.direction=dir;this.session.face(dir);this.remainder+=dt*.12;const n=Math.floor(this.remainder);this.remainder-=n;for(let i=0;i<n;i++){const foot=this.session.foot,v=V[dir],next=[foot[0]+v[0],foot[1]+v[1]];if(!this.safe(this.session.scene,next)){this.status='OUTSIDE_RECOVERED_SUPPORT_NOT_A_PHYSICAL_WALL';this.remainder=0;break}const r=this.session.move(dir);if(!r.ok){this.status=r.reason;this.remainder=0;break}this.status='RECOVERED_SUPPORT_MOVEMENT'}}
 async action(){if(this.disposed||!this.focused||this.locked)throw Error('INPUT_LOCKED');const s=this.session.snapshot();if(s.scene==='exterior'){const row=this.inputs.exterior.hub.anchors.find(a=>a.interactionFoot[0]===s.foot[0]&&a.interactionFoot[1]===s.foot[1]);if(row)return {executed:false,status:'CANONICAL_POINT_DISPATCH_NOT_CONNECTED',pointId:row.sourcePoint.id};}const result=await this.session.action();this.status=result.reason??result.kind;return result}
 releaseAction(){this.session.releaseAction()}
 setDoorState(s){return this.session.setDoorState(s)}
 setMapState(s){const old=this.session.mapState;const r=this.session.setMapState(s);if(!this.safe(this.session.scene,this.session.foot)){this.session.setMapState(old);return {ok:false,reason:'STATE_WOULD_INVALIDATE_CURRENT_SUPPORT'}}return r}
 dispose(){this.disposed=true;this.stop();this.session.dispose()}
}
