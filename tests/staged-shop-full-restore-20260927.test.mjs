import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanonical20260927Adapter} from '../dist/compatibility/canonical-20260927-adapter.mjs';
import {loadCanonicalRuntimeAdapter} from '../dist/compatibility/canonical-runtime-adapter.mjs';
import {CanonicalWorld} from '../dist/world/service.mjs';
import {cellPosition} from '../dist/world/definition.mjs';
import {economyAction} from '../dist/economy/actions.mjs';
import {itemUseResult,maxHp,quotePurchase,shopItems} from '../dist/economy/contract.mjs';
import {createCanonicalCreature} from '../dist/canonical-session.mjs';

const staged=await loadCanonical20260927Adapter({readStaging:file=>readFileSync(new URL('../dist/data/staging-20260927/'+file,import.meta.url),'utf8')});
test('staged shop buys sourced potion exactly once, with isolated v3.2 price and unchanged original',async()=>{
 let world=new CanonicalWorld({adapter:staged,mode:'test'});
 try{
  const p=world.definition.points['shop:PROLOGUE'],s=world.snapshot();
  s.position=cellPosition(p.mapId,p.x,p.y+1);world.dispose();world=new CanonicalWorld({adapter:staged,runtime:s,mode:'test'});
  const before=world.snapshot().economy.money,request={itemId:'potion',quantity:1,transactionId:'staged-potion-1'};
  await world.interact(p.id,request);await world.interact(p.id,request);
  assert.equal(world.snapshot().economy.money,before-200);
  assert.equal(world.snapshot().progress.items.potion,1);
  assert.ok(shopItems(world.catalog,{hubId:'SHOP:PROLOGUE'}).some(item=>item.id==='potion'));
  assert.ok(!shopItems(world.catalog,{hubId:'SHOP:PROLOGUE'}).some(item=>item.id==='full_restore'));
 }finally{world.dispose()}
 const original=await loadCanonicalRuntimeAdapter({readText:file=>readFileSync(new URL('../dist/data/canonical-handoff-v1/'+file,import.meta.url),'utf8')});
 assert.equal(original.battleRuntime.items.full_restore,undefined);
 assert.equal(original.battleRuntime.items.full_potion.consumableApprovalId,'CANONICAL_CONSUMABLES_APPROVED_V1');
});

test('full_restore requires league entrance and BADGE8, spends source price, then cures HP and major status',()=>{
 const world=new CanonicalWorld({adapter:staged,mode:'test'});
 try{
  const item=world.catalog.itemContract.full_restore,s=world.snapshot();
  assert.equal(item.price,3000);assert.equal(item.shop,'LEAGUE_ENTRANCE');assert.equal(item.effect.hp_restore,'full');
  assert.throws(()=>quotePurchase(s,world.catalog.itemContract,'full_restore',1,{hubId:'SHOP:PROLOGUE'}),/판매/);
  assert.throws(()=>quotePurchase(s,world.catalog.itemContract,'full_restore',1,{hubId:'SHOP:FINAL'}),/해금/);
  s.progress.currentStage='FINAL';s.progress.badges.push('BADGE_08');s.economy.money=4000;s.position=cellPosition('world:hub:FINAL',9,13);
  const host={world:world.definition,hubs:{'SHOP:FINAL':{id:'SHOP:FINAL',stageId:'FINAL',position:s.position}},validLanding:()=>true,canInteract:()=>true};
  const request={type:'purchase',hubId:'SHOP:FINAL',itemId:'full_restore',quantity:1,transactionId:'league-full-restore'};
  economyAction(s,world.catalog,request,host);economyAction(s,world.catalog,request,host);
  assert.equal(s.economy.money,1000);assert.equal(s.progress.items.full_restore,1);
  const mon=createCanonicalCreature(world.catalog,s.starterId,20);mon.hp=1;mon.status='bad_poison';
  const cured=itemUseResult(world.catalog,item,mon);
  assert.equal(cured.hp,maxHp(world.catalog,mon));assert.equal(cured.status,null);
  for(const status of ['poison','paralysis','burn','sleep','freeze'])assert.equal(itemUseResult(world.catalog,item,{...mon,status}).status,null);
  assert.throws(()=>itemUseResult(world.catalog,item,{...mon,hp:0}),/기절/);
 }finally{world.dispose()}
});
