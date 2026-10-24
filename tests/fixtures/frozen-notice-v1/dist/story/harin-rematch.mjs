import {HARIN_POST_V1 as policy} from '../compatibility/harin-post-rematch-v1.mjs';
import {pointDistance} from '../world/definition.mjs';

export const harinPostUnlocked=s=>s.contentNamespace==='canonical-v1'&&s.progress?.flags?.MAIN_STORY_CLEAR===true&&s.progress.flags.POST_UNLOCKED===true&&s.progress.defeatedTrainers.includes('NPC_CHAMPION_DOCTOR_YOON');
export const harinBattleId=(s,sequence)=>`${s.sessionId}:HARIN_POST:${sequence}`;
export function validateHarinPostState(s){
 const r=s.harinPost;if(r===undefined)return;
 const n=r.completedBattles,last=r.lastBattle;
 if(!harinPostUnlocked(s)||!s.world||r.version!==1||!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(r.wins)||r.wins<0||r.wins>n||last?.sequence!==n||last.battleId!==harinBattleId(s,n)||!['won','lost'].includes(last.outcome)||last.partyId!==policy.partyPrefix+s.starterId||last.outcome==='won'&&r.wins<1)throw Error('Invalid Harin POST record');
 if(r.wins===0){if(r.firstVictoryBattleId!==null)throw Error('Invalid Harin first victory')}
 else{const prefix=harinBattleId(s,''),id=r.firstVictoryBattleId,k=typeof id==='string'&&id.startsWith(prefix)?Number(id.slice(prefix.length)):NaN;if(!Number.isSafeInteger(k)||k<1||k>n||id!==harinBattleId(s,k)||k===n&&last.outcome!=='won')throw Error('Invalid Harin first victory')}
}
/** Monotonic completed sequence makes old result requests idempotent without an unbounded ledger. */
export function harinResultPending(s,sequence){
 if(!Number.isSafeInteger(sequence)||sequence<1)throw Error('Harin battle sequence required');
 const completed=s.harinPost?.completedBattles??0;
 if(sequence<=completed)return false;
 if(sequence!==completed+1)throw Error('Stale Harin battle sequence');
 return true;
}
export function requireHarinInteraction(s,host){
 if(!harinPostUnlocked(s))throw Error('본편 챔피언 승리와 POST 해금이 필요합니다.');
 if(s.enhancedLeague?.phase==='active')throw Error('강화 리그 도전을 먼저 끝내세요.');
 const point=host?.world?.points[policy.pointId];
 if(point?.kind!=='harin-rematch'||pointDistance(s.position,point)>1)throw Error('장승포 생태센터 인근 하린에게 직접 신청하세요.');
 if(!s.party.some(m=>m.hp>0))throw Error('센터에서 파티를 회복한 뒤 도전하세요.');
}
export function recordHarinResult(s,sequence,outcome,partyId){
 if(!harinResultPending(s,sequence))return false;
 if(!['won','lost'].includes(outcome)||partyId!==policy.partyPrefix+s.starterId)throw Error('Invalid Harin result');
 const old=s.harinPost,battleId=harinBattleId(s,sequence);
 s.harinPost={version:1,completedBattles:sequence,wins:(old?.wins??0)+(outcome==='won'?1:0),firstVictoryBattleId:old?.firstVictoryBattleId??(outcome==='won'?battleId:null),lastBattle:{sequence,battleId,outcome,partyId}};
 return true;
}
