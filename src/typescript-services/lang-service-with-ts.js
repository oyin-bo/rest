// @ts-check

import { EditedScriptSnapshot } from './edited-script-snapshot';

/**
 * @typedef {{
 *  ts: import('typescript'),
 *  languageService: import('typescript').LanguageService,
 *  missingDependencies: MissingDependencyInfo,
 *  stateVersion: number,
 *  update(updates: LanguageContextUpdates): void,
 * }} LanguageServiceAccess
 */

/**
 * @typedef {{
 *  paths: string[],
 *  change: Promise<MissingDependencyInfo>
 * }} MissingDependencyInfo
 */

/**
 * @typedef {{
 *  scripts?: { [filename: string]: { from: number, to: number, newText: string } | null },
 *  libdts?: { [filename: string]: string },
 *  dependencies?: { [filename: string]: string }
 * }} LanguageContextUpdates
 */

/**
 * @param {import('typescript')} ts
 * @returns {LanguageServiceAccess}
 */
export function langServiceWithTS(ts) {

  /** @type {{ [filename: string]: EditedScriptSnapshot }} */
  const scriptSnapshots = {};

  /** @type {{ [filename: string]: EditedScriptSnapshot }} */
  const libdtsSnapshots = {};

  /** @type {{ [filename: string]: EditedScriptSnapshot }} */
  const dependenciesSnapshots = {};

  const documentRegistry = ts.createDocumentRegistry();

  const compilerOptions = ts.getDefaultCompilerOptions();
  compilerOptions.target = ts.ScriptTarget.ESNext;
  compilerOptions.allowJs = true;
  compilerOptions.checkJs = true;
  compilerOptions.skipLibCheck = true; // maybe no?
  compilerOptions.skipDefaultLibCheck = true;
  compilerOptions.resolveJsonModule = true;
  compilerOptions.module = ts.ModuleKind.ESNext;

  /** @satisfies {import('typescript').LanguageServiceHost} */
  const lsHost = {
    getScriptFileNames: () =>
      Object.keys(scriptSnapshots).concat(Object.keys(libdtsSnapshots)),
    getScriptVersion: fileName =>
      (scriptSnapshots[fileName] ||
        libdtsSnapshots[fileName] ||
        dependenciesSnapshots[fileName])?.version.toString(),
    getScriptSnapshot: fileName =>
      scriptSnapshots[fileName] ||
      libdtsSnapshots[fileName] ||
      dependenciesSnapshots[fileName],
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
        dependenciesSnapshots[fileName]);
      if (!exists) updateMissingDependencies(fileName);
      return exists;
    },
    readFile: (fileName) => {
      const existingSnapshot = (scriptSnapshots[fileName] ||
        libdtsSnapshots[fileName] ||
        dependenciesSnapshots[fileName]);
      if (existingSnapshot) return existingSnapshot.getText(0, -1);
      updateMissingDependencies(fileName);
    },
    readDirectory: dir => {
      const dirContent = dir === '/' ? Object.keys(scriptSnapshots).concat(Object.keys(libdtsSnapshots)) : undefined;
      if (dirContent) updateMissingDependencies(dir);
      return dirContent || [];
    },
    directoryExists: dir => {
      const dirExists = dir === '/';
      // || dir.startsWith('/node_modules')

      if (!dirExists) updateMissingDependencies(dir);
      return dirExists;
    },
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

  let missingDependenciesResolve;

  /**
   * @type {LanguageServiceAccess}
   */
  const access = {
    ts,
    languageService,
    missingDependencies: {
      paths: [],
      change: new Promise(resolve => missingDependenciesResolve = resolve)
    },
    stateVersion: 0,
    update
  };

  return access;

  var missingDependenciesDebounceTimeout;
  var missingDependenciesQueued;

  function updateMissingDependencies(fileName) {
    const packageFileName = fileName.replace(/^(\/?)node_modules\//, '');
    if (packageFileName === fileName) return;

    if (access.missingDependencies.paths.indexOf(packageFileName) >= 0) return;
    if (missingDependenciesQueued?.indexOf(packageFileName) >= 0) return;

    if (!missingDependenciesQueued) missingDependenciesQueued = [packageFileName];
    else missingDependenciesQueued.push(packageFileName);

    if (missingDependenciesDebounceTimeout) return;
    missingDependenciesDebounceTimeout = setTimeout(() => {
      const resolve = missingDependenciesResolve;
      access.missingDependencies = {
        paths: missingDependenciesQueued,
        change: new Promise(resolve => missingDependenciesResolve = resolve)
      };
      resolve(access.missingDependencies);
    }, 10);
  }

  /**
   * @type {LanguageServiceAccess['update']}
   */
  function update({ scripts, libdts, dependencies }) {
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

    if (dependencies) {
      for (const origFileName in dependencies) {
        const fileName = 'node_modules/' + origFileName.replace(/^(\/?)node_modules\//, '');
        const text = dependencies[fileName];
        if (text === null) {
          delete dependenciesSnapshots[fileName];
          anyChanges = true;
          continue;
        }

        dependenciesSnapshots[fileName] = new EditedScriptSnapshot(null, 0, 0, text);
        anyChanges = true;

        // TODO: update missingDependencies
      }
    }

    if (scripts) {
      for (const fileName in scripts) {
        const edit = scripts[fileName];
        if (edit === null) {
          delete scriptSnapshots[fileName];
          anyChanges = true;
          continue;
        }

        if (!edit || typeof edit !== 'object') continue;

        let snapshot = scriptSnapshots[fileName];
        if (!snapshot || typeof snapshot !== 'object') {
          const newSnapshot = new EditedScriptSnapshot(null, 0, 0, edit.newText);
          scriptSnapshots[fileName] = newSnapshot;
        } else {
          const editedSnapshot = snapshot.applyEdits(
            edit.from,
            edit.to,
            edit.newText);

          scriptSnapshots[fileName] = editedSnapshot;
          anyChanges = true;
        }
      }
    }

    if (anyChanges)
      access.stateVersion++;

    // TODO: force regenerate dependency list
  }

}
