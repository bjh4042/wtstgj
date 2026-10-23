import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {loadCanonicalAdapter} from '../dist/compatibility/canonical-adapter.mjs';
import {SPECIES_MAPPING,CANONICAL_IDENTITIES,mappingSummary} from '../dist/compatibility/species-identity.mjs';
import {NPC_ASSET_BINDINGS} from '../dist/compatibility/npc-assets.mjs';
const adapter=await loadCanonicalAdapter({readText:f=>readFile(new URL('../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
const summary={status:adapter.validation.ready?'PASS':'FAIL',activeCanonicalContent:false,mapping:mappingSummary(),...adapter.validation};
if(process.argv.includes('--report')){
 const dir=new URL('../docs/canonical-compatibility-v1/',import.meta.url);await mkdir(dir,{recursive:true});
 const files={'validation.json':summary,'species-mapping.json':{source:'work-v2_2026-09-11 → handoff-v3_final',runtimeNameLookup:false,summary:mappingSummary(),rows:SPECIES_MAPPING},'canonical-identities.json':CANONICAL_IDENTITIES,'status-enum.json':adapter.validation.statusReport,'npc-assets.json':NPC_ASSET_BINDINGS};
 for(const [name,value] of Object.entries(files))await writeFile(new URL(name,dir),JSON.stringify(value,null,2)+'\n');
 const columns=['currentId','currentNumber','currentName','canonicalId','canonicalNumber','canonicalName','status','safeIdentity','evolutionCompatible','evidence'];
 const csv=[columns,...SPECIES_MAPPING.map(row=>columns.map(k=>row[k]??''))].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
 await writeFile(new URL('species-mapping.csv',dir),'\uFEFF'+csv+'\r\n');
}
console.log(JSON.stringify({status:summary.status,count:summary.count,mapping:summary.mapping,errors:summary.errors.length,acquisitionConflicts:summary.authorityConflicts.filter(x=>x.severity==='CONFLICT').length,historicalChecksums:summary.integrity.historical.staleFingerprints.length},null,2));
if(!adapter.validation.ready)process.exitCode=1;
