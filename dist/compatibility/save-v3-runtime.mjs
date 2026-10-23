import {CANONICAL_STORY_SAVE} from '../story/save.mjs';

// This is a read-only boundary audit. The canonical world session and handoff
// Save v3 are independent formats; partial projection must never be committed.
const speciesNo=id=>typeof id==='string'&&/^SPECIES_(\d{3})$/.test(id)?Number(id.slice(-3)):null;
const unique=values=>Array.isArray(values)&&new Set(values).size===values.length;
const issue=(code,path)=>({code,path});

export function inspectCanonicalWorldV3Boundary(runtime){
 const blockers=[];
 if(runtime?.format!==CANONICAL_STORY_SAVE||runtime.contentNamespace!=='canonical-v1'||!runtime.world){
  return {supported:false,knownMappings:null,blockers:[issue('CANONICAL_WORLD_SESSION_REQUIRED','runtime')]};
 }
 const p=runtime.progress??{},world=runtime.world,owned=[...(runtime.party??[]),...(runtime.box??[])];
 const mapSpecies=(ids,path)=>{
  if(!unique(ids)){blockers.push(issue('INVALID_ID_SET',path));return null}
  const nos=ids.map(speciesNo);
  if(nos.some(n=>n===null||n<1||n>151))blockers.push(issue('SPECIES_ID_MAPPING_UNAVAILABLE',path));
  return nos;
 };
 const knownMappings={
  profile:{playerName:runtime.player?.name??null},
  progress:{currentStage:p.currentStage??null,currentMapId:world.mapId??null,
   completedEvents:Array.isArray(p.completedEvents)?[...p.completedEvents]:null,
   flags:p.flags?Object.fromEntries(Object.entries(p.flags).filter(([,v])=>v===true)):null,
   leagueRunState:p.leagueRunState??null},
  world:{defeatedTrainerIds:Array.isArray(p.defeatedTrainers)?[...p.defeatedTrainers]:null,
   visitedMapIds:Array.isArray(world.visitedMaps)?[...world.visitedMaps]:null},
  dex:{seenSpeciesNos:mapSpecies(runtime.dex?.seen,'dex.seen'),caughtSpeciesNos:mapSpecies(runtime.dex?.caught,'dex.caught')},
  inventory:{capture_balls:runtime.inventory?structuredClone(runtime.inventory):null,
   tm:Object.fromEntries(Array.from({length:50},(_,i)=>{const id=`TM${String(i+1).padStart(2,'0')}`;return [id,(runtime.ownedTms??[]).includes(id)]}))},
  creatures:owned.map(mon=>({instanceId:mon.instanceId,speciesNo:speciesNo(mon.speciesId),level:mon.level,totalExp:mon.totalExp,
   moves:mon.moves?.map(m=>({moveId:m.id,ppCurrent:m.pp})),currentHp:mon.hp,status:mon.status}))
 };
 if(!unique(p.completedEvents)||!unique(p.defeatedTrainers)||!unique(world.visitedMaps)||!unique(runtime.ownedTms))blockers.push(issue('INVALID_ID_SET','runtime.progress/world'));
 if(owned.some(mon=>!mon.instanceId||!speciesNo(mon.speciesId)))blockers.push(issue('CREATURE_ID_MAPPING_UNAVAILABLE','party/box'));
 // These required v3 values are not recorded by the current world session.
 // Supplying the current time or deriving them from a counter would fabricate
 // acquisition and grant provenance.
 for(const mon of owned)if(!mon.obtainedAt||!mon.obtainedMethod||mon.obtainedAreaId===undefined||mon.obtainedEventId===undefined||typeof mon.releaseProtected!=='boolean')
  blockers.push(issue('CREATURE_PROVENANCE_UNAVAILABLE',`creatures.${mon.instanceId??'unknown'}`));
 const grants=p.geojeBallGrantHistory??[];
 if(grants.length)blockers.push(issue('GEOJE_GRANT_TIMESTAMP_UNAVAILABLE','rewards.geojeBallGrantHistory'));
 if(runtime.geojeHidden?.history?.length)blockers.push(issue('HIDDEN_GEOJE_GRANT_PROVENANCE_UNAVAILABLE','geojeHidden.history'));
 // Save v3 has no authoritative reverse mapping for these live state fields.
 for(const path of ['encounter','economy','pendingMoves','battleHistory','world.routeLog','world.surveyTrips','world.walkedTiles','world.walkedMsEstimate','world.warps','world.interactions']){
  const value=path.split('.').reduce((v,key)=>v?.[key],runtime);
  if(value!==undefined&&(typeof value==='object'||value!==0))blockers.push(issue('NATIVE_STATE_FIELD_UNMAPPED',path));
 }
 if(p.rewardClaims?.length)blockers.push(issue('REWARD_CLAIM_MAPPING_UNAVAILABLE','progress.rewardClaims'));
 if(p.items&&Object.keys(p.items).length)blockers.push(issue('ITEM_POCKET_MAPPING_UNAVAILABLE','progress.items'));
 if(runtime.position)blockers.push(issue('POSITION_UNIT_MAPPING_UNAVAILABLE','position'));
 if(runtime.player?.appearance)blockers.push(issue('AVATAR_MAPPING_UNAVAILABLE','player.appearance'));
 // Even a fresh session needs an explicit runtime constructor for a v3 read.
 blockers.push(issue('V3_TO_WORLD_SESSION_ADAPTER_UNAVAILABLE','runtime'));
 return {supported:false,knownMappings,blockers};
}

export function requireCanonicalWorldV3Bridge(runtime){
 const audit=inspectCanonicalWorldV3Boundary(runtime);
 const error=Error(`Canonical world Save v3 runtime bridge unavailable: ${audit.blockers.map(b=>b.code).join(', ')}`);
 error.code='CANONICAL_WORLD_SAVE_V3_BRIDGE_UNAVAILABLE';error.audit=audit;
 throw error;
}
