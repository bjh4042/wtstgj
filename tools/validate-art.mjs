import {inspectSpeciesArt,inspectCanonicalSpeciesArt} from './species-art-gate.mjs';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {ASSET_MANIFEST,HUMAN_ROSTER,HUMAN_FIELD_CONTRACT} from '../dist/asset-manifest.mjs';
import {artInventory,saveArtInventory} from './art-inventory.mjs';
const slots=Object.values(ASSET_MANIFEST).filter(a=>a.final),failures=[],present=[];
for(const a of slots){const path='dist/'+a.final.src;if(!existsSync(path))continue;try{const b=readFileSync(path);if(b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('PNG signature');const w=b.readUInt32BE(16),h=b.readUInt32BE(20);if(w!==a.final.width||h!==a.final.height)throw Error(`size ${w}x${h}, expected ${a.final.width}x${a.final.height}`);if(a.alpha&&![4,6].includes(b[25]))throw Error('RGBA/GA alpha required');present.push(a.id)}catch(e){failures.push({id:a.id,error:e.message})}}
const known=new Set(slots.map(a=>a.final.src)),unknown=artInventory().paths.filter(path=>!known.has(path));
const speciesReport=inspectSpeciesArt('dist',process.argv.filter(a=>a.startsWith('--species=')).map(a=>Number(a.split('=')[1])));
const canonicalReport=inspectCanonicalSpeciesArt('dist',process.argv.filter(a=>a.startsWith('--canonical-species=')).map(a=>a.split('=')[1]));
failures.push(...speciesReport.failures,...canonicalReport.failures);
const report={canonical:{species:canonicalReport.species,slots:canonicalReport.speciesSlots,present:canonicalReport.present.length,missing:canonicalReport.missing.length},registeredSlots:slots.length,humans:HUMAN_ROSTER.length,species:151,speciesSlots:604,present:present.length,missing:slots.length-present.length-failures.length,failures,unknown,speciesImport:{present:speciesReport.present.length,missing:speciesReport.missing.length}};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--write')){mkdirSync('docs/art-independent-pipeline-v1',{recursive:true});writeFileSync('docs/art-independent-pipeline-v1/asset-slots.json',JSON.stringify({version:1,humanContract:HUMAN_FIELD_CONTRACT,humans:HUMAN_ROSTER,slots:slots.map(a=>({id:a.id,kind:a.kind,path:a.final.src,width:a.final.width,height:a.final.height,alpha:!!a.alpha}))},null,2));for(const a of slots)mkdirSync('dist/'+a.final.src.slice(0,a.final.src.lastIndexOf('/')),{recursive:true});saveArtInventory();}
if(failures.length||unknown.length)process.exitCode=1;
