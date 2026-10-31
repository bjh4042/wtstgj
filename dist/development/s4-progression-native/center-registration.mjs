import{CENTER_CONTRACT as C}from'../center-interior/fixed-contract.mjs';
import{SELECTED_HEAL_ROWS}from'../../world/selected-heal-authority.mjs';
export{C as S4_CENTER};
export const S4_CENTER_SOURCE=SELECTED_HEAL_ROWS['heal:S4'].sourceRow;
export const S4_CENTER_RECOVERY_ORIGIN='original-s4-center-recovery';
export const S4_CENTER_MODE='native-s4-center';
export const S4_CENTER_SCHEMA='S5_JUNGLE_PAIR_SCENE_STATE_V24_S4_CENTER';
export function centerExteriorApproach(p,support){try{return support?.validate(p)===true&&p.mapId==='world:hub:S4'&&p.facing==='up'&&SELECTED_HEAL_ROWS['heal:S4'].approachRows[p.state]?.some(([y,a,b])=>p.foot[1]===y&&p.foot[0]>=a&&p.foot[0]<b)===true}catch{return false}}
export function centerCounter(p){return p?.facing==='up'&&C.counter.approachRows.some(([y,a,b])=>p.foot[1]===y&&p.foot[0]>=a&&p.foot[0]<b)}
export function centerReturnRegion(p){return !!p&&Math.abs(p.foot[0]-C.return.anchor[0])+Math.abs(p.foot[1]-C.return.anchor[1])<=C.return.range}
