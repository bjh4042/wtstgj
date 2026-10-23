/** Original code-native UI. Palette: approved SAVE_DIALOGUE_UI + BATTLE_UI.
 * No screenshot crops, image assets, gameplay state or save writes. */
export const FIELD_UI_PALETTE=Object.freeze({ink:'#173E34',paper:'#FAF5E9',card:'#FFFDF6',teal:'#17695E',line:'#697F70',selected:'#E0EDE5',focus:'#684A8F'});
export const FIELD_UI_DESCRIPTIONS=Object.freeze(['만난 생태몬과 도감 기록을 확인합니다.','함께 다니는 생태친구를 확인합니다.','가방에 든 도구를 확인합니다.','탐험가와 현재 지역을 확인합니다.','지금까지의 모험을 저장합니다.','소리와 조작 설정을 확인합니다.']);
export const FIELD_UI_REPLACED_IDS=Object.freeze(['field.ui.menu-frame','field.ui.cursor','field.ui.dialogue-frame']);
/** Pure measurement fixture: panel stays inside visual viewport minus safe insets. */
export function fieldUIBounds(width,height,safe={}){
 const left=Math.max(0,safe.left||0)+12,top=Math.max(0,safe.top||0)+12;
 const availableWidth=Math.max(0,width-left-Math.max(0,safe.right||0)-12);
 const availableHeight=Math.max(0,height-top-Math.max(0,safe.bottom||0)-12);
 const w=Math.min(560,availableWidth);return {x:left+(availableWidth-w)/2,y:top,width:w,maxHeight:availableHeight,fontSize:16,minTarget:44,overflow:'auto'};
}
export function fieldUISelection(index,count=6){return Array.from({length:count},(_,i)=>({selected:i===index,tabIndex:i===index?0:-1}));}
/** Grapheme-preserving deterministic wrapping for static fixtures, not DOM layout. */
export function wrapFieldUIText(text,maxWidth,measure){
 if(!(maxWidth>0))throw new RangeError('Positive text width required');
 const segments=typeof Intl.Segmenter==='function'?new Intl.Segmenter('ko',{granularity:'grapheme'}):null;
 const lines=[];for(const paragraph of String(text).split('\n')){let line='';const chars=segments?Array.from(segments.segment(paragraph),s=>s.segment):Array.from(paragraph);for(const char of chars){if(line&&measure(line+char)>maxWidth){lines.push(line);line=''}line+=char}lines.push(line)}return lines;
}
/** Logical-canvas fallback for non-DOM previews only; never combine with DOM overlay. */
export function drawFieldPanel(c,x,y,width,height){c.save();c.fillStyle=FIELD_UI_PALETTE.paper;c.strokeStyle=FIELD_UI_PALETTE.line;c.lineWidth=3;c.beginPath();c.roundRect(x+2,y+2,width-4,height-4,18);c.fill();c.stroke();c.restore();}
export function drawFieldCursor(c,x,y){c.save();c.fillStyle=FIELD_UI_PALETTE.teal;c.beginPath();c.roundRect(x,y,8,44,4);c.fill();c.restore();}
/**
 * Reuses existing menu buttons and their onclick handlers, never creates a second
 * menu activation path. Caller owns state and updates once per field frame.
 * callbacks: onSelect(index), onAdvance(), onClose(). No global key listeners.
 */
export function installApprovedFieldUI({menu,log,onSelect,onAdvance,onClose,document:doc=globalThis.document}){
 const root=doc.createElement('section');root.id='approved-field-ui';root.hidden=true;root.setAttribute('aria-label','모험 안내');
 const panel=doc.createElement('div');panel.className='approved-field-panel';
 const title=doc.createElement('h2');title.id='approved-field-ui-title';title.textContent='모험 메뉴';
 panel.setAttribute('aria-labelledby',title.id);panel.append(title);
 menu.classList.add('approved-field-menu');
 const buttons=Array.from(menu.querySelectorAll('button'));buttons.forEach((button,index)=>{button.style.removeProperty('top');button.textContent=button.getAttribute('aria-label')||button.textContent;button.addEventListener('focus',()=>onSelect(index));});
 const description=doc.createElement('p');description.className='approved-field-description';description.id='approved-field-description';menu.setAttribute('aria-describedby',description.id);
 log.classList.remove('sr-only');log.classList.add('approved-field-dialogue');log.setAttribute('tabindex','0');
 const footer=doc.createElement('div');footer.className='approved-field-footer';
 const advance=doc.createElement('button');advance.type='button';advance.textContent='계속';advance.addEventListener('click',()=>onAdvance());
 const close=doc.createElement('button');close.type='button';close.textContent='닫기';close.addEventListener('click',()=>onClose());footer.append(advance,close);
 panel.append(menu,description,log,footer);root.append(panel);doc.body.append(root);
 const area=doc.createElement('div');area.id='approved-field-area';area.hidden=true;area.setAttribute('role','status');doc.body.append(area);
 let previousMode='',previousLine='',previousFocus=null;
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();return;}
  if(event.key==='Tab'){const focusables=[...(menu.hidden?[]:buttons.filter(button=>button.tabIndex===0)),...(log.hidden?[]:[log]),...(advance.hidden?[]:[advance]),close];const first=focusables[0],last=focusables.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus()}event.stopPropagation();return;}
  if(!menu.hidden&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopPropagation();const selected=buttons.findIndex(b=>b.getAttribute('aria-current')==='true');const direction=['ArrowUp','ArrowLeft'].includes(event.key)?-1:1;const next=(Math.max(0,selected)+direction+buttons.length)%buttons.length;onSelect(next);buttons.forEach((button,i)=>{button.setAttribute('aria-current',String(i===next));button.tabIndex=i===next?0:-1});buttons[next].focus();buttons[next].scrollIntoView({block:'nearest'});return;}
  // Native focused button activation is the sole path; do not let app A/Enter also fire.
  if(['Enter',' ','Spacebar'].includes(event.key)&&event.target.tagName==='BUTTON')event.stopPropagation();
 });
 function update(state,{suppressed=false}={}){
  const mode=suppressed||!state?'':state.menu!==null?'menu':state.dialogue?.length?'dialogue':'';
  const line=mode==='dialogue'?(state.dialogue[state.dialogueIndex]??''):'';
  root.hidden=!mode;area.hidden=!!mode||suppressed||!state?.core?.area||!!state?.transition;
  if(!area.hidden)area.textContent=state.core.area.name;
  if(!mode){if(previousMode&&root.contains(doc.activeElement)&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousMode='';return;}
  title.textContent=mode==='menu'?'모험 메뉴':'대화';menu.hidden=mode!=='menu';description.hidden=mode!=='menu';log.hidden=mode!=='dialogue';advance.hidden=mode!=='dialogue';
  if(mode==='menu'){description.textContent=FIELD_UI_DESCRIPTIONS[state.menu]??'';const selection=fieldUISelection(state.menu,buttons.length);buttons.forEach((button,i)=>{button.setAttribute('aria-current',String(selection[i].selected));button.tabIndex=selection[i].tabIndex;});}
  if(log.textContent!==line)log.textContent=line;
  if(line!==previousLine){log.scrollTop=0;previousLine=line;}
  if(mode!==previousMode){if(!previousMode)previousFocus=doc.activeElement;(mode==='menu'?buttons[state.menu]:advance)?.focus({preventScroll:true});panel.scrollTop=0;}
  previousMode=mode;
 }
 return {update,root,area};
}
