import test from 'node:test';
import assert from 'node:assert/strict';
import {stagedTrainerPrize20260927} from '../dist/economy/staged-prize-20260927.mjs';

test('staged field prize uses approved level multiplier and replays once',()=>{
 const trainer={id:'ROUTE_S1_09',kind:'route_general',repeatable:false};
 const policy={id:'ECONOMY_CAPTURE_APPROVED_V1'};
 const save={economy:{policyId:policy.id,money:3000,transactions:{}}};
 const party={members:[{level:15},{level:12}]},contract={trainers:{[trainer.id]:trainer}};
 stagedTrainerPrize20260927(save,trainer,party,'battle-1',contract,policy);
 assert.equal(save.economy.money,3600);
 stagedTrainerPrize20260927(save,trainer,party,'battle-2',contract,policy);
 assert.equal(save.economy.money,3600);
 assert.equal(Object.keys(save.economy.transactions).length,1);
 assert.throws(()=>stagedTrainerPrize20260927(save,{id:'UNKNOWN',kind:'route_general'},party,'battle-3',contract,policy),/Unknown staged trainer/);
});
