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

/** @type {Record<string, string> | undefined} */
var libdts;

/** @type {Promise<Record<string, string>> | undefined} */
var libdtsPromise;

function loadLibdts() {
  if (libdts) return libdts;
  if (libdtsPromise) return libdtsPromise;
  return libdtsPromise = new Promise((resolve, reject) => {
    window['libdts'] = resolvedLibds => {
      libdtsPromise = undefined;
      resolve(libdts = { ...resolvedLibds });
    };
    const script = document.createElement('script');
    script.src =
      location.hostname === 'localhost' ? './node_modules/ts-jsonp/index.js' :
        'https://unpkg.com/ts-jsonp';

    script.onload = () => {
      setTimeout(() => {
        script.remove();
      }, 1000);
    };
    script.onerror = (err) => {
      reject(err);
      setTimeout(() => {
        script.remove();
      }, 1000);
    };

    (document.body || document.head).appendChild(script);
  });
}