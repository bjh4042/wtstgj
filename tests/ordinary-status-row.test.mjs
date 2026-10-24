import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {installNearbySafeBand} from '../docs/nearby-safe-band.mjs';
const require=createRequire(import.meta.url),{parseHTML}=require('linkedom'),cssom=require('cssom'),{transform}=require('lightningcss');
const base=process.env.ORDINARY_STATUS_BASE?pathToFileURL(process.env.ORDINARY_STATUS_BASE.replace(/\/$/,'')+'/'):new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
const {installOrdinaryOverlays}=await import(new URL('dist/ui/ordinary-overlays.mjs',base));
const pinned=read('docs/assets/mobile-viewport-CKi2spbv.js');
const installShell=Function(pinned.slice(0,pinned.indexOf('typeof document<'))+';return s;')();
const selector='#canonical-world.ordinary-world.shared-game-shell.shared-game-shell.shared-game-shell .shared-shell-header.qa-safe-nearby-header>[data-w=status].shared-shell-status';
const tick=async()=>{for(let i=0;i<16;i++)await Promise.resolve()};
function fixture({lateShell=false}={}){
 const {document,window}=parseHTML('<html><body><main id="canonical-world" class="ordinary-world"><h1>생태몬</h1><p>조작 안내</p><output role="status" data-w="status" hidden></output><div class="world-layout"><section class="world-play"><div data-w="location">거제</div><canvas data-w="field" tabindex="0"></canvas><section data-w="dialogue" hidden><p>대화</p><button>계속</button></section><div class="world-touch"><button data-dir="up">↑</button><button data-w="action">A</button><button data-w="cancel">B</button><button data-w="menu">메뉴</button></div><div data-w="choices"><button>주변 조사</button></div></section><aside hidden><header class="eco-menu-top"><h2 data-menu-focus="heading" tabindex="-1">메뉴</h2></header><section class="eco-menu-content"></section></aside></div></main></body></html>');
 const root=document.getElementById('canonical-world'),status=root.querySelector('[data-w=status]'),aside=root.querySelector('aside'),content=aside.querySelector('.eco-menu-content'),frames=new Map(),observed=new Set(),resizeObservers=[];
 let next=0,open=false,naturalHeight=38.8,width=1180,height=757,shell=null,band=null;
 window.HTMLElement.prototype.focus=function(){};
 // Deterministic measurement contract, NOT CSS layout/font/pixel proof. The
 // actual pinned fit owner consumes header/body rects. Status natural height is
 // supplied explicitly; source-rule tests separately require wrapping/flow.
 const layout=()=>{
  const landscape=width>height&&height<=500,bodyWidth=Math.max(0,width-26-(landscape?266:0)),bodyHeight=Math.max(0,height-26-(landscape?0:156));
  const header=root.querySelector('.shared-shell-header'),row=!!header&&status.parentNode===header&&!status.hidden&&!!status.textContent;
  const statusHeight=row?Math.min(naturalHeight,Math.max(44,height*.25)):0,headerHeight=89+(row?4+statusHeight:0);
  return {landscape,bodyWidth,bodyHeight,headerHeight,statusHeight,nearby:{x:21,y:56,w:Math.max(0,bodyWidth-16),h:44},status:{x:21,y:104,w:Math.max(0,bodyWidth-16),h:statusHeight}};
 };
 window.HTMLElement.prototype.getBoundingClientRect=function(){const l=layout();let w=l.bodyWidth,h=0;if(this.classList.contains('shared-shell-body'))h=l.bodyHeight;else if(this.classList.contains('shared-shell-header'))h=l.headerHeight;else if(this.classList.contains('shared-shell-dock')){w=l.landscape?260:width-26;h=l.landscape?height-26:150}return {x:13,y:13,width:w,height:h,top:13,left:13,right:13+w,bottom:13+h}};
 window.ResizeObserver=class{constructor(callback){this.callback=callback;resizeObservers.push(this)}observe(node){observed.add(node)}disconnect(){}};
 const viewport=new window.EventTarget();Object.assign(viewport,{width,height,offsetTop:0,offsetLeft:0});window.visualViewport=viewport;
 window.requestAnimationFrame=fn=>{const id=++next;frames.set(id,fn);return id};window.cancelAnimationFrame=id=>frames.delete(id);window.innerWidth=width;window.innerHeight=height;
 const install=()=>{shell=installShell(document,window);band=installNearbySafeBand({document,window})};
 if(!lateShell)install();
 const originalParent=status.parentNode,marker=document.createComment('original following sibling');status.after(marker);
 const overlays=installOrdinaryOverlays({root,aside,content,isMenuOpen:()=>open,closeMenu(){open=false;aside.hidden=true;overlays.update()},openMenu(){open=true;aside.hidden=false;overlays.update({opening:true})}});
 overlays.update();
 const f={root,status,aside,content,document,window,observed,originalParent,marker,overlays,install,layout,
  header:()=>root.querySelector('.shared-shell-header'),nearby:()=>root.querySelector('[data-w=choices]'),
  async settle(){await tick();for(const observer of resizeObservers)observer.callback([]);for(let i=0;frames.size&&i<10;i++){const batch=[...frames.values()];frames.clear();for(const fn of batch)fn();await tick()}assert.equal(frames.size,0,'no competing fit loop')},
  async message(text,{hidden=!text,natural=38.8}={}){naturalHeight=natural;status.textContent=text;status.hidden=hidden;await f.settle()},
  async menu(value){const opening=value&&!open;open=value;aside.hidden=!value;overlays.update({opening});await f.settle()},
  async resize(w,h){width=w;height=h;window.innerWidth=w;window.innerHeight=h;Object.assign(viewport,{width:w,height:h,offsetTop:0,offsetLeft:0});window.dispatchEvent(new window.Event('resize'));await f.settle()},
  async visualResize(w,h,top=0){width=w;height=h;Object.assign(viewport,{width:w,height:h,offsetTop:top});viewport.dispatchEvent(new window.Event('resize'));await f.settle()},
  measured:()=>JSON.parse(root.dataset.shellMeasured),
  dispose(){overlays.dispose();band?.dispose();shell?.destroy()}
 };
 return f;
}
test('status-row CSS is ordinary direct-header flow only and preserves bounded readable feedback, hidden/empty semantics and 44px nearby pins',()=>{
 const css=read('dist/ui/species-dex.css'),rules=[...cssom.parse(css).cssRules],rule=rules.find(r=>r.selectorText===selector);assert.ok(rule,'outside status needs measured flow, not fixed top60px');
 for(const [key,value]of Object.entries({position:'static',inset:'auto','box-sizing':'border-box',flex:'0 0 100%',width:'100%','max-width':'100%',margin:'0','z-index':'auto'}))assert.equal(rule.style[key],value);
 assert.match(rule.style['max-height'],/var\(--shell-view-height,100dvh\)/);assert.equal(rule.style['pointer-events'],undefined);assert.equal(rule.style.display,undefined);assert.equal(rules.find(r=>r.selectorText===selector+':empty')?.style.display,'none');
 const f=fixture();try{assert.equal(f.status.matches(selector),true);assert.equal(f.nearby().matches(selector),false);assert.equal(f.aside.matches(selector),false);f.root.classList.remove('ordinary-world');f.overlays.update();assert.equal(f.status.matches(selector),false);assert.ok(f.status.parentNode===f.originalParent,'non-ordinary route must not acquire a header row')}finally{f.dispose()}
 assert.match(read('docs/nearby-safe-band-ordinary.css'),/height:44px;min-height:44px;max-height:44px/);
 assert.match(read('docs/assets/ui-preview-WMU7-lXW.css'),/overflow-wrap:anywhere;white-space:pre-wrap/);
 assert.equal(transform({filename:'species-dex.css',code:Buffer.from(css),errorRecovery:false}).warnings.length,0);
});
test('status-row same live output cycles empty save error and cleared without changing children, semantics, nearby control or persistence',async()=>{
 const f=fixture();try{
  await f.settle();const initial=f.measured();assert.ok(f.status.parentNode===f.header());assert.equal(f.layout().statusHeight,0);assert.equal(f.status.getAttribute('role'),'status');
  let nearbyActions=0,statusActions=0;f.nearby().querySelector('button').onclick=()=>nearbyActions++;
  await f.message('SLOT_1 저장 완료');assert.ok(f.status.previousElementSibling===f.nearby());assert.equal(f.root.querySelectorAll('[data-w=status]').length,1);assert.ok(f.measured().scene.height<initial.scene.height);
  f.nearby().querySelector('button').click();assert.equal(nearbyActions,1);
  await f.message('저장하지 못했습니다. 저장 메뉴에서 다시 시도해 주세요.');const action=f.document.createElement('button');action.onclick=()=>statusActions++;action.textContent='상태 확인';f.status.append(action);action.click();assert.equal(statusActions,1);
  assert.equal(f.status.getAttribute('role'),'status');assert.equal(f.status.hidden,false);assert.ok(f.status.querySelector('button')===action);
  await f.message('');assert.equal(f.status.hidden,true);assert.equal(f.layout().statusHeight,0);assert.deepEqual(f.measured().scene,initial.scene);
  await f.message('',{hidden:false});assert.equal(f.layout().statusHeight,0,'empty output has no phantom row');assert.deepEqual(f.measured().scene,initial.scene);
 }finally{f.dispose()}assert.ok(f.status.parentNode===f.originalParent);assert.ok(f.status.nextSibling===f.marker);
});
test('status-row pinned header measurement budgets long Korean text across portrait short landscape and visual-height resize without new fit ownership',async()=>{
 const f=fixture();try{
  for(const [w,h]of [[1180,757],[390,844],[320,568],[667,375],[844,390],[390,260]]){
   await f.resize(w,h);await f.message('');const empty=f.measured(),before=f.layout();
   await f.message('저장을 완료하지 못했습니다. 인터넷과 저장 공간을 확인한 뒤 다시 시도해 주세요. '.repeat(30),{natural:1400});
   const l=f.layout(),measured=f.measured();assert.ok(f.status.parentNode===f.header());assert.ok(l.statusHeight>0);assert.ok(f.observed.has(f.header()),'existing pinned ResizeObserver owns header measurements');assert.equal(measured.height,h);
   assert.equal(l.nearby.h,44);assert.ok(l.status.y>=l.nearby.y+l.nearby.h,'separate rows do not overlap in the deterministic contract');assert.ok(l.statusHeight<=Math.max(44,h*.25));
   assert.equal(measured.scene.availableHeight,Math.max(0,l.bodyHeight-l.headerHeight-16));assert.ok(measured.scene.height<=empty.scene.height);assert.equal(measured.native[0],960);assert.equal(measured.native[1],540);assert.equal(l.bodyWidth,before.bodyWidth,'status must not become a lateral root flex sibling');
   await f.message('');assert.deepEqual(f.measured().scene,empty.scene);
  }
  await f.resize(390,844);const full=f.measured();await f.visualResize(390,260,68);await f.message('오류 안내 '.repeat(100),{natural:1400});
  assert.equal(f.window.innerHeight,844,'visual viewport resize must be distinct from layout viewport');assert.equal(f.measured().height,260);assert.equal(f.root.style.getPropertyValue('--shell-view-top'),'68px');assert.ok(f.layout().statusHeight<=65);
  await f.visualResize(390,844,0);await f.message('');assert.deepEqual(f.measured().scene,full.scene);
 }finally{f.dispose()}
});
test('status-row menu moves keep original output and action listeners, return after nearby, and restore exact original root order only on teardown',async()=>{
 const f=fixture();try{
  await f.message('포획에 성공했어요.');let actions=0;const action=f.document.createElement('button');action.onclick=()=>actions++;f.status.append(action);
  const outside=f.measured();
  for(let i=0;i<3;i++){
   await f.menu(true);assert.ok(f.status.parentNode===f.aside);assert.ok(f.status.nextSibling===f.content);assert.equal(f.status.matches(selector),false);assert.ok(f.measured().scene.height>=outside.scene.height);
   action.click();await f.message('늦게 도착한 저장 오류');assert.ok(f.status.parentNode===f.aside);f.status.append(action);
   await f.menu(false);assert.ok(f.status.parentNode===f.header());assert.ok(f.status.previousElementSibling===f.nearby());assert.equal(f.status.matches(selector),true);assert.ok(f.status.querySelector('button')===action);
  }
  assert.equal(actions,3);assert.equal(f.root.querySelectorAll('[data-w=status]').length,1);await f.menu(true);
 }finally{f.dispose()}assert.ok(f.status.parentNode===f.originalParent);assert.ok(f.status.nextSibling===f.marker);assert.match(f.status.textContent,/늦게 도착한 저장 오류/);
});
test('status-row late shell and band installation are idempotent, do not pull status from an open menu, and preserve teardown position',async()=>{
 const f=fixture({lateShell:true});try{
  await f.message('저장 오류');assert.ok(f.status.parentNode===f.root);await f.menu(true);assert.ok(f.status.parentNode===f.aside);
  f.install();await f.settle();assert.ok(f.status.parentNode===f.aside);await f.menu(false);assert.ok(f.status.parentNode===f.header());assert.ok(f.status.previousElementSibling===f.nearby());
  for(let i=0;i<4;i++){f.overlays.update();await f.settle();assert.ok(f.status.previousElementSibling===f.nearby());assert.equal(f.root.querySelectorAll('[data-w=status]').length,1)}
 }finally{f.dispose()}assert.ok(f.status.parentNode===f.originalParent);assert.ok(f.status.nextSibling===f.marker);
});
test('status-row implementation changes placement only, with no new measurements, save writes, feedback dismissal or control disabling',()=>{
 const source=read('dist/ui/ordinary-overlays.mjs');assert.match(source,/node.previousElementSibling!==nearby/);assert.match(source,/statusAnchor\.replaceWith\(statusNode\)/);
 assert.doesNotMatch(source,/getBoundingClientRect|ResizeObserver|visualViewport|requestAnimationFrame|localStorage|setItem\(|cloneNode|aria-live|pointerEvents|\.textContent\s*=/);
});
