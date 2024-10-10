// @ts-check

export function execIsolation() {

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

  /** @param {string} scriptText */
  async function execScriptIsolated(scriptText) {
    const iframe = await loadedWorkerIframe();
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
        script: scriptText
      }
    }, '*');

    return promise;
  }

  /** @type {Promise<HTMLIFrameElement> | undefined} */
  var _workerIframePromise;
  var childOrigin;

  function loadedWorkerIframe() {
    return _workerIframePromise || (_workerIframePromise =
      new Promise(async (resolve, reject) => {
        const workerIframeCandidate = document.createElement('iframe');
        workerIframeCandidate.style.cssText =
          'position: absolute; left: -200px; top: -200px; width: 20px; height: 20px; pointer-events: none; opacity: 0.01;'

        const ifrWrk = Math.random().toString(36).slice(1).replace(/[^a-z0-9]/ig, '') + '-ifrwrk.';
        childOrigin =
          !/http/i.test(location.protocol || '') ? 'https://' + ifrWrk + 'tty.wtf' :
            window.origin.replace(location.host, ifrWrk + location.host);

        workerIframeCandidate.src =
          !/http/i.test(location.protocol) ? 'https://' + ifrWrk + 'tty.wtf/origin/' + window.origin :
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

          let initialized = false;
          window.addEventListener('message', ({ data, origin }) => {
            if (childOrigin !== '*' && origin !== childOrigin) return;

            if (data.init === 'ack') {
              initialized = true;
              resolve(workerIframeCandidate);
            } else if (data.evalReply) {
              const { key, success, result, error } = data.evalReply;

              const entry = scriptRequests[key];
              if (entry) {
                delete scriptRequests[key];
                if (success) entry.resolve(result);
                else entry.reject(error);
              }
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
