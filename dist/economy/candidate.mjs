import {deepFreeze,sha256,stableJSON} from '../compatibility/codec.mjs';
import {CANDIDATE_ID,activateConfirmedEconomy,transaction} from './contract.mjs';
import {TRAINER_PRIZE_MULTIPLIERS} from './trainer-prize-map.mjs';
export const ECONOMY_CANDIDATE=deepFreeze({id:CANDIDATE_ID,version:1,approvalStatus:'PENDING_USER_APPROVAL',defaultEnabled:false,startingMoney:3000,trainerPrizeMultipliers:TRAINER_PRIZE_MULTIPLIERS,confirmedIndividualPrizes:{},researchReward:400,researchPointCount:3,normalBallAid:{moneyBelow:200,quantity:3},stock:'unlimited_unlocked_priced_normal_consumables',resale:false,lossMoneyPenalty:0,geoje:{normal:3,legend:5,legendIds:['SPECIES_148','SPECIES_149','SPECIES_150','SPECIES_151'],cap:.95},geography:'DEV_FIXTURE_ONLY'});
export const CANDIDATE_HASH=sha256(stableJSON(ECONOMY_CANDIDATE));
export function candidateAdapter(adapter,{mode,policyId}={}){
 const allowed=mode==='test'&&typeof process!=='undefined'&&!!process.versions?.node||mode==='development'&&import.meta.env?.DEV===true;
 if(!allowed||policyId!==CANDIDATE_ID)throw Error('Explicit DEV/TEST candidate selection required');
 return deepFreeze({...adapter,economyPolicy:ECONOMY_CANDIDATE});
}
export function activateCandidateNewGame(input,catalog){
 if(catalog.economyPolicy?.id!==CANDIDATE_ID)throw Error('Candidate catalog required');
 if(input.economy?.policyId===CANDIDATE_ID)return structuredClone(input);
 if(input.progress.completedEvents.length||input.party.length||input.box.length||input.economy||input.money!==undefined||input.player.money!==undefined)throw Error('Candidate starting allowance is new-game only');
 const s=activateConfirmedEconomy(input);s.candidatePolicyId=CANDIDATE_ID;Object.assign(s.economy,{policyId:CANDIDATE_ID,approvalStatus:'PENDING_USER_APPROVAL',money:0});
 transaction(s,'new-game:'+s.sessionId,{kind:'new-game',policyId:CANDIDATE_ID},()=>{s.economy.money+=ECONOMY_CANDIDATE.startingMoney;return {kind:'new-game',amount:ECONOMY_CANDIDATE.startingMoney}});return s;
}
export function candidatePrize(s,trainer,party,instanceId,outcome,policy=ECONOMY_CANDIDATE){
 if(s.economy?.policyId!==policy.id||outcome!=='won')return;
 const rate=policy.trainerPrizeMultipliers[trainer.id];if(!rate)throw Error('Unclassified trainer ID');
 const level=Math.max(...party.members.map(m=>m.level)),amount=policy.confirmedIndividualPrizes[trainer.id]??level*rate;
 const id=trainer.repeatable?`battle:${instanceId}`:`first-win:${trainer.id}`;
 return transaction(s,id,{kind:'trainer-prize',trainerId:trainer.id,level,amount},()=>{s.economy.money+=amount;return {kind:'trainer-prize',trainerId:trainer.id,level,amount,battleInstanceId:instanceId}});
}
