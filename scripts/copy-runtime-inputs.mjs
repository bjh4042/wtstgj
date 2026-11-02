import {lstatSync,readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import path, {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {approvedPublicAsset} from '../tools/approved-public-assets.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function relative(p){if(typeof p!=='string'||!p||p.includes('\\')||p.includes('\0')||p.startsWith('/')||p.split('/').some(x=>!x||x==='.'||x==='..')||p.includes(':'))throw Error('Unsafe relative path: '+p);return p;}
export function pathAncestors(p,pathApi=path){
 p=pathApi.resolve(p);let cur=pathApi.parse(p).root;const parts=[cur];
 for(const part of p.slice(cur.length).split(pathApi.sep).filter(Boolean)){cur=pathApi.join(cur,part);parts.push(cur);}return parts;
}
export function containsPath(parent,child,pathApi=path){
 const rel=pathApi.relative(pathApi.resolve(parent),pathApi.resolve(child));
 return rel===''||(!pathApi.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+pathApi.sep));
}
export function unsafeOutputOverlap(source,output,pathApi=path){
 return containsPath(output,source,pathApi)||containsPath(pathApi.join(source,'dist'),output,pathApi);
}
function safe(p){p=resolve(p);for(const cur of pathAncestors(p)){try{if(lstatSync(cur).isSymbolicLink())throw Error('Symlink refused: '+cur);}catch(e){if(e.code!=='ENOENT')throw e;}}return p;}
function bytes(p,row){const b=readFileSync(p);if(b.length!==row.bytes||sha(b)!==row.sha256)throw Error('Hash/size mismatch: '+p);return b;}
export function copyRuntimeInputs({sourceRoot,outputRoot,manifest,apply=false}){
 sourceRoot=safe(sourceRoot);outputRoot=safe(outputRoot);
 if(unsafeOutputOverlap(sourceRoot,outputRoot))throw Error('Unsafe output overlap');
 if(manifest.schema!==1||!Array.isArray(manifest.rows)||!manifest.snapshot||!manifest.selection)throw Error('Invalid manifest');
 // Snapshot is intentionally strict: an r2 source must select a separately reviewed r2 manifest.
 for(const row of manifest.snapshot){relative(row.path);bytes(safe(join(sourceRoot,row.path)),row);}
 const seen=new Set(),plan=[];
 for(const row of manifest.rows){
  relative(row.source);relative(row.destination);
  if(!row.source.startsWith('dist/')||row.destination!==row.source.slice(5))throw Error('Noncanonical mapping');
  if(/(^|\/)(provenance|source-verification|source-report|SOURCE_PROVENANCE)\.json$/i.test(row.destination)||/(^|\/)(private|development)(\/|$)/i.test(row.destination))throw Error('Private/development metadata refused');
  if(row.kind==='approved-media'){if(!approvedPublicAsset(row.source))throw Error('Public boundary refused');}
  else if(!['runtime-data','shell-snapshot','pwa'].includes(row.kind)||!manifest.explicitExceptions?.includes(row.source))throw Error('Unapproved exception');
  if(seen.has(row.destination))throw Error('Duplicate destination');seen.add(row.destination);
  const src=safe(join(sourceRoot,row.source)),dest=safe(join(outputRoot,row.destination));
  bytes(src,row);let reuse=false;if(existsSync(dest)){bytes(dest,row);reuse=true;}
  plan.push({row,src,dest,reuse});
 }
 // All paths, inputs and existing outputs validated before any writes.
 if(apply)for(const {row,src,dest,reuse} of plan){if(reuse)continue;safe(dest);const b=bytes(src,row);mkdirSync(dirname(dest),{recursive:true});safe(dest);writeFileSync(dest,b,{flag:'wx'});bytes(dest,row);}
 return {selection:manifest.selection,mode:apply?'apply':'dry-run',files:plan.length,bytes:plan.reduce((n,p)=>n+p.row.bytes,0),reuse:plan.filter(p=>p.reuse).length,writes:apply?plan.filter(p=>!p.reuse).length:0,buildVerified:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),get=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1]};
 const allowed=new Set(['--source','--out','--manifest','--apply']);for(let i=0;i<args.length;i++){if(!allowed.has(args[i]))throw Error('Unknown argument');if(args[i]!=='--apply')i++;}
 const sourceRoot=get('--source')??process.cwd(),outputRoot=get('--out')??join(sourceRoot,'build');
 const manifest=JSON.parse(readFileSync(get('--manifest')??new URL('./runtime-inputs-manifest.json',import.meta.url)));
 console.log(JSON.stringify(copyRuntimeInputs({sourceRoot,outputRoot,manifest,apply:args.includes('--apply')}),null,2));
}
