import {launchRequest,failLaunch} from './ordinary/launch.mjs';
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('s9Transfer')){
 const {startS9TransferReview}=await import('./development/s9-transfer/entry.mjs');await startS9TransferReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).has('gohyeonGym4')){
 const {startGohyeonGym4Review}=await import('./development/gohyeon-gym4/entry.mjs');await startGohyeonGym4Review();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).has('cargoMemory')){
 const {startCargoMemoryReview}=await import('./development/cargo-memory/entry.mjs');await startCargoMemoryReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).has('gohyeonGameplay')){
 const {startGohyeonGameplayReview}=await import('./development/gohyeon-gameplay/entry.mjs');await startGohyeonGameplayReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('prologueNative')==='1'){
 const {startPrologueNativeReview}=await import('./development/prologue-native/entry.mjs');await startPrologueNativeReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('jungleNative')==='1'){
 const {startJungleReview}=await import('./development/jungle-native/entry.mjs');await startJungleReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('cargoNative')==='1'){
 const {startCargoReview}=await import('./development/cargo-native/entry.mjs');await startCargoReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('gohyeonPair')==='1'){
 const {startGohyeonPairReview}=await import('./development/gohyeon-pair/entry.mjs');await startGohyeonPairReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('gohyeonNative')==='1'){
 const {startGohyeonReview}=await import('./development/gohyeon-native/entry.mjs');await startGohyeonReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('pairedNative')==='1'){
 const {startPairedReview}=await import('./development/paired/entry.mjs');await startPairedReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('summitNative')==='1'){
 const {startSummitReview}=await import('./development/nojasan-entry.mjs');await startSummitReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('nativeMemory')==='1'){
 const {startNativeMemoryReview}=await import('./development/native-save/memory-entry.mjs');await startNativeMemoryReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('postNative')==='1'){
 const {startPostReview}=await import('./development/post-entry.mjs');await startPostReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('finalGame')==='1'){
 const {startFinalGameReview}=await import('./development/final-game-entry.mjs');await startFinalGameReview();
}else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('world')==='1'){
 const {startCanonicalWorld}=await import('./world/entry.mjs');await startCanonicalWorld();
}else if(launchRequest?.namespace==='canonical-v1'){
 try{
  const [{loadOrdinaryGameplayReleases},{createOrdinarySlots},{startCanonicalWorld}]=await Promise.all([import('./ordinary/runtime-releases.mjs'),import('./ordinary/slots.mjs'),import('./world/entry.mjs')]);
  const api=createOrdinarySlots(localStorage,await loadOrdinaryGameplayReleases()),saved=api.read(launchRequest.slot);
  if(saved.contentNamespace!==launchRequest.namespace)throw Error('슬롯의 콘텐츠가 변경되었습니다. 다시 선택하세요.');
  await startCanonicalWorld({ordinary:{slot:launchRequest.slot,api,runtime:saved.runtime,recovered:!!saved.recovery}});
 }catch(e){failLaunch(e.message);if(document.getElementById('canonical-world')){const p=document.createElement('p'),b=document.createElement('button');p.textContent='저장을 변경하지 않았습니다. '+e.message;b.textContent='타이틀로 돌아가기';b.onclick=()=>location.reload();document.body.replaceChildren(p,b)}else await import('./app.js')}
}else await import('./app.js');
