import {deepFreeze,sha256} from './codec.mjs';
import {parseCSV,SOURCE_FILES} from './canonical-source-format.mjs';
import {resolveSpecies,CANONICAL_NAMESPACE} from './species-identity.mjs';
import {adaptStoryRuntime} from './story-adapter.mjs';
import {adaptEncounterRuntime} from './encounter-adapter.mjs';
import {AQUATIC_POLICY_A} from './aquatic-policy-a-v1.mjs';
import {APPROVED_ECONOMY} from '../economy/approved-v1.mjs';
import {compareStatusSources} from './status-enum.mjs';

export const CANONICAL_20260927_VERSION='canonical-20260927';
export const STAGING_FILES=Object.freeze({battle:'geoje_battle_collection_master_v3_2.json',trainer:'geoje_trainer_npc_master_v2_2.json',character:'geoje_character_npc_master_v2_1.json',stage:'geoje_stage_master_v2_4.json',flags:'geoje_story_flags_master_v3.json',encounter:'geoje_encounter_master_v2_4.json',save:'geoje_save_schema_v3.json'});
const indexBy=(rows,key='id')=>Object.fromEntries(rows.map(row=>[row[key],row]));
const bytes=text=>new TextEncoder().encode(text).length;
export async function readStaging20260927(file){
 const response=await fetch(new URL('../data/staging-20260927/'+file,import.meta.url));
 if(!response.ok)throw Error('Staging source unavailable: '+file);
 return new TextDecoder('utf-8',{ignoreBOM:true,fatal:true}).decode(await response.arrayBuffer());
}

/** Build an immutable, opt-in candidate. No import here changes the active session. */
export async function loadCanonical20260927Adapter({readStaging=readStaging20260927}={}){
 const index=JSON.parse(await readStaging('STAGING_SHA256_INDEX.json'));
 const errors=[],sources={},hashes={};
 if(index.status==='ACTIVE'||!index.files)errors.push({code:'INVALID_STAGING_INDEX'});
 for(const [key,file] of Object.entries(STAGING_FILES)){
  const text=await readStaging(file),expected=index.files?.[file],hash=sha256(text);
  hashes[file]=hash;
  if(!expected||expected.sha256!==hash||expected.sizeBytes!==bytes(text))errors.push({code:'STAGING_HASH_MISMATCH',file});
  sources[key]=JSON.parse(text);
 }
 const commonKeys=['species','fishing','acquisition','migration'];
 for(const key of commonKeys){const file=SOURCE_FILES[key],text=await readStaging(file),expected=index.files?.[file];hashes[file]=sha256(text);if(!expected||expected.sha256!==hashes[file]||expected.sizeBytes!==bytes(text))errors.push({code:'STAGING_HASH_MISMATCH',file});sources[key]=file.endsWith('.csv')?parseCSV(text):JSON.parse(text)}
 const issue=(code,path,detail)=>errors.push({code,path,detail});
 const battle=sources.battle,trainers=[...sources.trainer.route_trainers,...sources.trainer.gym_subtrainers],species=battle.species,moves=battle.move_catalog,tms=battle.tm_catalog;
 const checks=[['species',species,151,'no'],['chains',[...new Set(species.map(x=>x.chain_id))],75],['moves',moves,117,'id'],['tms',tms,50,'id'],['fieldTrainers',sources.trainer.route_trainers,84,'trainer_id'],['gymSubTrainers',sources.trainer.gym_subtrainers,20,'trainer_id'],['stages',sources.stage.stages,12,'id'],['characters',sources.character.characters,18,'npc_id']];
 for(const [name,rows,count,id] of checks){if(rows.length!==count)issue('COVERAGE',name,{actual:rows.length,expected:count});if(id&&new Set(rows.map(x=>x[id])).size!==rows.length)issue('DUPLICATE_ID',name)}
 if(sources.trainer.route_trainers.filter(x=>x.required_for_progress).length!==28||sources.trainer.gym_subtrainers.filter(x=>x.required_for_progress).length!==12)issue('TRAINER_REQUIRED_COVERAGE','trainer');
 const speciesByNo=new Map(species.map(x=>[x.no,x])),movesById=indexBy(moves),tmsById=indexBy(tms);
 const identity=(no,path)=>{const entry=resolveSpecies(no,CANONICAL_NAMESPACE);if(!entry.resolved||!speciesByNo.has(Number(no)))issue('UNKNOWN_SPECIES',path,no);return entry.canonicalId};
 for(const mon of species){for(const learn of mon.level_up_moves??[])if(!movesById[learn.move_id])issue('MISSING_MOVE','species.'+mon.no,learn.move_id);for(const tm of mon.tm_compatibility??[])if(!tmsById[tm])issue('MISSING_TM','species.'+mon.no,tm)}
 for(const tm of tms)if(!movesById[tm.move_id])issue('MISSING_TM_MOVE',tm.id,tm.move_id);
 for(const trainer of trainers){for(const mon of trainer.party){identity(mon.species_no,trainer.trainer_id);for(const move of mon.moves??[])if(!movesById[move.move_id])issue('MISSING_TRAINER_MOVE',trainer.trainer_id,move.move_id)}}
 const status=compareStatusSources(null,battle,sources.save);
 for(const key of ['battle','save'])if(status.sources[key].missing.length||status.sources[key].unknown.length||status.sources[key].duplicates.length)issue('STATUS_ENUM',key,status.sources[key]);
 const geoje=battle.capture_contract?.geoje_ball;
 if(geoje?.ordinary_multiplier!==3||geoje.legendary_multiplier!==5||geoje.probability_cap!==.95||geoje.guaranteed!==false||battle.items.catalog.find(x=>x.id==='geoje_ball')?.shop!==false)issue('GEOJE_BALL_POLICY','battle');
 if(battle.tm_catalog.some(x=>x.consumable===true)||battle.battle_balance?.tm_reusable!==true)issue('TM_PERMANENCE','battle');
 const acquisitionByChain=new Map(sources.acquisition.map(x=>[Number(x.chain_id),x]));
 const models=species.map(mon=>{const old=sources.species.species.find(x=>x.no===mon.no),name=old?.name??mon.name,acq=acquisitionByChain.get(mon.chain_id);return {id:identity(mon.no,'battle.species'),number:mon.no,name,real:old?.motif??mon.motif,chainId:mon.chain_id,chainLength:old?.chain_length??null,stage:old?.chain_position??null,types:mon.types,stats:['hp','atk','def','spa','spd','spe'].map(k=>mon.base_stats?.[k]),evo:mon.evolution?.evolves_to_species_no?identity(mon.evolution.evolves_to_species_no,'evolution'):null,evoLevel:mon.evolution?.level??null,moves:(mon.level_up_moves??[]).map(x=>({level:x.level,id:x.move_id})),tmIds:mon.tm_compatibility??[],baseExp:mon.base_exp,captureBaseProbability:mon.capture_base_probability,available:true,acquisition:{randomSpawnAllowed:acq?.random_spawn_allowed==='True'}}});
 const storyRuntime=adaptStoryRuntime(sources,{speciesId:identity,issue});
 const encounterRuntime=adaptEncounterRuntime(sources,models,storyRuntime);
 encounterRuntime.handoffVersion='20260927';
 encounterRuntime.policy=AQUATIC_POLICY_A;
 encounterRuntime.policyExcludedTables=AQUATIC_POLICY_A.excluded;
 const story=encounterRuntime.story;
 for(const no of [148,149,150]){
  const id=`POST_SANCTUARY_${no}_RESOLVED`,event=story.events[id];
  if(!event)issue('MISSING_POST_EVENT',id);
  else Object.assign(event,{active:true,requiresEvents:['FINAL_CHAMPION'],requiresGates:['CAN_ENTER_POST'],operations:[{op:'dialogue',text:event.summary??id}]});
 }
 for(const [id,gate,prerequisites] of [
  ['POST_COMPASS','CAN_ASSEMBLE_ONSEOM_COMPASS',[148,149,150].map(no=>`POST_SANCTUARY_${no}_RESOLVED`)],
  ['YEJI_FINAL','CAN_BATTLE_YEJI_FINAL',['POST_COMPASS']],
  ['YEJI_FINAL_ENDING',null,['YEJI_FINAL']],
  ['POST_ONSEOM_GARDEN_FIRST_151','CAN_CAPTURE_151',['YEJI_FINAL_ENDING']]]){
  const event=story.events[id];if(!event){issue('MISSING_POST_EVENT',id);continue}
  Object.assign(event,{active:true,requiresEvents:prerequisites,requiresGates:gate?[gate]:[],operations:[{op:'dialogue',text:event.summary??id}]});
 }
 for(const no of [148,149,150]){const reward=story.rewards[`TX_POST_${no}_SANCTUARY_RESOLVED`];if(reward)reward.requires=[];else issue('MISSING_SANCTUARY_REWARD',no)}
 const yeji=battle.yeji_final_battle,yejiMembers=yeji.party.map(p=>({namespace:'npc_preview_species',speciesId:p.preview_species_id,level:p.level,moveIds:p.moves.map(m=>m.move_id),ace:!!p.ace}));
 story.parties['PARTY:YEJI_FINAL']={id:'PARTY:YEJI_FINAL',members:yejiMembers,moveLevelExceptions:[]};
 story.trainers.YEJI_FINAL={id:'YEJI_FINAL',npcId:'NPC_POST_YEJI',kind:'post-final',stageId:'POST',label:yeji.name,partyId:'PARTY:YEJI_FINAL',eventId:'YEJI_FINAL',required:true,repeatable:false,ai:yeji.ai_tier,itemUses:yeji.item_uses,itemId:yeji.item};
 if(story.events.YEJI_FINAL)story.events.YEJI_FINAL.trainerId='YEJI_FINAL';
 story.stages.POST.trainerIds.push('YEJI_FINAL');
 story.stages.POST.bossIds.push('YEJI_FINAL');
 story.deferred={postEvents:[],rivalRematch:null,championRematch:null};
 errors.push(...encounterRuntime.validation.errors);
 const items=indexBy(battle.items.catalog.map(row=>row.pocket==='items'&&row.shop!==false&&Number.isSafeInteger(row.price)&&row.price>0&&row.unlock&&row.effect&&typeof row.effect==='object'?{...row,shop:row.shop??true,stagedShopSourceVersion:CANONICAL_20260927_VERSION}:row));
 // The source item row retains a legacy display token; use the numeric capture contract.
 items.geoje_ball={...items.geoje_ball,capture_multiplier:geoje.ordinary_multiplier};
 const starterIds=[1,4,7].map(n=>identity(n,'starter'));
 const starterChains=new Set(starterIds.map(id=>models.find(m=>m.id===id).chainId));
 const ednaRows=battle.npc_preview_species??[],ednaById=indexBy(ednaRows.map(row=>({id:row.preview_species_id,namespace:'npc_preview_species',name:row.name,types:row.types,stats:['hp','atk','def','spa','spd','spe'].map(k=>row.base_stats[k]),definitionStatus:row.definition_status,baseExp:row.base_exp,mainDexInclusion:false,playerObtainable:false})));
 for(const member of yejiMembers){const definition=ednaById[member.speciesId];if(!definition||!Number.isInteger(definition.baseExp)||definition.baseExp<=0||member.moveIds.length!==4||new Set(member.moveIds).size!==4||member.moveIds.some(id=>!movesById[id]))issue('YEJI_PARTY_CONTRACT',member.speciesId)}
 const yejiOpponent={version:'yeji-final-v20260927',ready:yejiMembers.length===6&&Object.keys(ednaById).length===6,active:true,approvalStatus:'APPROVED',namespace:'npc_preview_species',definitionStatus:'APPROVED_OPPONENT_ONLY_V1',byId:ednaById,baseExpById:Object.fromEntries(Object.values(ednaById).map(x=>[x.id,x.baseExp])),party:{id:'YEJI_FINAL',members:yejiMembers},aiTier:yeji.ai_tier,itemUses:yeji.item_uses,repeatability:yeji.repeatability};
 const rival=story.trainers.RIVAL_05,harinVariants={};
 for(const [starterId,partyId] of Object.entries(rival?.variantPartyIds??{})){
  const base=story.parties[partyId];if(base?.members.length!==6||base.members[0]?.level!==51)issue('HARIN_POST_BASE_PARTY',starterId);
  harinVariants[starterId]={basePartyId:partyId,baseVersion:story.version,basePartySha256:sha256(JSON.stringify(base)),party:{...structuredClone(base),id:`PARTY:POST_HARIN:${starterId}`,members:base.members.map(m=>({...structuredClone(m),level:m.level+15}))}};
 }
 if(Object.keys(harinVariants).length!==3||Object.values(harinVariants).some(x=>x.party.members[0]?.level!==66))issue('HARIN_POST_VARIANTS','RIVAL_05');
 const harinPostRematch={policy:{id:'HARIN_POST_REMATCH_V1',approvalStatus:'APPROVED',baseTrainerId:'RIVAL_05',sourceFile:STAGING_FILES.battle,sourceSha256:hashes[STAGING_FILES.battle],levelDelta:15,partyPrefix:'PARTY:POST_HARIN:',npcId:'NPC_RIVAL_HARIN',pointId:'post:harin',mapId:'world:hub:PROLOGUE',cell:[22,17],repeatable:true,entryHeal:false,winHeal:false,rewards:{money:0,items:[],geojeBalls:0}},active:true,ready:true,baseTrainer:structuredClone(rival),sourceSettings:{ai_tier:'AI_4',repeatable:true},variants:harinVariants};
 const validation={ready:errors.length===0&&yejiOpponent.ready,errors,count:{species:models.length,chains:new Set(models.map(x=>x.chainId)).size,moves:moves.length,tms:tms.length,trainers:trainers.length,required:trainers.filter(x=>x.required_for_progress).length},hashes,status};
 const encounters=indexBy(sources.encounter.areas.map(area=>({id:area.area_id,stageId:area.stage_id,name:area.display_name,methods:Object.fromEntries(area.encounter_tables.map(table=>[table.method,table.slots.map(slot=>({id:identity(slot.species_no,area.area_id),weight:slot.weight,level:slot.level}))]))})));
 return deepFreeze({version:CANONICAL_20260927_VERSION,active:false,namespace:'handoff-v3',validation,sourceVersions:Object.fromEntries(Object.entries(STAGING_FILES).map(([key])=>[key,sources[key].meta.version])),starters:{ids:starterIds,familyIds:models.filter(m=>starterChains.has(m.chainId)).map(m=>m.id)},species:models,byId:indexBy(models),moves:indexBy(moves.map(x=>({...x,kind:x.category}))),tms:indexBy(tms.map(x=>({...x,moveId:x.move_id}))),trainers:indexBy(trainers.map(t=>({id:t.trainer_id,stageId:t.stage,areaId:t.area_id,required:!!t.required_for_progress,ai:t.ai_tier,party:t.party.map(p=>({id:identity(p.species_no,t.trainer_id),level:p.level,moves:p.moves.map(m=>m.move_id)}))}))),stages:indexBy(sources.stage.stages),encounters,storyRuntime:story,encounterRuntime,harinPostRematch,story:{events:indexBy([...sources.flags.main_event_catalog,...sources.flags.external_event_catalog].map(x=>({...x,id:x.event_id}))),flags:indexBy(sources.flags.flag_catalog),gates:indexBy(sources.flags.derived_gates),rewards:indexBy([...sources.flags.reward_transactions,...sources.flags.legend_reward_transactions])},battleContract:structuredClone(battle.battle_balance),battleRuntime:{version:battle.meta.version,typeChart:battle.type_system.effectiveness_sparse,types:battle.type_system.types.map(x=>x.id),capture:battle.capture_contract,items,yejiFinal:structuredClone(battle.yeji_final_battle),previewOpponent:yejiOpponent},economyPolicy:APPROVED_ECONOMY,saveContract:structuredClone(sources.save),migrationContract:structuredClone(sources.migration)});
}
