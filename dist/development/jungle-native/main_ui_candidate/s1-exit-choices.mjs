import{S1_S2_WARPS as S2W}from'../../s1-s2-native/registration.mjs';
import{WETLAND_PAIR as W}from'../../hacheong-wetland/fixed-pair.mjs';
import{BRACKISH_PAIR as B}from'../../hacheong-brackish/fixed-pair.mjs';
import{S1_FIXED_REGISTRATION as S}from'../../s1-local/fixed-registration.mjs';
import{STREAM_FIXED_REGISTRATION as T,STREAM_RESIDENT_REGISTRATION as N}from'../../yeoncho-stream/fixed-registration.mjs';
import{dataRecord}from'../student_puzzle_candidate/progress-shape.mjs';
const rows=Object.freeze([S[1],T[0],B[0],W[0],S2W[0]]),keys=['sceneId','mapId','revision','imageSHA','maskSHA','foot','facing'];
// Read-only menu labels, never grants. Exact owner checks every selected action.
export function listS1ExitChoices(location){const p=dataRecord(location,keys);if(!p)return Object.freeze([]);const f=p.foot;if(!Array.isArray(f)||Object.getPrototypeOf(f)!==Array.prototype||Reflect.ownKeys(f).length!==3)return Object.freeze([]);const d=[0,1].map(i=>Object.getOwnPropertyDescriptor(f,String(i)));if(d.some(v=>!v?.enumerable||!Object.hasOwn(v,'value')||!Number.isSafeInteger(v.value)))return Object.freeze([]);const[x,y]=d.map(v=>v.value);return Object.freeze(rows.filter(r=>['sceneId','mapId','revision','imageSHA','maskSHA','facing'].every(k=>p[k]===r[k])&&r.approach.rows.some(([yy,a,b])=>y===yy&&x>=a&&x<b)).map(r=>Object.freeze({pointId:r.pointId,label:r===S2W[0]?r.sourceRow.label+'으로 가기':r===rows[0]?'장승포로 돌아가기':r===rows[1]?'연초 하천길로 가기':r===rows[2]?'하청 기수 해안 · 개발 연결':'하청 습지 · 개발 연결',enabled:true})))}

export function streamResidentCue(state){return state?.scene===N.sceneId&&state.facing===N.facing&&Array.isArray(state.foot)&&N.rows.some(([y,a,b])=>state.foot[1]===y&&state.foot[0]>=a&&state.foot[0]<b)?'주민 · 대화 연결 준비 중':''}
