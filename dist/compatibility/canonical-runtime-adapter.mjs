import {SPECIES_WEATHER_CONFIG} from '../encounter/species-weather-config.mjs';
import {HIDDEN_PLACEMENT_V1} from '../world/hidden-placement-v1.mjs';
import {CONSUMABLES_V1,applyConsumablesApproval} from '../economy/consumables-v1.mjs';
import {APPROVED_ECONOMY} from '../economy/approved-v1.mjs';
import {loadCanonicalAdapter,SOURCE_FILES,parseCSV,createCanonicalAdapter} from './canonical-adapter.mjs';
import {deepFreeze} from './codec.mjs';
import {AQUATIC_POLICY_A} from './aquatic-policy-a-v1.mjs';
import {effectiveAquaticSource} from './aquatic-policy.mjs';
import {readCanonicalSource} from './canonical-source-loader.mjs';
import {applyYejiTypeStatsApproval} from './yeji-preview-type-stats-v1.mjs';
import {applyYejiBaseExpApproval} from './yeji-base-exp-v1.mjs';
import {buildEnhancedEliteParties} from './enhanced-elite-party-v1.mjs';
import {applyElitePartyCorrection,ELITE_PARTY_CORRECTION_V1} from './elite-party-correction-v1.mjs';
import {ENHANCED_LEAGUE_V1} from '../story/enhanced-league.mjs';
import {buildHarinPostRematch} from './harin-post-rematch-v1.mjs';
/** Production entrypoint. Raw loadCanonicalAdapter remains the historical source/audit boundary. */
export async function loadCanonicalRuntimeAdapter({readText=readCanonicalSource,development=false}={}){
 const texts={};const original=await loadCanonicalAdapter({readText:async file=>texts[file]=await readText(file),development});
 if(!original.validation.ready)throw Error('Canonical source validation failed; policy not applied');
 const sources=Object.fromEntries(Object.entries(SOURCE_FILES).map(([key,file])=>[key,file.endsWith('.csv')?parseCSV(texts[file]):JSON.parse(texts[file])]));
 sources.encounter=effectiveAquaticSource(texts[SOURCE_FILES.encounter]);
 const effective=applyElitePartyCorrection(createCanonicalAdapter(sources,{integrity:original.validation.integrity}),texts[SOURCE_FILES.battle]);
 if(!effective.validation.ready||effective.encounterRuntime.validation.errors.length)throw Error('Effective aquatic data validation failed');
 const harinPostRematch=buildHarinPostRematch(effective,texts[SOURCE_FILES.battle]);
 return deepFreeze({...effective,hiddenPlacementPolicy:HIDDEN_PLACEMENT_V1,economyPolicy:APPROVED_ECONOMY,consumableApproval:CONSUMABLES_V1,harinPostRematch,enhancedLeague:ENHANCED_LEAGUE_V1,battleRuntime:{...effective.battleRuntime,items:applyConsumablesApproval(effective.battleRuntime.items,texts[SOURCE_FILES.battle]),previewOpponent:applyYejiBaseExpApproval(applyYejiTypeStatsApproval(effective.battleRuntime.previewOpponent,texts),texts[SOURCE_FILES.battle]),enhancedEliteParties:buildEnhancedEliteParties(effective,texts[SOURCE_FILES.battle],ELITE_PARTY_CORRECTION_V1)},encounterRuntime:{...effective.encounterRuntime,speciesWeatherWeights:SPECIES_WEATHER_CONFIG,policy:AQUATIC_POLICY_A,policyExcludedTables:AQUATIC_POLICY_A.excluded,sourceAudit:{version:original.encounterRuntime.sourceVersions.encounter,validation:original.encounterRuntime.validation}}});
}
