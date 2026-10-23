import {PREVIEW_NAMESPACE} from '../compatibility/opponent-namespace.mjs';
import {deepFreeze,stableJSON} from '../compatibility/codec.mjs';
import {battleStats} from './rules.mjs';
import {startSessionBattle} from './engine.mjs';
import {assertEnhancedLeagueReady,enhancedLeagueActive,enhancedLeagueUnlocked} from '../story/enhanced-league.mjs';
import {validateCanonicalStorySave,storyBattleInput} from '../story/save.mjs';

const permits=new WeakMap();
function requirePreviewMode(mode){
 const allowed=mode==='development'&&import.meta.env?.DEV===true||mode==='test'&&typeof process!=='undefined'&&!!process.env?.NODE_TEST_CONTEXT;
 if(!allowed)throw Error('Preview opponents require explicit DEV/TEST mode');
}
/** In-memory rehearsal only. No world gate, reward, save writer, or ordinary entrypoint. */
export function startYejiPreviewBattle(session,{adapter,mode,rng,map={id:'yeji-preview-test',biomeId:'LEAGUE'}}={}){
 requirePreviewMode(mode);
 const contract=adapter?.battleRuntime?.previewOpponent;
 if(!adapter?.validation?.ready||!contract?.ready||contract.active!==false||contract.approvalStatus!=='PENDING_USER_APPROVAL')throw Error('Validated pending Yeji preview contract required');
 const opponents=structuredClone(contract.party.members),permit=Object.freeze({});
 permits.set(permit,{session,adapter,opponents:stableJSON(opponents),contract});
 try{return startSessionBattle(session,{kind:'trainer',opponents,previewPermit:permit,map,rng},{adapter})}
 finally{permits.delete(permit)}
}
/** Approved POST path only; the original DEV rehearsal remains non-persistable. */
export function startYejiLeagueBattle(session,{adapter,story,rng,map}={}){
 assertEnhancedLeagueReady(adapter);
 const clean=validateCanonicalStorySave(story,session.catalog);
 if(!enhancedLeagueUnlocked(clean)||!enhancedLeagueActive(clean)||clean.enhancedLeague.nextIndex!==4||stableJSON(storyBattleInput(clean,session.catalog))!==stableJSON(session.runtime))throw Error('Yeji requires the current approved league checkpoint');
 const contract=adapter.battleRuntime.previewOpponent,opponents=structuredClone(contract.party.members),permit=Object.freeze({});
 permits.set(permit,{session,adapter,opponents:stableJSON(opponents),contract,approvedLeague:true});
 try{return startSessionBattle(session,{kind:'trainer',opponents,previewPermit:permit,map,rng},{adapter})}
 finally{permits.delete(permit)}
}
/** The independent POST final uses the six approved EDNA opponents, outside the retired league. */
export function startYejiFinalBattle(session,{adapter,story,rng,map={id:'NOJASAN_ECO_OBSERVATORY',biomeId:'MOUNTAIN'}}={}){
 const c=adapter?.battleRuntime?.previewOpponent,p=story?.progress;
 if(!adapter?.validation?.ready||adapter.encounterRuntime?.handoffVersion!=='20260927'||c?.party?.id!=='YEJI_FINAL'||!c.ready||c.approvalStatus!=='APPROVED'||c.aiTier!=='AI_4'||c.itemUses!==2)throw Error('Approved YEJI_FINAL opponent contract required');
 if(!p?.flags?.POST_COMPASS_COMPLETE||!p?.flags?.SANCTUARY_148_RESOLVED||!p?.flags?.SANCTUARY_149_RESOLVED||!p?.flags?.SANCTUARY_150_RESOLVED||!['sea_emblem','forest_emblem','wind_emblem','onseom_compass'].every(id=>(p.items?.[id]??0)>0)||p.flags.YEJI_FINAL_DONE)throw Error('YEJI_FINAL story gate locked');
 if(stableJSON(storyBattleInput(story,session.catalog))!==stableJSON(session.runtime))throw Error('YEJI_FINAL battle session mismatch');
 const opponents=structuredClone(c.party.members),permit=Object.freeze({});
 permits.set(permit,{session,adapter,opponents:stableJSON(opponents),contract:c,approvedFinal:true});
 try{return startSessionBattle(session,{kind:'trainer',opponents,previewPermit:permit,map,rng},{adapter})}
 finally{permits.delete(permit)}
}
/** Single-use capability; ordinary CanonicalBattle cannot opt in via an ID/boolean. */
export function consumePreviewOpponents(permit,{session,adapter,opponents,kind,partyId}){
 if(permit==null)return null;
 const record=permits.get(permit);permits.delete(permit);
 if(!record||record.session!==session||record.adapter!==adapter||record.opponents!==stableJSON(opponents)||kind!=='trainer'||partyId)throw Error('Invalid preview opponent capability');
 const base=session.catalog,c=record.contract;
 // Private combat lookup. The player's catalog, save validation and asset manifest stay unchanged.
 const preview=id=>typeof id==='object'?(id.namespace===PREVIEW_NAMESPACE?c.byId[id.speciesId]:null):c.byId[id];
 const experienceEnabled=record.approvedFinal===true||record.approvedLeague===true&&c.baseExpApproval?.approvalStatus==='APPROVED';
 const catalog=Object.freeze({...base,
  getSpeciesById:id=>preview(id)??base.getSpeciesById(id),
  getBaseStats:id=>preview(id)?.stats??base.getBaseStats(id),
  getTypes:id=>preview(id)?.types??base.getTypes(id),
  getDisplayName:id=>preview(id)?.name??base.getDisplayName(id),
  getGrowthData:id=>{
   const row=preview(id);if(!row)return base.getGrowthData(id);
   const baseExp=c.baseExpById?.[row.id];
   if(!experienceEnabled||!Number.isSafeInteger(baseExp)||baseExp<=0)throw Error('Approved EDNA BaseEXP required');
   return Object.freeze({baseExp});
  },
  reference:id=>preview(id)?Object.freeze({namespace:PREVIEW_NAMESPACE,speciesId:preview(id).id}):base.reference(id)
 });
 return {catalog,playerCatalog:base,metadata:deepFreeze({id:c.party.id,namespace:PREVIEW_NAMESPACE,approvalStatus:record.approvedLeague||record.approvedFinal?'APPROVED':c.approvalStatus,definitionStatus:c.definitionStatus,persistable:record.approvedLeague===true||record.approvedFinal===true,rewardsEnabled:false,experienceEnabled}),
  createOpponent(p){const index=c.party.members.findIndex(m=>m.speciesId===p.speciesId);if(index<0)throw Error('Unknown preview opponent');
   const mon={instanceId:`preview-opponent:${p.speciesId}`,namespace:PREVIEW_NAMESPACE,speciesId:p.speciesId,level:p.level,moves:p.moveIds.map(id=>({id,pp:adapter.moves[id].pp})),status:null};
   mon.hp=battleStats(catalog,mon).hp;return mon;
  }
 };
}
