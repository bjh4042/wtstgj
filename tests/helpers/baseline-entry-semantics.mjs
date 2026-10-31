import assert from 'node:assert/strict';
import {fixture,adapter,CanonicalWorld,createCanonicalCreature,flush,assertNoGlobalListeners,createBattleRules,calculateDamage,deferred} from './baseline-entry-fixture.mjs';
async function eligible(){const seed=new CanonicalWorld({adapter,hooks:{dialogue:async()=>{}}});for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await seed.story.runEvent(id);const s=seed.snapshot();s.party=[createCanonicalCreature(seed.catalog,'SPECIES_001',16)];s.dex.seen=['SPECIES_001'];s.dex.caught=['SPECIES_001'];seed.dispose();return s}
function nativeHost(){const host={blocked:false,active:false,canOpenCanonicalMenu:true,closed:0,disposed:0,pause(){},resume(){},beginCanonicalMenu(){return{close:()=>host.closed++}},dispose(){host.disposed++}};return host}
const evolutionButton=f=>{const b=f.root.querySelector('[data-menu-focus^="party-evolve:"]');assert.ok(b,'actual entry evolution button exists');return b};
export async function verifyEvolutionCallbacks({entry}={}){
 // Execute actual DOM callback and original world.evolve; persistence is awaited.
 const f=await fixture({entry,runtime:await eligible()});try{await f.el('menu').onclick();const before=f.world.snapshot(),button=evolutionButton(f);let release;f.state.persistGate={promise:new Promise(r=>release=r)};const pending=button.onclick();await flush();assert.equal(f.state.evolutionCalls?.length??0,0);assert.equal(f.world.snapshot().party[0].speciesId,'SPECIES_001');release();await pending;assert.equal(f.world.snapshot().party[0].speciesId,'SPECIES_002');assert.equal(f.state.evolutionCalls.length,1);assert.equal(f.state.evolutionCalls[0].committed.party[0].speciesId,'SPECIES_002');assert.equal(f.state.evolutionCalls[0].arg.before.speciesId,before.party[0].speciesId);assert.equal(f.state.evolutionCalls[0].arg.after.speciesId,'SPECIES_002');assert.equal(f.state.evolutionCalls[0].arg.confirmed,true)}finally{await f.cleanup()}
 const failed=await fixture({entry,runtime:await eligible()});try{await failed.el('menu').onclick();const before=failed.world.snapshot();failed.state.persistFailure=true;await evolutionButton(failed).onclick();assert.deepEqual(failed.world.snapshot(),before);assert.equal(failed.state.evolutionCalls?.length??0,0);assert.match(failed.el('status').textContent,/TEST_PERSIST_FAILURE/)}finally{await failed.cleanup()}
 const host=nativeHost(),leased=await fixture({entry,runtime:await eligible(),developmentReview:()=>host});try{
 await leased.el('menu').onclick();const oldButton=evolutionButton(leased);await leased.el('menu').onclick();host.blocked=true;await leased.el('menu').onclick();const lockedButton=evolutionButton(leased),before=leased.world.snapshot();assert.equal(lockedButton.disabled,true);host.blocked=false; // Host state can change before a queued callback; private lease must still reject.
 // Direct onclick intentionally models delayed queued/stale activation despite disabled DOM.
 await lockedButton.onclick();await oldButton.onclick();assert.deepEqual(leased.world.snapshot(),before);assert.equal(leased.state.evolutionCalls?.length??0,0);
 await leased.el('menu').onclick();assert.equal(host.closed,1);await lockedButton.onclick();assert.deepEqual(leased.world.snapshot(),before,'render-time readonly captured callback remains inert after lease closes');
 host.blocked=false;await leased.el('menu').onclick();leased.state.evolution.busy=true;await evolutionButton(leased).onclick();assert.deepEqual(leased.world.snapshot(),before);assert.equal(leased.state.evolutionCalls?.length??0,0);
 }finally{await leased.cleanup()}
}
export async function verifyTerminalTeardown({entry}={}){
 await verifyActualTerminalDrain(entry);
 const host=nativeHost(),f=await fixture({entry,runtime:await eligible(),developmentReview:()=>host});await f.frame();host.blocked=true;await f.el('menu').onclick();assert.equal(f.world.field.menu,0);const staleButton=evolutionButton(f),oldFrame=[...f.queue.values()][0],before=f.world.snapshot();
 const token=f.state.tail.begin();f.state.tail.settle(token,'won',f.clock);assert.equal(f.state.tail.pending,true);const hooks=f.state.hooks,preCounts={...f.counts};
 f.hide(false);await flush();assert.equal(f.counts.evolutionStops,preCounts.evolutionStops+1);assert.equal(f.counts.worldDisposes,preCounts.worldDisposes+1);assert.equal(f.counts.controlDisposes,preCounts.controlDisposes+1);assert.equal(host.disposed,1);assert.equal(f.world.field.menu,null);assert.equal(f.state.tail.pending,false);assert.equal(f.counts.finishes,0);assert.equal(f.pending,0);
 const counts={...f.counts};f.hide(false);f.handle.dispose();f.handle.dispose();f.show();oldFrame?.(f.clock+1);await staleButton.onclick();hooks.battleFinished('won');hooks.battleReady({});f.state.tail.tick(f.clock+9999,{busy:false});await flush();assert.deepEqual(f.counts,counts);assert.deepEqual(f.world.snapshot(),before);assert.equal(f.state.tail.pending,false);assert.equal(host.disposed,1);assert.equal(f.pending,0);assertNoGlobalListeners(f);
}

// Existing full-entry battle fixture pattern; Lv100 is test-only, not difficulty evidence.
async function battleRuntime(){
 const world=new CanonicalWorld({adapter,hooks:{dialogue:async()=>{}},rng:()=>.99});
 for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await world.story.runEvent(id);
 const runtime=world.snapshot();runtime.party=[createCanonicalCreature(world.catalog,'SPECIES_003',100)];
 for(const key of ['seen','caught'])if(!runtime.dex[key].includes('SPECIES_003'))runtime.dex[key].push('SPECIES_003');world.dispose();return runtime;
}
const rules=createBattleRules(adapter);
function bestMove(world,s){const player=s.party[s.active],enemy=s.opponents[s.enemyActive];return player.moves.filter(m=>m.pp>0).sort((a,b)=>damage(b.id)-damage(a.id))[0]?.id??'SYSTEM_STRUGGLE';function damage(id){const move=rules.moves[id];return move.power?calculateDamage({rules,catalog:world.catalog,move,attacker:player,defender:enemy}).damage:0}}


async function verifyActualTerminalDrain(entry){
 const f=await fixture({entry,runtime:await battleRuntime()});try{
  await f.el('save').onclick();const before=f.world.snapshot(),saves=f.counts.saves;
  const operation=f.world.story.runTrainer('RIVAL_00',f.world.options());
  for(let i=0;i<100&&!f.state.visuals.length;i++){await flush();if(!f.el('dialogue').hidden)f.el('continue').onclick()}
  assert.equal(f.state.visuals.length,1);const visual=f.state.visuals[0];
  f.state.terminalGate=deferred();let battle=visual.snapshot;
  for(let turn=0;turn<100&&battle.phase!=='ended';turn++){
   visual.busy=false;
   const moveId=bestMove(f.world,battle),label=f.world.catalog.getMoveById(moveId).name;
   const action=[...f.el('battle-actions').querySelectorAll('button')].find(b=>b.textContent.startsWith(label+' ('));
   assert.ok(action,'real battle move button');await action.onclick();await flush();battle=visual.snapshot;
  }
  assert.equal(battle.phase,'ended');assert.equal(battle.outcome,'won');
  visual.busy=true;f.hide(true);f.state.terminalGate.resolve();await flush();
  for(let i=0;i<50&&f.world.busy;i++){await flush()}
  await operation;assert.equal(f.state.tail.pending,true,'terminal callback must not be dropped just because field RAF is paused');
  const committed=f.world.snapshot();const staleActions=[...f.el('battle-actions').querySelectorAll('button')];for(const button of staleActions)await button.onclick();assert.deepEqual(f.world.snapshot(),committed);assert.ok(committed.progress.defeatedTrainers.includes('RIVAL_00'));assert.ok(committed.economy.money>before.economy.money);assert.equal(f.counts.saves,saves+1);assert.equal(f.counts.finishes,0);
  f.state.hooks.battleFinished('won');assert.equal(f.state.tail.pending,true);f.show();visual.busy=false;await f.frame();
  assert.equal(f.state.tail.pending,false);assert.equal(f.counts.finishes,1);assert.equal(f.el('battle-panel').hidden,true);assert.deepEqual(f.world.snapshot(),committed);
  for(let i=0;i<3;i++){f.hide(true);f.show();await f.frame()}
  f.state.hooks.battleFinished('won');assert.equal(f.counts.finishes,1);assert.equal(f.counts.saves,saves+1);assert.deepEqual(f.world.snapshot(),committed);
 }finally{await f.cleanup()}
}
