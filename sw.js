var CACHE = "pwp-v2";
var SHELL = ["/", "/favicon.svg", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/css/app.css", "/js/pwa.js"];

self.addEventListener("install", function (event) {
    event.waitUntil(caches.open(CACHE).then(function (cache) {
        return cache.addAll(SHELL);
    }).then(function () {
        return self.skipWaiting();
    }));
});

self.addEventListener("activate", function (event) {
    event.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (key) {
            return key !== CACHE;
        }).map(function (key) {
            return caches.delete(key);
        }));
    }).then(function () {
        return self.clients.claim();
    }));
});

function store(request, response) {
    if (!response || response.status !== 200 || response.type !== "basic") return;
    var copy = response.clone();
    caches.open(CACHE).then(function (cache) {
        cache.put(request, copy).catch(function () { });
    });
}

self.addEventListener("fetch", function (event) {
    var request = event.request;
    if (request.method !== "GET") return;
    var url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    var fresh = request.mode === "navigate" || /\.(html|js|css|json|svg)$/.test(url.pathname) || url.pathname === "/";
    if (fresh) {
        event.respondWith(fetch(request).then(function (response) {
            store(request, response);
            return response;
        }).catch(function () {
            return caches.match(request).then(function (hit) {
                return hit || caches.match("/");
            });
        }));
        return;
    }

    event.respondWith(caches.match(request).then(function (hit) {
        var network = fetch(request).then(function (response) {
            store(request, response);
            return response;
        });
        return hit || network;
    }));
});
