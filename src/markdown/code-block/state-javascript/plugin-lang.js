// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { ReplaceStep, ReplaceAroundStep } from '@milkdown/prose/transform';

import { loadTS } from '../../../typescript-services/load-ts';
import { loadLibdts } from '../../../typescript-services/load-libdts';
import { getCodeBlockRegionsOfEditorState } from '../state-block-regions';
import { langServiceWithTS } from '../../../typescript-services/lang-service-with-ts';


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

    /**
     * @satisfies {ReturnType<typeof getCodeBlockRegionsOfEditorState>}
     */
    this.codeBlockRegions = {
      codeBlocks: [],
      codeOnlyIteration: -1
    };

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
      const codeBlocksRegions = getCodeBlockRegionsOfEditorState(editorState);
      if (codeBlocksRegions) {
        this.codeBlockRegions = codeBlocksRegions;

        // initial update, create all the regions

        /** @type {import('../../../typescript-services/lang-service-with-ts').LanguageContextUpdates['scripts']} */
        const updates = {};
        let anyUpdates = false;

        for (let iBlock = 0; iBlock < codeBlocksRegions.codeBlocks.length; iBlock++) {
          const block = codeBlocksRegions.codeBlocks[iBlock];
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

        console.log('TypeScriptLanguagePlugin initial update ', {
          updates,
          codeBlocksRegions: this.codeBlockRegions
        });

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

    const codeBlocksRegions = getCodeBlockRegionsOfEditorState(newEditorState);
    if (!codeBlocksRegions ||
      codeBlocksRegions.codeOnlyIteration === this.codeBlockRegions.codeOnlyIteration) return;

    const updates = deriveUpdatesForTransactionSteps(
      tr.steps,
      this.codeBlockRegions.codeBlocks || [],
      codeBlocksRegions.codeBlocks);

    console.log('TypeScriptLanguagePlugin incremental update ', {
      updates,
      codeBlocksRegions,
      oldCodeBlockRegions: this.codeBlockRegions
    });

    this.codeBlockRegions = codeBlocksRegions;
    this.lang.update({ scripts: updates });
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

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 */
export function getTypescriptLanguageServiceFromEditorState(editorState) {
  const pluginState = typescriptLanguagePlugin.getState(editorState);
  return pluginState?.lang;
}

/**
 * @param {import('@milkdown/prose/view').EditorView} editorView
 */
export function getTypescriptLanguageServiceFromEditorView(editorView) {
  const pluginState = typescriptLanguagePlugin.getState(editorView.state);
  return pluginState?.lang;
}

/**
 * @param {import("prosemirror-transform").Step[]} steps
 * @param {import("../state-block-regions/find-code-blocks").CodeBlockNodeset[]} oldCodeBlockRegions
 * @param {import("../state-block-regions/find-code-blocks").CodeBlockNodeset[]} newCodeBlockRegions
 */
function deriveUpdatesForTransactionSteps(
  steps,
  oldCodeBlockRegions,
  newCodeBlockRegions
) {

  /** @type {import('../../../typescript-services/lang-service-with-ts').LanguageContextUpdates['scripts']} */
  const updates = {};

  // TODO: apply transaction steps
  if (Math.sin(1) > 1) {
    for (const step of steps) {
      if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep)) continue;

      for (let i = 0; i < oldCodeBlockRegions.length; i++) {
        const script = oldCodeBlockRegions[i].script;

        // TODO: which coordinate space is this in?
        // The original document, or document after previous steps ?
        const scriptFrom = script.pos + 1;
        const scriptTo = script.pos + script.node.nodeSize - 1;

        const overlaps = step.from < scriptTo && step.to >= scriptFrom;
        if (!overlaps) continue;
      }
    }
  }

  for (let iBlock = 0; iBlock < oldCodeBlockRegions.length; iBlock++) {
    const oldRegion = oldCodeBlockRegions[iBlock];
    const newRegion = newCodeBlockRegions[iBlock];

    const oldFileName =
      codeBlockVirtualFileName(iBlock, oldRegion.language);
    const newFileName =
      newRegion &&
      codeBlockVirtualFileName(iBlock, newRegion.language);

    if (!oldFileName) {
      if (newFileName) updates[newFileName] = { from: 0, to: 0, newText: newRegion.code };
    } else if (!newFileName) {
      updates[oldFileName] = null;
    } else if (oldFileName !== newFileName) {
      updates[oldFileName] = null;
      updates[newFileName] = { from: 0, to: 0, newText: newRegion.code }
    } else if (oldRegion.code !== newRegion.code) {
      // looking for changes

      let retainLead = 0;
      const minSize = Math.min(oldRegion.code.length, newRegion.code.length);

      for (retainLead = 0; retainLead < minSize; retainLead++) {
        if (oldRegion.code.charAt(retainLead) !== newRegion.code.charAt(retainLead)) {
          break;
        }
      }

      let retainTrail = 0;
      for (retainTrail = 0; retainLead + retainTrail < minSize; retainTrail++) {
        if (oldRegion.code.charAt(oldRegion.code.length - 1 - retainTrail) !==
          newRegion.code.charAt(newRegion.code.length - 1 - retainTrail)) {
          break;
        }
      }

      updates[newFileName] = {
        from: retainLead,
        to: oldRegion.code.length - retainTrail,
        newText: newRegion.code.substring(retainLead, newRegion.code.length - retainTrail)
      };
    }
  }

  for (let iBlock = oldCodeBlockRegions.length; iBlock < newCodeBlockRegions.length; iBlock++) {
    const newRegion = newCodeBlockRegions[iBlock];
    const newFileName =
      newRegion &&
      codeBlockVirtualFileName(iBlock, newRegion.language);

    if (newFileName)
      updates[newFileName] = { from: 0, to: 0, newText: newRegion.code };
  }

  return updates;
}

/**
 * @param {number} index
 * @param {'JavaScript' | 'TypeScript' | 'JSON' | null | undefined} lang
 */
export function codeBlockVirtualFileName(index, lang) {
  return 'code' + (index + 1) + (
    lang === 'TypeScript' ? '.ts' :
      lang === 'JSON' ? '.json' :
        lang === 'JavaScript' ? '.js' :
          undefined
  );
}