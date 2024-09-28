// @ts-check

import { withPromiseOrSync } from '../../with-promise-or-sync';

/**
 * @param {string} scriptText
 */
async function execScriptWithServiceWorker(scriptText) {
  const codeBlockScriptsVirtualDirectoryPath = '/code-block-scripts-virtual-directory/';
  async function registerServiceWorker() {
    if ('serviceWorker' in navigator && typeof navigator.serviceWorker?.register === 'function') {
      const registration = await navigator.serviceWorker.register(
        '/index.js',
        { scope: codeBlockScriptsVirtualDirectoryPath }
      );

      if (registration.installing) {
        console.log('Service worker installing');
      } else if (registration.waiting) {
        console.log('Service worker installed');
      } else if (registration.active) {
        console.log('Service worker active');
      }

      const readyRegistration = await navigator.serviceWorker.ready;
    }
  }

}

/**
 * @type {import('typescript') | Promise<import('typescript')> | undefined}
 */
var ts;

function loadTS() {
  if (ts) return ts;

  return ts= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      location.hostname === 'localhost' ?
      './node_modules/typescript/lib/typescript.js' :
        'https://cdn.jsdelivr.net/npm/typescript';

    script.onload = () => {
      resolve(ts = window['ts']);
      setTimeout(() => {
        script.remove();
      }, 1000);
    };
    script.onerror = (x) => {
      reject(x);
      setTimeout(() => {
        script.remove();
      }, 1000);
    };
    (document.body || document.head).appendChild(script);
  });

}

export function makeLanguageService() {
  return withPromiseOrSync(loadTS(), makeLanguageServiceWithTS);
}

/**
 * @param {import('typescript')} ts
 */
function makeLanguageServiceWithTS(ts) {

  const { createLanguageService, getDefaultCompilerOptions, ScriptSnapshot } = ts;

  /**
 * @typedef {{
 *  snapshot: import('typescript').IScriptSnapshot,
 *  text: string,
 *  version: number,
 * }} ScriptEntry
 */

  const compilerOptions = getDefaultCompilerOptions();
  compilerOptions.allowJs = true;

  /** @type {Record<string, ScriptEntry>} */
  const scriptCache = {};

  const result = {
    ts,
    scripts: /** @type {Record<string, string>} */({
    }),
    languageService: createLanguageService({
      getScriptFileNames: () => Object.keys(result.scripts),
      getScriptVersion: fn => /** @type {string} */(getCached(fn)?.version?.toString()),
      getScriptSnapshot: fn => getCached(fn)?.snapshot,
      getCurrentDirectory: () => '/',
      getCompilationSettings: () => compilerOptions,
      getDefaultLibFileName: options => '',
      fileExists: fn => typeof result.scripts[fn] === 'string',
      readFile: (fn) => result.scripts[fn],
      readDirectory: dir => dir === '/' ? Object.keys(result.scripts) : [],
      directoryExists: dir => dir === '/',
      getDirectories: () => [],
    })
  };

  return result;

  /**
   * @param {string} fn
   */
  function getCached(fn) {
    const text = result.scripts[fn];
    const cached = scriptCache[fn];

    if (typeof text !== 'string') {
      delete scriptCache[fn];
      return undefined;
    } else if (cached?.text === text) {
      return cached;
    } else {
      return scriptCache[fn] = {
        text,
        snapshot: ScriptSnapshot.fromString(text),
        version: (cached?.version || 0) + 1
      };
    }
  }

}