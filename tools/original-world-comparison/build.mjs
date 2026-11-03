import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath}from'node:url';import{createHash}from'node:crypto';import{constants}from'node:fs';
const here=fileURLToPath(new URL('.',import.meta.url)),repo=path.resolve(process.argv[2]??path.join(here,'../..')),output=path.resolve(process.argv[3]??path.join(here,'build'));
async function realDirectory(dir){const resolved=path.resolve(dir);if(await fs.realpath(resolved)!==resolved||(await fs.lstat(resolved)).isSymbolicLink()||!(await fs.stat(resolved)).isDirectory())throw Error('Directory symlink or invalid root');return resolved}
const roots={source:await realDirectory(here),repository:await realDirectory(repo)};await realDirectory(path.dirname(output));
function segments(rel){if(typeof rel!=='string'||path.isAbsolute(rel)||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Invalid manifest path');return rel.split('/')}
async function regular(root,rel){const parts=segments(rel);let current=root;for(let i=0;i<parts.length;i++){current=path.join(current,parts[i]);const s=await fs.lstat(current);if(s.isSymbolicLink()||(i<parts.length-1?!s.isDirectory():!s.isFile()))throw Error('Nonregular source path');}if(await fs.realpath(current)!==current)throw Error('Source path escaped');return current}
const manifestFile=await regular(roots.source,'COPY_MANIFEST.json'),manifest=JSON.parse(await fs.readFile(manifestFile,'utf8'));if(manifest.format!=='PORTABLE_DEV_EXACT_COPY_V3'||!Array.isArray(manifest.files))throw Error('Manifest format');
const hash=b=>createHash('sha256').update(b).digest('hex');
async function readPinned(root,source,bytes,sha256){
 if(!Number.isSafeInteger(bytes)||bytes<0||typeof sha256!=='string'||!/^[a-f0-9]{64}$/.test(sha256))throw Error('Source metadata');
 const input=await regular(root,source),handle=await fs.open(input,constants.O_RDONLY|constants.O_NOFOLLOW);let b;
 try{const st=await handle.stat();if(!st.isFile()||st.size!==bytes)throw Error('Nonregular input or size');b=await handle.readFile();await regular(root,source)}finally{await handle.close()}
 if(b.length!==bytes||hash(b)!==sha256)throw Error('Source SHA mismatch '+source);return b;
}
const bm=manifest.bundle;if(!bm||!Number.isSafeInteger(bm.bytes)||bm.bytes<1||bm.bytes>1024*1024)throw Error('Bundle metadata');
const bundleBytes=await readPinned(roots.source,bm.source,bm.bytes,bm.sha256),bundleText=new TextDecoder('utf-8',{fatal:true}).decode(bundleBytes);
if(!Buffer.from(bundleText,'utf8').equals(bundleBytes))throw Error('Bundle noncanonical UTF8');
const bundle=JSON.parse(bundleText);if(bundle.format!=='PORTABLE_UTF8_SOURCE_BUNDLE_V1'||!Array.isArray(bundle.entries)||bundle.entries.length>512)throw Error('Bundle format');
const sources=new Map(),usedSources=new Set();for(const entry of bundle.entries){
 if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).sort().join(',')!=='content,path'||typeof entry.content!=='string')throw Error('Bundle entry');
 segments(entry.path);if(sources.has(entry.path))throw Error('Duplicate bundle entry');const raw=Buffer.from(entry.content,'utf8');if(raw.toString('utf8')!==entry.content||raw.length>1024*1024)throw Error('Bundle source UTF8 or cap');sources.set(entry.path,raw);
}
const verified=[],seen=new Set();for(const f of manifest.files){
 segments(f.destination);if(seen.has(f.destination))throw Error('Duplicate output');seen.add(f.destination);
 if(!Number.isSafeInteger(f.bytes)||f.bytes<0||typeof f.sha256!=='string'||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('Output metadata');
 let b;
 if(f.kind==='source-bundle'){
  segments(f.entry);if(!sources.has(f.entry)||usedSources.has(f.entry))throw Error('Missing or reused bundle entry');usedSources.add(f.entry);b=sources.get(f.entry);
 }else if(f.kind==='new-base64'){
  if(!Array.isArray(f.chunks)||f.chunks.length<1||f.chunks.length>16)throw Error('Chunk count');
  const parts=[];let offset=0;
  for(const c of f.chunks){
   if(!Number.isSafeInteger(c.bytes)||c.bytes<1||c.bytes>4*1024*1024||c.offset!==offset||c.encodedBytes!==4*Math.ceil(c.bytes/3)||offset+c.bytes>f.bytes)throw Error('Chunk metadata');
   const text=await readPinned(roots.source,c.source,c.encodedBytes,c.encodedSHA256);
   for(const c of text)if(!((c>=65&&c<=90)||(c>=97&&c<=122)||(c>=48&&c<=57)||c===43||c===47||c===61))throw Error('Base64 syntax');
   const ascii=text.toString('ascii');
   const raw=Buffer.from(ascii,'base64');if(raw.toString('base64')!==text.toString('utf8')||raw.length!==c.bytes||hash(raw)!==c.sha256)throw Error('Base64 canonical bytes or hash');
   parts.push(raw);offset+=raw.length;
  }
  if(offset!==f.bytes)throw Error('Chunk total');b=Buffer.concat(parts,offset);
 }else{
  if(!['new-text','repository','reconstructed-repository'].includes(f.kind))throw Error('Source kind');
  b=await readPinned(f.kind==='new-text'?roots.source:roots.repository,f.source,f.bytes,f.sha256);
 }
 if(b.length!==f.bytes||hash(b)!==f.sha256)throw Error('Output SHA mismatch');verified.push([f,b]);
}
if(usedSources.size!==sources.size)throw Error('Unused bundle source');
// Atomic exclusive directory creation, never merge into an existing output.
await realDirectory(path.dirname(output));await fs.mkdir(output);if(await fs.realpath(output)!==output)throw Error('Output path escaped');
for(const[f,b]of verified){const parts=segments(f.destination);let dir=output;for(const part of parts.slice(0,-1)){dir=path.join(dir,part);try{await fs.mkdir(dir)}catch(e){if(e.code!=='EEXIST')throw e}await realDirectory(dir)}const to=path.join(dir,parts.at(-1));await fs.writeFile(to,b,{flag:'wx'})}console.log(JSON.stringify({status:'EXACT_COPY_PASS',files:verified.length,bytes:verified.reduce((n,[f])=>n+f.bytes,0)}));
