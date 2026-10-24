import {SAVE_SLOTS} from '../compatibility/save-slots.mjs';
const KEY='geoje.monsters.ordinary-launch.v1';
export function takeLaunch(storage){const raw=storage.getItem(KEY);if(raw===null)return null;storage.removeItem(KEY);const value=JSON.parse(raw);if(!SAVE_SLOTS.includes(value.slot)||!['canonical-v1','legacy-work-v2'].includes(value.namespace))throw Error('잘못된 이어하기 요청');return value}
export function requestLaunch(storage,slot,namespace){if(!SAVE_SLOTS.includes(slot)||!['canonical-v1','legacy-work-v2'].includes(namespace))throw Error('지원하지 않는 저장');storage.setItem(KEY,JSON.stringify({slot,namespace}))}
export let launchRequest=null,launchError=null;
if(typeof sessionStorage!=='undefined')try{launchRequest=takeLaunch(sessionStorage)}catch(e){launchError=e.message}
export function failLaunch(message){launchError=message;launchRequest=null}
