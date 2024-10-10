// @ts-check

/**
 * @typedef {'dormant' 
 *  | 'prepared'
 *  | 'running'
 *  | 'success'
 *  | 'fail'
 * } ScriptRuntimePhase
 */

export class ScriptRuntimeState {
  /**
   * @param {import('../../state-block-regions/find-code-blocks').CodeBlockNodeset} block
   */
  constructor(block) {
    this.block = block;

    /** @type {ScriptRuntimePhase} */
    this.phase = 'dormant';

    /** @type {import('./plugin-runtime').PreparedScript | undefined} */
    this.prepared = undefined;

    /** @type {number | undefined} */
    this.started = undefined;

    /** @type {number | undefined} */
    this.completed = undefined;

    /** @type {any} */
    this.result = undefined;
  }


}
