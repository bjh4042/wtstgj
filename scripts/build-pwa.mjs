import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hasher=createHash('sha256');
for(const file of ['index.html','pwa/offline.html','pwa/manifest.webmanifest','pwa/icon-192.png','pwa/icon-512.png'])hasher.update(readFileSync('build/'+file));
const version=hasher.digest('hex').slice(0,16);
// Deliberately cache only an offline explanation and icon/manifest. No game data,
// saves, remote weather, private URLs or gigabytes of artwork are precached.
const sw=`const CACHE='wtstgj-shell-${version}';
const BASE=new URL('./',self.location.href);
const urls=['pwa/offline.html','pwa/icon-192.png','pwa/icon-512.png','pwa/manifest.webmanifest'].map(p=>new URL(p,BASE).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls))));
// Do not skipWaiting or claim active sessions: updates activate after old tabs close.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('wtstgj-shell-')&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(async()=>await(await caches.open(CACHE)).match(new URL('pwa/offline.html',BASE).href)));
 else if(urls.includes(url.href))event.respondWith(fetch(event.request).catch(async()=>await(await caches.open(CACHE)).match(event.request)));
});\n`;
writeFileSync('build/sw.js',sw);
console.log('PWA offline shell version',version,'(4 small resources; no offline game claim)');
