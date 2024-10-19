// @ts-check

export { codeBlockRuntimePlugin } from './plugin-runtime-service';

/**
 * @typedef {{
 *  codeBlockStates: (ScriptRuntimeState | undefined)[],
 *  globalVariables: { name: string, value: any }[]
 * }} DocumentRuntimeState
 */

/**
 * @typedef {{
 *  phase: 'unknown',
 *  stale?: ScriptRuntimeStateSucceeded | ScriptRuntimeStateFailed
 * }} ScriptRuntimeStateUnknown
 */

/**
 * @typedef {{
 *  phase: 'parsed',
 *  variables?: string[],
 *  stale?: ScriptRuntimeStateSucceeded | ScriptRuntimeStateFailed
 * }} ScriptRuntimeStateParsed
 */

/**
 * @typedef {Omit<ScriptRuntimeStateParsed, 'phase'> & {
 *  phase: 'executing',
 *  started: number
 *  logs: { urgency?: 'error' | 'warning', output: any[] }[]
 * }} ScriptRuntimeStateExecuting
 */

/**
 * @typedef {Omit<ScriptRuntimeStateExecuting, 'phase' | 'stale'> & {
 *  phase: 'succeeded',
 *  completed: number,
 *  result: any
 * }} ScriptRuntimeStateSucceeded
 */

/**
 * @typedef {Omit<ScriptRuntimeStateExecuting, 'phase' | 'stale'> & {
 *  phase: 'failed',
 *  completed: number,
 *  error: any
 * }} ScriptRuntimeStateFailed
 */

/**
 * @typedef {ScriptRuntimeStateUnknown |
 *  ScriptRuntimeStateParsed |
 *  ScriptRuntimeStateExecuting |
 *  ScriptRuntimeStateSucceeded |
 *  ScriptRuntimeStateFailed
 * } ScriptRuntimeState
 */

/**
 * @typedef {{
 *  parse(args: {
 *    codeBlockRegions: { code: string, language: string | null | undefined }[],
 *    editorState: import('@milkdown/prose/state').EditorState
 * }): ({ variables?: string[] } | undefined)[];
 *  runCodeBlock(codeBlockIndex: number, globals: any[]): Promise<any> | any;
 *  hydrateReference?(reference: string): Promise<any>;
 *  onLog?: (output: LogOutput) => void;
 *  onInvalidate?: () => void;
 * }} ExecutionRuntime
 */

/**
 * @typedef {{
 *  urgency: 'error' | 'warning',
 *  outputs: any[]
 * }} LogOutput
 */