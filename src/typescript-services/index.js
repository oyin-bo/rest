// @ts-check

/**
 * @typedef {{
 *  ts: import('typescript'),
 *  languageService: import('typescript').LanguageService,
 *  stateVersion: number
 * }} LanguageServiceState
 */

/**
 * @typedef {LanguageServiceState & {
 *  update(updates: ScriptUpdates): void
 * }} LanguageServiceAccess
 */

/**
 * @typedef {{
 *  [filename: string]: { from: number, to: number, newText: string } | null
 * }} ScriptUpdates
 */

export {accessLanguageService} from './access-language-service';