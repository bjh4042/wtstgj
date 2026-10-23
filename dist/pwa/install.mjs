/** Optional install UI. No save or gameplay state is changed by installation. */
export function installHelp(userAgent='') {
 return /iPad|iPhone|iPod/.test(userAgent)
  ? 'Safari에서 공유 버튼 → 홈 화면에 추가를 선택하세요. 표시되는 경우 웹 앱으로 열기를 켜세요.'
  : '브라우저 주소창 오른쪽의 설치 아이콘 또는 브라우저 메뉴의 앱 설치를 확인하세요. 설치 가능 여부와 바탕화면 바로가기 생성은 브라우저와 운영체제에 따라 다릅니다.';
}
export function mountInstall({window:w=window,document:d=document,navigator:n=navigator}={}) {
 let pending=null,busy=false;
 const existing=d.getElementById('install-app'); if(existing)return;
 const button=d.createElement('button');button.id='install-app';button.type='button';button.textContent='앱 설치';
 const dialog=d.createElement('dialog');dialog.id='install-help';dialog.setAttribute('aria-label','앱 설치 안내');
 const copy=d.createElement('p'),close=d.createElement('button');close.textContent='닫기';close.type='button';
 dialog.append(copy,close);d.body.append(button,dialog);
 new MutationObserver(()=>{if(!button.isConnected)d.body.append(button,dialog)}).observe(d.body,{childList:true});
 const standalone=()=>w.matchMedia('(display-mode: standalone)').matches||n.standalone===true;
 const update=()=>{button.hidden=standalone()};update();
 close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>button.focus());
 w.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;update()});
 w.addEventListener('appinstalled',()=>{pending=null;button.hidden=true;if(dialog.open)dialog.close()});
 button.addEventListener('click',async()=>{
  if(busy)return;
  if(!pending){copy.textContent=installHelp(n.userAgent);dialog.showModal();return}
  busy=true;button.disabled=true;const event=pending;pending=null;
  try { await event.prompt();await event.userChoice; }
  catch {copy.textContent=installHelp(n.userAgent);dialog.showModal()}
  finally {busy=false;button.disabled=false;update()}
 });
}
if(typeof window!=='undefined') {
 const init=()=>mountInstall();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 if('serviceWorker' in navigator&&import.meta.env.PROD)window.addEventListener('load',()=>{
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).catch(()=>{/* Installation is optional; game continues. */});
 },{once:true});
}
