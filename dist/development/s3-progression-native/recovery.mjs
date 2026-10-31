import{S3_CENTER}from'./center-registration.mjs';
import{recoverAtLastHub}from'../../economy/actions.mjs';import{stableJSON}from'../../compatibility/codec.mjs';
const same=(a,b)=>stableJSON(a)===stableJSON(b),HUB=Object.freeze({id:'CENTER:S3',position:Object.freeze({scene:'world:hub:S3',x:264,y:600,facing:'down'}),stageId:'S3'});
/** Isolated owner-draft binding proposal. Not a public teleport/heal action; no save mutation. */
export function selectS3CenterRecovery({world,before,next,support}){const r=next?.economy?.recovery,old=before?.economy?.recovery;if(!r||same(r,old)||r.status!=='RETURNED_VERIFIED_HOST'||r.hubId!=='CENTER:S3')return null;
 if(!world||!same(world.snapshot(),before)||next.sessionId!==before.sessionId||next.economy.battleSerial!==before.economy.battleSerial+1||r.battleId!==`${next.sessionId}:${next.economy.battleSerial}`)throw Error('S3_RECOVERY_BATTLE_PROVENANCE');
 if(before.economy?.lastHub!==HUB.id||!before.world.visitedHubs.includes(HUB.id)||next.economy.lastHub!==before.economy.lastHub||!same(world.host.hubs[HUB.id],HUB)||!same(next.position,HUB.position)||!next.world.visitedHubs.includes(HUB.id)||next.economy.lastHub!==HUB.id)throw Error('S3_RECOVERY_SOURCE_HUB');
 const probe=structuredClone(next);recoverAtLastHub(probe,world.catalog,world.host,r.battleId);if(!same(probe.position,next.position)||!same(probe.party,next.party)||!same(probe.economy.recovery,r))throw Error('S3_ORIGINAL_RECOVERY_MISMATCH');
 if(support?.pinsVerified!==true||support.safe([350,604])!==true)throw Error('S3_RECOVERY_NATIVE_SUPPORT');const location=support.describe([350,604],'down');if(!support.validate(location)||location.mapId!=='world:hub:S3')throw Error('S3_RECOVERY_NATIVE_LOCATION');
 return Object.freeze({hubId:HUB.id,battleId:r.battleId,canonicalPosition:Object.freeze({...next.position}),location:Object.freeze({...location,foot:Object.freeze([...location.foot])}),automaticAction:false,requiresInputRelease:true,authority:'ORIGINAL_LOSS_DRAFT_OWNER_ONLY',ordinarySaveSupported:false});
}

export function validS3RecoveryRuntime(runtime,definition){const r=runtime?.economy?.recovery;return same(definition?.points?.['heal:S3'],S3_CENTER.sourceRow)&&runtime?.world?.mapId==='world:hub:S3'&&same(runtime.position,HUB.position)&&runtime.world.visitedHubs.includes(HUB.id)&&runtime.economy.lastHub===HUB.id&&r?.status==='RETURNED_VERIFIED_HOST'&&r.hubId===HUB.id&&Number.isSafeInteger(runtime.economy.battleSerial)&&runtime.economy.battleSerial>0&&r.battleId===`${runtime.sessionId}:${runtime.economy.battleSerial}`}
