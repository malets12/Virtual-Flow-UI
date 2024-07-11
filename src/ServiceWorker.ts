//Should be in app folder
const CACHE_NAME: string = "prefetch-vf-ui-v1";
const REQUIRED_FILES: ReadonlyArray<string> = [
    "/index.html",
    "/index.js",
    "/manifest.json",
    "/styles.css",
    "/worker/LoadFromDbAndCountJsWorker.js",
    "/asset/VF-icon.png"
];

self.addEventListener("install", (event: ExtendableEvent): void => {
    event.waitUntil(
        window.caches.open(CACHE_NAME)
            .then(cache => cache.addAll(REQUIRED_FILES))
    );
});

self.addEventListener("fetch", (event: FetchEvent): void => {
    event.respondWith(
        window.caches.match(event.request)
            .then(response => response || doCache(event.request, fetch(event.request)))
    );
});

async function doCache(request: Request, responsePromise: Promise<Response>): Promise<Response> {
    return responsePromise.then(response => {
        window.caches.open(CACHE_NAME)
            .then(cache => cache.put(request, response.clone()));
        return response;
    });
}