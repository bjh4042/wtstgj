import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {CONSUMABLES_V1,CONSUMABLES_V1_HASH,applyConsumablesApproval} from '../dist/economy/consumables-v1.mjs';
import {itemUseResult,maxHp,shopItems,quotePurchase} from '../dist/economy/contract.mjs';
import {itemUseChoices} from '../dist/economy/item-use-choices.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';import {createWorldStore} from '../dist/world/save-store.mjs';
import {cellPosition} from '../dist/world/definition.mjs';import {syncWorldLocation} from '../dist/world/state.mjs';
import {createCanonicalCreature,createGameSession} from '../dist/canonical-session.mjs';
import {SpeciesCatalogService} from '../dist/species-catalog-service.mjs';
import {validateCanonicalStorySave,storyBattleInput,mergeStoryAftermath} from '../dist/story/save.mjs';import {startSessionBattle} from '../dist/battle-v3/engine.mjs';
import {sha256,stableJSON} from '../dist/compatibility/codec.mjs';
import {isolatedStorage} from './helpers/enhanced-league-fixture.mjs';import {beforeConsumablesApproval} from './helpers/before-consumables-approval.mjs';
const text=readFileSync(new URL('../dist/data/canonical-handoff-v1/geoje_battle_collection_master_v3.json',import.meta.url),'utf8');
const originalItems=Object.fromEntries(JSON.parse(text).items.catalog.map(i=>[i.id,i]));
const adapter=await loadCanonicalRuntimeAdapter({readText:async f=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
const world=(s=null,options={})=>new CanonicalWorld({adapter,mode:'test',runtime:s,...options});
const starterWorld=world();for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])await starterWorld.story.runEvent(id);const starterCheckpoint=starterWorld.snapshot();starterWorld.dispose();
function fixture(){const w=world(starterCheckpoint),s=w.snapshot();s.party=['SPECIES_001','SPECIES_004'].map(id=>createCanonicalCreature(w.catalog,id,30));s.dex={seen:s.party.map(m=>m.speciesId),caught:s.party.map(m=>m.speciesId)};s.progress.items={ether:3,max_ether:3,full_heal:2};const p=w.definition.points['shop:PROLOGUE'];s.position=cellPosition(p.mapId,p.x,p.y+1);syncWorldLocation(s,w.host);w.dispose();return s}
const pp=m=>m.moves.map(x=>x.pp),maxPP=(c,m)=>m.moves.map(x=>c.getMoveById(x.id).pp);

// Independent transcription of the user's latest approved table; not derived from the overlay.
const expected=[
 ['potion','회복약',200,'PROLOGUE',{hp_restore:25}],['super_potion','좋은회복약',500,'BADGE2',{hp_restore:60}],
 ['hyper_potion','고급회복약',1000,'BADGE4',{hp_restore:120}],['full_potion','완전회복약',2000,'BADGE8',{hp_restore:'full'}],
 ['antidote','해독제',100,'PROLOGUE',{cure:['poison','bad_poison']}],['paralyze_heal','마비치료제',200,'BADGE2',{cure:['paralysis']}],
 ['burn_heal','화상치료제',200,'BADGE2',{cure:['burn']}],['awakening','잠깨는약',200,'BADGE2',{cure:['sleep']}],
 ['ice_heal','해빙제',200,'BADGE2',{cure:['freeze']}],['full_heal','만능치료제',500,'BADGE6',{cure:['all_status']}],
 ['revive','기력조각',1500,'BADGE6',{revive_hp_percent:50}],['max_revive','기력덩이',3000,'BADGE8',{revive_hp_percent:100}],
 ['ether','기술회복제',500,'BADGE4',{pp_restore:10}],['max_ether','만능기술회복제',1500,'BADGE8',{pp_restore_all:10}]
];
test('14 approved IDs/names/prices/unlocks/effects; only approved item overlay; source/candidate/balls intact',()=>{
 assert.equal(Object.keys(CONSUMABLES_V1.items).length,14);assert.equal(CONSUMABLES_V1.sourceSha256,sha256(text));assert.equal(CONSUMABLES_V1_HASH,sha256(stableJSON(CONSUMABLES_V1)));
 const effective=adapter.battleRuntime.items;
 assert.deepEqual(Object.keys(effective),Object.keys(originalItems));assert.equal(originalItems.max_ether.effect.pp_restore_all,'partial');
 for(const [id,name,price,unlock,effect]of expected){const i=effective[id];assert.deepEqual([i.id,i.name,i.price,i.unlock,i.effect],[id,name,price,unlock,effect]);assert.equal(i.shop,true);assert.equal(i.pocket,'items');if(id!=='max_ether')assert.deepEqual(i.effect,originalItems[id].effect)}
 for(const id of Object.keys(originalItems).filter(id=>!CONSUMABLES_V1.items[id]))assert.deepEqual(effective[id],originalItems[id]);
 assert.deepEqual(applyConsumablesApproval(effective,text),effective);assert.throws(()=>applyConsumablesApproval(effective,text+' '),/source mismatch/);
});

test('shop gates and quote share actual 17-item list; purchases go to item bag, once-only and capped',async()=>{
 const w=world(),ids=shopItems(w.catalog).map(i=>i.id);assert.equal(ids.length,17);assert.ok(!ids.includes('geoje_ball'));assert.ok(expected.every(([id])=>ids.includes(id)));
 for(const [id,,price,unlock]of expected){const s=w.snapshot();if(unlock!=='PROLOGUE')assert.throws(()=>quotePurchase(s,w.catalog.itemContract,id,1),/해금/);if(unlock!=='PROLOGUE')s.progress.badges.push('BADGE_0'+unlock.slice(5));assert.equal(quotePurchase(s,w.catalog.itemContract,id,2).cost,price*2)}
 const s=fixture(),n=world(s);const balls=structuredClone(s.inventory);
 const buy={transactionId:'consumable-buy',itemId:'potion',quantity:2};await n.interact('shop:PROLOGUE',buy);await n.interact('shop:PROLOGUE',buy);
 assert.equal(n.snapshot().economy.money,s.economy.money-400);assert.equal(n.snapshot().progress.items.potion,2);assert.deepEqual(n.snapshot().inventory,balls);
 await assert.rejects(()=>n.interact('shop:PROLOGUE',{transactionId:'locked',itemId:'ether',quantity:1}),/해금/);
 const full=n.snapshot();full.progress.items.potion=9999;assert.throws(()=>quotePurchase(full,n.catalog.itemContract,'potion',1),/한도/);
 n.dispose();w.dispose();
});

test('field ether targets selected move/creature only, clamps PP and consumes once; no-effect/invalid/fainted uses retain bag',async()=>{
 const s=fixture();s.party[0].moves[0].pp=0;s.party[0].moves[1].pp-=2;const w=world(s),m=s.party[0];
 const choice=itemUseChoices(w.catalog,s.progress.items,s.party).find(c=>c.itemId==='ether'&&c.instanceId===m.instanceId&&c.moveSlot===1);assert.ok(choice);
 await w.useItem(choice.itemId,choice.instanceId,'single-pp',choice.moveSlot);await w.useItem(choice.itemId,choice.instanceId,'single-pp',choice.moveSlot);
 assert.equal(w.snapshot().party[0].moves[0].pp,0);assert.equal(w.snapshot().party[0].moves[1].pp,w.catalog.getMoveById(m.moves[1].id).pp);assert.deepEqual(w.snapshot().party[1],s.party[1]);assert.equal(w.snapshot().progress.items.ether,2);
 const before=w.snapshot();for(const slot of [1,99,-1])await assert.rejects(()=>w.useItem('ether',m.instanceId,'invalid-'+slot,slot));await assert.rejects(()=>w.useItem('ether','missing','target',0));assert.deepEqual(w.snapshot(),before);
 const faint=structuredClone(m);faint.hp=0;assert.throws(()=>itemUseResult(w.catalog,w.catalog.itemContract.ether,faint,{moveSlot:0}),/기절/);w.dispose();
});

test('max ether restores each current move by 10 on one creature, skips full/empty slots, consumes one and rejects no effect',async()=>{
 const s=fixture(),probe=world(s);const max=maxPP(probe.catalog,s.party[0]);s.party[0].moves.forEach((m,i)=>m.pp=i===1?max[i]:i===2?max[i]-2:0);s.party[1].moves[0].pp=0;probe.dispose();
 const w=world(s),before=pp(s.party[0]);await w.useItem('max_ether',s.party[0].instanceId,'all-pp');await w.useItem('max_ether',s.party[0].instanceId,'all-pp');
 assert.deepEqual(pp(w.snapshot().party[0]),before.map((n,i)=>Math.min(max[i],n+10)));assert.deepEqual(w.snapshot().party[1],s.party[1]);assert.equal(w.snapshot().progress.items.max_ether,2);assert.deepEqual(maxPP(w.catalog,w.snapshot().party[0]),max);
 const sparse=structuredClone(s.party[0]);sparse.moves=[sparse.moves[0],null];assert.equal(itemUseResult(w.catalog,w.catalog.itemContract.max_ether,sparse).moves[1],null);
 const full=w.snapshot();full.party[0].moves.forEach(m=>m.pp=w.catalog.getMoveById(m.id).pp);const re=world(full);await assert.rejects(()=>re.useItem('max_ether',full.party[0].instanceId,'no-effect'),/효과/);assert.deepEqual(re.snapshot(),full);w.dispose();re.dispose();
});

test('full heal without major status never consumes for status-counter cleanup; status cure does not alter HP/PP/stages',async()=>{
 const s=fixture();s.party[0].hp-=5;s.party[0].moves[0].pp=0;s.party[0].statusState={sleepTurns:0,freezeTurns:0,toxicTurns:1};let w=world(s);
 await assert.rejects(()=>w.useItem('full_heal',s.party[0].instanceId,'healthy'),/효과/);assert.deepEqual(w.snapshot(),s);
 const poisoned=w.snapshot();poisoned.party[0].status='bad_poison';poisoned.party[0].statusState.toxicTurns=3;w.dispose();w=world(poisoned);await w.useItem('full_heal',s.party[0].instanceId,'cure');
 assert.equal(w.snapshot().party[0].status,null);assert.equal(w.snapshot().party[0].hp,s.party[0].hp);assert.deepEqual(pp(w.snapshot().party[0]),pp(s.party[0]));assert.equal(w.snapshot().progress.items.full_heal,1);w.dispose();
});

test('Battle v3 shared target choices restore bench PP once, use one turn, keep old in-flight partial policy unchanged',()=>{
 const s=fixture();s.party[1].moves.forEach(m=>m.pp=0);const w=world(s),input=storyBattleInput(s,w.catalog);delete input.encounterVersion;delete input.encounter;
 const start=(catalog,a)=>startSessionBattle(createGameSession(input,catalog),{kind:'wild',opponents:[{namespace:'canonical',speciesId:'SPECIES_010',level:3}],rng:()=>.999},{adapter:a});
 const b=start(w.catalog,adapter),snap=b.snapshot(),target=s.party[1].instanceId;const {label,...choice}=itemUseChoices(w.catalog,snap.bagItems,snap.party).find(c=>c.itemId==='max_ether'&&c.instanceId===target);
 const a={type:'item',...choice,transactionId:'battle-max-pp'};b.act(a);const after=b.snapshot();assert.equal(after.turn,1);assert.equal(after.bagItems.max_ether,2);assert.deepEqual(pp(after.party[1]),maxPP(w.catalog,s.party[1]).map(n=>Math.min(n,10)));assert.deepEqual(pp(after.party[0]),pp(s.party[0]));b.act(a);assert.deepEqual(b.snapshot(),after);
 b.act({type:'flee'});const merged=mergeStoryAftermath(s,b.aftermath(),w.catalog);assert.equal(merged.progress.items.max_ether,2);assert.deepEqual(pp(merged.party[1]),pp(after.party[1]));
 const historical=beforeConsumablesApproval(adapter),old=new SpeciesCatalogService({namespace:'canonical',adapter:historical}),oldBattle=start(old,historical),oldBefore=oldBattle.snapshot();assert.throws(()=>oldBattle.act(a),/미확정/);assert.deepEqual(oldBattle.snapshot(),oldBefore);w.dispose();
});

test('item-pocket purchase and PP use survive existing atomic save retry without duplication or changing other slots',async()=>{
 const memory=isolatedStorage(),seed=fixture(),base=world(seed),normal=createWorldStore(memory,base.catalog,base.host);normal.save('SLOT_1',seed);normal.save('SLOT_2',seed);const oldSlot2=normal.load('SLOT_2');assert.deepEqual(oldSlot2,seed);for(const [id,count] of [['unapproved_item',1],['max_ether',10000],['potion',-1]]){const bad=structuredClone(seed);bad.progress.items[id]=count;assert.throws(()=>validateCanonicalStorySave(bad,base.catalog),/inventory/)}
 let fail=true;const storage={...memory,setItem:(k,v)=>{memory.setItem(k,v);if(fail&&k.endsWith('.primary'))throw Error('after-write fixture')}};
 const store=createWorldStore(storage,base.catalog,base.host);const original=store.load('SLOT_1');let w=world(original,{persist:s=>store.save('SLOT_1',s)});
 const req={transactionId:'purchase-persist',itemId:'potion',quantity:1};await assert.rejects(()=>w.interact('shop:PROLOGUE',req),/after-write/);assert.equal(w.snapshot().economy.money,original.economy.money);assert.equal(normal.load('SLOT_1').progress.items.potion,1);
 fail=false;await w.story.retryCommit();await w.interact('shop:PROLOGUE',req);assert.equal(w.snapshot().progress.items.potion,1);assert.equal(w.snapshot().economy.money,original.economy.money-200);
 const s=w.snapshot();s.party[0].moves[0].pp=0;w.dispose();let rejectUse=true,saved;
 w=world(s,{persist:n=>{if(rejectUse)throw Error('use-fault');saved=n}});await assert.rejects(()=>w.useItem('max_ether',s.party[0].instanceId,'pp-persist'),/use-fault/);assert.deepEqual(w.snapshot(),s);rejectUse=false;await w.story.retryCommit();await w.useItem('max_ether',s.party[0].instanceId,'pp-persist');assert.equal(saved.progress.items.max_ether,2);assert.equal(saved.party[0].moves[0].pp,10);assert.deepEqual(normal.load('SLOT_2'),oldSlot2);w.dispose();base.dispose();
});
