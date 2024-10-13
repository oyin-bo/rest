// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { modifiesExecutionStateBlocks } from '../modifies-execution-state-blocks';
import { ExecutiveManager } from './executive-manager';

/**
 * @typedef {{
 *  executionStarted?: number,
 *  executionEnded?: number,
 *  succeeded?: boolean,
 *  error?: any,
 *  result?: any
 * }} CodeBlockState
 */

/**
 * @typedef {{
 *  current: number,
 *  executionStates: CodeBlockState[], 
 * }} DocumentCodeState
 */

export const setLargeResultAreaTextMeta = 'setLargeResultAreaText';

const pluginKey = new PluginKey('CODEBLOCK_RUNTIME');

export const codeBlockRuntimePlugin = new Plugin({
    key: pluginKey,
    filterTransaction: (tr, state) => {
      // let the code result changes flow normally
      if (tr.getMeta(setLargeResultAreaTextMeta)) return true;

      return !modifiesExecutionStateBlocks(tr);
    },
    state: {
      init: (config, editorState) => new ExecutiveManager(config, editorState),
      apply: (tr, pluginState, oldEditorState, newEditorState) => {
        pluginState.apply(tr, oldEditorState, newEditorState);
        return pluginState;
      }
    },
  view: editorView => {
    const pluginState = codeBlockRuntimePlugin.getState(editorView.state);
    pluginState?.initEditorView(editorView);
    return {};
  }
});

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 * @param {import('.').ExecutionRuntime} runtime
 */
export function registerRuntime(editorState, runtime) {
  const pluginState = codeBlockRuntimePlugin.getState(editorState);
  pluginState?.registerRuntime(runtime);
}
