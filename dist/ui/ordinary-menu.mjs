import {installOrdinaryOverlays} from './ordinary-overlays.mjs';
import {dexRecord,selectDexRecords,dexDetailMarkup,dexListMarkup,escapeDex} from './species-dex.mjs';
const esc=escapeDex;
export const ORDINARY_MENU_ITEMS=Object.freeze([
 ['dex','도감','설명 · 종족값 · 모티프'],['party','생태친구','파티 · 보관함'],['bag','가방','가지고 있는 도구'],
 ['explorer','탐험가','여행 기록 · 지역 안내'],['save','저장','현재 슬롯에 저장'],['settings','설정','글자 크기 · 조작 안내']
]);
/** View-only navigation controller. Existing party, item and save handlers stay authoritative. */
export function installOrdinaryMenu({root,onExit,onChanged=()=>{},returnFocus=null,onOpenMenu=()=>{}}){
 const aside=root.querySelector('aside'),document=root.ownerDocument;
 const party=aside.querySelector('[data-w="party"]'),state=aside.querySelector('[data-w="state"]'),guide=aside.querySelector('[data-w="guide"]').closest('details'),save=aside.querySelector('[aria-label="저장 메뉴"]');
 const top=document.createElement('header');top.className='eco-menu-top';
 const heading=document.createElement('h2');heading.id='eco-menu-heading';heading.dataset.menuFocus='heading';heading.tabIndex=-1;
 const back=document.createElement('button');back.type='button';back.dataset.menuFocus='back';back.textContent='B 닫기';back.setAttribute('aria-label','메뉴 닫기');top.append(heading,back);
 const content=document.createElement('section');content.className='eco-menu-content';aside.prepend(top,content);
 aside.classList.add('eco-menu-dialog');aside.setAttribute('role','dialog');aside.setAttribute('aria-modal','true');aside.setAttribute('aria-labelledby',heading.id);aside.tabIndex=-1;
 let page='main',speciesId=null,query='',filter='all',snapshot=null,catalog=null,shown=false,lastFocusedDex=null;
 const overlays=installOrdinaryOverlays({root,aside,content,isMenuOpen:()=>shown,closeMenu:onExit,openMenu:onOpenMenu});
 const show=(next,{focus=true}={})=>{page=next;speciesId=null;render();if(focus)heading.focus();onChanged()};
 const backOne=()=>{if(speciesId){speciesId=null;render();const match=[...content.querySelectorAll('[data-dex-id]')].find(b=>b.dataset.dexId===String(lastFocusedDex));(match??heading).focus();return true}if(page!=='main'){const previous=page;page='main';render();content.querySelector(`[data-menu-page="${previous}"]`)?.focus();return true}return false};
 back.onclick=()=>{if(!backOne())onExit()};
 // Capture before any outer entry render removes party controls. Keys identify logical
 // controls, not positions; consumed item options cannot silently select a new action.
 function captureFocus(){
  const node=document.activeElement;if(!aside.contains(node))return null;
  const key=node.dataset.menuFocus??(node.dataset.menuPage?'page:'+node.dataset.menuPage:node.dataset.dexId?'species:'+node.dataset.dexId:null);
  if(!key)return null;
  const result={key};
  if(node.matches('input[type="search"],input[type="text"],textarea'))Object.assign(result,{text:node.value,start:node.selectionStart,end:node.selectionEnd,direction:node.selectionDirection});
  if(node.tagName==='SELECT')Object.assign(result,{value:node.value,option:[...node.querySelectorAll('option')].find(o=>o.value===node.value)?.dataset.menuOption});
  return result;
 }
 // Passive DOM rebuilds restore logical focus, not the browser's scroll position.
 function restoreFocus(focus){
  if(!focus)return;
  const node=[heading,...visibleControls()].find(n=>(n.dataset.menuFocus??(n.dataset.menuPage?'page:'+n.dataset.menuPage:n.dataset.dexId?'species:'+n.dataset.dexId:null))===focus.key)??heading;
  if(focus.text!==undefined&&node.matches('input,textarea')){node.value=focus.text;node.focus({preventScroll:true});if(Number.isInteger(focus.start)&&Number.isInteger(focus.end))node.setSelectionRange?.(focus.start,focus.end,focus.direction??'none')}
  else {if(node.tagName==='SELECT'){const option=[...node.querySelectorAll('option')].find(o=>focus.option!==undefined?o.dataset.menuOption===focus.option:o.value===focus.value);if(option)option.selected=true}node.focus({preventScroll:true})}
 }
 function render(focus=captureFocus()){renderContent();restoreFocus(focus)}
 function renderContent(){
  if(!snapshot||!catalog)return;
  for(const node of [party,state,guide,save])node.hidden=true;
  const current=ORDINARY_MENU_ITEMS.find(([id])=>id===page);heading.textContent=speciesId?'생태 기록':current?.[1]??'탐험 메뉴';
  back.textContent=page==='main'?'B 닫기':'B 뒤로';back.setAttribute('aria-label',page==='main'?'메뉴 닫기':'이전 메뉴로');
  if(page==='main'){
   content.innerHTML=`<p class="eco-menu-intro">${esc(snapshot.player?.name??'탐험가')} · 메뉴를 선택하세요.</p><nav class="eco-menu-nav" aria-label="탐험 메뉴">${ORDINARY_MENU_ITEMS.map(([id,label,description])=>`<button type="button" data-menu-page="${id}"><span>${label}</span><small>${description}</small></button>`).join('')}</nav>`;
   content.querySelectorAll('[data-menu-page]').forEach(b=>b.onclick=()=>show(b.dataset.menuPage));
  }else if(page==='dex'){
   if(speciesId){const record=dexRecord(catalog,snapshot.dex,speciesId);content.innerHTML=dexDetailMarkup(record);return}
   const all=selectDexRecords(catalog,snapshot.dex),records=selectDexRecords(catalog,snapshot.dex,{query,filter});
   content.innerHTML=dexListMarkup(records,{seen:all.filter(x=>x.seen).length,caught:all.filter(x=>x.caught).length,total:all.length,query,filter});
   const search=content.querySelector('[data-dex-search]'),select=content.querySelector('[data-dex-filter]');
   search.dataset.menuFocus='dex-search';select.dataset.menuFocus='dex-filter';search.oninput=()=>{query=search.value};
   search.onchange=()=>{query=search.value;render()};
   select.onchange=()=>{filter=select.value;render()};
   content.querySelectorAll('[data-dex-id]').forEach(b=>b.onclick=()=>{const id=b.dataset.dexId,record=dexRecord(catalog,snapshot.dex,id);if(!record?.seen)return;speciesId=id;lastFocusedDex=id;
    // This is a new detail page, not a rebuild of the removed list row. Keep
    // accessible heading focus without focusing the sticky header into view.
    render(null);aside.scrollTop=0;heading.focus({preventScroll:true})});
  }else if(page==='party'){
   content.innerHTML='<p class="eco-menu-intro">함께하는 생태친구와 보관함입니다. 도구 사용·진화는 기존 조건을 그대로 따릅니다.</p>';party.hidden=false;
  }else if(page==='bag'){
   const rows=[...Object.entries(snapshot.inventory??{}),...Object.entries(snapshot.progress?.items??{})].filter(([,n])=>n>0);
   content.innerHTML=`<p class="eco-menu-intro">도구를 생태친구에게 사용하려면 생태친구 메뉴를 열어 주세요.</p><ul class="eco-menu-bag">${rows.map(([id,n])=>`<li>${esc(catalog.itemContract?.[id]?.name??id)} <strong>×${n}</strong></li>`).join('')||'<li>가방이 비어 있습니다.</li>'}</ul><button type="button" data-open-party data-menu-focus="open-party">생태친구에게 도구 사용</button>`;
   content.querySelector('[data-open-party]').onclick=()=>show('party');
  }else if(page==='explorer'){
   content.innerHTML='<p class="eco-menu-intro">현재 여행 기록과 지역의 조사 지점을 확인하세요.</p>';state.hidden=false;guide.hidden=false;guide.open=true;
  }else if(page==='save'){
   content.innerHTML='<p class="eco-menu-intro">현재 플레이 중인 슬롯을 저장합니다. 다른 슬롯의 저장은 바꾸지 않습니다.</p>';save.hidden=false;
  }else if(page==='settings'){
   content.innerHTML=`<label><input type="checkbox" data-large-text data-menu-focus="large-text" ${aside.dataset.largeText==='true'?'checked':''}> 메뉴 글자 크게 보기</label><p class="eco-menu-intro">이 설정은 현재 플레이 화면에만 적용됩니다.</p><ul><li>방향키 / WASD: 필드 이동</li><li>메뉴 안 방향키: 항목 이동</li><li>Z / Enter / A: 선택·조사</li><li>X / Esc / B: 한 단계 뒤로</li><li>M / 메뉴 버튼: 메뉴 열기·닫기</li><li>검색 입력 중에는 글자·방향키를 그대로 사용합니다.</li><li>선택 상자 방향키: 선택 변경 · Esc: 뒤로</li><li>터치: 항목을 눌러 선택</li></ul>`;
   content.querySelector('[data-large-text]').onchange=e=>{aside.dataset.largeText=String(e.target.checked)};
  }
 }
 const visibleControls=()=>[...aside.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')].filter(n=>!n.closest('[hidden]'));
 const textEditing=node=>!!node?.closest?.('textarea,input:not([type]),input[type="search"],input[type="text"],input[type="email"],input[type="url"],input[type="tel"],input[type="password"],input[type="number"],[contenteditable]:not([contenteditable="false"])');
 const consume=event=>{event.preventDefault();event.stopPropagation();return true};
 function activate(){
  if(!shown)return;
  const active=document.activeElement,node=aside.contains(active)?active:null;
  if(node?.matches('select')||textEditing(node))return;
  (node?.matches('button,input[type="checkbox"],input[type="radio"],summary')?node:visibleControls().find(n=>n!==back))?.click();
 }
 function keydown(event){
  if(overlays.handleKeydown(event))return true;
  if(!shown)return false;
  let active=document.activeElement;
  const owned=aside.contains(active)&&!active.closest?.('[hidden]');
  // Modal ownership comes before editable-control checks, including native inputs.
  if(event.key==='Tab'){
   const controls=visibleControls(),first=controls[0],last=controls.at(-1);
   if(!controls.length){consume(event);heading.focus()}
   else if(!owned||active===heading||active===aside){consume(event);(event.shiftKey?last:first).focus()}
   else if(event.shiftKey&&active===first){consume(event);last.focus()}
   else if(!event.shiftKey&&active===last){consume(event);first.focus()}
   return true;
  }
  if(!owned){heading.focus();active=heading}
  if(event.isComposing)return true;
  if(event.key==='Escape'){consume(event);if(!event.repeat&&!backOne())onExit();return true}
  // Text editing must not turn an X/M/Z letter, Enter search, or a caret key into
  // field/game commands. Native select arrows and Space retain browser behavior.
  if(textEditing(active)){if(event.key==='Enter'&&active.dataset.dexSearch!==undefined){consume(event);if(!event.repeat){query=active.value;render()}}return true;}
  if(['x','X'].includes(event.key)){consume(event);if(!event.repeat&&!backOne())onExit();return true}
  if(['m','M'].includes(event.key)){consume(event);if(!event.repeat)onExit();return true}
  if(active.tagName==='SELECT')return true;
  // Preserve the field controller's native-button repeat guard while the modal owns keys.
  if(active.tagName==='BUTTON'&&event.repeat&&['Enter',' '].includes(event.key)){consume(event);return true}
  if(['z','Z'].includes(event.key)||(event.key==='Enter'&&active.matches('input[type="checkbox"],input[type="radio"]'))){consume(event);if(!event.repeat)activate();return true}
  if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(event.key)){
   consume(event);const controls=visibleControls(),i=controls.indexOf(active),delta=['ArrowUp','ArrowLeft'].includes(event.key)?-1:1;const node=controls[(i+delta+controls.length)%controls.length];node?.focus();node?.scrollIntoView?.({block:'nearest'});return true;
  }
  if(event.key==='Enter'&&(active===heading||active===aside)){consume(event);if(!event.repeat)activate()}
  return true;
 }
 // The entry also invokes handleKeydown in document capture phase, before field
 // controls, so a browser BODY focus fallback cannot transfer input ownership.
 const onKeydown=event=>{if(keydown(event))event.stopPropagation()};
 aside.addEventListener('keydown',onKeydown);
 return {
  update(next,{catalog:nextCatalog,open,focusState=captureFocus()}){snapshot=next;catalog=nextCatalog;const opening=open&&!shown,closing=!open&&shown;shown=open;overlays.update({opening});if(!open){page='main';speciesId=null;if(closing)returnFocus?.focus();return}render(focusState);if(opening)content.querySelector('[data-menu-page]')?.focus();else if(!aside.contains(document.activeElement))heading.focus({preventScroll:true})},
  captureFocus,handleKeydown:keydown,closeHelp:overlays.closeHelp,activateHelp:overlays.activateHelp,get helpOpen(){return overlays.helpOpen},
  back:backOne,activate,
  get page(){return page},get selectedSpeciesId(){return speciesId},
  dispose(){overlays.dispose();aside.removeEventListener('keydown',onKeydown)}
 };
}
