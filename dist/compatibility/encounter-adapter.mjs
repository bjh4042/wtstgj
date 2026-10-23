/** Canonical source boundary. Runtime consumers never read CSV/JSON directly. */
export const ENCOUNTER_VERSION='canonical-encounter-v1';
export const ROD_METHODS=Object.freeze({basic_rod:'fishing_basic',good_rod:'fishing_good',super_rod:'fishing_super'});
export const RESTRICTED_AREAS=Object.freeze(['S5_GEOJE_JUNGLE_DOME','S9_HUNGNAM_MEMORIAL_PARK','S4_POW_CAMP_CORE']);
const rows=x=>Array.isArray(x)?x:[],index=xs=>Object.fromEntries(xs.map(x=>[x.id,x]));
const split=x=>String(x??'').split(/[;,]/).map(x=>x.trim()).filter(Boolean);
// Tuning metadata keyed by IDs, independent of canonical slot weights.
const RICH_AREAS=new Set(['S1_HACHEONG_WETLAND','S3_OKPO_FOREST_EDGE','S5_DUNDEOK_FOREST_STREAM','S6_HAKDONG_FOREST','POST_ISLAND_EXPEDITION']);
export function adaptEncounterRuntime(s,models,story){
 const byNumber=new Map(models.map(x=>[x.number,x])),id=n=>byNumber.get(Number(n))?.id??null,errors=[],historical=[],areas={},tables={},events={};
 const chains=index(rows(s.acquisition).map(a=>{
  const members=models.filter(m=>m.chainId===Number(a.chain_id)).sort((a,b)=>a.stage-b.stage);
  return {id:String(a.chain_id),speciesIds:members.map(m=>m.id),baseId:members[0]?.id,firstStage:a.first_stage,method:a.primary_acquisition,mode:a.interaction_mode,randomAllowed:a.random_spawn_allowed==='True',ballAllowed:a.standard_ball_capture_allowed==='True',requirements:split(a.field_requirements),siteId:a.special_site_id||null,areaIds:split(a.area_ids),tradeRequirement:a.trade_requirement};
 }));
 const chainFor=speciesId=>Object.values(chains).find(c=>c.speciesIds.includes(speciesId));
 for(const a of rows(s.encounter?.areas)){
  areas[a.area_id]={id:a.area_id,stageId:a.stage_id,label:a.display_name,level:a.recommended_level??null,restricted:RESTRICTED_AREAS.includes(a.area_id),methods:[],eventIds:rows(a.special_event_ids)};
  for(const t of rows(a.encounter_tables)){
   const rod=Object.keys(ROD_METHODS).find(r=>ROD_METHODS[r]===t.method)??null,tableId=`${a.area_id}:${t.method}`;
   const fish=rod?rows(s.fishing).filter(f=>f.area_id===a.area_id&&f.rod===rod):[];
   const table={id:tableId,areaId:a.area_id,stageId:a.stage_id,method:t.method,rod,gate:rod?`CAN_FISH_${rod.split('_')[0].toUpperCase()}`:null,requirements:split(t.unlock),availableFrom:fish[0]?.fishing_available_from??a.stage_id,profile:rod||areas[a.area_id].restricted?'NONE':RICH_AREAS.has(a.area_id)?'RICH':['shore_walk','rocky_shore','harbor_edge','park_edge'].includes(t.method)?'SPARSE':'NORMAL',slots:rows(t.slots).map((r,i)=>({slotId:i,speciesId:id(r.species_no),weight:r.weight,level:structuredClone(r.level)})),errors:[],active:true};
   const fail=(code,detail={})=>{const error={code,tableId,...detail};table.errors.push(error);errors.push(error);table.active=false};
   if(!table.slots.length||table.slots.reduce((n,x)=>n+x.weight,0)!==100||table.slots.some(r=>!Number.isFinite(r.weight)||r.weight<=0))fail('INVALID_WEIGHT');
   if(rod){
    table.requirements=[...new Set([...table.requirements,...fish.flatMap(f=>split(f.area_requirements))])];
    const expected=s.encounter?.design_rules?.fishing_rule?.slot_schema?.[rod]?.weights;
    if(JSON.stringify(table.slots.map(r=>r.weight))!==JSON.stringify(expected)||fish.length!==table.slots.length||fish.some((f,i)=>id(f.species_no)!==table.slots[i]?.speciesId||Number(f.weight)!==table.slots[i]?.weight||JSON.stringify([Number(f.level_min),Number(f.level_max)])!==JSON.stringify(table.slots[i]?.level)))fail('FISHING_AUTHORITY_CONFLICT');
   }
   for(const slot of table.slots){
    const species=models.find(m=>m.id===slot.speciesId),c=chainFor(slot.speciesId);
    if(!c||!species)fail('UNKNOWN_SPECIES',{speciesId:slot.speciesId});
    if(!Array.isArray(slot.level)||slot.level.length!==2||slot.level.some(n=>!Number.isInteger(n)||n<1||n>100)||slot.level[0]>slot.level[1])fail('INVALID_LEVEL');
    if(species?.number<=9)fail('STARTER_RANDOM_FORBIDDEN',{speciesId:slot.speciesId});
    // Fishing is explicitly authorized by matching Encounter + Fishing rows, not a primary-method label.
    // This exception never authorizes walking/Surf, and never overrides the capture/interaction contract.
    const approvedFishing=!!rod&&fish.some(f=>id(f.species_no)===slot.speciesId&&Number(f.weight)===slot.weight&&JSON.stringify([Number(f.level_min),Number(f.level_max)])===JSON.stringify(slot.level));
    if(c&&(!c.ballAllowed||(!rod&&!c.randomAllowed)||rod&&!approvedFishing))fail('ACQUISITION_RANDOM_CONFLICT',{speciesId:slot.speciesId,authority:'acquisition',method:c.method});
    if(c&&c.mode!=='standard_battle_capture')fail('ACQUISITION_INTERACTION_CONFLICT',{speciesId:slot.speciesId,authority:'acquisition',interactionMode:c.mode});
    if(species?.stage>1&&!(rod==='super_rod'&&fish.some(f=>id(f.species_no)===species.id)))fail('EVOLVED_DIRECT_FORBIDDEN',{speciesId:slot.speciesId});
   }
   if(areas[a.area_id].restricted)fail('RESTRICTED_AREA');
   areas[a.area_id].methods.push(t.method);tables[tableId]=table;
  }
 }
 const extended=structuredClone(story);
 for(const e of rows(s.encounter?.special_events).filter(e=>e.acquisition_available)){
  const speciesId=id(e.species_no),c=chainFor(speciesId),eventId=e.event_id,storyId=story.aliases[eventId]??eventId;
  const candidates=rows(e.candidate_species??e.starter_species).map(r=>id(r.species_no));
  const gate=eventId==='POST_STARTER_RESEARCH'?'CAN_START_POST_STARTER_RESEARCH':['legendary_capture','legendary_sanctuary','mythic_capture'].includes(e.kind)?`CAN_CAPTURE_${e.species_no}`:null;
  const event={id:eventId,storyId,areaId:e.area_id,stageId:e.stage,speciesId,candidateIds:candidates,mode:e.registration_mode,kind:e.kind,gate,requirements:c?.requirements??[],siteId:c?.siteId??e.special_site_id??null,requiredSpeciesId:id(e.required_species_no),requiredRegistered:rows(e.unlock_requires_species_registered).map(id),repeatable:e.repeatable===true,firstCaptureOnly:e.registration_mode==='battle_capture',level:e.event_id==='POST_STARTER_RESEARCH'?5:areas[e.area_id]?.level?.[0]??5,levelPolicy:'source-area-minimum; starter gift level 5',active:true};
  if(c?.siteId&&e.special_site_id&&c.siteId!==e.special_site_id)historical.push({code:'LOWER_AUTHORITY_SITE_ID',eventId,selected:c.siteId,historical:e.special_site_id});
  if(e.registration_mode==='battle_capture'&&!c?.ballAllowed){event.active=false;errors.push({code:'ACQUISITION_CAPTURE_CONFLICT',eventId})}
  if(eventId!=='STARTER_CHOICE_PROLOGUE'){
   const previous=extended.events[storyId]??{id:storyId,stageId:e.stage,requiresEvents:[],requiresGates:[],operations:[]};
   extended.events[storyId]={...previous,active:event.active,acquisitionOnly:true};
  }
  events[eventId]=event;
 }
 // Only acquisition transactions, not the remaining POST storyline, are activated.
 for(const r of rows(s.flags?.legend_reward_transactions))extended.rewards[r.id]={...structuredClone(r),triggerEvent:story.aliases[r.trigger_event]??r.trigger_event,requires:r.requires??(r.completion_condition?[r.completion_condition]:[])};
 if(extended.events.POST_COMPASS)Object.assign(extended.events.POST_COMPASS,{active:true,acquisitionOnly:true});
 for(const st of Object.values(extended.stages))st.context={...st.context,encounterActivation:true,fishingActivation:true};
 return {version:ENCOUNTER_VERSION,authority:['acquisition','encounter','fishing','stage/story','species-legacy-reference'],areas,tables,chains,events,story:extended,rodMethods:ROD_METHODS,restrictedAreas:RESTRICTED_AREAS,validation:{errors,historical,quarantinedTableIds:Object.values(tables).filter(t=>!t.active).map(t=>t.id)},modifiers:{timeModifier:1,weatherModifier:1},sourceVersions:{encounter:s.encounter?.meta?.version,fishing:'v1.1',acquisition:'v2'}};
}
