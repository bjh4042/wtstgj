import {battleStats,calculateDamage,stageMultiplier,moveType,typeMultiplier} from './rules.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const immunity=(status,types)=>['poison','bad_poison'].includes(status)&&types.some(t=>['poison','steel'].includes(t))||status==='burn'&&types.includes('fire')||status==='freeze'&&types.includes('ice');

/** Scores only the visible battle state. The player's pending action is deliberately absent. */
export function rankEnemyMoves({rules,catalog,actor,target,actorStages={},targetStages={},tier='AI_1',heals=0,lastHeal=false,sleptSpecies=new Set(),remaining=1}){
 const usable=actor.moves.filter(m=>m.pp>0);
 if(!usable.length)return [];
 const targetTypes=catalog.getTypes(target.speciesId),ownTypes=catalog.getTypes(actor.speciesId);
 const hpMax=battleStats(catalog,actor).hp,hpRatio=actor.hp/hpMax;
 return usable.map((slot,index)=>{
  const move=rules.moves[slot.id],type=moveType(rules,catalog,move,actor,target);
  const effective=move.target==='self'?1:typeMultiplier(rules,type,targetTypes);
  const accuracy=move.accuracy===null?1:clamp(move.accuracy/100*stageMultiplier((actorStages.accuracy??0)-(targetStages.evasion??0),true),0,1);
  const base=move.power?calculateDamage({rules,catalog,move,attacker:actor,defender:target,attackStages:actorStages,defenseStages:targetStages,randomPercent:95}).damage:0;
  const damage=effective===0?0:Math.min(target.hp,base)*accuracy;
  let score=damage+(move.power?6:0)+(ownTypes.includes(type)&&move.power?2:0);
  if(tier==='AI_1')score=1;
  else if(tier==='AI_2')score=damage+(move.power?8:0)+(ownTypes.includes(type)&&move.power?4:0);
  else {
   for(const effect of move.effects){
    if(effect.kind==='heal'){
     const threshold=move.name==='숨고르기'?.5:move.name==='씨앗회복'?.6:.5;
     const amount=Math.min(hpMax-actor.hp,Math.max(1,Math.floor(hpMax*effect.fraction)));
     score+=heals>=2||lastHeal||hpRatio>threshold?-1000:amount*(tier==='AI_4'?1.25:1.05)*accuracy;
    }
    if(effect.kind==='status'){
     const blocked=target.status||immunity(effect.status,targetTypes)||effect.status==='sleep'&&sleptSpecies.has(target.speciesId);
     score+=blocked?-1000:Math.min(target.hp,Math.max(12,battleStats(catalog,target).hp*.28))*accuracy*effect.chance;
    }
    if(effect.kind==='stage'){
     const stages=effect.target==='self'?actorStages:targetStages;
     const room=effect.stats.some(stat=>effect.amount>0?(stages[stat]??0)<6:(stages[stat]??0)>-6);
     score+=room&&remaining>1&&actor.hp>base*.6?Math.max(7,Math.min(27,battleStats(catalog,target).hp*.16))*accuracy*effect.chance:-40;
    }
    if(effect.kind==='recoil')score-=damage*effect.fraction*(actor.hp<damage*effect.fraction*2?2:1);
   }
   if(tier==='AI_4'&&move.power&&effective>0){
    const low=calculateDamage({rules,catalog,move,attacker:actor,defender:target,attackStages:actorStages,defenseStages:targetStages,randomPercent:90}).damage;
    if(low>=target.hp)score+=Math.max(50,target.hp)*accuracy*2;
    else if(base>=target.hp)score+=Math.max(25,target.hp)*accuracy;
   }
  }
  if(effective===0&&move.target!=='self')score=-1000;
  return {id:slot.id,index,score,expectedDamage:damage,accuracy};
 }).sort((a,b)=>b.score-a.score||a.index-b.index);
}

export function chooseEnemyMove(context,roll){
 const ranked=rankEnemyMoves(context),choices=['AI_3','AI_4'].includes(context.tier)?ranked.filter(x=>x.score>-500):ranked;
 if(!choices.length)return 'SYSTEM_STRUGGLE';
 const tier=context.tier;
 if(tier==='AI_1')return choices[Math.floor(roll()*choices.length)].id;
 if(tier==='AI_2')return choices[0].id;
 const weights=tier==='AI_4'?[.8,.15,.05]:[.7,.2,.1];
 const top=choices.slice(0,3),total=weights.slice(0,top.length).reduce((a,b)=>a+b,0);
 let n=roll()*total;
 for(let i=0;i<top.length;i++){n-=weights[i];if(n<0)return top[i].id}
 return top.at(-1).id;
}
