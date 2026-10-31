// Only original heal/purchase result fields may vary in service opt-in mode.
const serviceInvariant=snapshot=>{const s=structuredClone(snapshot);delete s.revision;delete s.updatedAt;delete s.inventory;if(s.progress)delete s.progress.items;if(s.economy){delete s.economy.money;delete s.economy.lastHub;delete s.economy.transactions;}if(s.world)delete s.world.visitedHubs;for(const p of s.party??[]){delete p.hp;delete p.status;delete p.statusState;for(const m of p.moves??[])delete m.pp;}return JSON.stringify(s);};
import {NativeHomeSession} from './verified/native_home_entries_remaining_1524/session.mjs';
import {renderNativeHome} from './verified/native_home_entries_remaining_1524/render.mjs';
export const NATIVE_MAPPING=Object.freeze({sourceRevision:'645923a3634e08878966ac72210f2189386011f8',canonicalMapId:'world:hub:S2',canonicalGrid:48,nativeWorldSize:[5120,1536],nativeActorSize:[107,107],nativeGroundAnchor:[53,90],nativeScale:1,kind:'EXPLICIT_DEVELOPMENT_REVIEW_NOT_WORLD_WARP',canonicalWarpId:null,saveConnected:false});
/** Owns no timer, DOM listener, canonical mutation or save. Host must route input/tick exclusively. */
export class NativeReviewAdapter {
 constructor({world,contract,masks,assets,environment,clearInput=()=>{},loadScene,travel,presentationSurface=null,selectedServices=false}){Object.assign(this,{world,contract,masks,assets,environment,clearInput,loadScene,travel,presentationSurface});this.selectedServices=selectedServices===true;this.session=null;this.active=false;this.remainder=0;this.lastResult=null;this.returnSnapshot=null;this.disposed=false;}
 enter(homeId='upper'){
  if(this.disposed)throw Error('DISPOSED');if(this.active)throw Error('NATIVE_ALREADY_ACTIVE');
  if(this.world.inputLocked||this.world.busy)throw Error('CANONICAL_INPUT_LOCKED');
  const snapshot=this.world.snapshot();if(snapshot.position.scene!==NATIVE_MAPPING.canonicalMapId||this.world.map.id!==NATIVE_MAPPING.canonicalMapId)throw Error('NATIVE_REVIEW_REQUIRES_JANGMOK_HUB');
  this.clearInput();const session=new NativeHomeSession({contract:this.contract,homeId,masks:this.masks,...(this.loadScene?{loadScene:this.loadScene}:{})});
  if(!session.safe(session.scene,session.foot))throw Error('NATIVE_ENTRY_SUPPORT_MISSING');
  this.session=session;this.returnSnapshot=JSON.stringify(snapshot);this.returnIdentity=serviceInvariant(snapshot);this.returnPosition=structuredClone(snapshot.position);this.remainder=0;this.active=true;return this.snapshot();
 }
 requireActive(){if(!this.active||this.disposed)throw Error('NATIVE_NOT_ACTIVE');if((this.selectedServices?serviceInvariant(this.world.snapshot()):JSON.stringify(this.world.snapshot()))!==(this.selectedServices?this.returnIdentity:this.returnSnapshot))throw Error('CANONICAL_CHANGED_DURING_NATIVE_REVIEW');}
 openDoor(homeId=this.session?.homeId){this.requireActive();this.clearInput();return this.session.setDoorState('OPEN',homeId);}
 routeTo(target='door'){
  this.requireActive();this.cancel();const s=this.session;let paths=[];
  if(s.scene==='exterior')paths=target==='door'?[s.h.exteriorDoor.approachRoute]:Object.entries(this.travel?.routes??{}).filter(([k])=>k.endsWith('__'+target)).map(([,p])=>p);
  else paths=Object.entries(this.contract.floors[s.scene].routes).filter(([k])=>k.endsWith(target==='stairs'?'_stair':'_entry')).map(([,p])=>p);
  for(const path of paths){const i=path.findIndex(p=>p[0]===s.foot[0]&&p[1]===s.foot[1]);if(i>=0){this.route=path.slice(i+1);this.routeFacing=s.scene==='exterior'?'up':target==='stairs'?null:'down';if(!this.route.length&&this.routeFacing)s.face(this.routeFacing);return {ok:true,steps:this.route.length};}}
  return {ok:false,reason:'NO_VERIFIED_ROUTE_FROM_CURRENT_FOOT'};
 }
 frame(dtMs,direction=null){
  this.requireActive();if(!Number.isFinite(dtMs)||dtMs<0)throw Error('INVALID_DELTA');this.environment.advance(Math.min(dtMs,50));if(direction)this.route=null;
  if((!direction&&!this.route?.length)||this.session.pending){this.remainder=0;this.session.stopGait();return;}
  this.remainder+=Math.min(dtMs,50)*.12;while(this.remainder>=1){this.remainder--;let d=direction;
   if(this.route?.length){const p=this.route[0],[x,y]=this.session.foot;if(Math.abs(x-p[0])+Math.abs(y-p[1])!==1)throw Error('INVALID_VERIFIED_ROUTE');d=p[0]<x?'left':p[0]>x?'right':p[1]<y?'up':'down';}
   this.lastResult=this.session.move(d);if(!this.lastResult.ok){this.remainder=0;this.route=null;this.clearInput();break;}
   if(this.route?.length){this.route.shift();if(!this.route.length){if(this.routeFacing)this.session.face(this.routeFacing);this.remainder=0;break;}}
  }
 }

 async action(){this.requireActive();this.clearInput();this.route=null;this.remainder=0;this.lastResult=await this.session.action();return this.lastResult;}
 stop(){this.route=null;this.remainder=0;this.session?.stopGait();}
 releaseAction(){this.session?.releaseAction();}
 cancel(){this.clearInput();this.route=null;this.remainder=0;this.session?.cancel();}
 draw(ctx){this.requireActive();const status=this.session.snapshot(),surface=this.presentationSurface,target=surface?surface.getContext('2d'):ctx,result=renderNativeHome(target,{contract:this.contract,assets:this.assets,environment:this.environment,status,supported:this.session.safe(status.scene,status.foot)});if(surface){ctx.canvas.width=960;ctx.canvas.height=540;ctx.fillStyle='#101a19';ctx.fillRect(0,0,960,540);ctx.imageSmoothingEnabled=false;ctx.drawImage(surface,Math.floor((960-surface.width)/2),Math.floor((540-surface.height)/2));}return {...result,hostConnected:true,worldConnected:false,saveConnected:false,mode:NATIVE_MAPPING.kind,presentationViewport:surface?[960,540]:[ctx.canvas.width,ctx.canvas.height],nativePresentationScale:1};}
 snapshot(){return {active:this.active,mode:NATIVE_MAPPING.kind,mapping:NATIVE_MAPPING,returnPosition:this.returnPosition??null,native:this.session?.snapshot()??null,lastResult:this.lastResult,statusLabel:this.selectedServices?'장목 서비스 검토 · 원래 회복/구매 메모리 결과 반영 · 사용자 저장 검증 아님':'장목 개발 검토 · 본편 지도 대체/물리 워프 연결 미완료 · 저장 변경 없음'};}
 exit(){this.requireActive();this.cancel();this.session.dispose();this.session=null;this.active=false;return {ok:true,position:structuredClone(this.returnPosition),canonicalSnapshotUnchanged:!this.selectedServices,canonicalPositionPreserved:true};}
 dispose(){this.cancel();this.session?.dispose();this.session=null;this.active=false;this.disposed=true;}
}
