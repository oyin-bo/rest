// @ts-check

import { withPromiseOrSync } from '../with-promise-or-sync';
import { loadLibdts } from './load-libdts';
import { loadTS } from './load-ts';

/**
 * @typedef {{
 *  then?: never,
 *  ts: import('typescript'),
 *  scripts: Record<string, string>,
 *  hiddenScripts: Record<string, string>,
 *  languageService: import('typescript').LanguageService,
 *  libdtsLoadedAsync?: Promise<void>
 * }} LanguageServiceContext
 */

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
  compilerOptions.checkJs = true;

  /** @type {Record<string, ScriptEntry>} */
  const scriptCache = {};

  const libdtsOrPromise = loadLibdts();

  /**
   * @type {LanguageServiceContext}
   */
  const result = {
    ts,
    scripts: {},
    hiddenScripts:
      !libdtsOrPromise || typeof libdtsOrPromise.then === 'function' ?
        {} :
        /** @type {*} */({ ...libdtsOrPromise }),
    languageService: createLanguageService({
      getScriptFileNames: () =>
        Object.keys(result.scripts).concat(Object.keys(result.hiddenScripts)),
      getScriptVersion: fn =>
        /** @type {string} */(getCached(fn)?.version?.toString()),
      getScriptSnapshot: fn =>
        getCached(fn)?.snapshot,
      getCurrentDirectory: () =>
        '/',
      getCompilationSettings: () =>
        compilerOptions,
      getDefaultLibFileName: options =>
        '',
      fileExists: fn =>
        typeof result.scripts[fn] === 'string' || typeof result.hiddenScripts[fn] === 'string'
      //|| fn.startsWith('/node_modules/')
      ,
      readFile: (fn) =>
        typeof result.scripts[fn] === 'string' ? result.scripts[fn] : result.hiddenScripts[fn],
      readDirectory: dir =>
        dir === '/' ? Object.keys(result.scripts).concat(Object.keys(result.hiddenScripts)) : [],
      directoryExists: dir =>
        dir === '/'
      // || dir.startsWith('/node_modules')
      ,
      getDirectories: dir =>
        dir === '/' ? ['node_modules'] : [],
      // resolveModuleNameLiterals: (moduleLiterals, containingFile, redirectedReference, options, containingSourceFile, reusedNames) =>
      //   []
    }),
    libdtsLoadedAsync: (() => {
      if (typeof libdtsOrPromise.then === 'function') {
        return libdtsOrPromise.then(libdts => {
          for (const k in libdts) {
            result.hiddenScripts[k] = libdts[k];
          }
          result.libdtsLoadedAsync = undefined;
        });
      }
    })()
  };

  return result;

  /**
   * @param {string} fn
   */
  function getCached(fn) {
    const text = result.hiddenScripts[fn] || result.scripts[fn];
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
