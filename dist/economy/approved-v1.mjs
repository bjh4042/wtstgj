import {deepFreeze,sha256,stableJSON} from '../compatibility/codec.mjs';
import {ECONOMY_CANDIDATE,CANDIDATE_HASH} from './candidate.mjs';
import {APPROVED_ID,activateConfirmedEconomy,transaction} from './contract.mjs';
/** User approval overlay; immutable source/candidate and placement approvals remain separate. */
export const ECONOMY_APPROVAL_V1=deepFreeze({
 id:APPROVED_ID,version:1,approvalStatus:'USER_APPROVED',contentNamespace:'canonical-v1',
 basisCommit:'dd9a5a548000c023663ed348b9ba2856879b9b93',
 candidateId:ECONOMY_CANDIDATE.id,candidateSha256:'2a94d49207f679cd5012e090f2e2a9e503b7e0ae2bb54a7541016bc5f5464a84',
 authority:'User final approval — economy/shop default policy and Geoje Ball capture v1',
 excluded:['unknown-item-prices-effects-unlocks','final-map-placements','hidden-geoje-ball-12-locations','cheats'],
 postRewards:'HARIN_POST_V1 / ENHANCED_LEAGUE_V1: EXP only, no prize/items/Geoje Ball',
 existingSaves:'Preserve assets and receipts; no retroactive allowance; activate at session construction only',
 publication:'No public deployment approved'
});
if(CANDIDATE_HASH!==ECONOMY_APPROVAL_V1.candidateSha256)throw Error('Approved economy candidate hash mismatch');
export const APPROVED_ECONOMY=deepFreeze({...ECONOMY_CANDIDATE,id:APPROVED_ID,approvalStatus:'USER_APPROVED',defaultEnabled:true,approval:ECONOMY_APPROVAL_V1});
export const APPROVED_ECONOMY_HASH=sha256(stableJSON(APPROVED_ECONOMY));
/** Called on a validated, idle session copy. Never grants starting money to existing saves. */
export function adoptApprovedEconomy(input,catalog){
 if(catalog.economyPolicy?.id!==APPROVED_ID)return structuredClone(input);
 if(input.candidatePolicyId||input.economy?.policyId&&input.economy.policyId!==APPROVED_ID)throw Error('Candidate save cannot enter approved session');
 const s=activateConfirmedEconomy(input),e=s.economy;
 if(e.policyId===APPROVED_ID)return s;
 // null historically means no configured wallet. Preserve any recorded funds, including zero.
 const oldFunds=e.money??s.money??s.player.money??0;
 if(!Number.isSafeInteger(oldFunds)||oldFunds<0)throw Error('Existing wallet cannot be resolved safely');
 if(e.money===null&&s.money!==undefined&&s.player.money!==undefined&&s.money!==s.player.money)throw Error('Conflicting historical wallet fields');
 Object.assign(e,{policyId:APPROVED_ID,policyVersion:1,approvalStatus:'USER_APPROVED',money:oldFunds});return s;
}
export function activateApprovedNewGame(input,catalog){
 if(catalog.economyPolicy?.id!==APPROVED_ID)throw Error('Approved catalog required');
 const id='new-game:'+input.sessionId;
 if(input.economy?.policyId===APPROVED_ID&&input.economy.transactions[id])return structuredClone(input);
 if(input.economy||input.candidatePolicyId||input.progress.completedEvents.length||input.party.length||input.box.length||input.money!==undefined||input.player.money!==undefined)throw Error('Starting allowance is new-game only');
 const s=adoptApprovedEconomy(input,catalog);
 transaction(s,id,{kind:'new-game',policyId:APPROVED_ID},()=>{s.economy.money+=APPROVED_ECONOMY.startingMoney;return {kind:'new-game',amount:APPROVED_ECONOMY.startingMoney}});return s;
}
