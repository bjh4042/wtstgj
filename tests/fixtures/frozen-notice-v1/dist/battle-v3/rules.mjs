import {deepFreeze} from '../compatibility/codec.mjs';
const STATS={'공격':'atk','방어':'def','특공':'spa','특방':'spd','스피드':'spe','명중':'accuracy'};
const STATUS={'독':'poison','맹독':'bad_poison','화상':'burn','마비':'paralysis','얼음':'freeze','수면':'sleep'};
/** Compile the locked 117 effect descriptions once; unknown semantics fail activation, never silently disappear. */
export function compileMove(move){
 const text=move.effect, result={...move,effects:[],target:'opponent'};
 if(move.id==='MV312')return deepFreeze({...result,adaptiveTypes:['water','grass','flying','psychic']});
 if(text==='부가효과 없음')return deepFreeze(result);
 if(/^(기본|안정형|중위력|고위력).*공격$/.test(text))return deepFreeze(result);
 let match;
 if((match=text.match(/^자신의 HP (25|50)% 회복$/))){result.target='self';result.effects.push({kind:'heal',fraction:Number(match[1])/100,chance:1,target:'self'})}
 else if((match=text.match(/^(?:사용자에게 |실제로 상대에게 준 피해량의 )(25)% 반동$/)))result.effects.push({kind:'recoil',fraction:Number(match[1])/100,chance:1,target:'self'});
 else {
  const chanceMatch=text.match(/^(\d+)% 확률로 /),chance=chanceMatch?Number(chanceMatch[1])/100:1;
  const body=text.replace(/^\d+% 확률로 /,'').replace(/^명중 시 /,'');
  if((match=body.match(/^(?:대상을 )?(독|맹독|화상|마비|얼음|수면)(?: 상태로 만듦| 상태로 만든다)?$/)))result.effects.push({kind:'status',status:STATUS[match[1]],chance,target:'opponent'});
  else if(body==='풀죽음')result.effects.push({kind:'flinch',chance,target:'opponent'});
  else if((match=body.match(/^(?:(자신의|사용자|대상의|상대) )?([가-힣·]+) ([12])단계 (상승|하락)$/))){
   const target=match[4]==='상승'?'self':'opponent',stats=match[2].split('·').map(s=>STATS[s]);
   if(stats.some(s=>!s))throw Error('Unknown stage stat: '+move.id);
   result.effects.push({kind:'stage',stats,amount:Number(match[3])*(target==='self'?1:-1),chance,target});
   if(move.category==='status')result.target=target;
  }else throw Error('Unimplemented canonical move effect: '+move.id+' '+text);
 }
 return deepFreeze(result);
}
export function createBattleRules(adapter){
 if(!adapter?.validation?.ready||adapter.battleContract.battle_format!=='1v1_singles_only'||!adapter.battleRuntime?.capture?.probability_formula)throw Error('Validated Battle v3 adapter required');
 const moves=Object.fromEntries(Object.values(adapter.moves).map(m=>[m.id,compileMove(m)]));
 if(Object.keys(moves).length!==117||Object.keys(adapter.tms).length!==50||adapter.battleRuntime.types.length!==17)throw Error('Incomplete Battle v3 contract');
 if(Object.values(adapter.tms).some(t=>!moves[t.moveId])||adapter.battleRuntime.types.some(t=>!adapter.battleRuntime.typeChart[t])||adapter.battleRuntime.capture.balls.some(id=>!adapter.battleRuntime.items[id]))throw Error('Broken Battle v3 references');
 const unassignedMoveIds=Object.keys(moves).filter(id=>!adapter.species.some(s=>s.moves.some(m=>m.id===id)||s.tmIds.some(tm=>adapter.tms[tm]?.moveId===id)));
 return deepFreeze({version:adapter.battleRuntime.version,moves,tms:adapter.tms,...adapter.battleRuntime,balance:adapter.battleContract,
  coverage:{species:adapter.species.length,moves:Object.keys(moves).length,tms:Object.keys(adapter.tms).length,unassignedMoveIds},
  // Explicit local operational choices where the handoff supplies no formula. Not claimed as canonical source rules.
  operational:{version:'geoje-battle-operations-v1',wildFlee:'guaranteed; trainer prohibited',recoil:'floor(actual HP damage * fraction), minimum 1',stage:'(2+n)/2 or 2/(2-n); accuracy uses 3',statusImmunity:'poison/steel immune poison; fire immune burn; ice immune freeze',emptyPP:'neutral 50-power physical fallback with 25% actual-damage recoil',moveLearning:'pending player choice; never silently forget',evolution:'pending; not automatically activated',ai:'uniform among usable moves',speedTie:'uniform coin flip'}});
}
export function stageMultiplier(stage,accuracy=false){const n=Math.max(-6,Math.min(6,stage??0)),base=accuracy?3:2;return n>=0?(base+n)/base:base/(base-n)}
export function battleStats(catalog,mon){return Object.fromEntries(['hp','atk','def','spa','spd','spe'].map((s,i)=>[s,Math.floor(2*catalog.getBaseStats(mon.speciesId)[i]*mon.level/100)+(i===0?mon.level+10:5)]))}
export function typeMultiplier(rules,type,types){return types.reduce((n,t)=>n*(rules.typeChart[type]?.[t]??1),1)}
export function moveType(rules,catalog,move,attacker,defender){
 if(!move.adaptiveTypes)return move.type;
 const own=catalog.getTypes(attacker.speciesId),enemy=catalog.getTypes(defender.speciesId);
 return move.adaptiveTypes.reduce((best,t)=>{const value=typeMultiplier(rules,t,enemy)*(own.includes(t)?1.5:1);return value>best.value?{type:t,value}:best},{type:'water',value:-1}).type;
}
export function calculateDamage({rules,catalog,move,attacker,defender,attackStages={},defenseStages={},critical=false,randomPercent=100}){
 const type=moveType(rules,catalog,move,attacker,defender),effectiveness=move.neutral?1:typeMultiplier(rules,type,catalog.getTypes(defender.speciesId));
 if(!move.power||effectiveness===0)return {damage:0,type,effectiveness,critical};
 const a=battleStats(catalog,attacker),d=battleStats(catalog,defender),physical=move.category==='physical',ak=physical?'atk':'spa',dk=physical?'def':'spd';
 const attack=Math.max(1,Math.floor(a[ak]*stageMultiplier(attackStages[ak]))),defense=Math.max(1,Math.floor(d[dk]*stageMultiplier(defenseStages[dk])));
 let damage=Math.floor(Math.floor((Math.floor(2*attacker.level/5)+2)*move.power*attack/defense)/50)+2;
 for(const multiplier of [!move.neutral&&catalog.getTypes(attacker.speciesId).includes(type)?rules.balance.damage_contract.stab:1,effectiveness,critical?rules.balance.damage_contract.critical_multiplier:1,randomPercent/100,physical&&attacker.status==='burn'?rules.balance.status_contract.burn.physical_damage_multiplier:1])damage=Math.floor(damage*multiplier);
 return {damage:Math.max(1,damage),type,effectiveness,critical};
}
export function captureProbability(rules,catalog,mon,ballId,priorFailures=0){
 const ball=rules.items[ballId];if(!rules.capture.balls.includes(ballId)||!ball)throw Error('Unknown capture ball');
 const candidate=catalog.economyPolicy?.geoje;
 if(ballId==='geoje_ball'&&!candidate){if(rules.version?.startsWith('v3.2_'))throw Error('Geoje Ball capture policy unavailable');return 1}
 if(ballId==='geoje_ball'&&(!Number.isFinite(candidate.normal)||!Number.isFinite(candidate.legend)||candidate.cap!==.95))throw Error('Geoje Ball capture policy unavailable');
 const hp=1+1.5*(1-mon.hp/battleStats(catalog,mon).hp),status=rules.capture.status_multiplier[mon.status??'none'],retry=rules.capture.retry_multiplier_by_prior_failures[priorFailures>=5?'5+':String(priorFailures)];
 const multiplier=ballId==='geoje_ball'?(candidate.legendIds.includes(mon.speciesId)?candidate.legend:candidate.normal):ball.capture_multiplier;
 const cap=ballId==='geoje_ball'&&candidate?candidate.cap:.95;
 return Math.max(.03,Math.min(cap,catalog.getSpeciesById(mon.speciesId).captureBaseProbability*hp*status*multiplier*retry));
}
export function earnedExperience(rules,catalog,opponent,kind,share){return Math.floor(catalog.getGrowthData(opponent.speciesId).baseExp*opponent.level/7*rules.balance.exp_contract.battle_multiplier[kind]*rules.balance.exp_contract.share_multiplier[share])}
