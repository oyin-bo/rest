// @ts-check

function tty() {
  function browser() {

    /**
     * @typedef {{
     *  file?: string;
     *  offset?: number | { ln: number, col: number };
     * }} SharedContext
     */

    /**
     * @typedef {{
     *  earlyBoot(): void;
     *  activate(): void;
     *  deactivate(): void;
     * }} ModeController
    */


    /**
     * @param {SharedContext} context
     * @returns {ModeController}
     */
    function restMode(context) {
    }

    /**
     * @param {SharedContext} context
     * @returns {ModeController}
     */
    function textMode(context) {
      function earlyBoot() {
        function librariesLoaded() {
        }

        return librariesLoaded;
      }

      function activate() {
      }

      function deactivate() {
      }

      return {
        earlyBoot,
        activate,
        deactivate
      };
    }

    /**
     * @param {SharedContext} context
     * @returns {ModeController}
     */
    function filesMode(context) {
    }

    /**
     * @param {SharedContext} context
     * @returns {ModeController}
     */
    function markdownMode(context) {
    }

    async function boot() {
      const selfScript = [...document.getElementsByTagName('script')].pop();
      if (selfScript && selfScript.getAttribute('data-legit') !== 'tty')
        selfScript.setAttribute('data-legit', 'tty');

      function removeSpyElements() {

        removeElements('iframe');
        removeElements('style');
        removeElements('script');

        /** @param {string} tagName */
        function removeElements(tagName) {
          var list = document.getElementsByTagName(tagName);
          for (var i = 0; i < list.length; i++) {
            var elem = /** @type {HTMLElement} */(list[i] || list.item(i));

            if (/** @type {*} */(elem).__knownFrame) continue;

            if (elem && elem.parentElement &&
              elem.getAttribute?.('data-legit') !== 'tty' &&
              elem !== selfScript) {
              //if ((shell && elem===shell) || (boot && elem===boot)) continue;
              try { elem.parentElement.removeChild(elem); i--; } catch (error) { }
            }
          }
        }
      }

      async function earlyInit() {
        // TODO: early init, detect mode

        function untilDocumentLoaded() {
          if (document.readyState === 'complete') return;
          return new /** @type {typeof Promise<void>} */(Promise)(resolve => {
            var stopPolling = setInterval(checkIfComplete, 100);
            document.addEventListener('load', checkIfComplete);

            function checkIfComplete() {
              if (document.readyState !== 'complete') return;
              clearInterval(stopPolling);
              resolve();
            }
          });
        }

        function injectLibs() {
          if (window.exports?.codemirror) return window.exports;
          return new Promise((resolve, reject) => {
            const scr = document.createElement('script');
            scr.setAttribute('data-legit', 'tty');
            scr.src = 'libs.js';
            scr.onload = handleLibsLoad;
            scr.onerror = handleLibsError;
            (document.body || document.head).appendChild(scr);

            function handleLibsLoad() {
              resolve(window.exports);
            }

            /**
             * 
             * @param {Event | string} event
             * @param {string} [source]
             * @param {number} [lineno]
             * @param {number} [colno]
             * @param {Error} [error]
             */
            function handleLibsError(event, source, lineno, colno, error) {
              if (error) return reject(error);
              else return reject(new Error(event + ' ' + source + lineno + ':' + colno));
            }
          });
        }

        function injectCSS() {
          function getCSS() {
            return (`
html {
  box-sizing: border-box;
  font-family: "Arial Unicode", "Note Sans Math", "Note Emoji", "Noto Sans Symbols", "Noto Sans Symbols 2", "Note Sans";
  background: white;
  color: black
}

*, *:before, *:after {
  box-sizing: inherit;
}
`
            );
          }

          const sty = document.createElement('style');
          sty.innerHTML = getCSS();

          (document.body || document.head).appendChild(sty);
        }

        // TODO: handoff from bare HTML, initialise the mode
        // TODO: load lib.js, handoff to the mode

        removeSpyElements();
        injectCSS();
        await injectLibs();
      }

      function storageIndexedDB() {
        // TODO: load delta from indexedDB
        // * files { file, timestamp, encoding, content? }
      }

      function storageHTMLComments() {
      }

      // TODO: initiate storage extract...
      await earlyInit();

      // TODO: handoff to the mode already determined
    }

    boot();
  }

  function worker() {
  }

  function node() {
    // TODO: build library? serve?
  }

  function bootEnvironment() {
    if (typeof window !== 'undefined' && typeof window?.alert === 'function') return browser();
    if (typeof self !== 'undefined' && typeof importScripts === 'function') return worker();
    if (typeof require === 'function' && typeof require.resolve === 'function') return node();
  }

  bootEnvironment();
} tty();