// ======================
// TRANSMISSION SERVICE WORKER
// Version: 2.1 (Glitch-core)
// Caching Strategy: Stale-While-Revalidate
// ======================

const CACHE_NAME = 'transmission-v2.1';
const OFFLINE_PAGE = '/offline.html';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifesto.html',
  '/frequencies.html',
  OFFLINE_PAGE,
  '/styles.css',
  '/app.js',
  '/assets/neue-machina.woff2',
  '/assets/glitch-noise.mp3',
  '/assets/icon-192.png'
];

// ======================
// INSTALL PHASE
// ======================
self.addEventListener('install', (event) => {
  console.log('📡 Installing Service Worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache core assets immediately
        return cache.addAll(CORE_ASSETS)
          .then(() => {
            console.log('✅ Core assets cached');
            return self.skipWaiting();
          })
          .catch((err) => {
            console.log('⚠️ Cache addAll failed:', err);
          });
      })
  );
});

// ======================
// ACTIVATION PHASE
// ======================
self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker activated');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Delete old caches
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      ).then(() => self.clients.claim());
    })
  );
});

// ======================
// FETCH STRATEGY
// ======================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and external resources
  if (request.method !== 'GET' || 
      !url.origin.startsWith(self.location.origin)) {
    return;
  }

  // Strategy: Network first, fallback to cache
  if (isHtmlRequest(request)) {
    event.respondWith(
      fetchWithTimeout(request, 2000) // 2 second timeout
        .then((response) => {
          // Update cache with fresh response
          cacheResponse(request, response.clone());
          return response;
        })
        .catch(() => {
          // Fallback 1: Check cache
          return caches.match(request)
            .then((response) => {
              // Fallback 2: Generic offline page
              return response || caches.match(OFFLINE_PAGE);
            });
        })
    );
  } else {
    // For assets: Cache first, network fallback
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request)
            .then((networkResponse) => {
              cacheResponse(request, networkResponse.clone());
              return networkResponse;
            })
            .catch(() => {
              if (request.destination === 'image') {
                return caches.match('/assets/placeholder-glitch.png');
              }
            });
        })
    );
  }
});

// ======================
// HELPER FUNCTIONS
// ======================
function isHtmlRequest(request) {
  return request.headers.get('accept').includes('text/html') || 
         request.url.endsWith('.html');
}

function fetchWithTimeout(request, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function cacheResponse(request, response) {
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    return cache.put(request, response);
  }
}

// ======================
// BACKGROUND SYNC
// ======================
self.addEventListener('sync', (event) => {
  if (event.tag === 'submit-signal') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(handleFailedSubmissions());
  }
});

async function handleFailedSubmissions() {
  // Implement your failed request retry logic here
  // Example: Retry posting user signals when back online
}

// ======================
// PERIODIC SYNC (For future updates)
// ======================
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-transmissions') {
    event.waitUntil(checkForNewContent());
  }
});

async function checkForNewContent() {
  // Check for new manifesto updates
}