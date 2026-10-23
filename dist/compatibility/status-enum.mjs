export const MAJOR_STATUSES=Object.freeze(['poison','bad_poison','burn','paralysis','sleep','freeze']);
export const VOLATILE_STATUSES=Object.freeze(['flinch']);
export const STATUS_ALIASES=Object.freeze({toxic:'bad_poison'});
export function normalizeStatus(value){
 if(value===null)return {value:null,resolved:true,kind:'major'};
 const normalized=STATUS_ALIASES[value]??value;
 if(MAJOR_STATUSES.includes(normalized))return {value:normalized,resolved:true,kind:'major',alias:normalized!==value};
 if(value==='slow')return {value:'legacy:slow',resolved:true,kind:'legacy',warning:'LEGACY_SLOW_IS_NOT_PARALYSIS'};
 if(VOLATILE_STATUSES.includes(value))return {value,resolved:true,kind:'volatile'};
 return {value,resolved:false,kind:'unknown',warning:'UNKNOWN_STATUS_PRESERVED'};
}
export function compareStatusSources(manifest,battle,save){
 const sources={manifest:manifest?.battle_system?.status_condition_contract?.major_statuses??[],battle:MAJOR_STATUSES.filter(k=>Object.hasOwn(battle?.battle_balance?.status_contract??{},k)),save:(save?.snapshot_schema?.creatures?.instances?.['<instanceId>']?.status??'').split('|').filter(x=>x!=='null'),current:['poison','slow']};
 return {runtime:MAJOR_STATUSES,aliases:STATUS_ALIASES,volatile:VOLATILE_STATUSES,legacy:{slow:{normalized:'legacy:slow',reason:'Current speed ×0.6 only; canonical paralysis speed ×0.5 and 25% immobilization.'}},sources:Object.fromEntries(Object.entries(sources).map(([key,values])=>{const normalized=values.map(v=>normalizeStatus(v).value);return [key,{original:values,normalized,missing:MAJOR_STATUSES.filter(v=>!normalized.includes(v)),duplicates:normalized.filter((v,i)=>normalized.indexOf(v)!==i),unknown:values.filter(v=>!normalizeStatus(v).resolved)}]}))};
}
