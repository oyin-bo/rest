// @ts-check

import { createFetchForwarder } from './fetch-forwarder';

export function runIFRAMEWorker() {
  const baseOrigin = getBaseOrigin();
  console.log('IFRAME WORKER at ', window.origin, location + '', baseOrigin);

  const fetchForwarder = createFetchForwarder(baseOrigin);

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
      // if it is initialised, set fetch proxy
      console.log('init ACK, setting window fetch: ', window.fetch, ' => ', fetchForwarder.fetch);
      window.fetch = fetchForwarder.fetch;
      evt.source.postMessage({ init: 'ack' }, { targetOrigin: baseOrigin });
    } else if (evt.data.eval) {
      const script = evt.data.eval.script;
      const key = evt.data.eval.key;
      if (typeof script !== 'string') return;
      if (key == null) return;
      const globals = evt.data.eval.globals;

      execScriptAndReply(script, globals, key, evt.source);
    } else if (evt.data.fetchForwarder) {
      fetchForwarder.onFetchReply(evt.data, evt.source);
    }
  }

  /**
   * @param {string} script
   * @param {any} key
   * @param {MessageEventSource} replyTo
   */
  async function execScriptAndReply(script, globals, key, replyTo) {
    try {
      for (const key in window) {
        if (key.length === 2 && /\$[0-9]/.test(key)) {
          if (key in globals)
            window[key] = globals[key];
          else
            delete window[key];
        }
      }

      for (const key in globals) {
        window[key] = globals[key];
      }

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