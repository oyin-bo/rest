// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { ReplaceAroundStep, ReplaceStep } from '@milkdown/prose/transform';

import { langServiceWithTS } from '../../../typescript-services/lang-service-with-ts';
import { loadLibdts } from '../../../typescript-services/load-libdts';
import { loadTS } from '../../../typescript-services/load-ts';
import { getCodeBlockRegionsOfEditorState } from '../state-block-regions';

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

    this.codeBlockRegions = getCodeBlockRegionsOfEditorState(editorState) ||
    /**
     * @type {NonNullable<ReturnType<typeof getCodeBlockRegionsOfEditorState>>}
     */
    {
      codeBlocks: [],
      codeOnlyIteration: 0,
      codeOrPositionsIteration: 0
    };

    this.hiddenUpdateCount = 0;

    this.codeBlockRegionsState = this.recalcCodeBlockRegionsState();

    // initialize asynchronously
    let libdtsOrPromise = loadLibdts();
    const tsOrPromise = loadTS();
    if (typeof tsOrPromise.then === 'function') {
      tsOrPromise.then(ts => {
        this.lang = langServiceWithTS(ts);
        this.hiddenUpdateCount++;

        if (typeof libdtsOrPromise.then !== 'function')
          this.lang.update({
            libdts: /** @type {Record<string,string>} */(libdtsOrPromise)
          });

        this.hydrateCodeBlockRegionsToLanguageService();
        this.editorView?.dispatch(
          this.editorView.state.tr.setMeta('trigger reload due to TypeScript initialized', this.lang));
      });
    } else {
      this.lang = langServiceWithTS(tsOrPromise);
      this.hydrateCodeBlockRegionsToLanguageService();
    }

    if (typeof libdtsOrPromise.then === 'function') {
      libdtsOrPromise.then(libdts => {
        libdtsOrPromise = libdts;
        this.hiddenUpdateCount++;

        if (this.lang) {
          this.lang.update({ libdts });
          this.editorView?.dispatch(
            this.editorView.state.tr.setMeta('trigger reload due to TypeScript lib.d.ts loaded', this.lang));
        } else {
          libdtsOrPromise = libdts;
        }
      });
    } else {
      if (this.lang)
        this.lang.update({ libdts: /** @type {Record<string, string>} */(libdtsOrPromise) });
    }
  }

  hydrateCodeBlockRegionsToLanguageService = () => {
    if (!this.lang) return; // this should never happen

    /** @type {import('../../../typescript-services/lang-service-with-ts').LanguageContextUpdates['scripts']} */
    const updates = {};
    let anyUpdates = false;

    for (let iBlock = 0; iBlock < this.codeBlockRegions.codeBlocks.length; iBlock++) {
      const block = this.codeBlockRegions.codeBlocks[iBlock];
      const langType =
        block.language === 'TypeScript' ? this.lang.ts.ScriptKind.TSX :
          block.language === 'JavaScript' ? this.lang.ts.ScriptKind.JS :
            block.language === 'JSON' ? this.lang.ts.ScriptKind.JSON :
              undefined;

      if (!langType) continue;

      anyUpdates = true;
      const virtualFileName = codeBlockVirtualFileName(iBlock, /** @type {*} */(block.language));
      if (virtualFileName)
        updates[virtualFileName] = { from: 0, to: 0, newText: block.code };
    }

    console.log('TypeScriptLanguagePlugin initial update ', {
      updates,
      codeBlockRegions: this.codeBlockRegions
    });

    this.lang.update({ scripts: updates });
  };

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/state').EditorState} oldEditorState
   * @param {import('@milkdown/prose/state').EditorState} newEditorState
   */
  apply = (tr, oldEditorState, newEditorState) => {
    if (!tr.docChanged) return;

    const codeBlocksRegions = getCodeBlockRegionsOfEditorState(newEditorState);

    if (!codeBlocksRegions) return;
    if (codeBlocksRegions.codeOrPositionsIteration === this.codeBlockRegions.codeOrPositionsIteration) {
      if (codeBlocksRegions.codeOnlyIteration === this.codeBlockRegions.codeOnlyIteration) {
        // code didn't change, but positions did - no need to update anything but regions themselves
        this.codeBlockRegions = codeBlocksRegions;
        return;
      }
    }

    const updates = deriveUpdatesForTransactionSteps(
      tr.steps,
      this.codeBlockRegions.codeBlocks || [],
      codeBlocksRegions.codeBlocks);

    this.codeBlockRegions = codeBlocksRegions;
    this.codeBlockRegionsState = this.recalcCodeBlockRegionsState();

    if (!this.lang) return;

    this.lang.update({ scripts: updates });
  };

  recalcCodeBlockRegionsState = () => {
    const result = [];
    for (let iBlock = 0; iBlock < this.codeBlockRegions.codeBlocks.length; iBlock++) {
      const block = this.codeBlockRegions.codeBlocks[iBlock];
      const minCodeBlockPos = block.script.pos + 1;
      const maxCodeBlockPos = block.script.pos + block.script.node.nodeSize - 1;
      const codeBlockFileName = codeBlockVirtualFileName(iBlock, block.language);
      result.push({
        fileName: codeBlockFileName,
        index: iBlock,
        block: block,
        documentFrom: minCodeBlockPos,
        documentTo: maxCodeBlockPos
      });
    }

    return result;
  };

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
  if (!lang) return undefined;
  return 'code' + (index + 1) + (
    lang === 'TypeScript' ? '.ts' :
      lang === 'JSON' ? '.json' :
        lang === 'JavaScript' ? '.js' :
          undefined
  );
}

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 * @param {number} pos
 */
export function resolveDocumentPositionToTypescriptCodeBlock(editorState, pos) {
  const pluginState = typescriptLanguagePlugin.getState(editorState);
  if (!pluginState) return;

  for (let iBlock = 0; iBlock < pluginState.codeBlockRegions.codeBlocks.length; iBlock++) {
    const block = pluginState.codeBlockRegions.codeBlocks[iBlock];
    const minCodeBlockPos = block.script.pos + 1;
    const maxCodeBlockPos = block.script.pos  + block.script.node.nodeSize - 1;
    if (pos >= minCodeBlockPos && pos <= maxCodeBlockPos) {
      const tsBlock = pluginState.codeBlockRegionsState[iBlock];
      return {
        lang: pluginState.lang,
        ...tsBlock,
        pos: pos - minCodeBlockPos
      };
    }
  }
}

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 */
export function getTypeScriptCodeBlocks(editorState) {
  const pluginState = typescriptLanguagePlugin.getState(editorState);
  return {
    tsBlocks: pluginState?.codeBlockRegionsState || [],
    lang: pluginState?.lang,
    codeOnlyIteration: !pluginState ? 0 :
      pluginState.codeBlockRegions.codeOnlyIteration + pluginState.hiddenUpdateCount,
    codeOrPositionsIteration: !pluginState ? 0 :
      pluginState.codeBlockRegions.codeOrPositionsIteration + pluginState.hiddenUpdateCount
  };
}
