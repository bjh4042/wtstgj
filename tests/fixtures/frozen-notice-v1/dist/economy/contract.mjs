import {CONSUMABLE_APPROVAL_ID,CONSUMABLES_V1} from './consumables-v1.mjs';
import {deepFreeze,sha256,stableJSON} from '../compatibility/codec.mjs';
export const CONFIRMED_VERSION='CANONICAL_ECONOMY_FUNCTIONS_V1';
export const APPROVED_ID='ECONOMY_CAPTURE_APPROVED_V1';
export const activeEconomyPolicy=(s,catalog)=>!!s.economy&&[CANDIDATE_ID,APPROVED_ID].includes(s.economy.policyId)&&s.economy.policyId===catalog.economyPolicy?.id;
export const CANDIDATE_ID='ECONOMY_CAPTURE_CANDIDATE_V1';
export const NORMAL_BALLS=Object.freeze(['ecology_ball','affinity_ball','resonance_ball']);
export const maxHp=(catalog,mon)=>Math.floor(2*catalog.getBaseStats(mon.speciesId)[0]*mon.level/100)+mon.level+10;
export function activateConfirmedEconomy(input){
 if(input?.contentNamespace!=='canonical-v1'||!input.storyEnabled)throw Error('Canonical Story session required');
 const s=structuredClone(input);if(s.economy)return s;
 s.economy={version:CONFIRMED_VERSION,policyId:null,approvalStatus:'CONFIRMED_FUNCTIONS_ONLY',money:null,transactions:{},battleSerial:0,quest:{round:0,active:false,observed:[]},lastHub:null,tutorial:{eventId:'P03_TUTORIAL',open:false,completed:false,attempts:0,refills:0},recovery:null};return s;
}
export function validateEconomyState(s,catalog){
 if(!s?.economy){if(s?.candidatePolicyId||s?.bagItems)throw Error('Unversioned economy payload');return}
 const e=s.economy;
 if(e.version!==CONFIRMED_VERSION||e.policyId!==null&&e.policyId!==CANDIDATE_ID&&e.policyId!==APPROVED_ID||e.money!==null&&(!Number.isSafeInteger(e.money)||e.money<0))throw Error('Invalid economy state');
 if(e.policyId===CANDIDATE_ID){if(!Number.isSafeInteger(e.money)||s.candidatePolicyId!==CANDIDATE_ID||catalog.economyPolicy?.id!==CANDIDATE_ID||e.approvalStatus!=='PENDING_USER_APPROVAL')throw Error('Candidate save cannot enter ordinary session')}
 else if(e.policyId===APPROVED_ID){if(s.candidatePolicyId||!Number.isSafeInteger(e.money)||catalog.economyPolicy?.id!==APPROVED_ID||e.policyVersion!==1||e.approvalStatus!=='USER_APPROVED')throw Error('Approved economy namespace mismatch')}
 else if(s.candidatePolicyId||e.approvalStatus!=='CONFIRMED_FUNCTIONS_ONLY')throw Error('Economy namespace mismatch');
 if(!e.transactions||Array.isArray(e.transactions)||!Number.isSafeInteger(e.battleSerial)||e.battleSerial<0)throw Error('Invalid transaction ledger');
 for(const [id,r] of Object.entries(e.transactions))if(!id||id.length>160||!r||typeof r.fingerprint!=='string'||!r.result)throw Error('Invalid transaction receipt');
 if(!e.quest||!Number.isSafeInteger(e.quest.round)||e.quest.round<0||typeof e.quest.active!=='boolean'||!Array.isArray(e.quest.observed)||new Set(e.quest.observed).size!==e.quest.observed.length)throw Error('Invalid research round');
 if(!e.tutorial||e.tutorial.eventId!=='P03_TUTORIAL'||typeof e.tutorial.open!=='boolean'||typeof e.tutorial.completed!=='boolean'||!Number.isSafeInteger(e.tutorial.attempts)||e.tutorial.attempts<0||!Number.isSafeInteger(e.tutorial.refills)||e.tutorial.refills<0)throw Error('Invalid tutorial ledger');
 if(s.bagItems&&Object.entries(s.bagItems).some(([id,n])=>catalog.itemContract?.[id]?.pocket!=='items'||!Number.isInteger(n)||n<0||n>9999))throw Error('Invalid battle bag');
}
export function transaction(s,id,request,apply){
 if(typeof id!=='string'||!id.trim()||id.length>160)throw Error('Transaction ID required');
 const e=s.economy;if(!e)throw Error('Economy functions not enabled');const fingerprint=sha256(stableJSON(request)),old=e.transactions[id];
 if(old){if(old.fingerprint!==fingerprint)throw Error('Transaction ID payload conflict');return old.result}
 const result=apply();e.transactions[id]={fingerprint,result:structuredClone(result??{ok:true})};return result;
}
export function itemUnlocked(s,item){
 if(item.unlock==='PROLOGUE')return true;
 const m=/^BADGE([1-8])$/.exec(item.unlock??'');return !!m&&s.progress?.badges.includes('BADGE_0'+m[1]);
}
export const shopItemAllowed=(item,{hubId=null}={})=>item?.stagedShopSourceVersion==='canonical-20260927'
 ?item.pocket==='items'&&!!item.effect&&Number.isSafeInteger(item.price)&&item.price>0&&item.unlock&&
   (item.shop===true||item.shop==='LEAGUE_ENTRANCE'&&(!hubId||hubId==='SHOP:FINAL'))
 :item?.shop===true&&(NORMAL_BALLS.includes(item.id)||item.pocket==='items'&&item.consumableApprovalId===CONSUMABLE_APPROVAL_ID&&!!CONSUMABLES_V1.items[item.id]);
export const shopItems=(catalog,options={})=>Object.values(catalog.itemContract).filter(item=>shopItemAllowed(item,options));
export function quotePurchase(s,items,itemId,quantity,{unlimited=false,approved=false,hubId=null}={}){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>9999)throw Error('수량은 1~9999의 정수여야 합니다.');
 const item=items[itemId];if(!shopItemAllowed(item,{hubId}))throw Error('판매가 허용된 품목이 아닙니다.');
 if(!Number.isSafeInteger(item.price)||item.price<=0)throw Error('가격 미확정 품목은 구매할 수 없습니다.');
 if(!itemUnlocked(s,item))throw Error('아직 해금되지 않은 품목입니다.');
 const owned=item.pocket==='items'?s.progress?.items:s.inventory;
 const cost=item.price*quantity;if(!Number.isSafeInteger(cost)||(owned?.[itemId]??0)+quantity>9999)throw Error('구매 한도를 초과했습니다.');
 return {itemId,quantity,unitPrice:item.price,cost,stockPolicy:unlimited?(approved?'UNLIMITED_APPROVED':'UNLIMITED_CANDIDATE'):'NOT_CONFIGURED'};
}
/** Item effect uses source values only. Unknown/partial effects fail without consuming. */
export function itemUseResult(catalog,item,mon,{moveSlot=null}={}){
 if(!mon)throw Error('사용 대상을 선택하세요.');
 if(!item||item.pocket!=='items'||!item.effect||typeof item.effect!=='object')throw Error('사용할 수 없는 아이템입니다.');
 const next=structuredClone(mon),effect=item.effect,hp=maxHp(catalog,mon);
 if(effect.revive_hp_percent!==undefined){if(mon.hp>0)throw Error('기절한 생태몬에게만 사용할 수 있습니다.');next.hp=Math.max(1,Math.floor(hp*effect.revive_hp_percent/100));next.status=null;delete next.statusState}
 else{
  if(mon.hp<=0)throw Error('기절한 생태몬에게 사용할 수 없습니다.');
  if(effect.hp_restore!==undefined){if(effect.hp_restore!=='full'&&(!Number.isInteger(effect.hp_restore)||effect.hp_restore<=0))throw Error('회복량 미확정');next.hp=Math.min(hp,mon.hp+(effect.hp_restore==='full'?hp:effect.hp_restore));if(Array.isArray(effect.cure)&&mon.status&&(effect.cure.includes('all_status')||effect.cure.includes(mon.status))){next.status=null;delete next.statusState}}
  else if(effect.cure){if(mon.status&&(effect.cure.includes('all_status')||effect.cure.includes(mon.status))){next.status=null;delete next.statusState}}
  else if(Number.isInteger(effect.pp_restore_all)){for(const m of next.moves){if(!m?.id)continue;const maximum=catalog.getMoveById(m.id).pp;if(m.pp<maximum)m.pp=Math.min(maximum,m.pp+effect.pp_restore_all)}}
  else if(Number.isInteger(effect.pp_restore)){if(effect.target==='one_creature_each_known_move'){for(const m of next.moves)m.pp=Math.min(catalog.getMoveById(m.id).pp,m.pp+effect.pp_restore)}else{if(!Number.isInteger(moveSlot)||!mon.moves[moveSlot])throw Error('회복할 기술을 선택하세요.');const m=next.moves[moveSlot];m.pp=Math.min(catalog.getMoveById(m.id).pp,m.pp+effect.pp_restore)}}
  else throw Error('효과 수치가 미확정인 아이템입니다.');
 }
 if(stableJSON(next)===stableJSON(mon))throw Error('효과가 없어 아이템을 사용하지 않았습니다.');return next;
}
export function healAll(s,catalog){for(const mon of s.party){mon.hp=maxHp(catalog,mon);mon.status=null;delete mon.statusState;for(const m of mon.moves)m.pp=catalog.getMoveById(m.id).pp}}
export const confirmedContract=deepFreeze({version:CONFIRMED_VERSION,source:'Battle v3 items/capture_contract + Stage PROLOGUE key_rewards',initialKit:'existing TX_PROLOGUE_STARTER_KIT; no regrant',walletDefault:null,shopStockDefault:null,candidateDefault:false});
