/** Main owner's frame/input only. No RAF, timers or durable browser storage. */
export function installMemoryReviewHost({root,canvas,clearInput,onStatus,owner,view,onRestore}){
 let disposed=false,busy=false,remainder=0;const section=document.createElement('section');section.dataset.nativeMemory='';
 const label=document.createElement('p');label.textContent='장목 외부 · 메모리 전용 개발 슬롯 · 새로고침하면 소멸 · 집/워프 저장 미연결';section.append(label);
 const clear=()=>{remainder=0;owner.stop();clearInput()};
 const run=fn=>async()=>{if(disposed||busy)return;busy=true;clear();sync();try{await fn();}catch(e){if(!disposed)onStatus(e.message)}finally{if(!disposed){busy=false;sync()}}};
 const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.onclick=run(fn);section.append(b);return b};
 const save=button('현재 위치를 메모리 슬롯에 저장',()=>{owner.save();onStatus('메모리 슬롯 저장 완료 · 실제 사용자 저장소 변경 없음')});
 const restore=button('메모리 슬롯에서 위치·진행 복원',()=>onRestore());
 const retry=button('대기 중인 저장만 재시도',async()=>{await owner.retryCommit();if(!disposed)onStatus('캡처된 위치·진행 저장 재시도 완료')});
 function sync(){save.disabled=busy||owner.pending;restore.disabled=busy||(owner.pending&&!owner.canReload)||!owner.exportRaw();retry.disabled=busy||!owner.pending||owner.conflict;}
 root.querySelector('.world-play').prepend(section);root.querySelector('h1').textContent='QA 메모리 저장 E2E · 장목 외부';sync();
 return {get active(){return !disposed},get blocked(){return true},
  frame(dt,direction){if(disposed)return;if(!busy&&!owner.pending&&direction){remainder+=Math.min(dt,50)*.12;while(remainder>=1){remainder--;if(!owner.move(direction).ok){remainder=0;break}}}else clear();view.draw(canvas.getContext('2d'),owner.getNativeState(),busy||owner.pending?0:dt);sync()},
  action(){if(!disposed)onStatus('이 모드는 검증된 외부 이동과 메모리 저장/복원만 연결합니다. 집·워프는 아직 미연결입니다.')},releaseAction(){},cancel:clear,pause:clear,
  dispose(){if(disposed)return;disposed=true;clear();owner.dispose();section.remove()}
 };
}
