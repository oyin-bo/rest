// @ts-check

export function runIFRAMEWorker() {
  const baseOrigin = getBaseOrigin();
  console.log('IFRAME WORKER at ', window.origin, location + '', baseOrigin);

  window.addEventListener('message', evt => handleMessageEvent(evt, baseOrigin));

  function getBaseOrigin() {
    // embedded tool in another page that loaded code from canonical source
    if (location.hostname.endsWith('-ifrwrk.tty.wtf') && location.pathname.startsWith('/origin/')) {
      return location.pathname.replace('/origin/', '');
    }

    const posIfrWrk = window.origin.indexOf('-ifrwrk.');
    if (posIfrWrk < 0) return '';
    const baseOrigin =
      !/http/i.test(location.protocol) ? 'https://tty.wtf' :
        location.protocol + '//' + window.origin.slice(posIfrWrk + ('-ifrwrk.').length);
    return baseOrigin;
  }

  /**
   * @param {MessageEvent} evt
   * @param {string} baseOrigin
   */
  function handleMessageEvent(evt, baseOrigin) {
    console.log('IFRAME WORKER EVENT at ', window.origin, evt.data, evt);
    if (evt.origin !== baseOrigin) return;

    if (!evt.data || !evt.source) return;

    if (evt.data.init) {
      evt.source.postMessage({ init: 'ack' }, { targetOrigin: baseOrigin });
    } else if (evt.data.eval) {
      const script = evt.data.eval.script;
      const key = evt.data.eval.key;
      if (typeof script !== 'string') return;
      if (key == null) return;

      execScriptAndReply(script, key, evt.source);
    }
  }

  /**
   * @param {string} script
   * @param {any} key
   * @param {MessageEventSource} replyTo
   */
  async function execScriptAndReply(script, key, replyTo) {
    try {
      const result = (0, eval)(script);
      let resolvedResult = result;
      if (typeof result?.then === 'function')
        resolvedResult = await result;

      replyTo.postMessage({ evalReply: { key, result: resolvedResult, success: true } }, { targetOrigin: baseOrigin });
    } catch (error) {
      replyTo.postMessage({ evalReply: { key, success: false, error } }, { targetOrigin: baseOrigin });
    }
  }

}