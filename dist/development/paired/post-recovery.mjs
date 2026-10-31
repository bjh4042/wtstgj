import {recoverAtLastHub} from '../../economy/actions.mjs';
import {stableJSON} from '../../compatibility/codec.mjs';
const same=(a,b)=>stableJSON(a)===stableJSON(b);
// Called only by the owner persistence closure, not a caller-request authority.
export function selectedPostRecovery({world,before,next,registry}){
 const r=next.economy?.recovery,old=before.economy?.recovery;
 if(!r||same(r,old))return null;
 if(r.status!=='RETURNED_VERIFIED_HOST')return null;
 if(next.sessionId!==before.sessionId||next.economy.battleSerial!==before.economy.battleSerial+1||r.battleId!==`${next.sessionId}:${next.economy.battleSerial}`)throw Error('RECOVERY_BATTLE_PROVENANCE_MISMATCH');
 const probe=structuredClone(next);recoverAtLastHub(probe,world.catalog,world.host,r.battleId);
 if(!same(probe.position,next.position)||!same(probe.party,next.party)||!same(probe.economy.recovery,r))throw Error('ORIGINAL_RECOVERY_DESTINATION_MISMATCH');
 if(r.hubId!=='CENTER:POST')throw Error('NATIVE_RECOVERY_DESTINATION_PENDING');
 const hub=world.host.hubs['CENTER:POST'];if(!hub||!same(hub.position,next.position))throw Error('RECOVERY_CANONICAL_LANDING_MISMATCH');
 const location={...registry.describe('world:hub:POST'),foot:[465,425],facing:'down'};
 if(location.mapRevision!=='POST_NATIVE_2SCENE_DEV_R1:hub'||location.imageSHA!=='29e0513d5d7ed29ba72badb58a4082a0e594853a07ae8e197a6e33e01d6e53f8'||location.maskSHA!=='3ecad473fb5bbefce73d9afdf0b0f2ee57862f670f7e781eba1ffb5ecab38e48')throw Error('RECOVERY_SELECTED_REGISTRATION_DRIFT');
 const reason=registry.validate(location);if(reason)throw Error(reason);
 return {hubId:r.hubId,battleId:r.battleId,location,canonicalPosition:structuredClone(next.position)};
}
