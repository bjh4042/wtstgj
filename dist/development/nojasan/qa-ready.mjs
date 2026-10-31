import {CanonicalWorld,createWorldHost} from '../../world/service.mjs';
import {createWorldDefinition,cellPosition} from '../../world/definition.mjs';
import {initialWorldState,syncWorldLocation} from '../../world/state.mjs';
import {createBattleRules,calculateDamage} from '../../battle-v3/rules.mjs';
export const QA_READY_LABEL='QA_READY_NO_STORAGE';
export const OFFICIAL_POST_FIXTURE_SHA='5221bb8cfb8b9f7cffc227b72d3a87b6926392d9630140dbbe798cfcfa8bacdf';
const sha=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
/** Only preparatory sanctuary battles are automated. Never return this driver to the UI world. */
function createPreparationBattleDriver(adapter,catalog){const rules=createBattleRules(adapter);return async battle=>{for(let i=0;i<5000;i++){const s=battle.snapshot();if(s.phase==='ended'){if(s.outcome!=='won')throw Error('QA_PREPARATION_BATTLE_NOT_WON');return}if(s.phase==='forced-switch'){battle.act({type:'switch',index:s.party.findIndex(m=>m.hp>0)});continue}const mon=s.party[s.active],enemy=s.opponents[s.enemyActive],damage=m=>rules.moves[m.id]?.power?(enemy.namespace==='npc_preview_species'?rules.moves[m.id].power:calculateDamage({rules,catalog,move:rules.moves[m.id],attacker:mon,defender:enemy,critical:false,randomPercent:100}).damage):0,move=mon.moves.filter(m=>m.pp>0).sort((a,b)=>damage(b)-damage(a))[0];battle.act({type:'move',moveId:move?.id??'SYSTEM_STRUGGLE'})}throw Error('QA_PREPARATION_BATTLE_BOUND')}}
/** Parent must additionally enforce import.meta.env.DEV + exact summitQAReady=1 query.
 * Input pinned official memory fixture only. No storage/persist handle accepted.
 * Existing original entry remains explicit UI action after preparation.
 */
export async function createQAReadyFixture({adapter,fixtureText,mode,onProgress=()=>{}}){
 if(mode!==QA_READY_LABEL)throw Error('QA_READY_EXPLICIT_MODE_REQUIRED');
 if(typeof fixtureText!=='string'||await sha(fixtureText)!==OFFICIAL_POST_FIXTURE_SHA)throw Error('QA_READY_OFFICIAL_FIXTURE_SHA_MISMATCH');
 const runtime=JSON.parse(fixtureText),definition=createWorldDefinition(adapter);
 // Same approved QA initial geometry adoption as existing nojasan-entry, no progression writes.
 runtime.world=initialWorldState(definition);runtime.position=cellPosition('world:hub:POST',34,8);syncWorldLocation(runtime,createWorldHost(definition,adapter.storyRuntime));
 const world=new CanonicalWorld({adapter,runtime,mode:'development'}),actions=[];
 try{
  if(world.story.gate('CAN_BATTLE_YEJI_FINAL')||world.story.eventCompleted('YEJI_FINAL'))throw Error('QA_INITIAL_POST_EXPECTED');
  const initialPosition=world.snapshot().position,partyIds=world.snapshot().party.map(m=>m.instanceId),options={rng:()=>.4,battleDriver:createPreparationBattleDriver(adapter,world.catalog)};
  for(const no of [148,149,150]){const event=adapter.encounterRuntime.events[`LEGEND_${no}_CAPTURE`];await world.story.enterArea(event.areaId);await world.story.recoverParty();await world.story.acquire(event.id,options);actions.push({action:'acquire',id:event.id,completed:true});onProgress({label:QA_READY_LABEL,completed:actions.length,total:4});}
  await world.story.assembleCompass();actions.push({action:'assembleCompass',completed:true});await world.story.recoverParty();
  const ready=world.snapshot();if(!world.story.gate('CAN_BATTLE_YEJI_FINAL')||world.story.eventCompleted('YEJI_FINAL')||world.story.eventCompleted('YEJI_FINAL_ENDING'))throw Error('QA_READY_FINAL_STATE_INVALID');
  if(JSON.stringify(ready.position)!==JSON.stringify(initialPosition)||JSON.stringify(ready.party.map(m=>m.instanceId))!==JSON.stringify(partyIds))throw Error('QA_READY_UNEXPECTED_POSITION_OR_PARTY_REPLACEMENT');
  onProgress({label:QA_READY_LABEL,completed:4,total:4});
  return {runtime:ready,report:{label:QA_READY_LABEL,fixtureSHA:OFFICIAL_POST_FIXTURE_SHA,actions,gateReady:true,finalCompleted:false,storage:'NONE',partyReplacement:false,manualFlagWrites:0,entry:'Explicit existing post-entry:nojasan-summit UI action; not auto-entered',scope:'Browser final battle controls / ending-once / map-return QA, not complete playthrough certification'}};
 }finally{world.dispose()}
}
