// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { getCodeBlockRegionsOfEditorState, getCodeBlockRegionsOfEditorView } from '../../state-block-regions';
import { ScriptRuntimeState } from './script-runtime-state';

/**
 * @typedef {(args: {
 *  editorView: import('@milkdown/prose/view').EditorView,
 *  editorState: import('@milkdown/prose/state').EditorState,
 *  codeBlockRegions: import('../../state-block-regions/find-code-blocks').CodeBlockNodeset[]
 * }) => Promise<(PreparedScript | undefined)[]> | undefined} RuntimeProvider
 */

/**
 * @typedef {{
 *  run(): Promise<any>;
 * }} PreparedScript
 */

/**
 * @typedef {{
 *  __PROXY_TTY_REMOTE__: ProxyTtyTag
 * }} ProxyTtyRemote
 */

/**
 * @typedef {{
 *  key: any,
 *  function?: ProxyTtyFunctionAspect,
 *  promise?: boolean,
 *  iterable?: boolean,
 *  asyncIterable?: boolean,
 *  proto?: any
 * }} ProxyTtyTag
 */

/**
 * @typedef {{
 *  name: string,
 *  asString: string
 * }} ProxyTtyFunctionAspect
 */

/**
 * @typedef {{
 *  name: string,
 *  asString: string
 * }} ProxyTtyDOMElement
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

    /**
     * @type {(ScriptRuntimeState | undefined)[]}
     */
    this.runtimeStates = [];

    this.runtimeCodeVersionCounter = 0;
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

    const markScriptStatesStale = () => {
      this.runtimeCodeVersionCounter++;

      const codeBlockRegions = getCodeBlockRegionsOfEditorState(this.editorState);
      if (!codeBlockRegions) return;

      if (this.runtimeStates.length > codeBlockRegions.codeBlocks.length) {
        // TODO: abort any running scripts?
        this.runtimeStates.length = codeBlockRegions.codeBlocks.length;
      }

      for (let iBlock = 0; iBlock < codeBlockRegions.codeBlocks.length; iBlock++) {
        const block = codeBlockRegions.codeBlocks[iBlock];
        const runtimeState = this.runtimeStates[iBlock];
        if (runtimeState) {
          runtimeState.block = block;
          runtimeState.stale = true;

          this.updateFormattedRuntimeResultsInView(iBlock);
        }
      }
    };

    const requestUpdatesFromProviders = () => {
      if (!this.editorView) return;
      const codeBlockRegions = getCodeBlockRegionsOfEditorState(this.editorState);
      if (!codeBlockRegions) return;

      /** @type {boolean[]} */
      let updated = [];
      for (const runti of this.runtimeProviders) {
        const preparedScripts = runti({
          editorState: this.editorState,
          editorView: this.editorView,
          codeBlockRegions: codeBlockRegions.codeBlocks
        });

        if (!preparedScripts) continue;

        for (let iBlock = 0; iBlock < codeBlockRegions.codeBlocks.length; iBlock++) {
          const prepared = preparedScripts[iBlock];
          if (!prepared) continue;

          const block = codeBlockRegions.codeBlocks[iBlock];
          const runtimeState = this.runtimeStates[iBlock];
          if (!runtimeState) {
            this.runtimeStates[iBlock] = {
              block,
              prepared
            };
          } else {
            runtimeState.prepared = prepared;
          }

          updated[iBlock] = true;
        }

        for (let iBlock = 0; iBlock < codeBlockRegions.codeBlocks.length; iBlock++) {
          if (!updated[iBlock]) {
            // TODO destroy, abort and abandon
            this.runtimeStates[iBlock] = undefined;
          }
        }
      }

      clearTimeout(this.requestUpdatesFromProvidersDebounceTimeout);
      this.requestUpdatesFromProvidersDebounceTimeout = setTimeout(triggerScriptRun, 10);
    };

    const triggerScriptRun = async () => {
      const currentCodeVersion = this.runtimeCodeVersionCounter;
      for (let iBlock = 0; iBlock < this.runtimeStates.length; iBlock++) {
        if (currentCodeVersion !== this.runtimeCodeVersionCounter) return;

        const rState = this.runtimeStates[iBlock];
        if (!rState) continue;
        try {
          rState.started = Date.now();
          const promise = rState.prepared.run();
          const result = await promise;
          if (currentCodeVersion !== this.runtimeCodeVersionCounter) return;

          rState.completed = Date.now();
          rState.success = true;
          rState.result = result;
        } catch (error) {
          if (currentCodeVersion !== this.runtimeCodeVersionCounter) return;

          rState.completed = Date.now();
          rState.success = false;
          rState.result = error;
        }

        this.updateFormattedRuntimeResultsInView(iBlock);
      }
    };

    markScriptStatesStale();

    clearTimeout(this.requestUpdatesFromProvidersDebounceTimeout);
    this.requestUpdatesFromProvidersDebounceTimeout = setTimeout(requestUpdatesFromProviders, 600);

  };

  /** @param {number} codeBlockIndex */
  updateFormattedRuntimeResultsInView = (codeBlockIndex) => {
    // TODO: update the view with the results
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