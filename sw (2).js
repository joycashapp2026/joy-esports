self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
  e.respondWith(fetch(r).then(function(res){var c=res.clone();caches.open('joy-v1').then(function(x){x.put(r,c)});return res}).catch(function(){return caches.match(r)}));
});
