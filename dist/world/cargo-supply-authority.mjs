import{CARGO_SUPPLY_ACCESS as ACCESS}from'./cargo-supply-access.mjs';
import{cargoSupplyReceipt,cargoSupplyRequest,cargoSupplyKey}from'./cargo-supply-receipts.mjs';
import {CARGO_SUPPLY_ROWS as ROWS} from './cargo-supply-rows.mjs';
import {CARGO_SUPPLY_PLACEMENTS as PLACEMENTS} from './cargo-supply-placements.mjs';
import {transaction,activeEconomyPolicy} from '../economy/contract.mjs';
import {stableJSON} from '../compatibility/codec.mjs';
const authorities=new WeakMap(),grants=new WeakMap();
const same=(a,b)=>stableJSON(a)===stableJSON(b),fail=c=>{throw Error(c)};
const keys=['version','sceneId','mapId','revision','imageSHA','maskSHA','foot','facing','phase','sessionEpoch'];
function data(value,fields){if(!value||Object.getPrototypeOf(value)!==Object.prototype)return false;const ks=Reflect.ownKeys(value);return ks.length===fields.length&&fields.every(k=>{const d=Object.getOwnPropertyDescriptor(value,k);return !!d&&Object.hasOwn(d,'value')&&d.enumerable})}
function footData(v){if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype||Reflect.ownKeys(v).length!==3||v.length!==2)return false;return ['0','1'].every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return !!d&&Object.hasOwn(d,'value')&&d.enumerable&&Number.isInteger(d.value)})}
export function cargoSupplyId(id){return typeof id==='string'&&Object.hasOwn(ROWS,id);}
export function createCargoSupplyAuthority({getWorld,readNative}={}){if(typeof getWorld!=='function'||typeof readNative!=='function')fail('TRUSTED_CARGO_SUPPLY_OWNER_REQUIRED');const a=Object.freeze({});authorities.set(a,{getWorld,readNative});return a;}
export const isCargoSupplyAuthority=a=>authorities.has(a);
function stamp(a,w,id){
 const owner=authorities.get(a);if(!owner||!cargoSupplyId(id)||owner.getWorld()!==w)return null;
 const row=ROWS[id],p=PLACEMENTS[id];if(!p||p.enabled!==true||row.missingSourceGuards.length)return null;
 const s=w.snapshot(),c=w.catalog,n=owner.readNative();
 if(s.developmentOnly!==true||s.position.scene!==row.mapId||s.world?.mapId!==row.mapId||!w.story.stageUnlocked('S9')||w.story.pendingCommit||!activeEconomyPolicy(s,c)||!same(c.itemContract[row.itemId],row.item))return null;
 if(!same(w.definition.points[ACCESS.point.id],ACCESS.point)||!same(w.story.contract.gates[ACCESS.gate.id],ACCESS.gate)||!w.story.gate(ACCESS.gate.id))return null;
 if(row.guardEncounterIds.some(g=>!w.story.contract.trainers[g]||!s.progress.defeatedTrainers.includes(g)))return null;
 if(!data(n,keys)||n.phase!=='field'||n.version!==1||n.sceneId!==row.sceneId||n.mapId!==row.mapId||!Number.isSafeInteger(n.sessionEpoch)||n.sessionEpoch<0||!footData(n.foot))return null;
 if((!['revision','imageSHA'].every(k=>n[k]===p[k])||!p.maskSHAs.includes(n.maskSHA))||!p.facings.includes(n.facing)||!p.footRows.some(([y,x0,x1])=>n.foot[1]===y&&n.foot[0]>=x0&&n.foot[0]<=x1))return null;
 return {sessionId:s.sessionId,revision:s.revision,native:stableJSON(n)};
}
export function mintCargoSupplyGrant(a,w,id){const captured=stamp(a,w,id);if(!captured)fail('CARGO_SUPPLY_REGISTRATION_OR_ACCESS_HELD');const g=Object.freeze({});grants.set(g,{a,w,id,captured});return g;}
export function revokeCargoSupplyGrant(g){grants.delete(g);}
/** Only original Story private draft may be passed by scoped CanonicalWorld host hook. */
export function applyCargoSupplyDraft(draft,catalog,g,w,id){
 if(!cargoSupplyId(id))fail('CARGO_SUPPLY_ID_REJECTED');const v=grants.get(g),row=ROWS[id];if(!v||v.w!==w||v.id!==id||!same(stamp(v.a,w,id),v.captured)||draft.sessionId!==v.captured.sessionId||draft.revision!==v.captured.revision)fail('CARGO_SUPPLY_GRANT_REJECTED');
 const item=catalog.itemContract[row.itemId];if(!same(item,row.item)||!['items','capture_balls'].includes(item.pocket)||!Number.isSafeInteger(row.quantity)||row.quantity<=0)fail('CARGO_SUPPLY_ITEM_CONTRACT_DRIFT');
 const idKey=cargoSupplyKey(id),request=cargoSupplyRequest(id),receipt=cargoSupplyReceipt(id);
 const old=draft.economy.transactions[idKey];if(old&&!same(old.result,receipt))fail('CARGO_SUPPLY_RECEIPT_DRIFT');
 return transaction(draft,idKey,request,()=>{const bag=item.pocket==='items'?draft.progress.items:draft.inventory,n=bag[row.itemId]??0;if(!Number.isSafeInteger(n)||n<0||n+row.quantity>9999)fail('CARGO_SUPPLY_BAG_CAP');bag[row.itemId]=n+row.quantity;return receipt;});
}
