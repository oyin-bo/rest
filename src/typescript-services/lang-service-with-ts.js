// @ts-check

import { EditedScriptSnapshot } from './edited-script-snapshot';

/**
 * @typedef {{
 *  ts: import('typescript'),
 *  languageService: import('typescript').LanguageService,
 *  missingDependencies?: {
 *    paths: string[],
 *    libdts?: boolean
 *  },
 *  stateVersion: number,
 *  update(updates: LanguageContextUpdates): void
 * }} LanguageServiceAccess
 */

/**
 * @typedef {{
 *  scripts?: { [filename: string]: { from: number, to: number, newText: string } | null },
 *  libdts?: { [filename: string]: string },
 *  dependencies?: { [filename: string]: string[] }
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
  const typingsSnapshots = {};

  const documentRegistry = ts.createDocumentRegistry();

  const compilerOptions = ts.getDefaultCompilerOptions();
  compilerOptions.target = ts.ScriptTarget.ESNext;
  compilerOptions.allowJs = true;
  compilerOptions.checkJs = true;
  compilerOptions.skipLibCheck = true; // maybe no?
  compilerOptions.skipDefaultLibCheck = true;
  compilerOptions.resolveJsonModule = true;

  /** @satisfies {import('typescript').LanguageServiceHost} */
  const lsHost = {
    getScriptFileNames: () =>
      Object.keys(scriptSnapshots).concat(Object.keys(libdtsSnapshots)),
    getScriptVersion: fileName =>
      (scriptSnapshots[fileName] ||
        libdtsSnapshots[fileName] ||
        typingsSnapshots[fileName])?.version.toString(),
    getScriptSnapshot: fileName =>
      scriptSnapshots[fileName] ||
      libdtsSnapshots[fileName] ||
      typingsSnapshots[fileName],
    getCurrentDirectory: () =>
      '/',
    getCompilationSettings: () =>
      compilerOptions,
    getDefaultLibFileName: options =>
      '',
    fileExists: fileName => !!(
      scriptSnapshots[fileName] ||
      libdtsSnapshots[fileName] ||
      typingsSnapshots[fileName]),
    readFile: (fileName) =>
      (scriptSnapshots[fileName] ||
      libdtsSnapshots[fileName] ||
      typingsSnapshots[fileName])?.getText(0, -1),
    readDirectory: dir =>
      dir === '/' ? Object.keys(scriptSnapshots).concat(Object.keys(libdtsSnapshots)) : [],
    directoryExists: dir =>
      dir === '/'
    // || dir.startsWith('/node_modules')
    ,
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
   * @type {LanguageServiceAccess}
   */
  const access = {
    ts,
    languageService,
    missingDependencies: {
      paths: [],
      libdts: true
    },
    stateVersion: 0,
    update
  };

  return access;

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
      for (const fileName in dependencies) {
        const deps = dependencies[fileName];
        if (deps === null) {
          delete typingsSnapshots[fileName];
          anyChanges = true;
          continue;
        }

        if (!deps || !Array.isArray(deps)) continue;

        const text = deps.join('\n');
        typingsSnapshots[fileName] = new EditedScriptSnapshot(null, 0, 0, text);
        anyChanges = true;
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

    if (Object.keys(libdtsSnapshots)) {
      access.missingDependencies = {
        paths: [],
        libdts: true
      };
    }

    if (anyChanges)
      access.stateVersion++;

    // TODO: force regenerate dependency list
  }

}
