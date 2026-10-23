import {approvedPublicAsset} from './tools/approved-public-assets.mjs';
import {artInventory,saveArtInventory} from './tools/art-inventory.mjs';
import {defineConfig} from 'vite';
import {cpSync,readFileSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
export default defineConfig({root:'dist',base:'/wtstgj/',publicDir:false,build:{outDir:'../build',emptyOutDir:true},server:{host:'0.0.0.0',allowedHosts:['terminal.local']},plugins:[{name:'art-inventory',buildStart(){saveArtInventory()},configureServer(server){server.middlewares.use('/art-inventory.json',(_req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(artInventory()))})}},
 {name:'responsive-qa-fixture',configureServer(server){for(const [route,file] of [['/__mobile-qa','mobile-preview.html'],['/__slice-qa','slice-preview.html'],['/__golden-qa','golden-preview.html'],['/__character-qa','character-npc-preview.html'],['/__pipeline-qa','pipeline-preview.html']])server.middlewares.use(route,(_req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(readFileSync(new URL('./tests/'+file,import.meta.url),'utf8'))});
   // Development-only explicit QA export, excluded from the public build.
   server.middlewares.use('/__pilot-evidence',(req,res)=>{
     const name=new URL(req.url,'http://terminal.local').searchParams.get('name');
     if(req.method!=='POST'||!name||!(/^[A-Za-z0-9_-]+\.(png|json)$/).test(name)){res.statusCode=400;res.end('Invalid evidence name');return}
     const chunks=[];let size=0;
     req.on('data',chunk=>{size+=chunk.length;if(size>20*1024*1024){res.statusCode=413;res.end('Evidence too large');req.destroy();return}chunks.push(chunk)});
     req.on('end',()=>{if(res.writableEnded)return;try{const body=Buffer.concat(chunks);if(!body.length)throw Error('Empty evidence');const directory=resolve('docs/character-npc-refinement-v1/evidence/pilot');mkdirSync(directory,{recursive:true,filter:path=>!path.includes('/approved-npc/')&&!path.includes('/approved-player/')&&!path.includes('/golden-field/player')&&!path.endsWith('/golden-field-v2/player/provenance.json')&&!path.endsWith('/golden-field/player/manifest.json')});writeFileSync(resolve(directory,name),body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:name,bytes:body.length}))}catch{res.statusCode=500;res.end('Evidence save failed')}});
   });
 }},
 {name:'copy-runtime-data',closeBundle(){cpSync(resolve('dist/art-inventory.json'),resolve('build/art-inventory.json'));for(const name of ['assets','data','pwa'])cpSync(resolve('dist',name),resolve('build',name),{recursive:true,filter:path=>{const normalized=path.replaceAll('\\','/');return !normalized.includes('/dist/assets/')||approvedPublicAsset(normalized,{directory:statSync(path).isDirectory()})}})}}
]});
