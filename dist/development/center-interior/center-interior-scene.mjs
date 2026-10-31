import {CENTER_CONTRACT as FIXED} from './fixed-contract.mjs';
const token=Symbol(),owners=new WeakMap();
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
export async function createCenterInteriorScene(options){const safe=Uint8Array.from(options.safe??[]);if(safe.length!==768*576||await hash(safe)!==FIXED.inputs.safe.sha256)throw Error('FIXED_CENTER_MASK_PIN_MISMATCH');return new CenterInteriorScene({...options,contract:FIXED,safe},token)}
export function ownedCenterWorld(scene){return owners.get(scene)?.world??null}
export function readOwnedCenterPose(scene){const s=owners.get(scene);return s?.read()??null}
import {createRoomProvider} from './room-provider.mjs';
const dirs=new Set(['up','down','left','right']);
/** Isolated candidate. Caller retains the sole world, RAF and atomic persistence owner. */
export class CenterInteriorScene{
 constructor({contract,safe,retainedExterior,foot=retainedExterior.servicePose?.foot??contract.entry.foot,facing=retainedExterior.servicePose?.facing??contract.entry.facing,epoch,assets=null,layout=null,onSuccessfulPixel=null},authorization){
  if(authorization!==token)throw Error('PRIVATE_CENTER_FACTORY_REQUIRED');
  if(!Number.isSafeInteger(epoch)||epoch<1||retainedExterior?.mapId!=='world:hub:S4')throw Error('EXACT_CENTER_OWNER_REQUIRED');
  this.latch=retainedExterior.servicePose?{released:retainedExterior.servicePose.released,left:retainedExterior.servicePose.left}:{released:false,left:false};this.contract=structuredClone(contract);this.retained=structuredClone(retainedExterior);this.provider=createRoomProvider(contract.inputs,safe,{foot,facing});this.sessionEpoch=epoch;this.mapId='world:hub:S4';this.disposed=false;this.focused=true;this.stopped=true;this.pending=false;this.world=null;this.accumulator=0;this.onSuccessfulPixel=onSuccessfulPixel;this.assets=assets;this.layout=layout;const provider=this.provider,c=this.contract,ownedEpoch=epoch;owners.set(this,{read:()=>this.disposed?null:{sceneId:c.sceneId,imageSHA:c.inputs.image.sha256,maskSHA:c.inputs.safe.sha256,foot:provider.snapshot().foot,facing:provider.snapshot().facing,epoch:ownedEpoch,focused:this.focused,stopped:this.stopped,pending:this.pending}});
 }
 bindWorld(w){if(this.world&&this.world!==w)throw Error('WORLD_REPLACEMENT_REQUIRES_NEW_OWNER');this.world=w;owners.get(this).world=w}
 getLocation(){const p=this.provider.snapshot();return{...structuredClone(this.retained),servicePose:{sceneId:this.contract.sceneId,mapRevision:'CENTER_R4_COUNTER_ROOT_SELECTED_R1',released:this.latch.released,left:this.latch.left,imageSHA:this.contract.inputs.image.sha256,maskSHA:this.contract.inputs.safe.sha256,foot:p.foot,facing:p.facing}}}
 readNative(){return null}
 readReviewNative(){if(this.disposed)return null;return{...this.provider.snapshot(),mapId:this.contract.sceneId}}
 readServicePose(){return readOwnedCenterPose(this)}
 setFocused(v){this.focused=v===true;if(!this.focused)this.stop()}
 stop(){this.stopped=true;this.accumulator=0}
 frame(dt,dir){if(this.disposed||!this.focused||this.pending||this.world?.busy||this.world?.inputLocked||this.world?.field?.menu!=null||!dirs.has(dir)){this.stop();return 0}if(!Number.isFinite(dt)||dt<0)throw Error('FRAME_DELTA_REQUIRED');this.stopped=false;this.accumulator+=Math.min(50,dt)*.12;let n=0;while(this.accumulator>=1){this.accumulator--;const from=this.provider.snapshot().foot;if(this.provider.step(dir)){n++;if(!this.isReturnTrigger())this.latch.left=true;if(this.onSuccessfulPixel?.({from,to:this.provider.snapshot().foot,distance:1})===false){this.accumulator=0;break}}else{this.accumulator=0;break}}return n}
 releaseAction(){this.latch.released=true}
 isReturnTrigger(){const p=this.provider.snapshot().foot;return Math.abs(p[0]-384)+Math.abs(p[1]-524)<=24}
 inspect(execution){if(this.provider.snapshot().facing==='down'&&this.isReturnTrigger()){if(typeof execution!=='function')throw Error('TRUSTED_CENTER_RETURN_REQUIRED');return execution('service:center:exit')}return this.counterIntent()}
 counterIntent(){const p=this.readServicePose();if(!p||!p.focused||!p.stopped||p.pending||p.facing!=='up')return null;return this.contract.counter.approachRows.some(([y,l,r])=>p.foot[1]===y&&p.foot[0]>=l&&p.foot[0]<r)?{kind:'SERVICE_INTENT_ONLY',pointId:'heal:S4'}:null}
 draw(ctx,clock){if(!this.assets||!this.layout)throw Error('EXACT_CENTER_RENDER_INPUTS_REQUIRED');const p=this.provider.snapshot(),cameraY=Math.max(0,Math.min(36,p.foot[1]-270)),a=this.assets,l=this.layout;ctx.clearRect(0,0,960,540);ctx.save();ctx.beginPath();ctx.rect(96,0,768,540);ctx.clip();ctx.translate(96,-cameraY);ctx.drawImage(a.room,0,0);const k=5/12,draw=(img,f)=>ctx.drawImage(img,0,0,256,256,f[0]-128*k,f[1]-216*k,256*k,256*k);draw(a.doctor,l.doctorFoot);ctx.drawImage(a.foreground,0,0);const b={down:0,right:3,left:6,up:9}[p.facing],frame=b+(this.stopped?0:1+Math.floor(clock.elapsedMs/100)%2);const actor=a.playerFrames['actor:'+frame];if(!actor||actor.width!==107||actor.height!==107)throw Error('ORIGINAL_PLAYER_107_REQUIRED');ctx.drawImage(actor,p.foot[0]-53,p.foot[1]-90);for(const o of l.depthObjects)if(p.foot[1]<o.baseY)ctx.drawImage(a.depth[o.id],0,0);ctx.restore()}
 dispose(){if(this.disposed)return;this.disposed=true;this.stop();this.provider.dispose();this.world=null;owners.get(this).world=null}
}
