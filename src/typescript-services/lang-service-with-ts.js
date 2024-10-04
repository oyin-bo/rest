// @ts-check

/**
 * @typedef {{
 *  languageService: import('typescript').LanguageService,
 *  applyEdits(edits: { [filename: string]: { from: number, to: number, newText: string } | null }): void
 * }} LanguageServiceAccess
 */

/**
 * @param {import('typescript')} ts
 */
export function langServiceWithTS(ts) {

  const documentRegistry = ts.createDocumentRegistry();
  
  /**
   * @param {{
   *  [filename: string]: { from: number, to: number, newText: string } | null
   * }} edits 
   */
  function applyEdits(edits) {
  }

}
