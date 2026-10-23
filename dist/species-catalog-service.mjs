import {SPECIES,LEGACY_SPECIES,MOVES,moveKeys} from './model.mjs';
import {STARTER_IDS,STARTER_FAMILY_IDS} from './starter-config.mjs';
import {CANONICAL_IDENTITIES} from './compatibility/species-identity.mjs';
import {LEGACY_CONTENT,CANONICAL_CONTENT} from './compatibility/content-namespaces.mjs';
import {deepFreeze} from './compatibility/codec.mjs';
import {speciesSlot} from './species-asset-resolver.mjs';
/** Session-scoped, immutable catalog. This service does not install a global active catalog. */
export class SpeciesCatalogService {
 constructor({namespace,adapter=null}){
  if(!['canonical','work-v2'].includes(namespace))throw Error('Explicit species namespace required');
  const canonical=namespace==='canonical';
  if(canonical&&(!adapter?.validation?.ready||adapter.namespace!=='handoff-v3'))throw Error('Validated canonical adapter required');
  const records=deepFreeze(structuredClone(canonical?adapter.species:[...SPECIES,...LEGACY_SPECIES].map(s=>({...s,number:typeof s.id==='number'?s.id:null}))));
  const byId=new Map(records.map(s=>[s.id,s])),byNumber=new Map(records.filter(s=>s.number!==null).map(s=>[s.number,s]));
  if(records.some(s=>s.number!==null&&(!Number.isInteger(s.number)||s.number<1)))throw Error('Invalid display number');
  if(byId.size!==records.length||byNumber.size!==(canonical?151:151))throw Error('Duplicate species ID or display number');
  if(canonical&&(records.length!==151||CANONICAL_IDENTITIES.some(s=>!byId.has(s.id))))throw Error('Canonical catalog must cover all 151 stable IDs');
  const get=id=>{if(id&&typeof id==='object'){if(id.namespace!==namespace)return null;id=id.speciesId}return byId.get(id)??null};
  const need=id=>{const s=get(id);if(!s)throw Error('Species reference is not in this catalog');return s};
  const chain=id=>{const s=need(id);if(s.chainId!=null)return records.filter(r=>r.chainId===s.chainId).sort((a,b)=>a.stage-b.stage);
   let first=s;const seen=new Set();while(!seen.has(first.id)){seen.add(first.id);const parent=records.find(r=>r.evo===first.id);if(!parent)break;first=parent}
   const result=[];seen.clear();for(let next=first;next&&!seen.has(next.id);next=byId.get(next.evo)){seen.add(next.id);result.push(next)}return result;
  };
  const starterIds=canonical?adapter.starters?.ids:STARTER_IDS;
  const blockedIds=canonical?adapter.starters?.familyIds:STARTER_FAMILY_IDS;
  const randomIds=canonical?new Set(Object.values(adapter.encounters).flatMap(a=>Object.values(a.methods).flat().map(r=>r.id))):null;
  if(!starterIds||starterIds.length!==3||starterIds.some(id=>!byId.has(id))||!blockedIds)throw Error('Authoritative starter contract missing');
  Object.assign(this,{namespace,...(canonical?CANONICAL_CONTENT:LEGACY_CONTENT),size:records.length,records,starterIds:Object.freeze([...starterIds]),starterFamilyIds:Object.freeze([...blockedIds]),
   hiddenPlacementPolicy:canonical&&adapter.economyPolicy?.id!=='ECONOMY_CAPTURE_CANDIDATE_V1'?adapter.hiddenPlacementPolicy??null:null,
   storyContract:canonical?adapter.storyRuntime:null,
   encounterContract:canonical?adapter.encounterRuntime:null,
   itemContract:canonical?adapter.battleRuntime.items:null,
   economyPolicy:canonical?adapter.economyPolicy??null:null,
   getSpeciesById:get,
   getSpeciesByNumber:number=>Number.isInteger(number)?byNumber.get(number)??null:null,
   getEvolutionChain:id=>Object.freeze(chain(id)),
   getBaseStats:id=>need(id).stats,
   getTypes:id=>need(id).types,
   getGrowthData:id=>deepFreeze(canonical?{curve:adapter.battleContract.level_curve,baseExp:need(id).baseExp,evolutionId:need(id).evo,evolutionLevel:need(id).evoLevel}:{curve:'work-v2-level-budget',baseExp:null,evolutionId:need(id).evo??null,evolutionLevel:need(id).evoLevel??null,stone:need(id).stone??null}),
   getMoveset:(id,level=100)=>{if(!Number.isInteger(level)||level<1||level>100)throw Error('Invalid moveset level');const s=need(id);if(!canonical)return Object.freeze(moveKeys({id:s.id,level}).map(k=>deepFreeze({id:k,...MOVES[k]})));
    const learned=s.moves.filter(m=>m.level<=level).map(m=>m.id),latest=[...new Set(learned)].slice(-4);return Object.freeze(latest.map(k=>adapter.moves[k]));},
   getMoveById:id=>canonical?adapter.moves[id]??null:MOVES[id]??null,
   getTmById:id=>canonical?adapter.tms[id]??null:null,
   getDisplayName:id=>need(id).name,
   reference:id=>{const s=need(id);return Object.freeze({namespace,speciesId:s.id})},
   resolveAssetId:(id,slot)=>{const s=need(id);return speciesSlot({namespace,speciesId:s.id},slot)},
   resolveFollowerAsset:id=>this.resolveAssetId(id,'fieldFollower.atlas'),
   resolveBattleFront:id=>this.resolveAssetId(id,'battle.front'),
   resolveBattleBack:id=>this.resolveAssetId(id,'battle.back'),
   resolveIcon:id=>this.resolveAssetId(id,'ui.icon'),
   canRandomEncounter:id=>{const s=need(id);return !blockedIds.includes(s.id)&&(!canonical||(s.acquisition?.randomSpawnAllowed===true&&randomIds.has(s.id)))}
  });Object.freeze(this);
 }
}
