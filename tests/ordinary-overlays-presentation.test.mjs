import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{parseHTML}=require('linkedom'),cssom=require('cssom'),{transform}=require('lightningcss');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('dist/ui/species-dex.css');
test('menu status CSS outranks pinned absolute output only for relocated node and never disables actions or alters header',()=>{
 const selector='#canonical-world.ordinary-world.shared-game-shell.shared-game-shell.shared-game-shell aside.eco-menu-dialog>[data-w=status].shared-shell-status';
 const rule=[...cssom.parse(css).cssRules].find(r=>r.selectorText===selector);assert.ok(rule);assert.equal(rule.style.position,'static');assert.equal(rule.style.inset,'auto');assert.equal(rule.style['max-height'],'none');assert.equal(rule.style['pointer-events'],undefined);assert.equal(rule.style['z-index'],undefined);
 const {document}=parseHTML('<main id="canonical-world" class="ordinary-world shared-game-shell"><output data-w="status" class="shared-shell-status"></output><aside class="eco-menu-dialog"><header class="eco-menu-top"><h2>메뉴</h2></header><output data-w="status" class="shared-shell-status"></output></aside></main>');
 const [outside,inside]=document.querySelectorAll('output');assert.equal(outside.matches(selector),false);assert.equal(inside.matches(selector),true);assert.equal(document.querySelector('header').matches(selector),false);
 document.querySelector('main').classList.remove('ordinary-world');assert.equal(inside.matches(selector),false);
 const compiled=transform({filename:'species-dex.css',code:Buffer.from(css),errorRecovery:false});assert.equal(compiled.warnings.length,0);
});
test('overlay source keeps original status identity, scoped menu lock exception and pinned ownership unchanged',()=>{
 const overlay=read('dist/ui/ordinary-overlays.mjs'),entry=read('dist/world/entry.mjs');
 assert.match(overlay,/statusAnchor\.replaceWith\(statusNode\)/);assert.doesNotMatch(overlay,/cloneNode|innerHTML|aria-live|z-index|pointerEvents/);
 assert.match(entry,/el\('menu'\)\.disabled=\(!!world\?\.inputLocked&&!\(ordinary&&world\?\.story.pendingCommit\)\)\|\|!!battle/);
 assert.match(entry,/el\('retry'\)\.disabled=!world\?\.story.pendingCommit\|\|!!world\?\.story.busy/);
 assert.match(entry,/el\('retry'\)\.onclick=safe\(async\(\)=>\{if\(nativeBusy\(\)\)return;const retry=world\.story\.retryCommit\(\);render\(\);await retry;world\.syncField\(\);nativePorts\?\.reconcile\(\)\}\)/);
 assert.match(entry,/canMove:\(\)=>!nativeBusy\(\)&&active\(\)&&!ordinaryMenu\?\.helpOpen/);
});

test('actual retry handler keeps render-await-sync order and native pending blocks every side effect',async()=>{const entry=read('dist/world/entry.mjs'),marker="el('retry').onclick=safe(async()=>",start=entry.indexOf(marker),end=entry.indexOf(');\n',start);assert.ok(start>=0&&end>start);const make=new Function('world','nativeBusy','nativePorts','render','safe','return '+entry.slice(start+"el('retry').onclick=".length,end+1));const events=[];let resolve;const pending=new Promise(r=>resolve=r);const world={story:{retryCommit:()=>{events.push('retry');return pending}},syncField:()=>events.push('sync')},ports={reconcile:()=>events.push('reconcile')},render=()=>events.push('render');await make(world,()=>true,ports,render,fn=>fn)();assert.deepEqual(events,[]);const done=make(world,()=>false,ports,render,fn=>fn)();assert.deepEqual(events,['retry','render']);resolve();await done;assert.deepEqual(events,['retry','render','sync','reconcile']);});
