// Historical 02e67b0 source/approval boundary, for the preserved 20 READY / 4 HOLD assertions.
// Never imported by the game; latest approval is exercised in elite-party-correction.test.mjs.
import {loadCanonicalAdapter,SOURCE_FILES,parseCSV,createCanonicalAdapter} from '../../dist/compatibility/canonical-adapter.mjs';
import {effectiveAquaticSource} from '../../dist/compatibility/aquatic-policy.mjs';
import {applyYejiTypeStatsApproval} from '../../dist/compatibility/yeji-preview-type-stats-v1.mjs';
import {buildEnhancedEliteParties,ENHANCED_ELITE_PARTY_V1} from '../../dist/compatibility/enhanced-elite-party-v1.mjs';
import {deepFreeze} from '../../dist/compatibility/codec.mjs';
export async function loadPreEliteApprovalAdapter({readText}){
 const texts={},original=await loadCanonicalAdapter({readText:async file=>texts[file]=await readText(file)});
 const sources=Object.fromEntries(Object.entries(SOURCE_FILES).map(([key,file])=>[key,file.endsWith('.csv')?parseCSV(texts[file]):JSON.parse(texts[file])]));
 sources.encounter=effectiveAquaticSource(texts[SOURCE_FILES.encounter]);
 const a=createCanonicalAdapter(sources,{integrity:original.validation.integrity});
 return deepFreeze({...a,battleRuntime:{...a.battleRuntime,previewOpponent:applyYejiTypeStatsApproval(a.battleRuntime.previewOpponent,texts),enhancedEliteParties:buildEnhancedEliteParties(a,texts[SOURCE_FILES.battle],ENHANCED_ELITE_PARTY_V1)}});
}
