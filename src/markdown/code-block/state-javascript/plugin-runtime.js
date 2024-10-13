// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { registerRuntime } from '../state/runtime/plugin-runtime-service';
import { execIsolation } from '../state/exec-isolation';

class JSRuntime {

  constructor() {
    this.onLog = (...args) => { };

    /** @type {ReturnType<typeof execIsolation> | undefined} */
    this.isolation = undefined;
  }

  /**
   * @param {{ code: string, language: string | null | undefined }[]} codeBlockRegions
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  parse(codeBlockRegions, editorState) {
    this.codeBlockRegions = codeBlockRegions;
    this.editorState = editorState;

    return codeBlockRegions.map(reg =>
      reg.language === 'JavaScript' ? { variables: undefined } : undefined);
  }

  /** @param {number} iBlock */
  runCodeBlock(iBlock) {
    if (!this.isolation)
      this.isolation = execIsolation();

    const block = this.codeBlockRegions?.[iBlock];
    if (block?.language !== 'JavaScript') return;

    return this.isolation.execScriptIsolated(block.code);
  }
}

const key = new PluginKey('JAVASCRIPT_RUNTIME');
export const javascriptRuntimePlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => {
      registerRuntime(
        editorState,
        new JSRuntime());
    },
    apply: (tr, pluginState, oldState, newState) => undefined
  },
});
