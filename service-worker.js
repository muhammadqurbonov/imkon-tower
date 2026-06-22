// ═══════════════════════════════════════════════════════════
// Service Worker — Imkon Tower PWA
// ═══════════════════════════════════════════════════════════
const CACHE = 'imkon-v1';
const ASSETS = [
  '/imkon-tower/',
  '/imkon-tower/index.html',
  '/imkon-tower/style.css',
  '/imkon-tower/app.js',
  '/imkon-tower/common.js',
  '/imkon-tower/map.js',
  '/imkon-tower/firebase-config.js',
  '/imkon-tower/manifest.json'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=> c.addAll(ASSETS)).then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  // Firestore ва Cloudinary-ро cache накун
  if(e.request.url.includes('firebase') ||
     e.request.url.includes('firestore') ||
     e.request.url.includes('cloudinary') ||
     e.request.url.includes('openstreetmap') ||
     e.request.url.includes('nominatim')){
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached=>{
      return cached || fetch(e.request).catch(()=> caches.match('/imkon-tower/'));
    })
  );
});
