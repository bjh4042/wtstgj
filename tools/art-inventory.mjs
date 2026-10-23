import {ASSET_MANIFEST} from '../dist/asset-manifest.mjs';
import {validateSpeciesPNG} from './species-art-gate.mjs';
import {readdirSync,writeFileSync,mkdirSync,readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
export function artInventory(root='dist'){
 const paths=[];
 for(const prefix of ['assets/final','assets/approved-atlases']){const base=resolve(root,prefix);if(!existsSync(base))continue;const visit=dir=>{for(const item of readdirSync(dir,{withFileTypes:true})){const full=resolve(dir,item.name);if(item.isDirectory())visit(full);else if(item.name.endsWith('.png'))paths.push(prefix+'/'+full.slice(base.length+1));}};visit(base);}
 const rejected=[];const validated=paths.filter(path=>{const asset=Object.values(ASSET_MANIFEST).find(a=>a.speciesId&&a.final?.src===path);if(!asset)return true;try{validateSpeciesPNG(asset,readFileSync(resolve(root,path)));return true}catch(error){rejected.push({path,error:error.message});return false}});return {version:1,paths:validated,rejected};
}
export function saveArtInventory(){writeFileSync('dist/art-inventory.json',JSON.stringify(artInventory()));}
if(process.argv[1]?.endsWith('art-inventory.mjs'))saveArtInventory();
