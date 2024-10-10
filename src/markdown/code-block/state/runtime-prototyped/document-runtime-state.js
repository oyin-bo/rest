// @ts-check

export class DocumentRuntimeState {
  constructor() {
    /** @type {import('./script-runtime-state').ScriptRuntimePhase[]} */
    this.scriptStates = [];
  }

  /**
   * @param {import('../../state-block-regions/find-code-blocks').CodeBlockNodeset[]} codeBlockRegions
   * @param {import('./plugin-runtime').RuntimeProvider[]} runtimeProviders
   */
  documentUpdated(codeBlockRegions, runtimeProviders) {
  }

}