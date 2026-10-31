// Native-coordinate review only. Derived from v4 motion contract, not main controller.
export const createDoorState=()=>({phase:'closed',progress:0});
export function toggleDoor(s,occupied=false){if(['opening','closing'].includes(s.phase))return 'BUSY';if(s.phase==='open'&&occupied)return 'OCCUPIED';s.phase=s.phase==='closed'?'opening':'closing';return 'OK';}
export function tickDoor(s,ms,occupied=false){if(s.phase==='closing'&&occupied){s.phase='open';s.progress=1;return;}const d=Math.min(100,Math.max(0,ms))/450;if(s.phase==='opening'){s.progress=Math.min(1,s.progress+d);if(s.progress===1)s.phase='open';}else if(s.phase==='closing'){s.progress=Math.max(0,s.progress-d);if(s.progress===0)s.phase='closed';}}
export const doorBlocks=s=>s.progress<1;
