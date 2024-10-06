// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { getCodeBlockRegionsOfEditorView } from '../state-block-regions';

/**
 * @typedef {(args: {
 *  editorView: import('@milkdown/prose/view').EditorView,
 *  editorState: import('@milkdown/prose/state').EditorState,
 *  codeBlockIndex: number,
 *  codeBlockRegion: import('../state-block-regions/find-code-blocks').CodeBlockNodeset,
 *  codeOffset: number
 * }) => Promise<ScriptRuntimeState>} RuntimeProvider
 */

/**
 * @typedef {{
 *  start: number,
 *  end: number,
 *  success: number,
 *  result?: RuntimeReference
 *  error?: ErrorDetails,
 *  promise: Promise
 * }} ScriptRuntimeState
 */

/**
 * @typedef {{
 * }} RuntimeReference
 */

/**
 * @typedef {{
 * }} ErrorDetails
 */

class CodeRuntimeService {
  /**
   * @param {import('@milkdown/prose/state').EditorStateConfig} config
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  constructor(config, editorState) {
    this.config = config;
    this.editorState = editorState;

    /** @type {import('@milkdown/prose/view').EditorView | undefined} */
    this.editorView = undefined;

    /**
     * @type {RuntimeProvider[]}
     */
    this.runtimeProviders = [];
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/state').EditorState} oldEditorState
   * @param {import('@milkdown/prose/state').EditorState} newEditorState
   */
  apply = (tr, oldEditorState, newEditorState) => {
    // view already processes the updates, maybe we skip this one?
  };

  /**
   * @param {import('@milkdown/prose/view').EditorView} editorView
   */
  initView = (editorView) => {
    this.editorView = editorView;
    this.updateRuntimes();
  };

  /**
   * @param {RuntimeProvider} runtimeProvider
   */
  addRuntimeProvider = (runtimeProvider) => {
    this.runtimeProviders.push(runtimeProvider);
    const self = this;

    this.updateRuntimes();

    return removeRuntimeProvider;

    function removeRuntimeProvider() {
      const index = self.runtimeProviders.indexOf(runtimeProvider);
      if (index >= 0) self.runtimeProviders.splice(index, 1);
      this.updateRuntimes();
    }
  };

  updateRuntimes = () => {
    // TODO: iterate and rerun?
  };
}

const key = new PluginKey('RUNTIME_SERVICE');
export const runtimeServicePlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => new CodeRuntimeService(config, editorState),
    apply: (tr, pluginState, oldState, newState) => {
      pluginState.apply(tr, oldState, newState);
      return pluginState;
    }
  },
  view: (editorView) => {
    const pluginState = runtimeServicePlugin.getState(editorView.state);
    pluginState?.initView(editorView);

    return {
      update: (editorView, editorState) => {
        const pluginState = runtimeServicePlugin.getState(editorState);
        pluginState?.updateRuntimes();
      }
    };
  }
});

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 * @param {RuntimeProvider} runtimeProvider
 */
export function addRuntimeProviderToEditorState(editorState, runtimeProvider) {
  const pluginState = runtimeServicePlugin.getState(editorState);
  return pluginState?.addRuntimeProvider(runtimeProvider);
}

/**
 * @param {import('@milkdown/prose/view').EditorView} editorView
 * @param {RuntimeProvider} runtimeProvider
 */
export function addRuntimeProviderToEditorView(editorView, runtimeProvider) {
  return addRuntimeProviderToEditorState(editorView.state, runtimeProvider);
}