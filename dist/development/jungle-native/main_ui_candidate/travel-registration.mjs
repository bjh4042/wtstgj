import{S3_KNOWN_WARPS as S3W}from'../../s3-progression-native/known-warps.mjs';
import{S2_AREA_WARPS as A2}from'../../s2-areas-native/warps.mjs';
import{S2_GYM_WARPS as E2}from'../../s2-gym2-native/registration.mjs';
import{S1_S2_WARPS as S2W}from'../../s1-s2-native/registration.mjs';
import{S1_GYM_WARPS as E1}from'../../s1-completion/warp-registration.mjs';
import{WETLAND_PAIR as W}from'../../hacheong-wetland/fixed-pair.mjs';
import{BRACKISH_PAIR as B}from'../../hacheong-brackish/fixed-pair.mjs';
import{STREAM_FIXED_REGISTRATION as T}from'../../yeoncho-stream/fixed-registration.mjs';
import{S1_FIXED_REGISTRATION as S}from'../../s1-local/fixed-registration.mjs';
import{PROLOGUE_FIXED_REGISTRATION as P}from'../../prologue-areas/fixed-registration.mjs';
import{dataRecord}from'../student_puzzle_candidate/progress-shape.mjs';
import{cellPosition}from'../../../world/definition.mjs';
export const ROWS=Object.freeze([...P,...S,...T,...B,...W,...E1,...S2W,...E2,...A2,...S3W]);
export const S2='world:hub:S2';
export const FOREST='world:area:P_ECO_CENTER_EDGE',COAST='world:area:P_JANGSEUNGPO_COAST',PROLOGUE='world:hub:PROLOGUE',S1='world:hub:S1',STREAM='world:area:S1_YEONCHO_STREAM',BRACKISH='world:area:S1_HACHEONG_BRACKISH',WETLAND='world:area:S1_HACHEONG_WETLAND';
export const isTravelMap=m=>[PROLOGUE,FOREST,COAST,S1,STREAM,BRACKISH,WETLAND,'world:gym:1','world:gym:2',S2,'world:area:S2_JANGMOK_COAST','world:area:S2_JANGMOK_BIRD_HILL','world:hub:S3','world:area:S3_AJU_GRASSLAND','world:area:S3_OKPO_FOREST_EDGE','world:gym:3'].includes(m);
export const poseKey=m=>m===FOREST?'forest':m===COAST?'coast':null;
export const inRows=(foot,row)=>row.approach.rows.some(([y,a,b])=>foot[1]===y&&foot[0]>=a&&foot[0]<b);
export function validTravelOrigin(id,runtime,definition){const r=ROWS.find(q=>q.pointId===id),last=runtime.world.routeLog.at(-1);if(!r||JSON.stringify(definition.points[id])!==JSON.stringify(r.sourceRow)||last?.warpId!==id||last.from!==r.mapId||last.to!==r.sourceRow.targetMapId)return false;const p=cellPosition(r.sourceRow.targetMapId,...r.sourceRow.target);return runtime.position.scene===p.scene&&runtime.position.x===p.x&&runtime.position.y===p.y}
export function validateAreaPoses(value,resources){const a=dataRecord(value,['forest','coast']);if(!a)return false;return ['forest','coast'].every(k=>a[k]===null||resources[k].validate(a[k])===true)}
export class TravelGuard{#released=false;#left=new Set;reset(){this.#released=false;this.#left.clear()}release(){this.#released=true}observe(map,foot){for(const r of ROWS)if(r.mapId===map&&!inRows(foot,r))this.#left.add(r.pointId)}readiness(r){return!this.#left.has(r.pointId)?'LEAVE_REQUIRED':!this.#released?'RELEASE_REQUIRED':'READY'}can(r){return this.readiness(r)==='READY'}press(r){if(!this.can(r))return false;this.#released=false;return true}}
