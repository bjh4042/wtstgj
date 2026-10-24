import {APPROVED_ID,activeEconomyPolicy,NORMAL_BALLS,transaction,quotePurchase,itemUseResult,healAll} from './contract.mjs';
import {syncWorldLocation} from '../world/state.mjs';
import {terrainWalkable,behaviorAt,FIELD_GRID} from '../field-behavior.mjs';
const near=(a,b)=>a?.scene===b?.scene&&Math.hypot(a.x-b.x,a.y-b.y)<=12;
export function validLanding(p,host=null,s=null){if(host?.world)return host.validLanding(p,s)===true;return !!p&&['outdoor','interior','qa_a','qa_b'].includes(p.scene)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&terrainWalkable(p.scene,p.x,p.y)&&!['WATER','WATER_EDGE','BLOCKED','WARP','DOOR','LEDGE'].includes(behaviorAt(p.scene,p.x,p.y).id)}
const hostNear=(s,h,p)=>h?.world?h.canInteract(s.position,p):near(s.position,p);
function boundHub(s,host,id){const h=host?.hubs?.[id];if(!h||!validLanding(h.position,host,s)||h.stageId&&!s.progress.completedStages.includes(h.stageId)&&s.progress.currentStage!==h.stageId)throw Error('회복 거점 위치/접근 조건을 확인할 수 없습니다.');return h}
function atHub(s,host,id){const h=boundHub(s,host,id);if(!hostNear(s,host,h.position))throw Error('센터의 지정 위치에서 이용하세요.');return h}
export function recoverAfterLoss(s,catalog,host,battleId){
 if(!activeEconomyPolicy(s,catalog))return;
 return recoverAtLastHub(s,catalog,host,battleId);
}
/** Shared verified recovery; callers own their approved loss policy. No money/item changes. */
export function recoverAtLastHub(s,catalog,host,battleId,{hubId=s.economy?.lastHub}={}){
 if(!s.economy)throw Error('Recovery save context required');
 let h=null;try{const id=hubId??host?.initialHub;if(s.world&&id!==host?.initialHub&&!s.world.visitedHubs.includes(id))throw Error('Unvisited hub');h=boundHub(s,host,id)}catch{}
 if(!h)try{h=boundHub(s,host,host?.initialHub)}catch{}
 if(!h){s.economy.recovery={status:'BLOCKED_UNVERIFIED_DESTINATION',battleId};return}
 healAll(s,catalog);s.position=structuredClone(h.position);s.economy.recovery={status:'RETURNED_VERIFIED_HOST',battleId,hubId:h.id,developmentPlacement:host.developmentOnly===true};
 if(s.world)syncWorldLocation(s,host);
}
/** Runs only on Story service's private draft, committed by its existing atomic persistence. */
export function economyAction(s,catalog,request,host){
 if(!s.economy)throw Error('경제 기능이 활성화되지 않았습니다.');
 const {type,transactionId}=request,policy=catalog.economyPolicy;
 const enabled=activeEconomyPolicy(s,catalog);
 if(type==='use-item')return transaction(s,transactionId,request,()=>{
  const item=catalog.itemContract[request.itemId],mon=s.party.find(m=>m.instanceId===request.instanceId);
  if(!(s.progress.items[request.itemId]>0))throw Error('아이템이 없습니다.');
  const next=itemUseResult(catalog,item,mon,request);Object.assign(mon,next);if(next.statusState===undefined)delete mon.statusState;s.progress.items[request.itemId]--;return {kind:type,itemId:request.itemId,instanceId:mon.instanceId};
 });
 if(!enabled)throw Error('승인 대기 후보 정책은 일반 세션에서 사용할 수 없습니다.');
 if(type==='walk'){
  const to=request.position,from=s.position;if(!to||to.scene!==from.scene||!Number.isFinite(to.x)||!Number.isFinite(to.y)||Math.hypot(to.x-from.x,to.y-from.y)>FIELD_GRID||to.x!==from.x&&to.y!==from.y)throw Error('Invalid walking step');
  const n=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/4));for(let i=1;i<=n;i++)if(!validLanding({...to,x:from.x+(to.x-from.x)*i/n,y:from.y+(to.y-from.y)*i/n}))throw Error('Walking blocked');
  s.economy.walkedDistance=(s.economy.walkedDistance??0)+Math.hypot(to.x-from.x,to.y-from.y);s.position={...to,facing:to.facing??from.facing};return;
 }
 return transaction(s,transactionId,request,()=>{
  if(type==='purchase'){
   atHub(s,host,request.hubId);const q=quotePurchase(s,catalog.itemContract,request.itemId,request.quantity,{unlimited:true,approved:policy.id===APPROVED_ID,hubId:request.hubId});
   if(s.economy.money<q.cost)throw Error('소지금이 부족합니다.');s.economy.money-=q.cost;const bag=catalog.itemContract[q.itemId].pocket==='items'?s.progress.items:s.inventory;bag[q.itemId]=(bag[q.itemId]??0)+q.quantity;return {kind:type,...q};
  }
  if(type==='heal'){const h=atHub(s,host,request.hubId);healAll(s,catalog);s.economy.lastHub=h.id;return {kind:type,hubId:h.id,cost:0}}
  if(type==='ball-aid'){
   atHub(s,host,request.hubId);
   if(s.economy.tutorial.open&&!s.economy.tutorial.completed)throw Error('튜토리얼 지원과 본편 지원은 중복 이용할 수 없습니다.');
   if(NORMAL_BALLS.reduce((n,id)=>n+s.inventory[id],0)!==0||s.economy.money>=policy.normalBallAid.moneyBelow)throw Error('볼 지원 조건을 충족하지 않습니다.');
   const quantity=policy.normalBallAid.quantity;s.inventory.ecology_ball+=quantity;return {kind:type,itemId:'ecology_ball',quantity};
  }
  if(type==='research-accept'){
   atHub(s,host,request.hubId);if(s.economy.quest.active)throw Error('진행 중인 의뢰가 있습니다.');
   if(!host?.points||Object.keys(host.points).length!==3)throw Error('조사점 배치가 없습니다.');
   s.economy.quest={round:s.economy.quest.round+1,active:true,observed:[]};return {kind:type,round:s.economy.quest.round};
  }
  if(type==='observe'){
   const q=s.economy.quest,p=host?.points?.[request.pointId];if(!q.active||request.round!==q.round||!p||!validLanding(p.position,host,s)||!hostNear(s,host,p.position))throw Error('현재 의뢰 회차의 조사점에서 관찰하세요.');
   if(!q.observed.includes(request.pointId))q.observed.push(request.pointId);return {kind:type,round:q.round,pointId:request.pointId};
  }
  if(type==='research-report'){
   atHub(s,host,request.hubId);const q=s.economy.quest;if(!q.active||request.round!==q.round||q.observed.length!==3||q.observed.some(id=>!host.points[id]))throw Error('서로 다른 조사점 3곳의 새 관찰이 필요합니다.');
   q.active=false;s.economy.money+=policy.researchReward;return {kind:type,round:q.round,amount:policy.researchReward};
  }
  throw Error('지원하지 않는 경제 거래입니다.');
 });
}
