import{PROLOGUE_RIVAL as R}from'./fixed-registration.mjs';
const foot=f=>Array.isArray(f)&&f.length===2&&f.every(Number.isSafeInteger);
export const clearRival=f=>foot(f)&&(Math.abs(f[0]-R.npcFoot[0])>R.occupiedRadius[0]||Math.abs(f[1]-R.npcFoot[1])>R.occupiedRadius[1]);
// Original architectural safe mask is never rewritten; actor occupancy is separate.
export const rivalContact=(f,facing,safe)=>foot(f)&&facing===R.playerFacing&&safe(f)===true&&clearRival(f)&&f[0]>R.npcFoot[0]&&Math.abs(f[0]-R.contactCenter[0])+Math.abs(f[1]-R.contactCenter[1])<=R.radius;
