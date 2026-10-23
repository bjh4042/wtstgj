import {beforeConsumablesApproval} from './before-consumables-approval.mjs';
import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../../dist/compatibility/canonical-runtime-adapter.mjs';
import {SpeciesCatalogService} from '../../dist/species-catalog-service.mjs';
import {candidateAdapter} from '../../dist/economy/candidate.mjs';
import {CANDIDATE_ID} from '../../dist/economy/contract.mjs';
import {createEconomyGame} from '../../dist/economy/session.mjs';
import {ECONOMY_TEST_PLACEMENT as host} from '../../dist/economy/dev-placement.mjs';
import {StoryProgressionService} from '../../dist/story/progression-service.mjs';
import {createBattleRules,calculateDamage} from '../../dist/battle-v3/rules.mjs';
export {host};
const latest=await loadCanonicalRuntimeAdapter({readText:async f=>readFileSync(new URL('../../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
// STEP 8 historical policy snapshot; approval-on routing has its own focused suite.
export const raw=beforeConsumablesApproval(latest);delete raw.economyPolicy;delete raw.hiddenPlacementPolicy; // Preserve the pre-placement historical fixture.
export const adapter=candidateAdapter(raw,{mode:'test',policyId:CANDIDATE_ID});
export const catalog=new SpeciesCatalogService({namespace:'canonical',adapter});
export const ordinary=new SpeciesCatalogService({namespace:'canonical',adapter:raw});
export const rules=createBattleRules(adapter);
export function fresh(cat=catalog,starterId='SPECIES_001'){const s=createEconomyGame(cat,{mode:'test',starterId});s.position=structuredClone(host.hubs.TEST_CENTER.position);return s}
export const service=(runtime=fresh(),opts={})=>new StoryProgressionService({runtime,catalog,adapter,economyHost:host,...opts});
export const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
export function seeded(seed){let a=seed>>>0;return ()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296}}
export function bestMove(s){const mon=s.party[s.active],enemy=s.opponents[s.enemyActive];return mon.moves.filter(m=>m.pp>0).sort((a,b)=>score(b.id)-score(a.id))[0]?.id??'SYSTEM_STRUGGLE';function score(id){const move=rules.moves[id];return move.power?calculateDamage({rules,catalog,move,attacker:mon,defender:enemy}).damage:0}}
export function fight(b){for(let i=0;i<2000;i++){const s=b.snapshot();if(s.phase==='ended')return s;if(s.phase==='forced-switch')b.act({type:'switch',index:s.party.findIndex(m=>m.hp>0)});else b.act({type:'move',moveId:bestMove(s)})}throw Error('Battle turn bound')}
export async function partner(s=service()){for(const id of ['P00_HOME_START','P01_ECO_CENTER','P02_FIRST_PARTNER'])if(s.contract.events[id]&&s.eventAvailable(id))await s.runEvent(id);return s}
export async function walkTo(s,target){while(s.snapshot().position.x!==target.x||s.snapshot().position.y!==target.y){const p=s.snapshot().position;if(p.x!==target.x)p.x+=Math.sign(target.x-p.x)*Math.min(48,Math.abs(target.x-p.x));else p.y+=Math.sign(target.y-p.y)*Math.min(48,Math.abs(target.y-p.y));await s.economyCommand({type:'walk',position:p})}}
export async function research(s,prefix){await walkTo(s,host.hubs.TEST_CENTER.position);await s.economyCommand({type:'research-accept',transactionId:prefix+'-accept',hubId:'TEST_CENTER'});const round=s.snapshot().economy.quest.round;for(const [pointId,p] of Object.entries(host.points)){await walkTo(s,p.position);await s.economyCommand({type:'observe',transactionId:prefix+'-'+pointId,pointId,round})}await walkTo(s,host.hubs.TEST_CENTER.position);await s.economyCommand({type:'research-report',transactionId:prefix+'-report',hubId:'TEST_CENTER',round})}
