// @ts-check

import { EditorState, Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';

import { makeLanguageService } from './lang-service';

export const EDITOR_VIEW_PLUGIN = 'EDITOR_VIEW_PLUGIN';
export const editorViewPluginKey = new PluginKey(EDITOR_VIEW_PLUGIN);

export const EDITOR_VIEW_SET_STATE = 'EDITOR_VIEW_SET_STATE';

/**
 * @typedef {{
 *  editorView: import('@milkdown/prose/view').EditorView,
 *  promise?: never, resolve?: never
 * } | {
 *  editorView?: never,
 *  promise: Promise<import('@milkdown/prose/view').EditorView>,
 *  resolve: (value: import('@milkdown/prose/view').EditorView) => void
 * }} InternalState
 */

/**
 * Allows retrieving EditorView from editor state.
 */
export const editorViewPlugin = new Plugin({
  key: editorViewPluginKey,
  state: {
    init: () => {
      /** @type {*} */
        let resolve;
        /** @type {Promise<import('@milkdown/prose/view').EditorView>} */
        const promise = new Promise(r => resolve = r);

      return /** @type {InternalState} */({ promise, resolve });
    },
    apply: (tr, prevState) => {
      const editorView = tr.getMeta(EDITOR_VIEW_SET_STATE);
      return editorView ? { editorView } : prevState;
    }
  },
  view: editorView => {
    editorView.dispatch(editorView.state.tr.setMeta(EDITOR_VIEW_SET_STATE, editorView));
    return {};
  }
});

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 */
export function getEditorView(editorState) {
  const internalState = editorViewPlugin.getState(editorState);
  if (internalState?.editorView) return internalState.editorView;
  else return /** @type {Promise<import('@milkdown/prose/view').EditorView>}*/(internalState?.promise);
}
