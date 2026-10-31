import{recoverAtLastHub}from'../../../economy/actions.mjs';
import{stableJSON}from'../../../compatibility/codec.mjs';
import{selectedPrologueRecovery}from'../../prologue-native/recovery-mapper.mjs';
const same=(a,b)=>stableJSON(a)===stableJSON(b);
// Own candidate only; ROOT landing selection is a required loader/install prerequisite.
// This is an owner-persist draft selector, never a public receipt or recovery action.
export function selectS4RecoveryProposal({world,before,next,registry,retainedHubState}){
 const r=next?.economy?.recovery;if(same(before?.economy?.recovery,r))return null;
 if(!r||r.status!=='RETURNED_VERIFIED_HOST')throw Error('S4_RECOVERY_DRAFT_UNREGISTERED');
 if(!['OPEN','CLOSED'].includes(retainedHubState))throw Error('S4_RECOVERY_RETAINED_STATE_REQUIRED');
 const prologue=selectedPrologueRecovery({world,before,next});
 if(prologue){const p=prologue.location,location={version:1,sceneId:p.sceneId,mapId:p.mapId,mapRevision:p.revision,imageSHA:p.imageSHA,maskSHA:p.maskSHA,foot:[...p.foot],facing:p.facing,retainedHubState};const error=registry.validate(location);if(error)throw Error(error);return{...prologue,location}}
 if(r.hubId!=='CENTER:S4')throw Error('S4_RECOVERY_DESTINATION_UNREGISTERED');
 if(!world||!same(world.snapshot(),before)||next.sessionId!==before.sessionId||next.economy.battleSerial!==before.economy.battleSerial+1||r.battleId!==`${next.sessionId}:${next.economy.battleSerial}`)throw Error('S4_RECOVERY_BATTLE_PROVENANCE');
 const hub=world.host.hubs['CENTER:S4'];if(!hub||!same(hub.position,next.position)||!next.world.visitedHubs.includes('CENTER:S4'))throw Error('S4_RECOVERY_CANONICAL_LANDING');
 const probe=structuredClone(next);recoverAtLastHub(probe,world.catalog,world.host,r.battleId);if(!same(probe.position,next.position)||!same(probe.party,next.party)||!same(probe.economy.recovery,r))throw Error('S4_ORIGINAL_RECOVERY_MISMATCH');
 const location={...registry.describe('world:hub:S4',retainedHubState),foot:[1624,2018],facing:'down'};const error=registry.validate(location);if(error)throw Error(error);
 return{hubId:r.hubId,battleId:r.battleId,location,canonicalPosition:structuredClone(next.position),automaticAction:false,requiresInputRelease:true,ordinarySaveSupported:false};
}
