/// <reference lib="webworker" />

const CACHE_NAME = 'trackr-v3';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install event — pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately without waiting for old service worker to finish
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Notification click — focus the app window when user clicks a notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already an open window, focus it
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      // Otherwise open a new window
      return clients.openWindow('/');
    })
  );
});

// Push event — handle incoming push messages (future server push support)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Trackr';
    const options = {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.data || {},
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // If the push data is not JSON, show a generic notification
    const title = 'Trackr';
    const options = {
      body: event.data ? event.data.text() : 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Fetch event — route requests through appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // API requests — Network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets — Cache-first strategy
  event.respondWith(cacheFirst(request));
});

/**
 * Cache-first strategy:
 * Try the cache first, fall back to network.
 * Good for static assets that rarely change (images, fonts, CSS, JS bundles).
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const cached = await caches.match('/offline') || await caches.match('/');
      if (cached) return cached;
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network-first strategy:
 * Try the network first, fall back to cache.
 * Good for API requests where fresh data is preferred but cached data is acceptable offline.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
