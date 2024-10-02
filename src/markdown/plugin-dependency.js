// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

/**
 * @template T
 * @typedef {(arg: {
 *  config: import('@milkdown/prose/state').EditorStateConfig,
 *  editorState: import('@milkdown/prose/state').EditorState,
 *  editorView?: import('@milkdown/prose/view').EditorView,
 *  update: (value: T) => void,
 *  from?: {
 *    transaction: import('@milkdown/prose/state').Transaction,
 *    value: T,
 *    editorState: import('@milkdown/prose/state').EditorState
 * }
 * }) => T} DeriveDependency
 */

/**
 * @template T
 * @typedef {{
 * }} DependencyOptions
 */

/**
 * @template T
 * @param {{
 *  derive: DeriveDependency<T>,
 *  name?: string,
 *  update?: 'never' | 'docChanged' | 'selectionChanged' | 'all'
 * }} _
 */
export function pluginDependency({ name, derive, update }) {

  /**
   * @typedef {{
   *  config: any,
   *  value: T,
   *  editorView?: import('@milkdown/prose/view').EditorView,
   *  update: (value: T) => void
   * }} InternalState
   */
  const META_UPDATE_INTERNAL_STATE = name + '_META_UPDATE_INTERNAL_STATE';
  const pluginKey = new PluginKey(name);
  /** @type {Plugin<InternalState>} */
  const plugin = new Plugin({
    key: pluginKey,
    state: {
      init: (config, editorState) => {
        /** @type {InternalState} */
        const initialState = {
          config,
          value: derive({
            config,
            editorState,
            editorView: undefined,
            update
          }),
          editorView: undefined,
          update
        };
        return initialState;

        /** @param {T} value */
        function update(value) {
          const internalState = plugin.getState(editorState) || initialState;
          if (!internalState.editorView) {
            internalState.value = value;
          } else {
            internalState.editorView.dispatch(
              internalState.editorView.state.tr.setMeta(META_UPDATE_INTERNAL_STATE, { state: value }));
          }
        }
      },
      apply: (tr, prevState, oldEditorState, newEditorState) => {
        const meta = tr.getMeta(META_UPDATE_INTERNAL_STATE);
        if (meta)
          return { ...prevState, ...meta };

        if (update === 'never') return prevState;
        if (update === 'docChanged' && !tr.docChanged) return prevState;
        if (update === 'selectionChanged' && !tr.selectionSet) return prevState;

        const value = derive({
          config: prevState.config,
          editorState: newEditorState,
          editorView: prevState.editorView,
          update: prevState.update,
          from: {
            editorState: newEditorState,
            transaction: tr,
            value: prevState.value
          }
        });

        return { ...prevState, value };
      }
    },
    view: editorView => {
      const internalState = plugin.getState(editorView.state);
      editorView.dispatch(
        editorView.state.tr.setMeta(
          META_UPDATE_INTERNAL_STATE,
          internalState ? { value: internalState.value, editorView } : { editorView }));

      return {};
    }
  });

  /**
   * 
   * @param {import('@milkdown/prose/state').EditorState} editorState 
   * @returns {T | undefined} 
   */
  function getValue(editorState) {
    return plugin.getState(editorState)?.value;
  }

  return { plugin, getValue };
}
