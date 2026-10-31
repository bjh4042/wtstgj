import {spawnSync} from 'node:child_process';
import {copyFileSync,mkdirSync} from 'node:fs';
// Vite has publicDir disabled. Preserve the exact original offline resources;
// never replace the real PWA module with the QA wrapper or activate SW eagerly.
const build=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit'});
if(build.status!==0)process.exit(build.status??1);
// Audited shell imports use @vite-ignore; Vite does not emit these static dependencies.
mkdirSync('build/assets',{recursive:true});
for(const file of ['assets/mobile-viewport-CKi2spbv.js','assets/ui-preview-WMU7-lXW.css','nearby-safe-band.mjs','nearby-safe-band-ordinary.css'])copyFileSync('dist/'+file,'build/'+file);
mkdirSync('build/pwa',{recursive:true});
for(const file of ['offline.html','manifest.webmanifest','icon-192.png','icon-512.png'])copyFileSync('dist/pwa/'+file,'build/pwa/'+file);
const pwa=spawnSync(process.execPath,['scripts/build-pwa.mjs'],{stdio:'inherit'});
process.exit(pwa.status??1);
