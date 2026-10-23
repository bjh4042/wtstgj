/** Shared field/battle target choices. Effects and consumption stay in the existing transaction path. */
export function itemUseChoices(catalog,bag,party){
 const choices=[];
 for(const [itemId,quantity] of Object.entries(bag??{})){
  const item=catalog.itemContract[itemId];if(quantity<1||item?.pocket!=='items')continue;
  for(const mon of party){
   const label=`${catalog.getDisplayName(mon.speciesId)} · ${item.name} (${quantity})`;
   if(Number.isInteger(item.effect.pp_restore))mon.moves.forEach((move,moveSlot)=>{if(move?.id)choices.push({itemId,instanceId:mon.instanceId,moveSlot,label:`${label} → ${catalog.getMoveById(move.id).name} PP ${move.pp}/${catalog.getMoveById(move.id).pp}`})});
   else choices.push({itemId,instanceId:mon.instanceId,label});
  }
 }
 return choices;
}
