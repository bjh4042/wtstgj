import {deepFreeze} from '../compatibility/codec.mjs';
import {healAll} from '../economy/contract.mjs';
import {cellPosition,pointDistance} from '../world/definition.mjs';
import {syncWorldLocation} from '../world/state.mjs';

export const ENHANCED_LEAGUE_V1=deepFreeze({
 id:'ENHANCED_LEAGUE_OPERATION_V1',version:1,approvalStatus:'APPROVED',active:true,contentNamespace:'canonical-v1',
 approvalEvidence:'사용자 승인 — 강화 리그 운영 v1 및 canonical POST 연결. 본편 승리/POST 이후, 윤우→시윤→은미→준호→예지, 입장/실패 회복, 승리 자동회복 없음, 최종 1회 완료, 추가 상금/아이템 없음.',
 baseCommit:'f6b914b30571628b256d3637084956fbe26d688b',
 order:['NPC_ELITE_01_YUNWOO','NPC_ELITE_02_SIYOON','NPC_ELITE_03_EUNMI','NPC_ELITE_04_JUNHO','NPC_POST_YEJI'],
 entryPointId:'league:enhanced:entry',entryMapId:'world:hub:FINAL',entryCell:[32,5],safeCell:[32,6],
 closingDialogue:'예지: 끝까지 생태몬들과 함께해 줘서 고마워. 너희의 도전을 기억할게!',
 rewards:{money:0,items:[],geojeBalls:0},
 expPolicy:'Existing Battle v3 EXP v1.2; EDNA yield supplied by YEJI_EDNA_BASE_EXP_V1. No additional completion EXP.'
});
export const enhancedLeagueActive=s=>s.enhancedLeague?.phase==='active';
export const enhancedLeagueUnlocked=s=>s.contentNamespace==='canonical-v1'&&s.progress?.flags?.MAIN_STORY_CLEAR===true&&s.progress.flags.POST_UNLOCKED===true&&s.progress.defeatedTrainers.includes('NPC_CHAMPION_DOCTOR_YOON');
export function validateEnhancedLeagueState(s){
 const l=s.enhancedLeague;if(l===undefined)return;
 if(!enhancedLeagueUnlocked(s)||!s.world||l.version!==1||!Number.isSafeInteger(l.attempt)||l.attempt<1||!['active','idle','completed'].includes(l.phase)||!Number.isInteger(l.nextIndex)||l.nextIndex<0||l.nextIndex>5||typeof l.startRequestId!=='string'||!l.startRequestId||l.startRequestId.length>160||!Array.isArray(l.receipts)||l.receipts.length>5)throw Error('Invalid enhanced league state');
 for(const [i,r] of l.receipts.entries())if(r.attempt!==l.attempt||r.index!==i||r.opponentId!==ENHANCED_LEAGUE_V1.order[i]||!['won','lost','abandoned'].includes(r.outcome)||i<l.receipts.length-1&&r.outcome!=='won')throw Error('Invalid enhanced league receipt');
 const wins=l.receipts.filter(r=>r.outcome==='won').length,last=l.receipts.at(-1);
 if(l.phase==='active'&&(l.nextIndex!==wins||wins>=5||last&&last.outcome!=='won'||s.position.scene!==ENHANCED_LEAGUE_V1.entryMapId)||l.phase==='idle'&&(l.nextIndex!==0||!['lost','abandoned'].includes(last?.outcome))||l.phase==='completed'&&(l.nextIndex!==5||wins!==5))throw Error('Enhanced league checkpoint mismatch');
}
export function assertEnhancedLeagueReady(adapter){
 if(adapter.enhancedLeague?.id!==ENHANCED_LEAGUE_V1.id||adapter.enhancedLeague.active!==true||!adapter.battleRuntime.enhancedEliteParties.ready||adapter.battleRuntime.previewOpponent.typeStatsApproval?.approvalStatus!=='APPROVED')throw Error('Approved enhanced league unavailable');
}
function requireEntry(s,host){const p=host?.world?.points[ENHANCED_LEAGUE_V1.entryPointId];if(!p||pointDistance(s.position,p)>1)throw Error('리그 입구에서 이용하세요.');}
function returnToEntry(s,catalog,host){
 const position=cellPosition(ENHANCED_LEAGUE_V1.entryMapId,...ENHANCED_LEAGUE_V1.safeCell);
 if(!host?.validLanding(position,s))throw Error('Enhanced league return position is not walkable');
 s.position=position;syncWorldLocation(s,host);healAll(s,catalog);
}
export function beginEnhancedLeague(s,catalog,host,requestId){
 if(!enhancedLeagueUnlocked(s))throw Error('본편 챔피언 승리와 POST 해금이 필요합니다.');
 if(s.enhancedLeague?.phase==='completed')throw Error('강화 리그는 이미 최종 완료했습니다.');
 requireEntry(s,host);
 if(typeof requestId!=='string'||!requestId||requestId.length>160)throw Error('League request ID required');
 if(enhancedLeagueActive(s)||s.enhancedLeague?.startRequestId===requestId)return false;
 if(!s.party.length)throw Error('파티가 필요합니다.');
 s.enhancedLeague={version:1,attempt:(s.enhancedLeague?.attempt??0)+1,phase:'active',nextIndex:0,startRequestId:requestId,receipts:[]};
 returnToEntry(s,catalog,host);return true;
}
export function leagueResultPending(s,attempt,index){
 const l=s.enhancedLeague;
 if(l?.attempt===attempt&&l.receipts.some(r=>r.index===index))return false;
 if(!enhancedLeagueActive(s)||l.attempt!==attempt||l.nextIndex!==index)throw Error('Stale enhanced league result');
 return true;
}
/** Mutates only the Story service draft; commit/retry remains the existing atomic save path. */
export function finishEnhancedLeagueOpponent(s,{attempt,index,outcome},catalog,host){
 if(!leagueResultPending(s,attempt,index))return false;
 if(!['won','lost','abandoned'].includes(outcome))throw Error('Invalid enhanced league outcome');
 const l=s.enhancedLeague;l.receipts.push({attempt,index,opponentId:ENHANCED_LEAGUE_V1.order[index],outcome});
 if(outcome==='won'){l.nextIndex++;if(l.nextIndex===5)l.phase='completed'}
 else{l.phase='idle';l.nextIndex=0;returnToEntry(s,catalog,host)}
 return true;
}
export function reorderEnhancedLeagueParty(s,ids){
 if(!enhancedLeagueActive(s)||!Array.isArray(ids)||ids.length!==s.party.length||new Set(ids).size!==ids.length||ids.some(id=>!s.party.some(m=>m.instanceId===id)))throw Error('Invalid league party order');
 s.party=ids.map(id=>s.party.find(m=>m.instanceId===id));
}
