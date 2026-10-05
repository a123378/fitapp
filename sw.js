// 離線快取：先抓網路最新版（network-first），沒網路才用快取；API 請求不快取
const CACHE = 'fitapp-v20';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/config.js',
  './js/store.js',
  './js/exercises.js',
  './js/viyade.js',
  './js/jinshicheng.js',
  './js/creators.js',
  './js/coaching.js',
  './js/rrroy.js',
  './js/tanchengyi.js',
  './js/xunlianguaishou.js',
  './js/split.js',
  './js/nutrition.js',
  './js/gemini.js',
  './js/timer.js',
  './js/chart.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Gemini / Firebase / Google 服務一律走網路
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
