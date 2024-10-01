// @ts-check

export function runIFRAMEWorker() {
  console.log('IFRAME WORKER at ', location.origin);
  window.addEventListener('message', handleMessageEvent);
}

var baseOrigin = getBaseOrigin();

/**
 * @param {MessageEvent} evt
 */
function handleMessageEvent(evt) {
  console.log('IFRAME WORKER EVENT at ', location.origin, evt.data, evt);
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

function getBaseOrigin() {
  const posIfrWrk = location.origin.indexOf('-ifrwrk.');
  if (posIfrWrk < 0) return '';
  const baseOrigin = location.protocol + '//' + location.origin.slice(posIfrWrk + ('-ifrwrk.').length);
  return baseOrigin;
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
