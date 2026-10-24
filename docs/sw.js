const CACHE='wtstgj-shell-6b0cb250f7266e6c';
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
});
