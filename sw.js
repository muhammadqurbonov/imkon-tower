// ═══════════════════════════════════════════════════════════
// sw.js — Service Worker барои Imkon Tower PWA
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'imkon-tower-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/property.html',
  '/style.css',
  '/app.js',
  '/common.js',
  '/map.js',
  '/firebase-config.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/og-image.jpg'
];

// ── Насб кардан — файлҳоро кэш кун ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Баъзе файлҳо кэш нашуданд:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Фаъол кардан — кэши кӯҳнаро нест кун ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Дархост — аввал кэш, баъд интернет ──
self.addEventListener('fetch', event => {
  // Firebase ва Cloudinary дархостҳоро кэш накун
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('cloudinary.com') ||
    event.request.url.includes('nominatim.openstreetmap.org') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Натиҷаи хубро кэш кун
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Офлайн — index.html-ро нишон деҳ
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
