const CACHE='rancho-ruisenor-v18';
const CORE=['./','index.html','manifest.json','assets/logo-rancho.svg','assets/icon-192.png','assets/fonts/Fraunces.woff2'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(CORE.map(u=>c.add(u)))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
// Red primero (siempre la versión más nueva); si no hay conexión, usa la copia guardada.
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const k=r.clone();caches.open(CACHE).then(ch=>ch.put(e.request,k))}return r}).catch(()=>caches.match(e.request).then(c=>c||caches.match('index.html'))))});
