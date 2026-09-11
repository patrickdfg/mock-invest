/**
 * 최소 서비스워커.
 *
 * 시세와 잔고는 항상 최신이어야 하므로 캐시를 쓰지 않는다(network-only).
 * 캐시는 오프라인일 때 "연결 없음" 안내를 띄우기 위한 앱 셸 용도로만 쓴다.
 * 설치 프롬프트(홈 화면에 추가)를 띄우려면 fetch 핸들러가 있어야 한다.
 */
const CACHE = 'mock-invest-v1';
const SHELL = ['/offline.html', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // 페이지 이동만 오프라인 폴백을 붙인다. API/시세는 건드리지 않는다.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
  }
});
