// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { findCodeBlocks } from './find-code-blocks';

class CodeBlockRegionsPlugin {
  /**
   * @param {import('@milkdown/prose/state').EditorStateConfig} config
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  constructor(config, editorState) {
    this.config = config;
    this.editorState = editorState;
    /** @type {import('@milkdown/prose/view').EditorView | undefined} */
    this.editorView = undefined;

    this.codeBlocks = findCodeBlocks(editorState.doc);
    this.codeOnlyIteration = 0;
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/state').EditorState} oldEditorState
   * @param {import('@milkdown/prose/state').EditorState} newEditorState
   */
  apply = (tr, oldEditorState, newEditorState) => {
    if (!tr.docChanged) return;

    const codeBlocks = findCodeBlocks(newEditorState.doc);
    if (!codeMatch(codeBlocks, this.codeBlocks)) this.codeOnlyIteration++;

    this.codeBlocks = codeBlocks;
  }
}

const key = new PluginKey('CODE_BLOCK_REGIONS');
export const codeBlockRegionsPlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => new CodeBlockRegionsPlugin(config, editorState),
    apply: (tr, pluginState, oldState, newState) => {
      pluginState.apply(tr, oldState, newState);
      return pluginState;
    }
  },
  view: (editorView) => {
    const pluginState = key.getState(editorView.state);
    pluginState.editorView = editorView;

    return {};
  }
});

/**
 * 
 * @param {import('@milkdown/prose/state').EditorState} editorState 
 */
export function getCodeBlockRegionsOfEditorState(editorState) {
  const pluginState = codeBlockRegionsPlugin.getState(editorState);
  return pluginState && { codeBlocks: pluginState.codeBlocks, codeOnlyIteration: pluginState.codeOnlyIteration };
}

/**
 * @param {import('@milkdown/prose/view').EditorView} editorView
 */
export function getCodeBlockRegionsOfEditorView(editorView) {
  return getCodeBlockRegionsOfEditorState(editorView.state);
}

/**
 * @param {import('./find-code-blocks').CodeBlockNodeset[]} codeBlocks1
 * @param {import('./find-code-blocks').CodeBlockNodeset[]} codeBlocks2
 */
function codeMatch(codeBlocks1, codeBlocks2) {
  if (codeBlocks1.length !== codeBlocks2.length) return false;

  for (let i = 0; i < codeBlocks1.length; i++) {
    if (codeBlocks1[i].code !== codeBlocks2[i].code ||
      codeBlocks1[i].language !== codeBlocks2[i].language) {
      return false;
    }
  }

  return true;
}
