import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
const TARGET='dist/native-ports/resources/recovery_runtime_20261102/s5_resume/dist/development/nambu-hub-native/source/G7-Open-visible-stair-barrier-candidate.png';
const SOURCE='asset-sources/nambu-open-r1',BYTES=21968609,SHA='72751f4ffa8e719a3a500d59dda6ae777ebb33022120563e237ac354e61a55b9',CAP=8*1024*1024;
const hash=b=>createHash('sha256').update(b).digest('hex');
const defaultRoot=fileURLToPath(new URL('../',import.meta.url));
async function safePath(root,relative,{directories=false}={}){
 if(typeof relative!=='string'||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('ASSET_PATH');
 const segments=relative.split('/');let current=root;
 for(let i=0;i<segments.length;i++){
  current=path.join(current,segments[i]);let st;
  try{st=await fs.lstat(current)}catch(e){if(e.code!=='ENOENT')throw e;if(directories&&i<segments.length-1){try{await fs.mkdir(current)}catch(m){if(m.code!=='EEXIST')throw m}st=await fs.lstat(current)}else if(i===segments.length-1)return current;else throw e}
  if(st.isSymbolicLink()||(i<segments.length-1&&!st.isDirectory()))throw Error('ASSET_PATH_NOT_REGULAR');
  if(await fs.realpath(current)!==current)throw Error('ASSET_PATH_OUTSIDE_ROOT');
 }
 return current;
}
async function readRegular(file,expected,max=expected){
 const st=await fs.lstat(file);if(!st.isFile()||st.isSymbolicLink()||st.size!==expected||st.size>max)throw Error('ASSET_FILE_SIZE_OR_TYPE');
 const data=await fs.readFile(file);if(data.length!==expected)throw Error('ASSET_READ_SIZE');return data;
}
async function prepareOne(root,{TARGET,SOURCE,BYTES,SHA,COUNT}){
 root=await fs.realpath(root);
 const manifestFile=await safePath(root,SOURCE+'/manifest.json'),stat=await fs.lstat(manifestFile);
 if(!stat.isFile()||stat.size>65536)throw Error('ASSET_MANIFEST_SIZE');
 const m=JSON.parse(await fs.readFile(manifestFile,'utf8'));
 if(m.format!=='EXACT_ASSET_SOURCE_CHUNKS_V1'||m.target!==TARGET||m.bytes!==BYTES||m.sha256!==SHA||m.chunkMaxBytes!==CAP||!Array.isArray(m.chunks)||m.chunks.length!==COUNT)throw Error('ASSET_MANIFEST');
 const parts=[];let end=0;
 for(let i=0;i<m.chunks.length;i++){
  const c=m.chunks[i];if(c.file!==`chunk-${String(i+1).padStart(2,'0')}.bin`||!Number.isSafeInteger(c.offset)||c.offset!==end||!Number.isSafeInteger(c.bytes)||c.bytes<=0||c.bytes>CAP||!Number.isSafeInteger(end+c.bytes)||end+c.bytes>BYTES||typeof c.sha256!=='string'||!/^[a-f0-9]{64}$/.test(c.sha256))throw Error('ASSET_CHUNK_METADATA');
  const data=await readRegular(await safePath(root,SOURCE+'/'+c.file),c.bytes,CAP);if(hash(data)!==c.sha256)throw Error('ASSET_CHUNK_HASH');parts.push(data);end+=c.bytes;
 }
 if(end!==BYTES)throw Error('ASSET_TOTAL_SIZE');const combined=Buffer.concat(parts,BYTES);if(hash(combined)!==SHA)throw Error('ASSET_FULL_HASH');
 const target=await safePath(root,TARGET,{directories:true});
 async function exactExisting(){try{const bytes=await readRegular(target,BYTES);if(hash(bytes)!==SHA)throw Error('ASSET_EXISTING_CONFLICT');return true}catch(e){if(e.code==='ENOENT')return false;throw Error('ASSET_EXISTING_CONFLICT',{cause:e})}}
 if(await exactExisting())return{status:'REUSED_EXACT',target:TARGET,bytes:BYTES,sha256:SHA};
 const temporary=path.join(path.dirname(target),'.prepare-assets-'+randomUUID()+'.tmp');let created=false;
 try{
  const handle=await fs.open(temporary,'wx',0o644);created=true;try{await handle.writeFile(combined);await handle.sync()}finally{await handle.close()}
  // Hard-link publication is atomic and refuses an existing destination on Windows/POSIX.
  // No rename-overwrite, direct partial destination, or conflict-repair fallback.
  try{await fs.link(temporary,target)}catch(e){if(e.code==='EEXIST'&&await exactExisting())return{status:'REUSED_EXACT_CONCURRENT',target:TARGET,bytes:BYTES,sha256:SHA};throw e}
  return{status:'RECONSTRUCTED_EXACT',target:TARGET,bytes:BYTES,sha256:SHA};
 }finally{if(created)await fs.unlink(temporary)}
}
export async function prepareAssets(root=defaultRoot){
 const configs=[{TARGET,SOURCE,BYTES,SHA,COUNT:3},{TARGET:'dist/native-ports/resources/map_simulation_20261102/s8_hub_r2/assets/CLOSED.png',SOURCE:'asset-sources/s8-closed-r1',BYTES:13270263,SHA:'f602c93bdee4c4bd7d08f87d9951b34515d9ffbb34769aea28a4331ffb8b5e06',COUNT:2}];
 const assets=[];for(const config of configs)assets.push(await prepareOne(root,config));return{format:'EXACT_ASSET_SOURCE_CHUNKS_V1',assets};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await prepareAssets()))}catch(e){console.error('Asset preparation stopped without overwriting existing files:',e.message);process.exitCode=1}
}
