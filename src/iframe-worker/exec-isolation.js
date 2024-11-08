// @ts-check

import { createFetchForwarderService } from './fettch-forwarder-service';
import { thisScriptURL } from '../url-encoded/parse-location';
import { remoteObjects } from './serialize/remote-objects';

export var USE_SERIALIZATION = true;

export function execIsolation() {

  const remote = remoteObjects();

  return {
    execScriptIsolated
  };

  /**
   * @type {{
   *  [key: string]: {
   *    promise: Promise,
   *    resolve: (value: any) => void,
   *    reject: (value: any) => void
   *  }
   * }}
   */
  var scriptRequests;

  /**
   * @param {string} scriptText
   * @param {Record<string, any>} globals
   */
  async function execScriptIsolated(scriptText, globals) {
    const { iframe, origin } = await loadedWorkerIframe();
    if (!scriptRequests) scriptRequests = {};

    /** @type {*} */
    let resolve;
    /** @type {*} */
    let reject;
    let promise = new Promise((xResolve, xReject) => {
      resolve = xResolve;
      reject = xReject;
    });

    const key = Date.now() + ' ' + Math.random();

    scriptRequests[key] = { promise, resolve, reject };

    iframe.contentWindow?.postMessage({
      eval: {
        key,
        script: scriptText,
        globals: USE_SERIALIZATION ? remote.serialize(globals) : globals
      }
    }, origin);

    return promise;
  }

  /** @type {Promise<{ iframe: HTMLIFrameElement, origin: string }> | undefined} */
  var _workerIframePromise;

  function loadedWorkerIframe() {
    return _workerIframePromise || (_workerIframePromise =
      new Promise(async (resolve, reject) => {
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
                _workerIframePromise = undefined;
              }, 1000);
              return;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
          }

          const fetchForwardService = createFetchForwarderService(childOrigin);
          let initialized = false;
          window.addEventListener('message', ({ data, origin, source }) => {
            if (childOrigin !== '*' && origin !== childOrigin) return;

            if (data.init === 'ack') {
              initialized = true;
              resolve({ iframe: workerIframeCandidate, origin: childOrigin });
            } else if (data.evalReply) {
              const { key, success, result, error } = data.evalReply;

              const entry = scriptRequests[key];
              if (entry) {
                delete scriptRequests[key];
                if (success) entry.resolve(USE_SERIALIZATION ? remote.deserialize(result) : result);
                else entry.reject(USE_SERIALIZATION ? remote.deserialize(error) : error);
              }
            } else if (data.fetchForwarder) {
              fetchForwardService.onMessage({ data, source });
            }
          });

          while (!initialized) {
            // keep polling
            workerIframeCandidate.contentWindow.postMessage({ init: new Date() + '' }, childOrigin);

            if (Date.now() > pollUntil) {
              reject(new Error('IFRAME init timeout after ' + (Date.now() - pollUntil) + 'msec.'));
              setTimeout(() => {
                workerIframeCandidate.remove();
                _workerIframePromise = undefined;
              }, 1000);
              return;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        };

        workerIframeCandidate.onerror = (iframeError) => {
          console.log('IFRAME ', iframeError);
          reject(iframeError);

          setTimeout(() => {
            workerIframeCandidate.remove();
            _workerIframePromise = undefined;
          }, 1000);
        };

        document.body.appendChild(workerIframeCandidate);
      }));
  }
}
