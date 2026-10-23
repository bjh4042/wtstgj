import {transaction} from './contract.mjs';

/** Existing approved multipliers applied to the staged, ID-bound trainer roster. */
export function stagedTrainerPrize20260927(save,trainer,party,battleId,contract,policy){
 if(save.economy?.policyId!==policy?.id)return;
 if(contract.trainers[trainer.id]!==trainer||!party?.members?.length)throw Error('Unknown staged trainer reward identity');
 const rates={route_general:40,gym_subtrainer:40,gym:120,rival:80,elite:120,champion:120};
 let rate=rates[trainer.kind];
 if(trainer.kind==='blacknet')rate=trainer.id==='BLACKNET_HWIGYEONG_FINAL'?120:80;
 if(!rate)throw Error('Unclassified staged trainer kind');
 const level=Math.max(...party.members.map(mon=>mon.level)),amount=level*rate;
 const id=trainer.repeatable?`battle:${battleId}`:`first-win:${trainer.id}`;
 return transaction(save,id,{kind:'trainer-prize',trainerId:trainer.id,level,amount},()=>{save.economy.money+=amount;return {kind:'trainer-prize',trainerId:trainer.id,level,amount,battleInstanceId:battleId}});
}
