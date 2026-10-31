import {storyTrainerAvailable} from '../../story/availability-readiness.mjs';
// NEW root-selected constrained-access presentation. Never writes story flags.
export function gym4VisualState(runtime,contract){
 const p=runtime.progress,w=runtime.world;
 const defeated=p.defeatedTrainers.includes('NPC_GYM_04_JINSEONG');
 const completed=p.completedEvents.includes('S4_GYM_STORY');
 if(defeated!==completed)throw Error('GYM4_PARTIAL_ORIGINAL_VICTORY_RECEIPT_HOLD');
 if(defeated&&completed)return '05';
 const puzzle=w.puzzles.includes('gym-switch:4');
 return puzzle&&storyTrainerAvailable('NPC_GYM_04_JINSEONG',runtime,contract)?'05':'04';
}
