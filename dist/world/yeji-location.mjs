/** NEW_FIX_CANDIDATE: source summary identifies Nojasan as YEJI_FINAL owner.
 * Geometry only. Trainer/event IDs, party, gates, rewards and save ledgers stay original.
 * Keep old hub point ID inert so historical references remain readable, not executable.
 */
export const YEJI_LOCATION_FIX='YEJI_FINAL_SINGLE_NOJASAN_OWNER_V1';
export function applyYejiLocationFix({maps,points,eventBindings,trainerBindings}){
 const legacy=points['trainer:YEJI_FINAL'],summit=points['post:yeji-final'];
 if(!legacy||legacy.mapId!=='world:hub:POST'||legacy.x!==24||legacy.y!==14||legacy.kind!=='trainer'||legacy.npcId!=='NPC_POST_YEJI'||legacy.trainerId!=='YEJI_FINAL'||legacy.eventId!=='YEJI_FINAL'||!summit||summit.mapId!=='world:post:nojasan-summit'||summit.kind!=='yeji-final'||summit.eventId!=='YEJI_FINAL'||summit.gate!=='CAN_BATTLE_YEJI_FINAL')throw Error('YEJI_LOCATION_SOURCE_DRIFT');
 const hub=maps[legacy.mapId],mountain=maps[summit.mapId];
 if(hub.actors.filter(a=>a.pointId===legacy.id).length!==1||mountain.actors.filter(a=>a.pointId===summit.id).length!==1)throw Error('YEJI_LOCATION_ACTOR_DRIFT');
 // Keep coordinates/ID for safe legacy reads and save-location continuity, but no battle alias.
 Object.assign(legacy,{kind:'legacy-location-info',label:'노자산 정상 생태관측지 안내',message:'예지와의 최종 대결은 노자산 정상 생태관측지에서 진행합니다.',legacyTrainerId:'YEJI_FINAL',legacyEventId:'YEJI_FINAL',supersededBy:summit.id,placementFix:YEJI_LOCATION_FIX});
 for(const key of ['npcId','trainerId','eventId','required','repeatable'])delete legacy[key];
 hub.actors=hub.actors.filter(a=>a.pointId!==legacy.id);hub.trainers=hub.trainers.filter(id=>id!==legacy.id);
 eventBindings.YEJI_FINAL=summit.id;trainerBindings.YEJI_FINAL=summit.id;
 summit.placementFix=YEJI_LOCATION_FIX;
 return {id:YEJI_LOCATION_FIX,activePointId:summit.id,inertLegacyPointId:legacy.id,nativePlacement:'HOLD_NO_NATIVE_SUMMIT_COORDINATES'};
}
