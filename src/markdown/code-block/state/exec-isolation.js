// @ts-check

export function execIsolation() {

  return {
    execScriptIsolated
  };

  /** @type {HTMLIFrameElement & { runThis(code: string); }} */
  var ifr;
  /** @type {Promise<typeof ifr> | undefined} */
  var ifrPromise;

  /** @param {string} scriptText */
  function execScriptIsolated(scriptText) {
    if (!ifr) {
      if (!ifrPromise) {
        ifrPromise = new Promise(async (resolve) => {
          const ifrCandidate = /** @type {typeof ifrCandidate} */(document.createElement('iframe'));
          ifrCandidate.style.cssText =
            'position: absolute; left: -200px; top: -200px; width: 20px; height: 20px; pointer-events: none; opacity: 0.01;'

          ifrCandidate.src = 'about:blank';

          document.body.appendChild(ifrCandidate);

          await new Promise(resolve => setTimeout(resolve, 10));

          ifrCandidate.contentDocument?.write(
            '<script>window.runThis = function(code) { return eval(code) }</script>'
          );

          ifrCandidate.runThis = /** @type {*} */(ifrCandidate.contentWindow).runThis;
          delete /** @type {*} */(ifrCandidate.contentWindow).runThis;

          ifr = ifrCandidate;
          ifrPromise = undefined;
        });
      }

      return ifrPromise.then(() => ifr.runThis(scriptText));
    }

    return ifr.runThis(scriptText)
  }
}
