// @ts-check

import { executeEvalRequest } from './execute-eval-request';
import { executeInitRequest } from './execute-init-request';
import { createFetchForwarder } from './fetch-forwarder';

export function runIFRAMEWorker() {
  const baseOrigin = getBaseOrigin();
  console.log('IFRAME WORKER at ', window.origin, location + '', baseOrigin);

  const fetchForwarder = createFetchForwarder(baseOrigin);

  window.addEventListener('message', evt => handleMessageEvent(evt, baseOrigin));

  function getBaseOrigin() {
    // embedded tool in another page that loaded code from canonical source
    if (location.hostname.endsWith('-ifrwrk.tty.wtf') && location.pathname.startsWith('/origin/')) {
      const passedOrigin = location.pathname.replace('/origin/', '');
      if (passedOrigin === 'null') return '*'; // sad, but last resort for file:// schema
      else return passedOrigin;
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
  async function handleMessageEvent(evt, baseOrigin) {
    console.log('IFRAME WORKER EVENT at ', window.origin, evt.data, evt);
    const evtOrigin = evt.origin === 'null' ? '*' : evt.origin;
    if (evtOrigin !== baseOrigin) return;

    if (!evt.data || !evt.source) return;

    if (evt.data.init) {
      // if it is initialised, set fetch proxy
      const msg = executeInitRequest(fetchForwarder);
      evt.source.postMessage(msg, { targetOrigin: baseOrigin });
    } else if (evt.data.eval) {
      const msg = await executeEvalRequest(evt.data.eval.script, evt.data.eval.globals, evt.data.eval.key);
      try {
        evt.source.postMessage(msg, { targetOrigin: baseOrigin });
      } catch (error) {
        evt.source.postMessage({ evalReply: { key: evt.data.eval.key, success: false, error } }, { targetOrigin: baseOrigin });
      }
    } else if (evt.data.fetchForwarder) {
      fetchForwarder.onFetchReply(evt.data, evt.source);
    }
  }

}
