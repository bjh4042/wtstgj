import {isShopCounterPose} from './counter-predicate.mjs';
import {SHOP_CONTRACT as C} from './fixed-contract.mjs';
import {createShopR3Walker,createShopR3Renderer} from './shop-r3-provider.mjs';
const owners=new WeakMap(),dirs=new Set(['up','down','left','right']);
const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
export const ownedShopWorld=s=>owners.get(s)?.world??null;
export const readOwnedShopPose=s=>owners.get(s)?.read()??null;
export async function createShopInteriorScene({safe,retainedExterior,epoch,assets=null,canvasFactory=null,onSuccessfulPixel=null}){
 const mask=Uint8Array.from(safe??[]);if(mask.length!==960*720||await sha(mask)!==C.pins['public_safe.u8'].sha256)throw Error('SHOP_MASK_PIN');
 if(retainedExterior?.mapId!=='world:hub:S4'||retainedExterior.indoorPose!=null||!Number.isSafeInteger(epoch)||epoch<1)throw Error('SHOP_EXCLUSIVE_OWNER');
 const saved=retainedExterior.servicePose;if(saved&&(saved.sceneId!==C.sceneId||saved.imageSHA!==C.image.sha256||saved.maskSHA!==C.pins['public_safe.u8'].sha256||saved.mapRevision!==C.revision))throw Error('SHOP_SAVED_PIN');
 const retained=structuredClone(retainedExterior),walker=createShopR3Walker(C,mask,{foot:saved?.foot??C.entry,facing:saved?.facing??'up'}),renderer=assets?createShopR3Renderer({image:assets.room,cashier:assets.cashier,canvasFactory}):null;
 let world=null,disposed=false,focused=true,stopped=true,pending=false,accumulator=0,released=saved?.released??false,left=saved?.left??false;
 const read=()=>disposed?null:{sceneId:C.sceneId,imageSHA:C.image.sha256,maskSHA:C.pins['public_safe.u8'].sha256,foot:walker.snapshot().foot,facing:walker.snapshot().facing,epoch,focused,stopped,pending};
 const returnTrigger=()=>{const f=walker.snapshot().foot;return Math.abs(f[0]-480)+Math.abs(f[1]-625)<=24};
 const scene={get sessionEpoch(){return epoch},mapId:'world:hub:S4',get disposed(){return disposed},get world(){return world},get latch(){return {released,left}},
 bindWorld(w){if(!w||world&&world!==w)throw Error('SHOP_WORLD_REPLACEMENT');world=w;owners.get(scene).world=w},
 getLocation(){const p=walker.snapshot();return {...structuredClone(retained),servicePose:{sceneId:C.sceneId,mapRevision:C.revision,imageSHA:C.image.sha256,maskSHA:C.pins['public_safe.u8'].sha256,foot:p.foot,facing:p.facing,released,left}}},
 readNative(){return null},readServicePose:read,readReviewNative:()=>disposed?null:{...walker.snapshot(),mapId:C.sceneId},
 setFocused(v){focused=v===true;if(!focused)scene.stop()},setPending(v){pending=v===true;if(pending)scene.stop()},stop(){stopped=true;accumulator=0},releaseAction(){released=true},isReturnTrigger:returnTrigger,
 frame(dt,dir){if(disposed||!focused||pending||world?.busy||world?.inputLocked||world?.field?.menu!=null||!dirs.has(dir)){scene.stop();return 0}if(!Number.isFinite(dt)||dt<0)throw Error('SHOP_FRAME_DELTA');stopped=false;accumulator+=Math.min(dt,50)*.12;let n=0;while(accumulator>=1){accumulator--;const from=walker.snapshot().foot;if(!walker.step(dir)){accumulator=0;break}n++;if(!returnTrigger())left=true;if(onSuccessfulPixel?.({from,to:walker.snapshot().foot,distance:1})===false){accumulator=0;break}}return n},
 proximityHint(){return scene.counterIntent()?'생태 상점 · 캐셔에게 구매 상담 · 위를 보고 조사':returnTrigger()?'상점 출입구 · 아래를 보고 조사':'생태 상점 · 중앙 통로를 따라 캐셔 앞으로 이동하세요'},
 counterIntent(){const p=read();return isShopCounterPose(p)?{kind:'SHOP_COUNTER_INTENT_ONLY',pointId:'shop:S4'}:null},
 inspect(execute){if(disposed)return null;if(walker.snapshot().facing==='down'&&returnTrigger()){if(typeof execute!=='function')throw Error('TRUSTED_SHOP_RETURN');return execute('service:shop:exit')}return scene.counterIntent()},
 draw(ctx,clock){if(!renderer||!assets?.playerFrames)throw Error('SHOP_RENDER_ASSETS');const p=walker.snapshot(),base={down:0,right:3,left:6,up:9}[p.facing],i=base+(stopped?0:1+Math.floor(clock.elapsedMs/100)%2);return renderer.draw(ctx,{player:assets.playerFrames[`actor:${i}`]??assets.playerFrames[i],foot:p.foot,facing:p.facing})},
 dispose(){if(disposed)return;disposed=true;scene.stop();walker.dispose();renderer?.dispose();world=null;owners.get(scene).world=null}
 };owners.set(scene,{read,world});return scene;
}
