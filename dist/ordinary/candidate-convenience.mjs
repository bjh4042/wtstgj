import {CANONICAL_20260927_VERSION} from '../compatibility/canonical-20260927-adapter.mjs';

const POST_STEPS=[
 ['FINAL_CHAMPION','윤 박사 승리'],
 ['POST_SANCTUARY_148_RESOLVED','No.148 성소 해결'],
 ['POST_SANCTUARY_149_RESOLVED','No.149 성소 해결'],
 ['POST_SANCTUARY_150_RESOLVED','No.150 성소 해결'],
 ['POST_COMPASS','온섬의 나침반'],
 ['YEJI_FINAL','예지 최종전'],
 ['YEJI_FINAL_ENDING','최종 엔딩'],
 ['POST_ONSEOM_GARDEN_FIRST_151','No.151 최초 조우']
];
const idOf=value=>typeof value==='number'?`SPECIES_${String(value).padStart(3,'0')}`:value;
const unique=rows=>[...new Set(rows)];
export function candidateConvenience(snapshot,adapter,world,storyService=null){
 if(adapter?.version!==CANONICAL_20260927_VERSION||!adapter.validation?.ready)throw Error('Validated 20260927 candidate required');
 if(!snapshot?.progress||!snapshot?.world||!snapshot?.dex)throw Error('World story snapshot required');
 const progress=snapshot.progress,done=new Set(progress.completedEvents),defeated=new Set(progress.defeatedTrainers);
 const stages=Object.values(adapter.stages).sort((a,b)=>a.order-b.order),stage=adapter.stages[progress.currentStage];
 const stageTrainers=Object.values(adapter.storyRuntime.trainers).filter(x=>x.stageId===progress.currentStage);
 const nextTrainer=stageTrainers.find(x=>x.required&&!defeated.has(x.id)&&(!storyService||storyService.trainerAvailable(x.id)));
 const nextEvent=stage?.main_beats?.find(x=>!done.has(x.event_id)&&(!storyService||storyService.eventAvailable(x.event_id)));
 const nextPost=POST_STEPS.find(([id])=>!done.has(id));
 const objective=done.has('FINAL_CHAMPION')?(nextPost?.[1]??'거제 전역을 탐험하세요'):
  nextEvent?`${stage.title}: ${nextEvent.title??nextEvent.summary??nextEvent.event_id}`:
  nextTrainer?`${stage.title}: ${nextTrainer.label}에게 승리`:
  `${stage.title}: 다음 지역으로 이동`;
 const caught=new Set(snapshot.dex.caught.map(idOf)),seen=new Set(snapshot.dex.seen.map(idOf));
 const areaRows=Object.values(adapter.encounters).map(area=>{
  const speciesIds=unique(Object.values(area.methods).flat().map(slot=>slot.id));
  const mapId='world:area:'+area.id;
  return {id:area.id,name:area.name,stageId:area.stageId,mapId,discovered:snapshot.world.visitedMaps.includes(mapId),total:speciesIds.length,caught:speciesIds.filter(id=>caught.has(id)).length,seen:speciesIds.filter(id=>seen.has(id)).length,speciesIds};
 });
 const species=adapter.species.map(mon=>({...mon,seen:seen.has(mon.id),caught:caught.has(mon.id),habitatHints:areaRows.filter(a=>a.speciesIds.includes(mon.id)).map(a=>a.name)}));
 const regions=stages.filter(s=>/^S[1-9]$/.test(s.id)).map(s=>{const ids=unique(areaRows.filter(a=>a.stageId===s.id).flatMap(a=>a.speciesIds));return {id:s.id,name:s.title,total:ids.length,caught:ids.filter(id=>caught.has(id)).length,seen:ids.filter(id=>seen.has(id)).length,speciesIds:ids}});
 const maps=Object.values(world?.maps??{}).map(map=>({id:map.id,name:map.label,stageId:map.stageId,discovered:snapshot.world.visitedMaps.includes(map.id)}));
 const landmarks=Object.values(world?.points??{}).filter(point=>point.kind==='landmark').map(point=>({id:point.id,name:point.label,mapId:point.mapId,discovered:snapshot.world.visitedMaps.includes(point.mapId),investigated:snapshot.world.interactions.includes(point.id),message:point.message??null}));
 return {
  version:adapter.version,objective,stage:{id:stage.id,title:stage.title,completed:progress.completedStages.includes(stage.id)},
  stages:stages.map(s=>({id:s.id,title:s.title,current:s.id===stage.id,completed:progress.completedStages.includes(s.id),badge:s.gym?.badge??null,badgeEarned:s.gym?progress.badges.includes(s.gym.badge_id):false})),
  maps,areas:areaRows,regions,landmarks,species,
  dex:{seen:species.filter(x=>x.seen).length,caught:species.filter(x=>x.caught).length,total:species.length},
  trainers:Object.values(adapter.storyRuntime.trainers).filter(t=>['route_general','gym_subtrainer'].includes(t.kind)).map(t=>({id:t.id,name:t.label,stageId:t.stageId,required:t.required,defeated:defeated.has(t.id)})),
  post:POST_STEPS.map(([id,name])=>({id,name,completed:done.has(id),available:done.has('FINAL_CHAMPION')})),
  fieldResearch:{visitedMaps:snapshot.world.visitedMaps.length,visitedHubs:snapshot.world.visitedHubs.length,investigatedLandmarks:landmarks.filter(x=>x.investigated).length,observedSites:snapshot.economy?.quest?.observed?.length??0,round:snapshot.economy?.quest?.round??0,active:!!snapshot.economy?.quest?.active},
  types:adapter.battleRuntime.types,typeChart:adapter.battleRuntime.typeChart
 };
}

export function selectCandidateDex(view,{filter='all',areaId='',query=''}={}){
 const area=[...view.areas,...view.regions].find(a=>a.id===areaId),q=query.trim().toLocaleLowerCase('ko');
 return view.species.filter(mon=>(filter==='caught'?mon.caught:filter==='seen'?mon.seen:filter==='unseen'?!mon.seen:true)&&(!area||area.speciesIds.includes(mon.id))&&(!q||mon.id.toLowerCase().includes(q)||mon.seen&&mon.name.toLocaleLowerCase('ko').includes(q)));
}
