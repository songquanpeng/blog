this.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open('cache-v1').then(function (cache) {
      return cache.addAll([
        '/',
        '/lightx.css',
        '/favicon.ico'
      ]);
    })
  );
});

this.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      }
      let request = event.request.clone();
      return fetch(request).then(function (httpRes) {
        if (!httpRes || httpRes.status !== 200) {
          return httpRes;
        }
        let responseClone = httpRes.clone();
        if (event.request.method !== 'POST' && event.request.method !== 'DELETE' && event.request.method !== 'PUT') {
          caches.open('cache-v1').then(function (cache) {
            cache.put(event.request, responseClone);
          });
        }
        return httpRes;
      });
    })
  );
});

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(function (cacheList) {
        return Promise.all(
          cacheList.map(function (cacheName) {
            if (cacheName !== 'cache-v1') {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});