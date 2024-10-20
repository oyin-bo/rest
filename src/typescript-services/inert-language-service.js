// @ts-check

import { EditedScriptSnapshot } from './edited-script-snapshot';
import { loadDependencies } from './load-dependencies'; 

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

/**
 * @param {import('typescript')} ts
 * @param {(fileName: string) => void} [missingDependency]
 * @returns {InertLanguageService}
 */
export function inertLanguageService(ts, missingDependency) {

  /** @type {{ [filename: string]: EditedScriptSnapshot }} */
  let scriptSnapshots = {};

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
  compilerOptions.module = ts.ModuleKind.NodeNext;

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
        dependenciesSnapshots[fileName]
      );

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
    directoryExists: dir => {
      if (dir === '/' ||
        dir === '/node_modules' ||
        dir === '/node_modules/@types') return true;
      if (dir.startsWith('@typescript') ||
        dir.startsWith('@types/typescript') ||
        dir.startsWith('http:') ||
        dir.startsWith('https:') ||
        dir.startsWith('@types/http:') ||
        dir.startsWith('@types/https:')) return false;
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
    stateVersion: 0,
    update
  };

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

    if (resetScripts) scriptSnapshots = {};

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
        if (typeof edit === 'string') {
          // may want to do a diff here
          scriptSnapshots[fileName] = new EditedScriptSnapshot(null, 0, 0, edit);
        } else if (!snapshot || typeof snapshot !== 'object') {
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
      inert.stateVersion++;

    if (forceLoadScripts) {
      for (const fileName in scriptSnapshots) {
        const snap = scriptSnapshots[fileName];
        const ln = snap.getLength();
        const refreshedSnap = snap.applyEdits(ln - 1, ln, snap.getText(ln - 1, ln));
        scriptSnapshots[fileName] = refreshedSnap;
      }
    }
  }

}
