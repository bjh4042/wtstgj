/** The 2026-09-27 POST rules are opt-in through the staged encounter adapter. */
export const POST_20260927='20260927';
export const SANCTUARIES=Object.freeze({148:{event:'POST_SANCTUARY_148_RESOLVED',emblem:'sea_emblem'},149:{event:'POST_SANCTUARY_149_RESOLVED',emblem:'forest_emblem'},150:{event:'POST_SANCTUARY_150_RESOLVED',emblem:'wind_emblem'}});
export const isPost20260927=contract=>contract?.handoffVersion===POST_20260927;
const has=(s,id)=>s.progress.completedEvents.includes(id);
const caught=(s,contract,no)=>s.dex.caught.includes(contract.speciesIdsByNumber[no]);
export function postChecklist20260927(save,contract){
 const champion=has(save,'FINAL_CHAMPION'),sanctuaries=Object.fromEntries(Object.entries(SANCTUARIES).map(([no,{event,emblem}])=>[no,{resolved:has(save,event),caught:caught(save,contract,Number(no)),emblem:(save.progress.items[emblem]??0)>0}]));
 const compass=has(save,'POST_COMPASS')&&(save.progress.items.onseom_compass??0)>0;
 const yeji=has(save,'YEJI_FINAL'),ending=has(save,'YEJI_FINAL_ENDING'),first151=has(save,'POST_ONSEOM_GARDEN_FIRST_151');
 return {champion,onlineFriendBattle:champion,sanctuaries,compass,yeji,ending,first151,caught151:caught(save,contract,151),fieldResearch:{completedQuestIds:[...(save.fieldResearch?.completedResearchQuestIds??[])],claimedRewardIds:[...(save.fieldResearch?.claimedResearchRewardIds??[])]}};
}
export function roamingEligible20260927(save,contract,no){
 if(![148,149,150,151].includes(no)||!has(save,'YEJI_FINAL_ENDING')||caught(save,contract,no))return false;
 return no!==151||has(save,'POST_ONSEOM_GARDEN_FIRST_151');
}
function approvedNodes(world,no){
 if(world?.roamingNodeApproval!=='APPROVED')return [];
 const pool=world?.roamingNodes?.[no]??world?.roamingNodes?.[String(no)];
 if(!pool?.mapId||!Array.isArray(pool.cells)||!Array.isArray(pool.nodeIds)||pool.nodeIds.length!==pool.cells.length||new Set(pool.nodeIds).size!==pool.nodeIds.length||pool.nodeIds.some((id,i)=>id!==`roam:${no}:${i+1}`))return [];
 const map=world.maps?.[pool.mapId];
 if(!map||map.stageId!=='POST')return [];
 return pool.cells.filter(cell=>Array.isArray(cell)&&cell.length===2&&cell.every(Number.isInteger)&&cell[0]>0&&cell[1]>0&&cell[0]<map.width-1&&cell[1]<map.height-1).map(([x,y])=>({mapId:pool.mapId,x,y}));
}
/** A missing QA-approved node pool disables spawns; it never guesses map cells. */
export function relocateRoamer20260927(save,contract,world,no,rng=Math.random){
 if(!roamingEligible20260927(save,contract,no))return null;
 const nodes=approvedNodes(world,no),ledger=save.world?.roamingLegends??{},prior=ledger[no]?.node;
 const choices=nodes.filter(n=>nodes.length===1||!prior||n.mapId!==prior.mapId||n.x!==prior.x||n.y!==prior.y);
 if(!choices.length)return null;
 const roll=rng(),node=choices[Math.min(choices.length-1,Math.max(0,Math.floor((Number.isFinite(roll)?roll:0)*choices.length)))];
 save.world.roamingLegends??={};save.world.roamingLegends[no]={node,resetOnNextEncounter:true};return node;
}
export function roamerAt20260927(save,contract,mapId,x,y,world=null){
 for(const no of [148,149,150,151]){const n=save.world?.roamingLegends?.[no]?.node;if(roamingEligible20260927(save,contract,no)&&n?.mapId===mapId&&n.x===x&&n.y===y&&(!world||approvedNodes(world,no).some(p=>p.mapId===mapId&&p.x===x&&p.y===y)))return no}return null;
}
