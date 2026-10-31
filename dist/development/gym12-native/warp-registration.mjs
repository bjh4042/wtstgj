import{GYM12}from'./registration.mjs';
// Native gym-side mat only. Hub-side approaches belong to their independently registered providers.
export const GYM12_RETURNS=Object.freeze(Object.values(GYM12).map(g=>Object.freeze({pointId:`gym-entry:${g.gymNo}:return`,mapId:g.mapId,sourceRow:g.warpSourceRows.find(r=>r.id===`gym-entry:${g.gymNo}:return`),entry:g.entry,matApproach:Object.freeze([g.entry[0]-24,g.entry[1]-12,g.entry[0]+24,g.entry[1]+12])})));
export function inGym12ReturnMat(no,foot){const r=GYM12_RETURNS[no-1];if(!r||!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isSafeInteger))return false;const[x,y,X,Y]=r.matApproach;return foot[0]>=x&&foot[0]<=X&&foot[1]>=y&&foot[1]<=Y}
