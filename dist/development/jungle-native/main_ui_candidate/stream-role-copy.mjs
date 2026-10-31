import{WETLAND_ROLES}from'../../hacheong-wetland/role-registration.mjs';
import{BRACKISH_ROLES}from'../../hacheong-brackish/npc-registration.mjs';
import{STREAM_ROLES}from'../../yeoncho-stream-roles/fixed-registration.mjs';
// Display-only labels for the already fixed native read regions, no authority.
export function streamRoleCue(state){if(!state||!Array.isArray(state.foot))return'';const r=[...STREAM_ROLES,...BRACKISH_ROLES,...WETLAND_ROLES].find(r=>state.scene===r.sceneId&&state.facing===r.requiredFacing&&r.rows.some(([y,a,b])=>state.foot[1]===y&&state.foot[0]>=a&&state.foot[0]<b));return r?r.kind==='event'?(r.pointId==='event:S1_TRAP_INVESTIGATION'?'그물 · 흔적 조사':'주민 · 제보 듣기'):['ROUTE_S1_04','ROUTE_S1_05'].includes(r.sourceRow?.trainerId)?'트레이너 · 필수 대결':'트레이너 · 선택 대결':''}
