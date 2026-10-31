import {NojasanNativeScene} from './scene.mjs';
import {createNojasanRenderer} from './ambient.mjs';
export function summitActionMessage(result){
 if(result?.returned)return '원래 POST [33,7]로 돌아왔습니다.';
 if(result?.completed===true&&result?.outcome==='won')return '예지와의 마지막 대결에서 승리했습니다. 진행 기록에 반영되었습니다.';
 if(result?.outcome==='lost')return '대결에서 패배했습니다.';
 const labels={SOURCE_FINAL_GATE_LOCKED:'아직 마지막 대결의 조건을 갖추지 못했습니다.',SOURCE_FINAL_ALREADY_COMPLETED:'이미 완료한 마지막 대결입니다.',NATIVE_BATTLE_AUTHORITY_NOT_CONNECTED:'아직 연결되지 않은 대결입니다.',NO_LOCAL_READ_POINT:'조사할 대상 가까이에서 바라보고 다시 시도하세요.'};
 return labels[result?.status]??'조사를 마쳤습니다.';
}
/** Construct before world; pass readNative to the branded core authority. No UI registration. */
export function createSummitSceneBinding(){let scene=null;return Object.freeze({readNative:()=>scene?.readNative()??null,bind(next){if(scene&&next&&scene!==next)throw Error('SUMMIT_ALREADY_BOUND');scene=next},unbind(expected){if(scene===expected)scene=null}})}
/** Main owns RAF, controls, battle presentation, clock and canonical world.
 * inputs.images lifetime belongs to entry: close decoded bitmaps on full entry teardown,
 * not canonical/native transitions; this host does not decode or close shared images. */
export function installSummitReviewHost({root,canvas,getWorld,environment,clearInput,onStatus,inputs,binding,renderer=createNojasanRenderer()}){
 if(!binding?.bind||!inputs?.images)throw Error('SUMMIT_HOST_INPUTS_REQUIRED');
 const world=getWorld(),scene=new NojasanNativeScene({world,...inputs,challenge:()=>world.interactNativeSummit('post:yeji-final',{type:'battle'}),returnToCanonical:()=>world.interactNativeSummit('post-entry:nojasan-summit:return',{type:'return'})});
 let disposed=false,acting=false,direction=null,focused=true,epoch=0,entered=false;
 const current=()=>!disposed&&getWorld()===world,active=()=>current()&&entered&&scene.active();
 const boundReader={readNative:()=>active()?scene.readNative():null};binding.bind(boundReader);
 const clear=()=>{direction=null;scene.walker.stop();clearInput()};
 const bar=document.createElement('section');bar.dataset.summitNative='';
 const note=document.createElement('p');note.textContent='노자산 R2 개발 검토 · 원본 최종대결/귀환 연결 · 혼합 식생 경계 실기 검토 필요';bar.append(note);
 const button=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>Promise.resolve().then(fn).catch(e=>{if(current())onStatus(e.message)});bar.append(b);return b};
 const enter=button('노자산 입장 · 원래 POST 입구 근처에서',async()=>{if(!current()||acting||active())return;const owner=epoch;acting=true;clear();sync();try{await scene.enter();if(!current()||epoch!==owner)return;entered=true;onStatus('노자산 native 입장 · 원본 최종대결 gate 유지');canvas.focus?.()}finally{if(current()&&epoch===owner){acting=false;sync()}}});
 const inspect=button('조사 · 예지 대결 / 원래 입구 귀환',action);
 function sync(){const busy=acting||world.busy;enter.disabled=!current()||active()||busy;inspect.disabled=!active()||busy;root.dataset.summitNativeActive=String(active())}
 async function action(){if(!active()||acting)return;const owner=epoch;acting=true;clear();sync();try{const result=await scene.inspect();if(current()&&epoch===owner)onStatus(summitActionMessage(result))}finally{if(current()&&epoch===owner){acting=false;clear();sync()}}}
 const win=globalThis.window,onBlur=()=>{focused=false;scene.walker.setFocus(false);clear()},onFocus=()=>{focused=true;scene.walker.setFocus(true)};
 win?.addEventListener('blur',onBlur);win?.addEventListener('focus',onFocus);
 root.querySelector('.world-play').prepend(bar);sync();
 return {bar,scene,get active(){return active()},get blocked(){return current()&&(active()||acting)},
  frame(dt,dir){if(!active()){sync();return}if(world.story?.battleSnapshot?.()){clear();return}if(scene.walker.focused!==focused){scene.walker.setFocus(focused);direction=null}if(dir!==direction){if(direction)scene.walker.key({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[direction],false);direction=dir;}if(dir)scene.walker.key({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[dir],true);scene.tick(dt/1000);canvas.width=960;canvas.height=540;const w=scene.walker,camera=[Math.max(0,Math.min(576,Math.round(w.x-480))),Math.max(0,Math.min(484,Math.round(w.y-270)))];const e=environment.getFrame(world.map);renderer(canvas.getContext('2d'),{scene,images:inputs.images,camera,minutes:e.lighting.minutes});sync()},
  action,releaseAction(){},cancel(){clear()},pause(){clear();scene.walker.setFocus(false)},
  dispose(){if(disposed)return;disposed=true;acting=false;epoch++;clear();binding.unbind(boundReader);scene.dispose();win?.removeEventListener('blur',onBlur);win?.removeEventListener('focus',onFocus);bar.remove()}
 };
}
