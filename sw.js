self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
  e.respondWith(fetch(r).then(function(res){var c=res.clone();caches.open('joy-v1').then(function(x){x.put(r,c)});return res}).catch(function(){return caches.match(r)}));
});
self.addEventListener('push',function(e){
  var d={};try{d=e.data.json()}catch(x){try{d={title:'Joy Esports',body:e.data.text()}}catch(y){}}
  var n=d.notification||d.data||d;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(l){
    for(var i=0;i<l.length;i++){if(l[i].visibilityState==='visible')return}
    return self.registration.showNotification(n.title||'Joy Esports',{body:n.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:n.tag||undefined,renotify:false});
  }));
});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(l){
    for(var i=0;i<l.length;i++){if('focus' in l[i])return l[i].focus()}
    return self.clients.openWindow('./');
  }));
});
