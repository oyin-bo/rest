// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { loadTS } from '../../../typescript-services/load-ts';
import { loadLibdts } from '../../../typescript-services/load-libdts';
import { getCodeBlockRegionsOfEditorState } from '../state-block-regions';
import { langServiceWithTS } from '../../../typescript-services/lang-service-with-ts';
import { codeBlockVirtualFileName } from './plugin-ast';


class TypeScriptLanguagePlugin {
  /**
   * @param {import('@milkdown/prose/state').EditorStateConfig} config
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  constructor(config, editorState) {
    this.config = config;
    this.editorState = editorState;
    /** @type {import('@milkdown/prose/view').EditorView | undefined} */
    this.editorView = undefined;

    // initialize asynchronously
    let libdtsOrPromise = loadLibdts();
    const tsOrPromise = loadTS();
    if (typeof tsOrPromise.then === 'function') {
      tsOrPromise.then(ts => {
        this.lang = langServiceWithTS(ts);

        if (typeof this.libdtsOrPromise.then !== 'function')
          this.lang.update({ libdts: this.libdtsOrPromise });
      });
    } else {
      this.lang = langServiceWithTS(tsOrPromise);
    }

    if (typeof libdtsOrPromise.then === 'function') {
      libdtsOrPromise.then(libdts => {
        this.libdtsOrPromise = libdts;

        if (this.lang) {
          this.lang.update({ libdts });
        } else {
          libdtsOrPromise = libdts;
        }
      });
    } else {
      if (this.lang)
        this.lang.update({ libdts: /** @type {Record<string, string>} */(libdtsOrPromise) });
    }

    if (this.lang) {
      const codeBlocksState = getCodeBlockRegionsOfEditorState(editorState);
      if (codeBlocksState) {
        this.iteration = codeBlocksState.codeOnlyIteration;

        /** @type {import('../../../typescript-services/lang-service-with-ts').LanguageContextUpdates['scripts']} */
        const updates = {};
        let anyUpdates = false;

        for (let iBlock = 0; iBlock < codeBlocksState.codeBlocks.length; iBlock++) {
          const block = codeBlocksState.codeBlocks[iBlock];
          const langType =
            block.language === 'TypeScript' ? this.lang.ts.ScriptKind.TSX :
              block.language === 'JavaScript' ? this.lang.ts.ScriptKind.JS :
                block.language === 'JSON' ? this.lang.ts.ScriptKind.JSON :
                  undefined;
          
          if (!langType) continue;

          anyUpdates = true;
          const virtualFileName = codeBlockVirtualFileName(iBlock, /** @type {*} */(block.language));
          updates[virtualFileName] = { from: 0, to: 0, newText: block.code };
        }

        this.lang.update({ scripts: updates });
      }
    }
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/state').EditorState} oldEditorState
   * @param {import('@milkdown/prose/state').EditorState} newEditorState
   */
  apply = (tr, oldEditorState, newEditorState) => {
    if (!tr.docChanged) return;
    if (!this.lang) return;

    const codeBlocksState = getCodeBlockRegionsOfEditorState(newEditorState);
    if (!codeBlocksState || codeBlocksState.codeOnlyIteration === this.iteration) return;

    this.iteration = codeBlocksState.codeOnlyIteration;

    /** @type {import('../../../typescript-services/lang-service-with-ts').LanguageContextUpdates['scripts']} */
    const updates = {};

    // TODO: walk through transaction steps, generate updates

    // TODO: alternatively, walk through code blocks and derive updates from comparison with previous state
  }

}

const key = new PluginKey('TYPESCRIPT_LANGUAGE_SERVICES');
export const typescriptLanguagePlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => new TypeScriptLanguagePlugin(config, editorState),
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
