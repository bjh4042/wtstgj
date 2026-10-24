import {HIDDEN_PLACEMENT_V1 as policy} from './hidden-placement-v1.mjs';
import {sha256,stableJSON} from '../compatibility/codec.mjs';
import {evaluateStoryExpression} from '../story/gates.mjs';
const own=(o,k)=>Object.hasOwn(o,k),same=(a,b)=>stableJSON(a)===stableJSON(b);
const snapshot=s=>({counterPresent:own(s,'geojeBallsGranted'),counter:s.geojeBallsGranted??null,historyPresent:own(s.progress,'geojeBallGrantHistory'),history:s.progress.geojeBallGrantHistory??null,events:[...s.progress.completedEvents],inventory:s.inventory.geoje_ball});
function issues(e,c){
 const reasons=[],h=e.history;
 if(!e.counterPresent||!Number.isInteger(e.counter)||e.counter<0||e.counter>12)reasons.push('MISSING_OR_INVALID_LIFETIME_COUNTER');
 if(!e.historyPresent||!Array.isArray(h)||new Set(h).size!==h.length||h.some(id=>!c.geojeGrants[id]))reasons.push('MISSING_OR_UNKNOWN_GRANT_HISTORY');
 else {
  if(h.some(id=>!e.events.includes(c.geojeGrants[id].triggerEvent)))reasons.push('UNPROVEN_HISTORICAL_GRANT');
  if(h.reduce((n,id)=>n+c.geojeGrants[id].quantity,0)!==e.counter)reasons.push('COUNTER_HISTORY_MISMATCH');
 }
 if(e.inventory>e.counter||!e.counterPresent)reasons.push('INVENTORY_WITHOUT_CONFIRMED_LIFETIME');
 return reasons;
}
/** Work on a copy. Keep old quantities/history exactly; ambiguity holds only new Geoje grants. */
export function adoptHiddenGeoje(input,catalog,c){
 const s=structuredClone(input);
 if(catalog.hiddenPlacementPolicy?.id!==policy.id||s.candidatePolicyId||s.geojeHidden)return s;
 const original=snapshot(s),reasons=issues(original,c);
 s.geojeHidden={policyId:policy.id,version:1,status:reasons.length?'HOLD':'READY',reasons,original,originalSha256:sha256(stableJSON(original)),receipts:{},onceFlags:[]};return s;
}
/** Shared only with the Battle save envelope; never changes capture/EXP or battle state. */
export function validateHiddenLifetime(s){
 const h=s.geojeHidden;if(!h)return false;
 if(s.contentNamespace!=='canonical-v1'||h.policyId!==policy.id||h.version!==1||!['READY','HOLD'].includes(h.status)||!h.original||!Array.isArray(h.original.events)||!Number.isInteger(h.original.inventory)||h.original.inventory<0||h.original.inventory>9999||h.originalSha256!==sha256(stableJSON(h.original))||!Array.isArray(h.reasons)||!Array.isArray(h.onceFlags)||new Set(h.onceFlags).size!==h.onceFlags.length||!h.receipts||typeof h.receipts!=='object'||Array.isArray(h.receipts))throw Error('Invalid hidden Geoje provenance');
 const ids=Object.keys(h.receipts);
 for(const id of ids){const p=policy.slots.find(p=>p.slotId===id),r=h.receipts[id];if(!p||r.slotId!==id||r.onceFlag!==p.onceFlag||r.quantity!==1||r.transactionId!==s.sessionId+':'+id||!h.onceFlags.includes(p.onceFlag))throw Error('Invalid hidden Geoje receipt');}
 if(h.onceFlags.length!==ids.length)throw Error('Hidden Geoje flag/receipt mismatch');
 if(h.status==='HOLD'){
  if(!h.reasons.length||ids.length||own(s,'geojeBallsGranted')!==h.original.counterPresent||!same(s.geojeBallsGranted??null,h.original.counter)||s.inventory.geoje_ball>h.original.inventory)throw Error('Held Geoje history was modified');
 }else if(h.reasons.length||!Number.isInteger(h.original.counter)||h.original.counter<0||s.geojeBallsGranted!==h.original.counter+ids.length||s.geojeBallsGranted>12||s.inventory.geoje_ball>s.geojeBallsGranted)throw Error('Geoje lifetime cap/provenance');
 return true;
}
export function validateHiddenHistory(s,c){
 const h=s.geojeHidden;if(!h)return false;validateHiddenLifetime(s);
 if(own(s.progress,'geojeBallGrantHistory')!==h.original.historyPresent||!same(s.progress.geojeBallGrantHistory??null,h.original.history))throw Error('Historical Geoje ledger must be preserved');
 const reasons=issues(h.original,c);
 if(!same(reasons,h.reasons)||h.status!==(reasons.length?'HOLD':'READY'))throw Error('Geoje migration evidence mismatch');
 for(const id of Object.keys(h.receipts)){
  const slot=policy.slots.find(p=>p.slotId===id),stage=c.stages[slot.stage];
  if(!stage.prerequisites.every(id=>s.progress.completedStages.includes(id))||!evaluateStoryExpression(slot.accessGate,s,c)||!s.world?.interactions.includes(id)||slot.requiredMarkers?.some(id=>!s.world.interactions.includes(id)))throw Error('Unproven hidden Geoje access/interaction');
 }
 return true;
}
/** Called on StoryProgressionService's atomic draft after spatial/gate checks. */
export function claimHiddenGeoje(s,slot){
 const h=s.geojeHidden;if(!h||h.policyId!==policy.id)throw Error('숨김 보상 승인 정책이 연결되지 않았습니다.');
 if(h.status==='HOLD')throw Error('과거 거제볼 누적 지급 이력이 불명확하여 이 저장의 추가 지급만 보류합니다: '+h.reasons.join(', '));
 if(h.receipts[slot.slotId])return {alreadyClaimed:true};
 if(s.geojeBallsGranted>=policy.lifetimeCap)throw Error('거제볼 평생 지급 한도 12개에 도달했습니다. 이 보관함은 수령 처리하지 않았습니다.');
 s.inventory.geoje_ball++;s.geojeBallsGranted++;
 h.receipts[slot.slotId]={slotId:slot.slotId,onceFlag:slot.onceFlag,quantity:1,transactionId:s.sessionId+':'+slot.slotId};h.onceFlags.push(slot.onceFlag);
 return {itemId:'geoje_ball',quantity:1};
}
