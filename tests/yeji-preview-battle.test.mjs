import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {adaptYejiPreview,PREVIEW_NAMESPACE,PREVIEW_DEFINITION_STATUS} from '../dist/compatibility/preview-opponent-adapter.mjs';
import {SpeciesCatalogService} from '../dist/species-catalog-service.mjs';
import {createCanonicalCreature,createCanonicalTestGame,createGameSession} from '../dist/canonical-session.mjs';
import {activateCanonicalBattleSave,validateCanonicalBattleSave} from '../dist/battle-v3/save.mjs';
import {startSessionBattle} from '../dist/battle-v3/engine.mjs';
import {startYejiPreviewBattle} from '../dist/battle-v3/preview-opponents.mjs';
import {createBattleRules} from '../dist/battle-v3/rules.mjs';
import {createBattlePresentation} from '../dist/battle-v3/presentation.mjs';
import {createMoveVfxCatalog,resolveMoveVfx} from '../dist/presentation/battle-vfx.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';
import {cellPosition,hubId} from '../dist/world/definition.mjs';

const read=f=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8');
// Pre-economy-approval snapshot retained; live approval paths tested separately.
const adapter={...await loadCanonicalRuntimeAdapter({readText:async f=>read(f)}),economyPolicy:undefined},catalog=new SpeciesCatalogService({namespace:'canonical',adapter});
const manifest=JSON.parse(read('geoje_final_source_manifest_v1.json')),source=JSON.parse(read('geoje_battle_collection_master_v3.json'));
const contract=adapter.battleRuntime.previewOpponent,rules=createBattleRules(adapter);
function session(){return createGameSession(activateCanonicalBattleSave(createCanonicalTestGame(catalog,{mode:'test',starterId:'SPECIES_001'}),catalog),catalog)}
const start=(s=session(),options={})=>startYejiPreviewBattle(s,{adapter,mode:'test',rng:()=>.5,...options});

test('Yeji six preview IDs, levels, moves, candidate types/stats match the two immutable sources',()=>{
 assert.equal(contract.ready,true);assert.deepEqual(contract.errors,[]);assert.equal(contract.partyStatus,'LOCKED');assert.equal(contract.definitionStatus,PREVIEW_DEFINITION_STATUS);
 assert.equal(contract.namespace,PREVIEW_NAMESPACE);assert.equal(contract.party.id,source.enhanced_post_league.id);
 assert.equal(contract.unlock,source.enhanced_post_league.unlock);assert.equal(contract.repeatability,'one_time');
 assert.deepEqual(contract.party.members,source.enhanced_post_league.party.map(p=>({namespace:PREVIEW_NAMESPACE,speciesId:p.preview_species_id,level:p.level,moveIds:p.moves.map(m=>m.move_id),ace:p.ace})));
 for(const p of source.npc_preview_species){const r=contract.byId[p.preview_species_id];assert.deepEqual(r.stats,['hp','atk','def','spa','spd','spe'].map(k=>p.base_stats[k]));assert.deepEqual(r.types,p.types);assert.equal(r.playerObtainable,false);assert.equal(r.mainDexInclusion,false)}
 const vfx=createMoveVfxCatalog(rules.moves);for(const p of contract.party.members)for(const id of p.moveIds){assert.ok(rules.moves[id]);assert.ok(resolveMoveVfx(vfx,id).effects.length)}
});

test('malformed preview references quarantine this optional contract, not replace canonical species',()=>{
 for(const edit of [s=>s.enhanced_post_league.party[0].preview_species_id='SPECIES_001',s=>s.enhanced_post_league.party[0].moves[0].move_id='MISSING',s=>s.npc_preview_species[0].base_stats.hp=null,s=>s.npc_preview_species[0].definition_status='APPROVED']){
  const changed=structuredClone(source);edit(changed);const bad=adaptYejiPreview(manifest,changed);assert.equal(bad.ready,false);assert.ok(bad.errors.length);
  assert.throws(()=>start(session(),{adapter:{...adapter,battleRuntime:{...adapter.battleRuntime,previewOpponent:bad}}}),/Validated pending/);
 }
 assert.equal(catalog.size,151);assert.equal(catalog.getSpeciesById('EDNA_01'),null);
});

test('DEV/TEST capability creates the exact six-opponent party; ordinary/forged/wild access remains blocked',()=>{
 const s=session(),before=structuredClone(s.runtime),b=start(s),snap=b.snapshot();
 assert.equal(snap.kind,'trainer');assert.equal(snap.engine,'canonical-battle-v3');assert.equal(snap.preview.approvalStatus,'PENDING_USER_APPROVAL');assert.equal(snap.preview.persistable,false);
 assert.deepEqual(snap.opponents.map(m=>[m.namespace,m.speciesId,m.level,m.moves.map(x=>x.id)]),contract.party.members.map(m=>[m.namespace,m.speciesId,m.level,m.moveIds]));
 for(const m of snap.opponents){assert.equal(m.hp,Math.floor(2*contract.byId[m.speciesId].stats[0]*m.level/100)+m.level+10);for(const move of m.moves)assert.equal(move.pp,rules.moves[move.id].pp)}
 for(const mode of [undefined,'production','development'])assert.throws(()=>start(s,{mode}),/DEV\/TEST/);
 for(const kind of ['wild','trainer'])assert.throws(()=>startSessionBattle(s,{kind,opponents:contract.party.members.slice(0,1)},{adapter}),/canonical opponent/);
 assert.throws(()=>startSessionBattle(s,{kind:'trainer',opponents:contract.party.members,previewPermit:{}},{adapter}),/capability/);
 assert.throws(()=>b.act({type:'capture',ballId:'ecology_ball'}),/Cannot capture/);assert.throws(()=>b.aftermath(),/cannot export/);
 assert.deepEqual(s.runtime,before);
});

test('Battle v3 executes every preview opponent with existing moves/VFX and no EXP or ownership export',()=>{
 const s=session();
 // Isolated level-100 battle fixture only, not normal growth, world progression or economy evidence.
 s.runtime.party=Array.from({length:6},()=>createCanonicalCreature(catalog,'SPECIES_151',100));
 s.runtime.dex={seen:['SPECIES_001','SPECIES_151'],caught:['SPECIES_001','SPECIES_151']};
 const before=structuredClone(s.runtime),b=start(s);
 for(let i=0;i<300&&b.snapshot().phase!=='ended';i++){
  const snap=b.snapshot(),p=snap.party[snap.active];
  if(snap.phase==='forced-switch')b.act({type:'switch',index:snap.party.findIndex(m=>m.hp>0)});
  else b.act({type:'move',moveId:p.moves.find(m=>m.pp>0&&rules.moves[m.id].power)?.id??p.moves.find(m=>m.pp>0)?.id??'SYSTEM_STRUGGLE'});
 }
 const snap=b.snapshot();assert.equal(snap.outcome,'won');
 const used=snap.events.filter(e=>e.type==='move'&&e.side==='opponent');
 assert.deepEqual([...new Set(used.map(e=>e.instanceId))],contract.party.members.map(p=>'preview-opponent:'+p.speciesId));
 for(const e of used){const p=contract.party.members.find(p=>e.instanceId.endsWith(p.speciesId));assert.ok(p.moveIds.includes(e.moveId)||e.moveId==='SYSTEM_STRUGGLE');assert.ok(e.vfx.effects.length)}
 assert.ok(!snap.events.some(e=>e.type==='exp'||e.type==='level-up'));assert.throws(()=>b.aftermath(),/cannot export/);assert.deepEqual(s.runtime,before);
 for(const id of Object.keys(contract.byId)){assert.equal(catalog.getSpeciesById(id),null);assert.throws(()=>createCanonicalCreature(catalog,id,70),/Invalid canonical creature/)}
 for(const destination of ['party','box','dex']){const poisoned=structuredClone(before);if(destination==='dex')poisoned.dex.seen.push('EDNA_01');else poisoned[destination].pop(),poisoned[destination].push(snap.opponents[0]);assert.throws(()=>validateCanonicalBattleSave(poisoned,catalog),/identity/)}
});

test('preview front uses existing labelled placeholder with correct namespace and common presentation',()=>{
 const b=start(),snap=b.snapshot(),text=[];
 const ctx=new Proxy({fillText:(t)=>text.push(t)},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const p=createBattlePresentation({audio:{emit(){}}});p.consume(snap);const r=p.draw(ctx,snap,0);
 assert.equal(r.front.status,'loading');assert.equal(r.front.assetId,'approved.EDNA_01.front');assert.equal(r.front.accessibleLabel,'이미지 준비 중');assert.equal(snap.background.biomeId,'LEAGUE');assert.ok(r.front.scale>0);
 assert.ok(snap.display.back.assetId);assert.equal(catalog.economyPolicy,null);p.stop();
});

test('existing POST Yeji interaction stays blocked without rewards, saving or economy approval',async()=>{
 // Historical pre-operation-approval gate, retained alongside the new approved-path tests.
 const w=new CanonicalWorld({adapter:{...adapter,enhancedLeague:undefined},mode:'test'}),p=w.definition.points['post:yeji'];
 // Focused location fixture; no full story traversal and no user save changes.
 const readSnapshot=w.story.snapshot.bind(w.story);
 w.story.snapshot=()=>({...readSnapshot(),position:cellPosition(hubId('POST'),p.x,p.y+1)});
 assert.ok(w.definition.postBlockers.includes(p.reason));
 const before=w.snapshot();
 try{await assert.rejects(()=>w.interact('post:yeji'),/PREVIEW_APPROVAL_AND_ENHANCED_LEAGUE_GATE_NOT_ACTIVATED/);assert.deepEqual(w.snapshot(),before);assert.equal(w.snapshot().candidatePolicyId,undefined);assert.equal(w.story.trainerAvailable('NPC_EXP_PREVIEW_EDNA'),false)}finally{w.dispose()}
});
