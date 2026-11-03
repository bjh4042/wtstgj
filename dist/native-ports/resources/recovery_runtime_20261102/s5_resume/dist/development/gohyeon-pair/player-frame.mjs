const BASE=Object.freeze({down:0,right:3,left:6,up:9});
// Existing twelve approved images; 120px/s movement × 100ms = prior twelve-pixel gait step.
export function selectPlayerFrame({facing,walking,elapsedMs}){if(!Object.hasOwn(BASE,facing)||typeof walking!=='boolean'||!Number.isFinite(elapsedMs)||elapsedMs<0)throw Error('PLAYER_FRAME_STATE_REQUIRED');return BASE[facing]+(walking?1+Math.floor(elapsedMs/100)%2:0)}
