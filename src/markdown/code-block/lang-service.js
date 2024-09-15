// @ts-check

import { createLanguageService, getDefaultCompilerOptions, ScriptSnapshot } from 'typescript';


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


export function makeLanguageService() {

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