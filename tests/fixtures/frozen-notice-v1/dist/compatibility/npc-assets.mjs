import {assetDescriptor} from '../asset-manifest.mjs';
import {playerFieldAssetId} from '../art/w03-player-field.mjs';
const bindings={
 PLAYER_BOY:'player-boy',PLAYER_GIRL:'player-girl',
 NPC_RIVAL_HARIN:'harin',NPC_GYM_01_KANGMIN:'kangmin',NPC_GYM_02_YOUNGJIN:'youngjin',NPC_GYM_03_JEONGUI:'jeongui',NPC_GYM_04_JINSEONG:'jinseong',NPC_GYM_05_MYEONGJU:'myeongju',NPC_GYM_06_JUHYEOK:'juhyeok',NPC_GYM_07_USANG:'usang',NPC_GYM_08_DOCTOR_CHAE:'dr-chae',NPC_BLACKNET_LEADER_HWIGYEONG:'hwigyeong',NPC_BLACKNET_OFFICER_BOMI:'bomi',NPC_BLACKNET_OFFICER_JUNSEOK:'junseok',NPC_ELITE_01_YUNWOO:'yunwoo',NPC_ELITE_02_SIYOON:'siyun',NPC_ELITE_03_EUNMI:'eunmi',NPC_ELITE_04_JUNHO:'junho',NPC_CHAMPION_DOCTOR_YOON:'dr-yun',NPC_POST_YEJI:'yeji'
};
// Player policy defines two existing avatars but no NPC IDs; PLAYER_* are local adapter IDs.
// User-approved identity-only registrations. No trainer, event, dialogue or map placement.
export const UNIQUE_CHARACTER_REGISTRY=Object.freeze({
 NPC_UNIQUE_WONI:Object.freeze({id:'NPC_UNIQUE_WONI',displayName:'원이',category:'unique_character',humanId:'woni',fieldAtlas:'human.woni.field',gameplayPlacement:'UNASSIGNED'}),
 NPC_UNIQUE_MINAMI:Object.freeze({id:'NPC_UNIQUE_MINAMI',displayName:'미나미',category:'unique_character',humanId:'minami',fieldAtlas:'human.minami.field',gameplayPlacement:'UNASSIGNED'})
});
export const NPC_ASSET_BINDINGS=Object.freeze({...Object.fromEntries(Object.entries(bindings).map(([id,humanId])=>[id,Object.freeze({id,humanId,fieldAtlas:id.startsWith('PLAYER_')?playerFieldAssetId(humanId):`human.${humanId}.field`,portrait:`human.${humanId}.portrait`,battleIdle:`human.${humanId}.battle-idle`,battleThrow:`human.${humanId}.battle-throw`})])),...UNIQUE_CHARACTER_REGISTRY});
export function npcAssets(id){return NPC_ASSET_BINDINGS[id]??null}
export function validateNpcAssets(characters=[]){
 const errors=[];
 for(const c of characters)if(!npcAssets(c.npc_id))errors.push({code:'NPC_ASSET_UNBOUND',id:c.npc_id});
 for(const row of Object.values(NPC_ASSET_BINDINGS))for(const key of ['fieldAtlas','portrait','battleIdle','battleThrow'])if(row[key]&&assetDescriptor(row[key]).kind==='unknown')errors.push({code:'ASSET_SLOT_UNREGISTERED',id:row[key]});
 return {count:Object.keys(NPC_ASSET_BINDINGS).length,canonicalNpcCount:characters.length,errors};
}
