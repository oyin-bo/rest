// @ts-check

function tty() {

  var { parseLocationURL, encodeAsPath } = (() => {

    /** @param {string} locationURL */
    function parseLocationURL(locationURL) {
      const { source, baseHref, payload } = parseLocation(new URL(locationURL));
      const { verb, addr, body, impliedVerb } = parsePathPayload(payload);

      return {
        source,
        baseHref,
        mode:
          restVerbs[verb] ? 'rest' :
            textVerbs[verb] ? 'text' :
              fileVerbs[verb] ? 'files' :
                markdownVerbs[verb] ? 'markdown' :
                  'text',
        verb,
        title: addr,
        content: body,
        impliedVerb
      };

    }

    /** @param {URL} location */
    function parseLocation(location) {
      if (location.protocol === 'http:' || location.protocol === 'https:') {
        if (/github\.io/i.test(location.host) || location.host.toLowerCase() === 'oyin.bo') {
          return {
            source: 'path',
            baseHref: location.pathname.slice(0, location.pathname.indexOf('/', 1) + 1),
            payload: location.pathname.slice(location.pathname.indexOf('/', 1) + 1)
          };
        } else if (/\.vscode/i.test(location.host)) {
          var matchIndexHtml = /\/(index|404)\.html\b/i.exec(location.pathname || '');
          if (!matchIndexHtml) return {
            source: 'hash',
            baseHref: location.pathname,
            payload: location.hash.replace(/^#/, '')
          };
          return {
            source: 'hash',
            baseHref: location.pathname.slice(0, matchIndexHtml.index + 1),
            payload: location.hash.replace(/^#/, '')
          };
        } else {
          return {
            source: 'path',
            baseHref: '/',
            payload: location.pathname.replace(/^\//, '')
          };
        }
      } else {
        return {
          source: 'hash',
          baseHref: location.pathname,
          payload: location.hash.replace(/^#/, '')
        };
      }
    }


    const verbRegex = /^[A-Z]+\//i;
    const urlLeadRegex = /^[A-Z]+\//i;

    const MAX_VERB_LENGTH = 10;
    const MAX_SCHEMA_LENGTH = 10;

    /**
     * @param {string} pathPayload
     * @returns {{
     *  verb: string,
     *  addr?: string,
     *  body?: string,
     *  impliedVerb?: boolean
     * }}
     */
    function parsePathPayload(pathPayload) {
      if (pathPayload.charAt(0) === '/') {
        return {
          verb: 'text',
          body: decodeBodyLines(pathPayload.slice(1)),
          impliedVerb: true
        };
      }

      const verbMatch = verbRegex.exec(pathPayload);
      // watch out for excessively long verbs
      if (verbMatch && verbMatch[0].length > MAX_VERB_LENGTH) {
        return { verb: 'text', body: decodeBodyLines(pathPayload), impliedVerb: true };
      }

      let verb;
      let furtherPayloadOffset;
      if (verbMatch) {
        verb = verbMatch[0].slice(0, -1).toLowerCase();
        furtherPayloadOffset = verbMatch[0].length;
      } else {
        const urlMatch = urlLeadRegex.exec(pathPayload);
        if (!urlMatch || urlMatch[0].length > MAX_SCHEMA_LENGTH) {
          return { verb: 'text', body: decodeBodyLines(pathPayload), impliedVerb: true };
        }
        verb = '';
        furtherPayloadOffset = 0;
      }

      let addrEndPos = pathPayload.indexOf('//', furtherPayloadOffset);
      if (addrEndPos > furtherPayloadOffset && pathPayload.charAt(addrEndPos - 1) === ':')
        addrEndPos = pathPayload.indexOf('//', addrEndPos + 2);

      if (addrEndPos < 0) addrEndPos = pathPayload.length;

      const addr = decodePath(pathPayload.slice(furtherPayloadOffset, addrEndPos));

      let body;
      let impliedVerb = !verb;
      if (addrEndPos + 2 < pathPayload.length) {
        body = decodeBodyLines(pathPayload.slice(addrEndPos + 2));
        if (!verb) verb = 'post';
      } else {
        if (!verb) verb = 'get';
      }

      return {
        verb,
        addr,
        body,
        impliedVerb
      };
    }

    /**
     * @param {string} content
     */
    function decodePath(content) {
      return decodeURIComponent(content.replace(/\+/, ' '));
    }

    const decodeBodyLines_regex = /([^\/\+]*)((\/)|(\+))?/gi;

    /**
     * @param {string} bodyRaw
     * @returns {string}
     */
    function decodeBodyLines(bodyRaw) {
      var body = bodyRaw.replace(
        decodeBodyLines_regex,
        function (whole, plain, remain, slash, plus) {
          return decodeURIComponent(plain || '') + (
            slash ? '\n' :
              plus ? ' ' :
                (remain || '')
          );
        }
      );

      return body;
    }

    /**
 * @param {string} verb
 * @param {string} addr
 * @param {string} body
 */
    function encodeAsPath(verb, addr, body) {
      if ((!verb || verb === 'text') && !addr) {
        if (!body) return '';
        const normalizedBody = normalizeBody(body);
        const trySlim = parsePathPayload(normalizedBody);
        if (trySlim.body === body) return normalizedBody;
        else return '/' + normalizedBody;
      }

      if (!verb) {
        if (addr) {
          if (!/^(http|https):/i.test(addr)) verb = 'GET';
        }
        else verb = 'text';
      }

      if (verb) {
        var normalizedUrl = !addr ? '' :
          encodeURI(addr)
            .replace(
              /(^http:)|(^https:)|(\/\/)|(#)|(\&)|(\?)/gi,
              function (whole, httpPrefix, httpSecurePrefix, slash, hash, ampersand, question) {
                return (
                  slash ? '/%2F' :
                    hash ? '%23' :
                      ampersand ? '%26' :
                        question ? '%3F' :
                          whole
                );
              });
      } else {
        var normalizedUrl = !addr ? '' :
          encodeURI(addr)
            .replace(
              /(^http:(\/\/)?)|(^https:(\/\/)?)|(\/\/)|(#)|(\&)|(\?)/gi,
              function (whole, httpPrefix, httpSecurePrefix, httpSlash2, httpsSlash2, slash, hash, ampersand, question) {
                return (
                  slash ? '/%2F' :
                    hash ? '%23' :
                      ampersand ? '%26' :
                        question ? '%3F' :
                          whole
                );
              });
      }

      var normalizedBody = normalizeBody(body);

      if (verb === 'text') {
        const trySlim = parsePathPayload(normalizedBody);
        if ((trySlim.body || '') === body && (trySlim.addr || '') === addr)
          return normalizedBody;
      }

      var result =
        textVerbs[verb] ? verb + '/' + normalizedBody :
          (verb ? verb + '/' : '') + (normalizedUrl ? normalizedUrl : '') + (
            (normalizedBody && (verb || normalizedUrl)) ? '//' + normalizedBody : normalizedBody || ''
          );
      return result;
    }

    const restVerbs = {
      rest: true,
      get: true,
      post: true,
      put: true,
      patch: true,
      delete: true,
      ws: true,
      websocket: true
    };

    const textVerbs = {
      edit: true,
      text: true,
      read: true,
      view: true
    };

    const fileVerbs = {
      file: true,
      files: true,
      folder: true,
      folders: true
    };

    const markdownVerbs = {
      markdown: true,
      md: true
    };

    /** @param {string} body */
    function normalizeBody(body) {
      return body
        .replace(
          /([^\n\/\+ \#\&\?]*)((\n)|(\/)|(\+)|( )|(#)|(\&)|(\?))/gi,
          function (whole, plain, remain, newLine, slash, plus, space, hash, ampersand, question) {
            return encodeURI(plain || '') + (
              newLine ? '/' :
                slash ? '%2F' :
                  plus ? '%2B' :
                    space ? '+' :
                      hash ? '%23' :
                        ampersand ? '%26' :
                          question ? '%3F' :
                            (remain || '')
            );
          }
        );
    }

    return { parseLocationURL, encodeAsPath };

  })();

  function browser() {

    /**
     * @typedef {{
     *  file?: string;
     *  offset?: number | { ln: number, col: number };
     * }} SharedContext
     */

    /**
     * @typedef {{
     *  earlyBoot(bootHost: HTMLElement): void;
     *  activate(realHost: HTMLElement): void;
     *  deactivate(): void;
     * }} ModeController
    */

    /**
     * @param {SharedContext} context
     * @returns {ModeController}
     */
    function restMode(context) {
      throw new Error('REST mode is not implemented.');
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
      throw new Error('File mode is not implemented.');
    }

    /**
     * @param {SharedContext} context
     * @returns {ModeController}
     */
    function markdownMode(context) {
      throw new Error('Markdown mode is not implemented.');
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

      function createScreenSwapper() {
        
      }

      async function earlyInit() {

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

        const detectMode = parseLocationURL(window.location + '');

        // TODO: early init, detect mode
        // TODO: handoff from bare HTML, initialise the mode
        // TODO: load lib.js, handoff to the mode

        removeSpyElements();
        injectCSS();
        const libsPromise = injectLibs();

        const mode =
          detectMode.mode === 'rest' ? restMode :
            detectMode.mode === 'text' ? textMode :
              detectMode.mode === 'files' ? filesMode :
                detectMode.mode === 'markdown' ? markdownMode :
                  textMode;

        const modeController = mode({});
        //modeController.earlyBoot();

        if (libsPromise?.then) {
          console.log('TTY detected ', detectMode, ' ...loading...');
          const libs = await libsPromise;
          console.log('TTY libs loaded ', libs);
        } else {
          console.log('TTY detected ', detectMode, ', libs loaded ', libsPromise);
        }


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
    function detectEsbuild() {
      try {
        require.resolve('esbuild');
        return true;
      } catch (error) {
        delete require.cache['esbuild'];
        return false;
      }
    }

    function npmInstall() {
      const { execSync } = require('child_process');
      execSync('npm install');
    }

    function build() {
      const fs = require('fs');
      const path = require('path');

      const esbuild = require('esbuild');

      /** @type {Parameters<typeof esbuild.build>[0]} */
      const baseOptions = {
        //entryPoints: ['lib/index.js'],
        bundle: true,
        sourcemap: true,
        target: 'es6',
        loader: { '.js': 'jsx' },
        format: 'iife',
        //logLevel: 'info',
        external: [
          'fs', 'path', 'os',
          'crypto', 'tty', 'tls',
          'events', 'stream',
          'zlib',
          'assert',
          'net', 'http', 'https', 'http2',
          'child_process',
          'module', 'url', 'worker_threads', 'util',
          'node:constants', 'node:buffer', 'node:querystring', 'node:events', 'node:fs', 'node:path', 'node:os',
          'node:crypto', 'node:util', 'node:stream', 'node:assert', 'node:tty', 'node:net', 'node:tls', 'node:http',
          'node:https', 'node:zlib', 'node:http2', 'node:perf_hooks', 'node:child_process', 'node:worker_threads',

          'ws'
        ],
        //outfile: 'libs.js'
      };

      let lastPrinted = 0;
      function printBanner(text) {
        const dt = new Date();
        let bannerText =
          dt.getHours() + ':' + (100 + dt.getMinutes()).toString().slice(1) + ':' + (100 + dt.getSeconds()).toString().slice(1) + ' ' +
          text + ' ';
        while (bannerText.length < 30)
          bannerText += '=';

        if (Date.now() - lastPrinted > 3000) bannerText = '\n' + bannerText;
        if (Date.now() - lastPrinted > 10000) bannerText = '\n' + bannerText;

        console.log(bannerText);
        lastPrinted = dt.getTime();
      }

      async function buildLib(mode) {

        const options = /** @type {typeof baseOptions} */({
          ...baseOptions,
          format: 'iife',
          entryPoints: ['lib/index.js'],
          plugins: [
            {
              name: 'post-export',
              /** @param {esbuild.PluginBuild} build */
              setup(build) {
                build.onStart(() => {
                  printBanner('LIBS.JS');
                }),
                  build.onEnd(result => {
                    const libsJSEntry = result.outputFiles?.find(file => file.path.endsWith('libs.js'));
                    if (libsJSEntry) {
                      const libsGenerated = libsJSEntry.text;
                      const libsTransformed = libsGenerated; // TODO: any post-build transform

                      if (libsTransformed !== libsGenerated) {
                        libsJSEntry.contents = Buffer.from(libsTransformed, 'utf8');
                      }
                    }
                  });
              }
            }
          ],
          outfile: 'libs.js'
        });

        if (mode === 'serve' || mode === 'watch') {
          const ctx = await esbuild.context(options);
          await ctx.watch();
          console.log('WATCHING LIB...');
        } else {
          await esbuild.build(options);
        }
      }

      buildLib();

    }

    if (!detectEsbuild())
      npmInstall();

    build();

  }

  function bootEnvironment() {
    if (typeof window !== 'undefined' && typeof window?.alert === 'function') return browser();
    if (typeof self !== 'undefined' && typeof importScripts === 'function') return worker();
    if (typeof require === 'function' && typeof require.resolve === 'function') return node();
  }

  bootEnvironment();
} tty();