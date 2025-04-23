// @ts-check

/// <reference lib="WebWorker" />

export function bootServiceWorker() {

  /** @type {ServiceWorkerGlobalScope} */(/** @type {*} */(self)).addEventListener(
    'fetch',
    handleFetch);

}

/**
 * 
 * @param {FetchEvent} event 
 */
function handleFetch(event) {
  event.respondWith(
    fetch(event.request).then(response => {
      const newHeaders = new Headers(response.headers);

      const headers = {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'cross-origin',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      };

      Object.entries(headers).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
      return newResponse;
    })
  );
}