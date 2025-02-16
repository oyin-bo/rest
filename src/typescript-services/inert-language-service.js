// @ts-check

import { EditedScriptSnapshot } from './edited-script-snapshot';

/**
 * @typedef {import('.').LanguageServiceState & {
 *  update(updates: {
 *    scripts?: import('.').ScriptUpdates,
 *    libdts?: { [fileName: string]: string | null } | undefined,
 *    dependencies?: { [fileName: string]: string | null } | undefined,
 *    resetScripts?: boolean,
 *    forceLoadScripts?: boolean
*   }): void
 * }} InertLanguageService
 */

const SPURIOUS_PREFIXES = [
  '@typescript',
  '@types/typescript',
  'http:',
  'https:',
  '@types/http:',
  '@types/https:',
  '@types/node_modules'
];

/**
 * @param {import('typescript')} ts
 * @param {(fileName: string) => void} [missingDependency]
 * @param {string} [logName]
 * @returns {InertLanguageService}
 */
export function inertLanguageService(ts, missingDependency, logName) {

  var LOG_LOOKUP_FAILURES = false;

  /** @type {{ [filename: string]: EditedScriptSnapshot }} */
  let scriptSnapshots = {};

  /** @type {{ [filename: string]: EditedScriptSnapshot }} */
  const libdtsSnapshots = {};

  /** @type {{ [filename: string]: EditedScriptSnapshot }} */
  const dependenciesSnapshots = {};

  const documentRegistry = ts.createDocumentRegistry();

  const compilerOptions = ts.getDefaultCompilerOptions();
  compilerOptions.target = ts.ScriptTarget.ESNext;
  compilerOptions.jsx = ts.JsxEmit.React;
  compilerOptions.allowJs = true;
  compilerOptions.checkJs = true;
  compilerOptions.allowArbitraryExtensions = true;
  compilerOptions.allowSyntheticDefaultImports = true;
  compilerOptions.allowImportingTsExtensions = true;
  compilerOptions.skipLibCheck = true; // maybe no?
  compilerOptions.skipDefaultLibCheck = true;
  compilerOptions.resolveJsonModule = true;
  compilerOptions.module = ts.ModuleKind.NodeNext;
  compilerOptions.moduleResolution = ts.ModuleResolutionKind.Bundler;
  compilerOptions.maxNodeModuleJsDepth = 12; // affects syntax parsing of dependent modules

  /** @satisfies {import('typescript').LanguageServiceHost} */
  const lsHost = {
    getScriptFileNames: () =>
      Object.keys(scriptSnapshots).concat(
        Object.keys(libdtsSnapshots)),
    //.concat(Object.keys(dependenciesSnapshots)),
    getScriptVersion: fileName =>
      (scriptSnapshots[fileName] ||
        libdtsSnapshots[fileName] ||
        dependenciesSnapshots[fileName])?.version.toString(),
    getScriptSnapshot: fileName =>
      scriptSnapshots[fileName] ||
      libdtsSnapshots[fileName] ||
      dependenciesSnapshots[fileName] ||
      (LOG_LOOKUP_FAILURES && console.info('TS LSHost> No snapshot for ', fileName)),
    getCurrentDirectory: () =>
      '/',
    getCompilationSettings: () =>
      compilerOptions,
    getDefaultLibFileName: options =>
      '',
    fileExists: fileName => {
      const exists = !!(
        scriptSnapshots[fileName] ||
        libdtsSnapshots[fileName] ||
        dependenciesSnapshots[fileName]
      );
      if (fileName === '/package.json' || fileName === '/package.json') return true;

      if (!exists) {
        if (!SPURIOUS_PREFIXES.some(prefix => fileName.startsWith(prefix))) {
          updateMissingDependencies(fileName);
          if (LOG_LOOKUP_FAILURES) console.info('TS LSHost> File not found: ', fileName);
        }
      }

      return exists;
    },
    readFile: (fileName) => {
      const existingSnapshot = (scriptSnapshots[fileName] ||
        libdtsSnapshots[fileName] ||
        dependenciesSnapshots[fileName]);
      if (existingSnapshot) return existingSnapshot.getText(0, -1);
      if (fileName === '/package.json' || fileName === '/package.json') return JSON.stringify({
        type: 'module'
      });

      updateMissingDependencies(fileName);
      if (LOG_LOOKUP_FAILURES) console.info('TS LSHost> Read file not found: ', fileName);
    },
    directoryExists: dir => {
      if (dir === '/' ||
        dir === '/node_modules' ||
        dir === '/node_modules/@types') return true;

      if (SPURIOUS_PREFIXES.some(prefix => dir.startsWith(prefix))) return false;
      return dir.startsWith('/node_modules/');
    },
    // readDirectory: dir => {
    //   const dirContent = dir === '/' ? Object.keys(scriptSnapshots).concat(Object.keys(libdtsSnapshots)) : undefined;
    //   if (dirContent) updateMissingDependencies(dir);
    //   return dirContent || [];
    // },
    getDirectories: dir =>
      dir === '/' ? ['node_modules'] : [],
    // resolveModuleNameLiterals: (moduleLiterals, containingFile, redirectedReference, options, containingSourceFile, reusedNames) =>
    //   []

    // TODO: see into implementing these -
    // getResolvedModuleWithFailedLookupLocationsFromCache
    // installPackage

    // jsDocParsingMode: ts.JSDocParsingMode.ParseAll,
  };

  const languageService = ts.createLanguageService(
    lsHost,
    documentRegistry,
    ts.LanguageServiceMode.Semantic
  );

  /**
   * @type {InertLanguageService}
   */
  const inert = {
    ts,
    languageService,
    languageHost: lsHost,
    stateVersion: 0,
    update
  };

  const debugLog = {
    all: inert,
    version: ts.version,
    scriptSnapshots,
    libdtsSnapshots,
    dependenciesSnapshots,
    documentRegistry
  };

  if (logName) {
    console.log(logName + ' TypeScript language service ', debugLog);
  }

  return inert;

  /** @param {string} fileName */
  function updateMissingDependencies(fileName) {
    if (!missingDependency) return;

    const packageFileName = fileName.replace(/^(\/?)node_modules\//, '');
    if (packageFileName === fileName) return;

    if (packageFileName.startsWith('typescript') ||
      packageFileName.startsWith('@typescript') ||
      packageFileName.startsWith('@types/typescript') ||
      packageFileName.startsWith('http:') ||
      packageFileName.startsWith('https:') ||
      packageFileName.startsWith('@types/http:') ||
      packageFileName.startsWith('@types/https:')
    ) return;

    missingDependency(packageFileName);
  }

  /**
   * @type {InertLanguageService['update']}
   */
  function update({ scripts, libdts, dependencies, resetScripts, forceLoadScripts }) {
    let anyChanges = false;
    if (libdts) {
      for (const fileName in libdts) {
        const text = libdts[fileName];
        if (text === null) {
          delete libdtsSnapshots[fileName];
          anyChanges = true;
          continue;
        }

        libdtsSnapshots[fileName] = new EditedScriptSnapshot(null, 0, 0, text);
        anyChanges = true;
      }
    }

    for (const origFileName in dependencies) {
      const fileName = '/node_modules/' + origFileName.replace(/^(\/?)node_modules\//, '');
      const text = dependencies[origFileName];
      if (text === null) {
        delete dependenciesSnapshots[fileName];
        anyChanges = true;
        continue;
      }

      dependenciesSnapshots[fileName] = new EditedScriptSnapshot(null, 0, 0, text);
      anyChanges = true;
    }

    let maxVersion = 0;
    for (const snap of Object.values(scriptSnapshots)) {
      maxVersion = Math.max(maxVersion, snap.version);
    }

    if (resetScripts) {
      scriptSnapshots = {};
      debugLog.scriptSnapshots = scriptSnapshots;
    }

    if (scripts) {
      for (const fileName in scripts) {
        const edit = scripts[fileName];
        if (edit === null) {
          delete scriptSnapshots[fileName];
          anyChanges = true;
          continue;
        }

        if (!edit || (typeof edit !== 'object' && typeof edit !== 'string')) continue;

        let snapshot = scriptSnapshots[fileName];
        if (!snapshot || typeof snapshot !== 'object') {
          const newSnapshot = new EditedScriptSnapshot(null, 0, 0, typeof edit === 'string' ? edit : edit.newText);
          newSnapshot.version = maxVersion + 1;
          scriptSnapshots[fileName] = newSnapshot;
          anyChanges = true;
        } else {
          const editedSnapshot = snapshot.applyEdits(
            typeof edit === 'string' ? 0 : edit.from,
            typeof edit === 'string' ? -1 : edit.to,
            typeof edit === 'string' ? edit : edit.newText);
          if (editedSnapshot !== snapshot) {
            scriptSnapshots[fileName] = editedSnapshot;
            anyChanges = true;
          }
        }
      }
    }

    if (anyChanges || resetScripts)
      inert.stateVersion++;

    if (forceLoadScripts) {
      for (const fileName in scriptSnapshots) {
        const snap = scriptSnapshots[fileName];
        const refreshedSnap = new EditedScriptSnapshot(null, 0, 0, snap.getText(0, -1));
        if (snap) refreshedSnap.version = snap.version + 1;
        scriptSnapshots[fileName] = refreshedSnap;
      }
    }
  }

}
