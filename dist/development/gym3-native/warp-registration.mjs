import{GYM3}from'./registration.mjs';
const g=GYM3[3];export const GYM3_RETURN=Object.freeze({pointId:'gym-entry:3:return',mapId:g.mapId,sourceRow:g.warpSourceRows.find(r=>r.id==='gym-entry:3:return'),entry:g.entry,matApproach:Object.freeze([276,998,324,1022])});
export function inGym3ReturnMat(foot){if(!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isSafeInteger))return false;const[x,y,X,Y]=GYM3_RETURN.matApproach;return foot[0]>=x&&foot[0]<=X&&foot[1]>=y&&foot[1]<=Y}
