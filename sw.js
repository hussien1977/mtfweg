// Import Babel standalone script. This will be available as `Babel` in the global scope.
importScripts("https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.7/babel.min.js");

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept only .ts and .tsx files from the same origin
  if (url.origin === self.origin && (url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx'))) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);

          if (!response.ok) {
            // Pass through non-200 responses like 404s
            return response;
          }

          const sourceCode = await response.text();

          if (!self.Babel) {
              console.error("Babel is not loaded in Service Worker.");
              throw new Error("Babel is not loaded in Service Worker.");
          }

          // Configure preset-react for automatic JSX runtime (React 17+).
          const transpiledResult = self.Babel.transform(sourceCode, {
            presets: [
                ["react", { runtime: "automatic" }],
                "typescript"
            ],
            filename: url.pathname // Important for sourcemaps and error messages
          });

          if (!transpiledResult || !transpiledResult.code) {
              throw new Error(`Babel transformation returned null for ${url.pathname}`);
          }
          
          const headers = new Headers(response.headers);
          headers.set('Content-Type', 'application/javascript; charset=utf-8');
          
          return new Response(transpiledResult.code, { headers });

        } catch (e) {
          console.error('Service Worker error for', url.pathname, e);
          const errorMessage = e instanceof Error ? e.message : String(e);
          // Return a proper error response that the browser can display in the console
          return new Response(
            `/*\n [Service Worker Error]\n URL: ${url.pathname}\n Message: ${errorMessage}\n*/`, 
            {
              status: 500,
              headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
            }
          );
        }
      })()
    );
  }
});

// Service worker lifecycle events
self.addEventListener('install', event => {
  // Activate new service worker as soon as it's installed
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  // Take control of all clients as soon as the service worker is activated
  event.waitUntil(self.clients.claim());
});
