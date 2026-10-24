import {gymBarrierAt,GYM_POLISH_VERSION} from './gym-polish.mjs';
import {HIDDEN_PLACEMENT_V1} from './hidden-placement-v1.mjs';
import {claimHiddenGeoje} from './hidden-geoje-ledger.mjs';
import {WORLD_VERSION,GEOJE_GRANT_POLICY,cellPosition,positionCell,pointDistance,tileAt,GRID} from './definition.mjs';
import {evaluateStoryExpression} from '../story/gates.mjs';
export function initialWorldState(d){return {version:WORLD_VERSION,geojeGrantPolicy:d.geojeGrantPolicy,mapId:d.initialMapId,visitedMaps:[d.initialMapId],visitedHubs:[],puzzles:[],walkedTiles:0,walkedMsEstimate:0,warps:0,interactions:[],routeLog:[],surveyTrips:[]}}
export function validateWorldState(s){if(s.world===undefined)return;const w=s.world;if(s.contentNamespace!=='canonical-v1'||w.version!==WORLD_VERSION||![GEOJE_GRANT_POLICY,HIDDEN_PLACEMENT_V1.id].includes(w.geojeGrantPolicy)||w.mapId!==s.position.scene)throw Error('Invalid canonical world identity');for(const k of ['walkedTiles','walkedMsEstimate','warps'])if(!Number.isSafeInteger(w[k])||w[k]<0)throw Error('Invalid world counters');for(const k of ['visitedMaps','visitedHubs','puzzles','interactions'])if(!Array.isArray(w[k])||new Set(w[k]).size!==w[k].length||w[k].some(x=>typeof x!=='string'||x.length>180))throw Error('Invalid world ledger');if(!w.visitedMaps.includes(w.mapId)||!Array.isArray(w.routeLog)||w.routeLog.length>128||!Array.isArray(w.surveyTrips))throw Error('Invalid world history')}
export function worldStageAccess(s,c,id){const st=c.stages[id];return !!st&&st.prerequisites.every(id=>s.progress.completedStages.includes(id))&&(!st.entryGate||evaluateStoryExpression(st.entryGate,s,c))}
export function worldGate(s,c,g){return !g||typeof g==='string'?(!g||evaluateStoryExpression(g,s,c)):!!g.defeatedTrainer&&s.progress.defeatedTrainers.includes(g.defeatedTrainer)}
export function worldWalkable(d,s,id,x,y,{actors=true,surf=true,story=null}={}){const m=d.maps[id];if(!m||!Number.isInteger(x)||!Number.isInteger(y)||gymBarrierAt(m,x,y))return false;const t=tileAt(m,x,y),water=surf&&t.water&&story&&evaluateStoryExpression('CAN_SURF',s,story);if(!t.walkable&&!water)return false;if(m.puzzle&&x===m.puzzle.gate[0]&&y===m.puzzle.gate[1]&&!s.world.puzzles.includes(m.puzzle.id))return false;if(m.routeBreak&&x===m.routeBreak.gate[0]&&y===m.routeBreak.gate[1]&&!s.world.interactions.includes(m.routeBreak.pointId))return false;return !actors||!m.actors.some(a=>a.x===x&&a.y===y)}
/** Reuse the local landing guard for cells newly occupied by a map overlay only.
 * Existing saves are cloned; recovery retains the original position and prior record.
 */
function recoverLocalPosition(s,h,policyId,reason,{gymSide=false}={}){
 const old=structuredClone(s.position),cell=positionCell(old),m=h.world.maps[old.scene],safe=[];
 for(let y=1;y<m.height-1;y++)for(let x=1;x<m.width-1;x++){
  if(gymSide&&(cell.y<10?y>=10:y<=10))continue;
  const pos=cellPosition(m.id,x,y,old.facing);if(h.validLanding(pos,s)&&!tileAt(m,x,y).encounter)safe.push({pos,distance:Math.abs(x-cell.x)+Math.abs(y-cell.y)});
 }
 safe.sort((a,b)=>a.distance-b.distance);if(!safe.length)throw Error('Map overlay has no safe local landing');
 s.position=safe[0].pos;
 s.world.placementRecovery={policyId,reason,originalPosition:old,position:structuredClone(s.position),...(s.world.placementRecovery?{prior:s.world.placementRecovery}:{})};
}
export function adoptPlacementPosition(input,h){
 const s=structuredClone(input),w=s.world,d=h.world;if(!w)return s;
 const matches=list=>{const cell=positionCell(s.position);return list?.some(p=>p.mapId===s.position.scene&&p.x===cell.x&&p.y===cell.y)};
 if(d.placementPolicy&&w.placementApproval!==d.placementPolicy.id){
  if(matches(d.placementCollisions))recoverLocalPosition(s,h,d.placementPolicy.id,'NEW_OPTIONAL_PATH_COLLISION');
  w.placementApproval=d.placementPolicy.id;
 }
 if(matches(d.polishCollisions))recoverLocalPosition(s,h,GYM_POLISH_VERSION,'NEW_GYM_PATH_COLLISION',{gymSide:true});
 if(d.trainerPlacementVersion&&w.trainerPlacementApproval!==d.trainerPlacementVersion){
  if(matches(d.trainerPlacementCollisions))recoverLocalPosition(s,h,d.trainerPlacementVersion,'NEW_TRAINER_ROUTE_COLLISION');
  w.trainerPlacementApproval=d.trainerPlacementVersion;
 }
 if(matches(d.privateSceneCollisions))recoverLocalPosition(s,h,d.privateSceneVersion,'PRIVATE_SCENERY_LOCAL_COLLISION');
 return s;
}
export function validateWorldLocation(s,h){validateWorldState(s);if(!s.world)return;const p=positionCell(s.position),m=h?.world?.maps[s.position.scene];if(!m||!worldStageAccess(s,h.story,m.stageId)||!h.canOccupy(s,m.id,p.x,p.y))throw Error('World save has invalid or locked landing');if(s.world.visitedMaps.some(id=>!h.world.maps[id])||s.world.visitedHubs.some(id=>!h.hubs[id])||s.world.puzzles.some(id=>!Object.values(h.world.maps).some(m=>m.puzzle?.id===id)))throw Error('Unknown world geometry')}
const add=(a,id)=>{if(!a.includes(id))a.push(id)};
export function syncWorldLocation(s,h){const m=h.world.maps[s.position.scene];s.world.mapId=m.id;add(s.world.visitedMaps,m.id);s.progress.currentStage=m.stageId;s.encounter.areaId=m.areaId;s.encounter.method=null;s.progress.leagueRunState=s.progress.flags.MAIN_STORY_CLEAR?'idle':s.progress.leagueWins.length===4?'champion':m.stageId==='FINAL'||s.progress.leagueWins.length?`elite_${s.progress.leagueWins.length+1}`:'idle'}
export function applyWorldAction(s,c,r,h){if(!s.world||!h?.world||s.world.version!==h.world.version)throw Error('World host required');const d=h.world,m=d.maps[s.position.scene],from=positionCell(s.position),p=d.points[r.pointId],at=()=>{if(!p||pointDistance(s.position,p)>1)throw Error('해당 위치 가까이에서 조사하세요.')};
 if(s.enhancedLeague?.phase==='active'&&!['face','move'].includes(r.type))throw Error('강화 리그 도전 중에는 이동·파티 정비·다음 대결·중도 포기만 가능합니다.');
 if(r.type==='face'){if(!['up','down','left','right'].includes(r.facing))throw Error('Invalid direction');s.position.facing=r.facing;return}
 if(r.type==='move'){const{x,y,facing}=r;if(!Number.isInteger(x)||!Number.isInteger(y)||Math.abs(x-from.x)+Math.abs(y-from.y)!==1||!['up','down','left','right'].includes(facing)||!h.canOccupy(s,m.id,x,y))throw Error('WORLD_MOVEMENT_BLOCKED');s.position=cellPosition(m.id,x,y,facing);s.world.walkedTiles++;s.world.walkedMsEstimate+=d.walkMs;if(s.economy?.policyId)s.economy.walkedDistance=(s.economy.walkedDistance??0)+GRID;return}
 if(r.type==='warp'){at();const target=d.maps[p.targetMapId];if(p.kind!=='warp'||!target||!worldStageAccess(s,h.story,target.stageId)||!worldGate(s,h.story,p.gate))throw Error('WORLD_GATE_LOCKED');if(d.placementPolicy&&m.kind==='league'&&target.kind!=='league'&&!s.progress.flags.MAIN_STORY_CLEAR&&s.progress.leagueWins.length)throw Error('본편 리그 연전 중에는 외부 시설로 나갈 수 없습니다.');if(!h.canOccupy(s,target.id,...p.target))throw Error('WORLD_WARP_DESTINATION_BLOCKED');s.position=cellPosition(target.id,...p.target);syncWorldLocation(s,h);s.world.warps++;s.world.routeLog.push({from:m.id,to:target.id,warpId:p.id,walkedTiles:s.world.walkedTiles});if(s.world.routeLog.length>128)s.world.routeLog.shift();return}
 if(r.type==='hidden-geoje'||r.type==='hidden-marker'){
  at();const policy=d.placementPolicy,slot=policy?.slots.find(x=>x.slotId===(p.slotId??p.id));
  if(!slot||!worldStageAccess(s,h.story,slot.stage)||!worldGate(s,h.story,slot.accessGate))throw Error('숨김 지점 접근 조건을 충족하지 않았습니다.');
  if(r.type==='hidden-marker'){if(p.kind!=='hidden-marker'||!slot.requiredMarkers?.includes(p.id))throw Error('Unknown hidden marker');add(s.world.interactions,p.id);return}
  if(p.kind!=='hidden-geoje')throw Error('Not hidden reward');
  if(slot.requiredMarkers?.some(id=>!s.world.interactions.includes(id)))throw Error('주변의 서로 다른 표식 2개를 먼저 조사하세요.');
  claimHiddenGeoje(s,slot);add(s.world.interactions,p.id);return;
 }
 if(r.type==='puzzle'){
  at();if(p.kind!=='puzzle')throw Error('Not puzzle');
  if(s.world.puzzles.includes(p.puzzleId))return; // Preserve pre-polish completed switches.
  const missing=p.requiresInteractions?.find(id=>!s.world.interactions.includes(id));
  if(missing)throw Error('먼저 '+d.points[missing].label+'을(를) 확인하세요.');
  add(s.world.interactions,p.id);
  if(p.completesPuzzle!==false)add(s.world.puzzles,p.puzzleId);
  return;
 }
 if(r.type==='visit-hub'){at();if(p.kind!=='heal')throw Error('Not center');add(s.world.visitedHubs,p.hubId);return}
 if(r.type==='storage-exchange'){
  at();if(p.kind!=='heal')throw Error('보관함은 생태센터에서 이용하세요.');
  const partyIndex=s.party.findIndex(mon=>mon.instanceId===r.partyInstanceId),boxIndex=s.box.findIndex(mon=>mon.instanceId===r.boxInstanceId);
  if(partyIndex<0||boxIndex<0||r.partyInstanceId===r.boxInstanceId)throw Error('교환 대상을 다시 선택하세요.');
  // Move the existing instances, never recreate or heal them. Replayed requests
  // cannot reverse the exchange because the original IDs have changed containers.
  [s.party[partyIndex],s.box[boxIndex]]=[s.box[boxIndex],s.party[partyIndex]];
  return;
 }
 if(r.type==='interaction'){at();add(s.world.interactions,p.id);return}
 if(r.type==='survey-start'){if(!s.economy.quest.active)throw Error('No survey');s.world.surveyStartTiles=s.world.walkedTiles;return}
 if(r.type==='survey-end'){if(s.economy.quest.active||!Number.isSafeInteger(s.world.surveyStartTiles))throw Error('Survey incomplete');s.world.surveyTrips.push({round:s.economy.quest.round,tiles:s.world.walkedTiles-s.world.surveyStartTiles,secondsEstimate:(s.world.walkedTiles-s.world.surveyStartTiles)*d.walkMs/1000});delete s.world.surveyStartTiles;return}throw Error('Unsupported world operation');
}
