// r52: offline play for 생태몬스터: 거제도 (registered by pwa/beta05-offline.mjs, scope = the game page only).
// r108off (user: '모험 화면을 준비하고 있어요'에서 더 이상 진행 안 됨 — the second loading stall after a deploy): offline play is retired.
// Players are online at school, and a stored copy of a game file that no longer matches the new build can stop the game from
// starting. This worker now only cleans up: it removes every stored copy of the game files (geoje-play-*), unregisters itself
// and never answers a request, so every file comes from the network as usual. It never reads or writes the game save.
// (Off by default; the page registers it again only with ?sw=1, where it behaves the same way.)
const VERSION = new URL(self.location.href).searchParams.get('v') || '0';
const CACHE = 'geoje-play-retired-' + VERSION;
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('geoje-play-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => caches.delete(CACHE))
    .then(() => self.registration.unregister())
    .catch(() => {}));
});
// No fetch handler: requests go straight to the network (range requests for music and video included).
