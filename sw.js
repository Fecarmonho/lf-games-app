// Service Worker — Vericta Sports
// Estrategia: network-first + atualizacao automatica ao abrir

self.addEventListener('install', () => {
  self.skipWaiting(); // ativa imediatamente sem esperar fechar o app
});

self.addEventListener('activate', (event) => {
  // Limpa todos os caches antigos
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first: sempre tenta buscar da rede
// Se offline, cai no cache
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Nunca intercepta Firebase — dados sempre em tempo real
  if (url.includes('firestore') ||
      url.includes('firebase') ||
      url.includes('googleapis') ||
      url.includes('identitytoolkit')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open('verictasports-cache').then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
