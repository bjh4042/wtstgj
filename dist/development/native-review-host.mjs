import{mountReviewPositionHud}from'./review-position-hud.mjs';
/** Development-only host: one canonical owner loop, no save or progression authority. */
export function installNativeReviewHost({root,canvas,getWorld,environment,clearInput,loadController,onStatus}) {
 let controller=null,loading=false,disposed=false,acting=false,epoch=0;
 const bar=document.createElement('section');bar.dataset.nativeReview='';bar.setAttribute('aria-label','개발용 지도 연결 검토');
 const note=document.createElement('p');note.textContent='개발 검토 · 최종 지도 대체 아님. 장목 도달 후 연결 가능 · 본편 저장/진행은 변경하지 않습니다.';bar.append(note);
 const buttons=[];
 const positionHud=mountReviewPositionHud({container:bar,enabled:import.meta.env?.DEV===true,read:()=>{const s=controller?.active?controller.snapshot()?.native:null;return{scene:s?.sceneId??s?.scene,foot:s?.foot,facing:s?.facing,pending:loading||acting||!!s?.pending}}});
 const report=e=>onStatus(e?.message??String(e));
 const button=(label,run)=>{const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{if(disposed||loading)return;try{await run()}catch(e){report(e)}finally{sync()}};buttons.push(b);bar.append(b);return b};
 const enter=async home=>{const world=getWorld();if(!world)throw Error('먼저 canonical 새 게임을 시작하세요.');if(controller?.active)throw Error('지도 검토가 이미 진행 중입니다.');loading=true;epoch++;acting=false;clearInput();sync();try{controller?.dispose();controller=await loadController({world,canonicalEnvironment:environment,clearInput});if(disposed){controller.dispose();return}try{controller.enter(home)}catch(e){controller.dispose();controller=null;throw e}onStatus('장목 native 지도 검토 · Z 조사 · X 취소 · 아래 복귀 버튼으로 본편 복귀');}finally{loading=false}};
 const upper=button('장목 지도 연결 · 위쪽 집',()=>enter('upper'));
 const family=button('장목 지도 연결 · 가족 집',()=>enter('family'));
 const coastal=button('장목 지도 연결 · 해안 집',()=>enter('coastal'));
 const open=button('DEV 검토 · 선택한 집 문 열기',()=>{controller.openDoor();onStatus('검토용 OPEN 상태 · 본편 해금 아님')});
 const routes=['door','stairs','exit'].map((target,i)=>button(['검증 경로 · 문 앞','검증 경로 · 계단','검증 경로 · 현관'][i],()=>{const r=controller.routeTo(target);onStatus(r.ok?'검증 경로 이동 중':r.reason)}));
 const back=button('canonical 본편으로 복귀',()=>{epoch++;acting=false;controller?.exit();clearInput();canvas.width=960;canvas.height=540;onStatus('본편 위치·진행 불변 확인 후 복귀했습니다.');canvas.focus()});
 function sync(){const active=!!controller?.active;upper.disabled=loading||active;family.disabled=loading||active;coastal.disabled=loading||active;open.disabled=loading||!active;routes.forEach(b=>b.disabled=loading||!active);back.disabled=loading||!active;root.dataset.nativeReviewActive=String(active);root.dataset.nativeReviewLoading=String(loading);positionHud.refresh()}
 root.querySelector('.world-play').prepend(bar);sync();
 return {get active(){return !!controller?.active},get blocked(){return loading||!!controller?.active},frame(dt,direction){if(controller?.active){controller.frame(dt,direction);controller.draw(canvas.getContext('2d'));sync()}},async action(){if(!controller?.active||acting)return;const target=controller,owner=epoch;acting=true;try{const result=await target.action();if(owner===epoch&&!disposed)onStatus(result?.ok?'조사 완료':result?.reason??'조사 처리')}finally{target.releaseAction();if(owner===epoch){acting=false;sync()}}},cancel(){controller?.cancel();clearInput();sync()},pause(){clearInput();controller?.releaseAction()},dispose(){disposed=true;epoch++;acting=false;try{controller?.dispose()}finally{positionHud.dispose();bar.remove()}},bar};
}
