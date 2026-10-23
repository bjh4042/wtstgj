import {presentationAudio} from './audio-hooks.mjs';
export const VFX_FAMILIES=Object.freeze(['BODY_HIT','BODY_CHARGE','WATER_PROJECTILE','WATER_WAVE','LEAF_SLASH','LEAF_BURST','ELECTRIC_BURST','ELECTRIC_BEAM','POISON_CLOUD','POISON_SPLASH','ROCK_IMPACT','ROCK_PROJECTILE','WIND_GUST','AIR_SLASH','GROUND_IMPACT','HEAL_GLOW','BUFF_AURA','DEBUFF_AURA','STATUS_EFFECT','SPECIAL_FLASH']);
export const VFX_CONTRACT=Object.freeze(Object.fromEntries(VFX_FAMILIES.map(family=>[family,Object.freeze({family,assetId:'vfx.'+family,variant:'default',timing:Object.freeze({duration:720,contact:.6}),moveSfxId:'move.'+family})])));
const STATUS=Object.freeze({MV002:'DEBUFF_AURA',MV003:'BUFF_AURA',MV004:'BUFF_AURA',MV005:'HEAL_GLOW',MV102:'BUFF_AURA',MV111:'DEBUFF_AURA',MV121:'BUFF_AURA',MV161:'BUFF_AURA',MV215:'HEAL_GLOW',MV217:'STATUS_EFFECT',MV218:'BUFF_AURA',MV219:'DEBUFF_AURA',MV222:'STATUS_EFFECT',MV228:'BUFF_AURA',MV235:'BUFF_AURA',MV241:'BUFF_AURA',MV248:'DEBUFF_AURA',MV307:'BUFF_AURA'});
function familyFor(m){if(STATUS[m.id])return STATUS[m.id];if(m.category==='status'||m.kind==='status')return 'STATUS_EFFECT';const special=(m.category??m.kind)==='special',strong=m.power>=80;return ({water:strong?'WATER_WAVE':'WATER_PROJECTILE',grass:special?'LEAF_BURST':'LEAF_SLASH',electric:special&&strong?'ELECTRIC_BEAM':'ELECTRIC_BURST',poison:special?'POISON_CLOUD':'POISON_SPLASH',rock:special?'ROCK_PROJECTILE':'ROCK_IMPACT',ground:'GROUND_IMPACT',flying:special?'WIND_GUST':'AIR_SLASH',normal:strong?'BODY_CHARGE':'BODY_HIT',fighting:'BODY_HIT',steel:'BODY_CHARGE',bug:'BODY_HIT'})[m.type]??'SPECIAL_FLASH'}
export function createMoveVfxCatalog(moves){
 const rows=Array.isArray(moves)?moves:Object.values(moves),seen=new Set(),catalog={};
 for(const m of rows){if(typeof m.id!=='string'||seen.has(m.id))throw Error('VFX move IDs must be unique');seen.add(m.id);const family=familyFor(m),base=VFX_CONTRACT[family];catalog[m.id]=Object.freeze({moveId:m.id,effects:Object.freeze([Object.freeze({...base,variant:m.type??'default',target:['HEAL_GLOW','BUFF_AURA'].includes(family)?'self':'opponent'})])})}
 return Object.freeze(catalog);
}
export function resolveMoveVfx(catalog,id){return catalog?.[id]??Object.freeze({moveId:id,effects:Object.freeze([VFX_CONTRACT.SPECIAL_FLASH]),fallback:true})}
export function resolveVfxFamily(family){return VFX_CONTRACT[family]??VFX_CONTRACT.SPECIAL_FLASH}
/** Pure presentation: no species records, HP, PP, battle rules, or sprite movement. */
export function drawVfxPlaceholder(c,family,elapsedMs,{from={x:70,y:160},to={x:330,y:70},variant='default',timing=null}={}){
 const cfg=resolveVfxFamily(family),duration=Number.isFinite(timing?.duration)&&timing.duration>0?timing.duration:cfg.timing.duration,t=Math.max(0,Math.min(1,elapsedMs/duration));
 if(elapsedMs<0||elapsedMs>=duration)return {done:elapsedMs>=duration,family:cfg.family};
 const f=cfg.family,self=['HEAL_GLOW','BUFF_AURA'].includes(f),end=self?from:to,travel=Math.min(1,t/.6),x=from.x+(end.x-from.x)*travel,y=from.y+(end.y-from.y)*travel;
 const color=f.startsWith('WATER')?'#87def4':f.startsWith('LEAF')||f==='HEAL_GLOW'?'#a3e08b':f.startsWith('ELECTRIC')?'#ffe877':f.startsWith('POISON')?'#c998df':f.startsWith('ROCK')||f.startsWith('GROUND')?'#b8aa90':'#e0e8ef';
 c.save();c.globalAlpha=Math.min(1,(1-t)*3);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=3;
 if(f.includes('SLASH')||f.includes('BEAM')||f==='WIND_GUST'){c.beginPath();c.moveTo(from.x,from.y);c.lineTo(x,y);c.stroke()}
 else if(f.includes('PROJECTILE')||f==='BODY_CHARGE'){c.fillRect(x-7,y-7,14,14)}
 else{const at=t<.6&&!self?{x,y}:end;for(let i=0;i<8;i++){const a=i*Math.PI/4+t*2,r=8+t*32;c.fillRect(at.x+Math.cos(a)*r-3,at.y+Math.sin(a)*r-3,6,6)}}
 c.restore();return {done:false,family:f,variant};
}
export const emitVfxAudio=(family,metadata={})=>presentationAudio.emit(resolveVfxFamily(family).moveSfxId,metadata);
// Retained legacy effects keep their artwork/timing and expose the same family/audio contract.
export const LEGACY_VFX_FAMILIES=Object.freeze({peck:'BODY_HIT',petal:'LEAF_BURST',leaf:'LEAF_SLASH',fire:'SPECIAL_FLASH',heal:'HEAL_GLOW',gust:'WIND_GUST',tackle:'BODY_CHARGE',water:'WATER_PROJECTILE',mud:'GROUND_IMPACT',wave:'WATER_WAVE',shell:'BODY_CHARGE',guard:'BUFF_AURA',crush:'ROCK_IMPACT',tide:'WATER_WAVE',wing:'AIR_SLASH',bite:'BODY_HIT',forest:'LEAF_BURST',poison:'POISON_CLOUD',mystic:'SPECIAL_FLASH',coral:'ROCK_PROJECTILE',struggle:'BODY_HIT'});
