import {installHouseSession,houseLocation,releaseHouseAction,requireHouseArrival,canHouseDoor} from './house-session.mjs';
import {GohyeonNativeScene} from '../gohyeon-native/native_candidate/scene.mjs';
import {createGohyeonRenderer} from '../gohyeon-native/native_candidate/render.mjs';
import {FIXED_REGISTRATION} from './fixed-registration.mjs';
export class S4HubScene {
 constructor({location,registry,inputs,scratchFactory,sessionEpoch}){
  if(location?.mapId!=='world:hub:S4'||registry.validate(location)||!Number.isSafeInteger(sessionEpoch)||sessionEpoch<1)throw Error('PINNED_HUB_LOCATION_REQUIRED');
  this.mapId='world:hub:S4';this.sessionEpoch=sessionEpoch;this.registry=registry;this.inputs=inputs;this.disposed=false;this.world=null;this.clock=null;this.scene=new GohyeonNativeScene(inputs);this.scene.session.mapState=location.retainedHubState;
  // Explicit selected local floor revision replaces support in this candidate only. Original masks remain untouched.
  this.scene.session.outside.safe=(foot,state)=>Array.isArray(foot)&&foot.length===2&&foot.every(Number.isSafeInteger)&&foot[0]>=0&&foot[1]>=0&&foot[0]<4294&&foot[1]<2400&&inputs.masks[state]?.[foot[1]*4294+foot[0]]===1;
  this.scene.session.foot=[...location.foot];this.scene.session.facing=location.facing;installHouseSession(this,location);
  this.renderer=createGohyeonRenderer(inputs,{scratchFactory,foregroundLayers:inputs.foregroundLayers,readEnvironment:()=>this.clock});
 }
 bindWorld(world){if(this.world&&this.world!==world)throw Error('WORLD_REPLACEMENT_REQUIRES_NEW_OWNER');this.world=world}
 getLocation(){const n=this.scene.snapshot();const house=houseLocation(this,n);if(house)return house;if(n.scene!=='exterior')throw Error('LOCAL_HOUSE_NATIVE_SAVE_NOT_REGISTERED');return{...this.registry.describe(this.mapId,n.mapState),foot:[...n.foot],facing:n.facing}}
 readReviewNative(){if(this.disposed)return null;const n=this.getLocation();if(this.registry.validate(n))throw Error('REGISTERED_REVIEW_LOCATION_REQUIRED');const p=n.indoorPose;return{mapId:p?.sceneId??n.mapId,sceneId:p?.sceneId??n.sceneId,foot:[...(p?.foot??n.foot)],facing:p?.facing??n.facing,sessionEpoch:this.sessionEpoch,readOnly:true}}
 readNative(){if(this.disposed||this.scene.snapshot().scene!=='exterior')return null;const n=this.getLocation();return{version:1,sceneId:n.sceneId,mapId:n.mapId,revision:n.mapRevision,imageSHA:n.imageSHA,maskSHA:n.maskSHA,foot:n.foot,facing:n.facing,phase:'field',sessionEpoch:this.sessionEpoch}}
 stop(){this.scene.stop()}
 setFocused(value){this.scene.setFocus(value)}
 frame(dt,dir){this.scene.setLocked(!!(this.world?.inputLocked||this.world?.busy));this.scene.tick(dt,dir)}
 draw(ctx,clock){this.clock=clock;return this.renderer(ctx,this.scene)}
 async inspect(execution){if(this.disposed||this.world?.inputLocked||this.world?.busy)throw Error('INPUT_LOCKED');const n=this.readNative();if(n){const row=FIXED_REGISTRATION.find(r=>r.mapId===this.mapId&&r.facing===n.facing&&(r.approach?r.approach.rows.some(([y,lo,hi])=>n.foot[1]===y&&n.foot[0]>=lo&&n.foot[0]<hi):r.readFoot.every((v,i)=>v===n.foot[i])));if(row){if(typeof execution!=='function')throw Error('TRUSTED_EXECUTION_REQUIRED');return execution(row.pointId)}}if(this.registry.housePose){if(typeof execution!=='function')throw Error('TRUSTED_EXECUTION_REQUIRED');return execution('house:inspect')}return this.scene.action()}
 releaseAction(){if(!releaseHouseAction(this))this.scene.releaseAction()}
 requireHouseArrival(){requireHouseArrival(this)}
 canHouseDoor(){return canHouseDoor(this)}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.dispose();this.world=null}
}
