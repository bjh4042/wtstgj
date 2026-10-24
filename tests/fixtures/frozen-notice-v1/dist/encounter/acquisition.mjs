import {createCanonicalCreature,canonicalHp} from '../canonical-session.mjs';
const add=(xs,x)=>{if(!xs.includes(x))xs.push(x)};
export function registerCompanion(save,catalog,speciesId,level){
 if(save.party.length>=6&&save.box.length>=300)throw Error('Storage full; acquisition not committed');
 const mon=createCanonicalCreature(catalog,speciesId,level);
 (save.party.length<6?save.party:save.box).push(mon);for(const key of ['seen','caught'])add(save.dex[key],speciesId);return mon;
}
export function grantAcquisition(save,catalog,event,{tradeInstanceId}={}){
 const c=catalog.encounterContract,owned=()=>[...save.party,...save.box],chain=Object.values(c.chains).find(c=>c.speciesIds.includes(event.speciesId));
 if(event.mode==='gift'){
  const ids=event.candidateIds.filter(id=>id!==save.starterId);for(const id of ids)if(!save.dex.caught.includes(id))registerCompanion(save,catalog,id,event.level);
  return {outcome:'registered',speciesIds:ids};
 }
 if(event.mode==='npc_trade'){
  if(owned().some(m=>chain.speciesIds.includes(m.speciesId)))throw Error('Receiving chain already owned');
  const group=save.party.some(m=>m.instanceId===tradeInstanceId)?save.party:save.box,index=group.findIndex(m=>m.instanceId===tradeInstanceId&&m.speciesId===event.requiredSpeciesId);
  if(index<0)throw Error('Select the required owned trade instance');
  const incoming=createCanonicalCreature(catalog,event.speciesId,event.level),outgoing=group[index];group[index]=incoming;
  save.pendingMoves=save.pendingMoves.filter(p=>p.instanceId!==outgoing.instanceId);
  for(const key of ['seen','caught'])add(save.dex[key],incoming.speciesId);
  return {outcome:'traded',speciesIds:[incoming.speciesId],consumedInstanceId:outgoing.instanceId,consumedSpeciesId:outgoing.speciesId};
 }
 if(event.mode!=='research_bond_no_ball')throw Error('Acquisition requires Battle v3 capture');
 const exists=owned().some(m=>chain.speciesIds.includes(m.speciesId));
 if(!exists&&!save.dex.caught.includes(event.speciesId))registerCompanion(save,catalog,event.speciesId,event.level);
 // An already-owned evolved chain is an observation, not a free base-form gift.
 if(!save.dex.caught.includes(event.speciesId))throw Error('Base registration proof required for this existing chain');
 return {outcome:'registered',speciesIds:[event.speciesId]};
}
export function recordAcquisition(save,event,receipt){
 add(save.encounter.acquisitionCompleted,event.id);save.encounter.receipts[event.id]=structuredClone(receipt);
 if(event.mode==='battle_capture')add(save.encounter.fixedCompleted,event.id);
}
export function evolveCompanion(save,catalog,instanceId){
 const mon=[...save.party,...save.box].find(m=>m.instanceId===instanceId),from=mon&&catalog.getSpeciesById(mon.speciesId);
 if(!from?.evo||mon.level<from.evoLevel)throw Error('Evolution level/chain condition unmet');
 const oldHp=canonicalHp(catalog,mon.speciesId,mon.level);
 mon.evolutionHistory??=[];mon.evolutionHistory.push({from:from.id,to:from.evo,level:mon.level});mon.speciesId=from.evo;
 if(mon.hp>0)mon.hp+=canonicalHp(catalog,mon.speciesId,mon.level)-oldHp;
 for(const key of ['seen','caught'])add(save.dex[key],mon.speciesId);
 // Keep existing moves/PP and queue the evolved form's legal moves for explicit choice.
 for(const m of catalog.getSpeciesById(mon.speciesId).moves.filter(m=>m.level<=mon.level))if(!mon.moves.some(x=>x.id===m.id)&&!save.pendingMoves.some(p=>p.instanceId===instanceId&&p.moveId===m.id))save.pendingMoves.push({instanceId,moveId:m.id});
 return mon;
}
