// @ts-check

import { ASSOCIATED_CSS_TAG, BACKUP_CHILD_NODES_TAG } from '../markdown/code-block/state-html/plugin-runtime';
import { createConsoleLogForwarder } from './console-log-forwarder';
import { USE_SERIALIZATION } from './exec-isolation';
import { executeEvalRequest } from './execute-eval-request';
import { executeInitRequest } from './execute-init-request';
import { createFetchForwarder } from './fetch-forwarder';
import { remoteObjects, storedElements } from './serialize/remote-objects';
import { createWebSocketForwarder } from './websocket-forwarder';

export function runIFRAMEWorker() {
  const console = getOriginalConsole();

  const removeNodes = [...document.body.childNodes].filter(node => {
    const elem = /** @type {HTMLElement} */(node);
    if (/script/i.test(elem.tagName)) return false;
    if (/style/i.test(elem.tagName)) return false;
    if (/link/i.test(elem.tagName)) return false;
    return true;
  });
  removeNodes.forEach(node => {
    node.remove();
  });
  const injectStyle = document.createElement('style');
  injectStyle.innerHTML =
    'html { background: transparent } body{ padding: 0; margin: 0; border: none; background: transparent; }';
  document.head.appendChild(injectStyle);

  const baseOrigin = getBaseOrigin();
  console.log('IFRAME WORKER at ', window.origin, location + '', baseOrigin);

  const remote = remoteObjects();

  const fetchForwarder = createFetchForwarder(baseOrigin);
  const webSocketForwarder = createWebSocketForwarder(baseOrigin);
  const consoleLogForwarder = createConsoleLogForwarder(baseOrigin, remote);

  window.addEventListener('message', evt => handleMessageEvent(evt, baseOrigin));

  function getBaseOrigin() {
    // embedded tool in another page that loaded code from canonical source
    if (location.hostname.endsWith('-ifrwrk.tty.wtf') && location.pathname.startsWith('/origin/')) {
      const passedOrigin = location.pathname.replace('/origin/', '');
      if (!passedOrigin || passedOrigin === 'null') return '*'; // sad, but last resort for file:// schema
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
      const msg = executeInitRequest(
        {
          ackKey: evt.data.ackKey,
          fetchForwarder,
          webSocketForwarder,
          consoleLogForwarder,
          console
        });
      const source = evt.source;
      evt.source.postMessage(msg, { targetOrigin: baseOrigin });
      remote.onSendMessage = (msg) => {
        source.postMessage(msg, { targetOrigin: baseOrigin });
      };
    } else if (evt.data.eval) {
      const msg = await executeEvalRequest(
        evt.data.eval.script,
        evt.data.eval.globals,
        evt.data.eval.key,
        USE_SERIALIZATION ? remote.serialize : obj => obj
      );
      try {
        evt.source.postMessage(msg, { targetOrigin: baseOrigin });
      } catch (error) {
        evt.source.postMessage({ evalReply: { key: evt.data.eval.key, success: false, error } }, { targetOrigin: baseOrigin });
      }
    } else if (evt.data.fetchForwarder) {
      fetchForwarder.onFetchReply(evt.data, evt.source);
    } else if (evt.data.webSocketForwarder) {
      webSocketForwarder.onWebSocketMessage(evt.data, evt.source);
    } else if (evt.data.presentVisual) {
      const { domAccessKey, callKey } = evt.data.presentVisual;
      for (let iFrame = 0; iFrame < window.parent.frames.length; iFrame++) {
        try {
          const siblingFrame = window.parent.frames[iFrame];
          if (siblingFrame.document.body) {
            const storedElementsMap = storedElements(siblingFrame);
            if (!storedElementsMap?.size) return;

            const weakRef = storedElementsMap.get(domAccessKey);

            const element = /** @type {HTMLElement | undefined} */(weakRef?.deref());

            /** @type {{ left: number, top: number, right: number, bottom: number, width: number, height: number } | undefined} */
            let bounds;
            if (element) {

              try {
                if (typeof element.getBoundingClientRect === 'function') {
                  bounds = { ...element.getBoundingClientRect() };
                }
              } catch (err) {
              }

              document.body.textContent = '';
              let childNodes = [...element.childNodes];
              if (element.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                if (element[BACKUP_CHILD_NODES_TAG]) {
                  childNodes = element[BACKUP_CHILD_NODES_TAG];

                  for (const child of element[BACKUP_CHILD_NODES_TAG]) {
                    document.body.appendChild(child);
                  }
                } else {
                  element[BACKUP_CHILD_NODES_TAG] = childNodes;
                  document.body.appendChild(element);
                }
              } else {
                document.body.appendChild(element);
              }

              if (element[ASSOCIATED_CSS_TAG]) {
                const styles = document.createElement('style');
                styles.innerHTML = element[ASSOCIATED_CSS_TAG];
                document.head.appendChild(styles);
              }

              if (!bounds || bounds.width <= 4 && bounds.height <= 4) {
                try {
                  if (typeof element.getBoundingClientRect === 'function') {
                    bounds = { ...element.getBoundingClientRect() };
                  }

                  if (childNodes.length) {
                    if (!bounds) bounds = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
                    for (const child of childNodes) {
                      try {
                        if (typeof /** @type {HTMLElement} */(child).getBoundingClientRect === 'function') {
                          const childBounds = /** @type {HTMLElement} */(child).getBoundingClientRect();
                          if (childBounds) {
                            if (childBounds.left < bounds.left) bounds.left = childBounds.left;
                            if (childBounds.top < bounds.top) bounds.top = childBounds.top;
                            if (childBounds.right > bounds.right) bounds.right = childBounds.right;
                            if (childBounds.bottom > bounds.bottom) bounds.bottom = childBounds.bottom;

                            bounds.width = bounds.right - bounds.left;
                            bounds.height = bounds.bottom - bounds.top;
                          }
                        }
                      } catch (childBoundsError) { }
                    }
                  }
                } catch (getBoundsError) {}
              }

              console.log('IFRAME WORKER PRESENTED VISUAL ', domAccessKey, element, bounds);
            }

            evt.source.postMessage({ presentVisualReply: { callKey, bounds } }, { targetOrigin: baseOrigin });
          }
        } catch (error) {
        }
      }
    } else {
      remote.onReceiveMessage(evt.data);
    }
  }

}

function getOriginalConsole() {
  return console;
}
