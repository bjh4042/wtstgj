import{storyTrainerAvailable}from'../../../story/availability-readiness.mjs';
// Selected NEW visual projection, not a new story flag/condition or authority.
export function gym5VisualState(runtime,contract){const interactions=runtime.world.interactions,p=runtime.progress;if(!interactions.includes('puzzle:5:step:1'))return 0;if(!interactions.includes('puzzle:5')||!runtime.world.puzzles.includes('gym-switch:5'))return 1;return p.defeatedTrainers.includes('NPC_GYM_05_MYEONGJU')||storyTrainerAvailable('NPC_GYM_05_MYEONGJU',runtime,contract)?3:2}
