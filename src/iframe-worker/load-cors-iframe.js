// @ts-check

import { thisScriptURL } from '../url-encoded/parse-location';

export function loadedCorsIframe() {
  return new Promise(async (resolve, reject) => {
    const workerIframeCandidate = document.createElement('iframe');
    workerIframeCandidate.style.cssText =
      'position: absolute; left: -200px; top: -200px; width: 20px; height: 20px; pointer-events: none; opacity: 0.01;'

    const ifrWrk = Math.random().toString(36).slice(1).replace(/[^a-z0-9]/ig, '') + '-ifrwrk.';
    const selfHosted =
      /http/i.test(location.protocol || '') && thisScriptURL?.host === location.host;

    const childOrigin =
      !selfHosted ? 'https://' + ifrWrk + 'tty.wtf' :
        window.origin.replace(location.host, ifrWrk + location.host);

    workerIframeCandidate.src =
      !selfHosted ? 'https://' + ifrWrk + 'tty.wtf/origin/' + window.origin :
        location.protocol + '//' + ifrWrk + location.host;

    workerIframeCandidate.onload = async () => {
      const pollUntil = Date.now() + 35000;
      while (true) {
        if (workerIframeCandidate.contentWindow) break;
        if (Date.now() > pollUntil) {
          reject(new Error('IFRAME load timeout after ' + (Date.now() - pollUntil) + 'msec.'));
          setTimeout(() => {
            workerIframeCandidate.remove();
          }, 1000);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      let initialized = false;
      window.addEventListener('message', handleIframeMessage);

      while (!initialized) {
        // keep polling
        workerIframeCandidate.contentWindow.postMessage({ init: new Date() + '' }, childOrigin);

        if (Date.now() > pollUntil) {
          reject(new Error('IFRAME init timeout after ' + (Date.now() - pollUntil) + 'msec.'));
          setTimeout(() => {
            workerIframeCandidate.remove();
          }, 1000);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      function handleIframeMessage({ data, origin, source }) {
        if (childOrigin !== '*' && origin !== childOrigin) return;

        if (data.init === 'ack') {
          window.removeEventListener('message', handleIframeMessage);
          resolve({ iframe: workerIframeCandidate, origin: childOrigin });
        }
      }
    };

    workerIframeCandidate.onerror = (iframeError) => {
      console.log('IFRAME ', iframeError);
      reject(iframeError);

      setTimeout(() => {
        workerIframeCandidate.remove();
      }, 1000);
    };

    document.body.appendChild(workerIframeCandidate);
  });
}