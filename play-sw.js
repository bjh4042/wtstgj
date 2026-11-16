// r52: offline play for 생태몬스터: 거제도 (registered by pwa/beta05-offline.mjs, scope = the game page only).
// Keeps a copy of each game file the first time the game loads it; later loads use the copy, so places already
// visited open without the internet. The page itself is always asked from the network first (so updates arrive),
// falling back to the copy, then to pwa/offline.html. Nothing here reads or writes the game save.
// The cache name follows ?v= (the game version): a new version starts a fresh cache and removes the old ones.
const VERSION = new URL(self.location.href).searchParams.get('v') || '0';
const CACHE = 'geoje-play-' + VERSION;
const BASE = '/wtstgj/';
const OFFLINE = BASE + 'pwa/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.add(OFFLINE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('geoje-play-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const keep = async (request, response) => {
  if (!response || response.status !== 200 || response.type !== 'basic') return;
  try { const c = await caches.open(CACHE); await c.put(request, response); } catch { /* storage full or refused: play on without the copy */ }
};
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE) || url.pathname === BASE + 'play-sw.js') return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try { const res = await fetch(req); if (res.ok) { const copy = res.clone(); event.waitUntil(keep(new Request(url.origin + url.pathname), copy)); } return res; }
      catch { const c = await caches.open(CACHE); return (await c.match(url.origin + url.pathname)) || (await c.match(OFFLINE)) || Response.error(); }
    })());
    return;
  }
  event.respondWith((async () => {
    const c = await caches.open(CACHE); const hit = await c.match(req); if (hit) return hit;
    const res = await fetch(req); event.waitUntil(keep(req, res.clone())); return res;
  })());
});
