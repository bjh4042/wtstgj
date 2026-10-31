import{recoverAtLastHub}from'../../economy/actions.mjs';
import{stableJSON}from'../../compatibility/codec.mjs';
import{PROLOGUE_SCENE as R}from'./scene.mjs';
const same=(a,b)=>stableJSON(a)===stableJSON(b),HUB=Object.freeze({id:'CENTER:PROLOGUE',position:Object.freeze({scene:'world:hub:PROLOGUE',x:264,y:600,facing:'down'}),stageId:'PROLOGUE'});
/** Persistence-owner hook ONLY: result is a prepared target descriptor, not a grant or write. */
export function selectedPrologueRecovery({world,before,next}={}){
 const r=next?.economy?.recovery,old=before?.economy?.recovery;if(!r||same(r,old)||r.status!=='RETURNED_VERIFIED_HOST')return null;
 if(r.hubId!=='CENTER:PROLOGUE')return null;
 if(!world||!same(world.snapshot(),before)||next.sessionId!==before.sessionId||next.economy.battleSerial!==before.economy.battleSerial+1||r.battleId!==`${next.sessionId}:${next.economy.battleSerial}`)throw Error('PROLOGUE_RECOVERY_BATTLE_PROVENANCE');
 if(!same(world.host.hubs[HUB.id],HUB))throw Error('PROLOGUE_SOURCE_HUB_DRIFT');
 const probe=structuredClone(next);recoverAtLastHub(probe,world.catalog,world.host,r.battleId);
 if(!same(probe.position,next.position)||!same(probe.party,next.party)||!same(probe.economy.recovery,r)||!same(next.position,HUB.position))throw Error('ORIGINAL_PROLOGUE_RECOVERY_MISMATCH');
 return Object.freeze({hubId:HUB.id,battleId:r.battleId,canonicalPosition:Object.freeze({...next.position}),location:Object.freeze({sceneId:R.sceneId,mapId:R.mapId,revision:R.revision,imageSHA:R.imageSHA,maskSHA:R.maskSHA,foot:Object.freeze([...R.landing]),facing:'down'}),automaticAction:false,requiresInputRelease:true,authority:'ORIGINAL_LOSS_DRAFT_OWNER_ONLY',ordinarySaveSupported:false});
}
