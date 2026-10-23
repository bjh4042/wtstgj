import {launchRequest,failLaunch} from './ordinary/launch.mjs';
if(import.meta.env.DEV&&new URLSearchParams(location.search).get('world')==='1'){
 const {startCanonicalWorld}=await import('./world/entry.mjs');await startCanonicalWorld();
}else if(launchRequest?.namespace==='canonical-v1'){
 try{
  const [{loadOrdinaryGameplayReleases},{createOrdinarySlots},{startCanonicalWorld}]=await Promise.all([import('./ordinary/runtime-releases.mjs'),import('./ordinary/slots.mjs'),import('./world/entry.mjs')]);
  const api=createOrdinarySlots(localStorage,await loadOrdinaryGameplayReleases()),saved=api.read(launchRequest.slot);
  if(saved.contentNamespace!==launchRequest.namespace)throw Error('슬롯의 콘텐츠가 변경되었습니다. 다시 선택하세요.');
  await startCanonicalWorld({ordinary:{slot:launchRequest.slot,api,runtime:saved.runtime,recovered:!!saved.recovery}});
 }catch(e){failLaunch(e.message);if(document.getElementById('canonical-world')){const p=document.createElement('p'),b=document.createElement('button');p.textContent='저장을 변경하지 않았습니다. '+e.message;b.textContent='타이틀로 돌아가기';b.onclick=()=>location.reload();document.body.replaceChildren(p,b)}else await import('./app.js')}
}else await import('./app.js');
