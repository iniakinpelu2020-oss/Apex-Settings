/* Apex Settings - service worker.
   All paths are relative so this works at /apps/settings/ and as a standalone PWA. */
'use strict';

const VERSION = 'v1';
const CACHE = 'apex-settings-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './sections.css',
  './config.js',
  './ui.js',
  './section-apps.js',
  './section-ai.js',
  './section-storage.js',
  './section-appearance.js',
  './section-backup.js',
  './boot.js',
  './manifest.json',
  './icons/icon-192.png'
];

const IMAGE_RE = /\.(png|jpe?g|svg|webp|gif|ico)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Per-file so one bad request cannot abort the whole install.
    await Promise.all(SHELL.map(async (url) => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const res = await fetch(new Request(url, { cache: 'reload' }));
          if (res && res.ok) {
            await cache.put(url, res.clone());
            return;
          }
        } catch (err) {
          /* retry once, then give up on this file */
        }
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => {
      if (name.startsWith('apex-settings-') && name !== CACHE) return caches.delete(name);
      return Promise.resolve(false);
    }));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.postMessage({ type: 'APEX_SW_UPDATED', version: VERSION }));
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'VERSION' && event.source && event.source.postMessage) {
    event.source.postMessage({ type: 'VERSION', version: VERSION });
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(CACHE);
        return (await cache.match(request)) || (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Images: cache first, refresh in the background.
  if (IMAGE_RE.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      try {
        const res = await fetch(request);
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      } catch (err) {
        return hit || Response.error();
      }
    })());
    return;
  }

  // Code and data: network first so updates land immediately, cache for offline.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(request);
      if (fresh && fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    } catch (err) {
      const hit = await cache.match(request);
      if (hit) return hit;
      return new Response('Offline and not cached yet.', {
        status: 503,
        headers: { 'content-type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
