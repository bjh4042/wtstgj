import{CanonicalWorld}from'../../world/service.mjs';
import{cargoOriginalBossCommitted}from'../../world/cargo-rescue-authority.mjs';
import{verifyEightSceneRegistry}from'../../world/cargo-eight-scene-geometry.mjs';
import{CargoRoomInteractions}from'./room-interactions.mjs';
import{createDoorState,tickDoor}from'./door-state.mjs';
import{sha256,stableJSON}from'../../compatibility/codec.mjs';
const owners=new WeakMap(),FLAGS=['S9_SHIP_ZONE1_CLEAR','S9_SHIP_ZONE2_RESCUE_CLEAR','S9_BLACKNET_BOMI_DEFEATED','S9_BLACKNET_JUNSEOK_DEFEATED'];
export function createBossDoorAuthority({getWorld,getConsumerWorld,registry}){if(typeof getWorld!=='function'||typeof getConsumerWorld!=='function'||!verifyEightSceneRegistry(registry))throw Error('BOSS_DOOR_OWNER_REQUIRED');const a=Object.freeze({});owners.set(a,{getWorld,getConsumerWorld});return a}
export const isBossDoorAuthority=a=>owners.has(a);
function inspect(a){const o=owners.get(a),w=o?.getWorld();if(!(w instanceof CanonicalWorld)||o.getConsumerWorld()!==w||w.map.id!=='world:ship:S9')return'OWNER_UNBOUND';const s=w.snapshot();if(s.developmentOnly!==true)return'NOT_DEVELOPMENT';const flags=[s.progress.flags.S9_BLACKNET_BOSS_DEFEATED===true,s.progress.completedEvents.includes('BLACKNET_HWIGYEONG_FINAL'),s.progress.defeatedTrainers.includes('BLACKNET_HWIGYEONG_FINAL')];if(flags.some(Boolean)&&!flags.every(Boolean))return'BOSS_COMMIT_INCONSISTENT';if(w.story.pendingCommit)return'COMMIT_PENDING';if(cargoOriginalBossCommitted(w))return'ORIGINAL_BOSS_COMMITTED';if(w.busy||w.inputLocked)return'WORLD_BUSY';const gate=w.story.contract.gates.CAN_FIGHT_HWIGYEONG;if(gate?.expr.replace(/\s/g,'')!==FLAGS.join('&&'))return'ORIGINAL_GATE_DRIFT';return FLAGS.every(k=>s.progress.flags[k]===true)&&w.story.gate('CAN_FIGHT_HWIGYEONG')&&w.story.trainerAvailable('BLACKNET_HWIGYEONG_FINAL')?'ORIGINAL_PREBOSS_READY':'ORIGINAL_STORY_GATES_REQUIRED'}
export function createBossDoorOwner({authority,contract,puzzle}){
 if(authority!==null&&!isBossDoorAuthority(authority))throw Error('UNREGISTERED_BOSS_DOOR_AUTHORITY');if(sha256(stableJSON(contract))!=='316425446b5ab2c41094251266c0deab0ef36068a97a9b8fa26e41430caae3e8'||Object.getPrototypeOf(puzzle)!==CargoRoomInteractions.prototype)throw Error('ORIGINAL_BOSS_DOOR_CONTRACT_REQUIRED');
 const state=createDoorState();let dead=false,unlocked=false,reason='LOCKED';
 function update(ms=0){if(dead)return snapshot();const eligibility=inspect(authority);if(!unlocked){if(eligibility==='ORIGINAL_BOSS_COMMITTED'){state.phase='open';state.progress=1;unlocked=true;reason='RESTORED_ORIGINAL_BOSS_COMMIT'}else if(eligibility==='ORIGINAL_PREBOSS_READY'&&puzzle.readyForCode()&&puzzle.passwordAccepted&&!puzzle.pending){state.phase='opening';unlocked=true;reason='ORIGINAL_FIFTEEN_AND_SIX_ACCEPTED'}else reason=eligibility==='ORIGINAL_PREBOSS_READY'?puzzle.readyForCode()?'SIX_CARDS_REQUIRED':'FIFTEEN_READS_REQUIRED':eligibility}if(unlocked&&state.phase==='opening'&&['ORIGINAL_PREBOSS_READY','ORIGINAL_BOSS_COMMITTED'].includes(eligibility))tickDoor(state,ms);return snapshot()}
 function snapshot(){return{phase:state.phase,progress:state.progress}};
 return Object.freeze({update,snapshot,diagnostic:()=>({reason,unlocked,registeredGateId:'S9_BOSS_PASSWORD_GATE',canonicalWrites:false}),dispose(){dead=true}})
}
