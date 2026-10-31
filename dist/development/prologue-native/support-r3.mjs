import{loadP0LightingAdapter}from'./lighting-adapter.mjs';
import{PROLOGUE_RIVAL as RIVAL}from'../prologue-rival/fixed-registration.mjs';
import{clearRival}from'../prologue-rival/geometry.mjs';
import{loadPrologueVisualLayer}from'./visual-layer.mjs';
import{PROLOGUE_SCENE as R,PROLOGUE_PREVIOUS_SCENE as OLD}from'./scene.mjs';
import{loadSelectedPlayerFrames}from'../gohyeon-pair/player_frames/load-player-frames.mjs';
import{selectPlayerFrame}from'../gohyeon-pair/player-frame.mjs';
const moduleURL=import.meta.url,keys=['sceneId','mapId','revision','imageSHA','maskSHA','foot','facing'];
const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
const footValue=f=>{if(!Array.isArray(f)||Object.getPrototypeOf(f)!==Array.prototype||Reflect.ownKeys(f).length!==3)return null;const d=[0,1].map(i=>Object.getOwnPropertyDescriptor(f,String(i)));return d.every(x=>x&&Object.hasOwn(x,'value')&&x.enumerable&&Number.isSafeInteger(x.value))?d.map(x=>x.value):null};
import{verifySupportClosure}from'../jungle-native/main_ui_candidate/verified-support-closure-r3.mjs';
import{JUNCTION}from'./junction-registration.mjs';
export async function preparePrologueSupport(options={}){let disposed=false;const get=await verifySupportClosure('prologue',{...options,retain:u=>u.pathname.endsWith('.u8')}),mask=get(new URL('./assets/main-junction-r3.safe.u8',moduleURL)),oldMask=get(new URL('./assets/main.safe.u8',moduleURL));
 const safe=foot=>{const f=footValue(foot);return!disposed&&!!f&&f[0]>=0&&f[1]>=0&&f[0]<R.width&&f[1]<R.height&&mask[f[1]*R.width+f[0]]===1&&clearRival(f)};
 const validate=n=>{if(disposed)return'PROLOGUE_PRESENTATION_DISPOSED';if(!n||Object.getPrototypeOf(n)!==Object.prototype||Reflect.ownKeys(n).length!==keys.length||keys.some(k=>{const d=Object.getOwnPropertyDescriptor(n,k);return!d||!Object.hasOwn(d,'value')||!d.enumerable}))return'INVALID_PROLOGUE_LOCATION';if(n.sceneId!==R.sceneId||n.mapId!==R.mapId||n.revision!==R.revision||n.imageSHA!==R.imageSHA||n.maskSHA!==R.maskSHA)return'PROLOGUE_LOCATION_PIN_MISMATCH';if(!['up','down','left','right'].includes(n.facing)||!safe(n.foot))return'UNSUPPORTED_PROLOGUE_POSE';return true};
 const validatePrevious=n=>{if(disposed)return'PROLOGUE_PRESENTATION_DISPOSED';if(!n||Object.getPrototypeOf(n)!==Object.prototype||Reflect.ownKeys(n).length!==keys.length||keys.some(k=>{const d=Object.getOwnPropertyDescriptor(n,k);return!d||!Object.hasOwn(d,'value')||!d.enumerable}))return'INVALID_PREVIOUS_PROLOGUE_LOCATION';if(['sceneId','mapId','revision','imageSHA','maskSHA'].some(k=>n[k]!==OLD[k]))return'PREVIOUS_PROLOGUE_PIN_MISMATCH';const f=footValue(n.foot);return f&&f[0]>=0&&f[1]>=0&&f[0]<R.width&&f[1]<R.height&&oldMask[f[1]*R.width+f[0]]===1&&['up','down','left','right'].includes(n.facing)?true:'PREVIOUS_PROLOGUE_POSE_UNSUPPORTED'};
 const migratePrevious=n=>{if(validatePrevious(n)!==true)throw Error('PREVIOUS_PROLOGUE_LOCATION_INVALID');if(!safe(n.foot))throw Error('PREVIOUS_PROLOGUE_SAME_FOOT_HOLD');return Object.freeze({sceneId:R.sceneId,mapId:R.mapId,revision:R.revision,imageSHA:R.imageSHA,maskSHA:R.maskSHA,foot:Object.freeze([...n.foot]),facing:n.facing})};
return Object.freeze({get pinsVerified(){return !disposed},safe,validate,validatePrevious,migratePrevious,lampRegistration:JUNCTION,dispose(){disposed=true}});}
