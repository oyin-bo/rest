// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { getCodeBlockRegionsOfEditorState } from '../state-block-regions';

/**
 * @typedef {(args: {
 *  invalidate: () => void,
 *  editorState: import('@milkdown/prose/state').EditorState,
 *  codeBlockRegions: import('../state-block-regions/find-code-blocks').CodeBlockNodeset[]
 * }) => (CodeBlockHighlightSpan[] | null | undefined)[] | null | undefined} HighlightProvider
 */

/**
 * @typedef {{
 *  from: number,
 *  to: number,
 *  class: string
 * }} CodeBlockHighlightSpan
 */

class CodeHighlightService {
  /**
   * @param {import('@milkdown/prose/state').EditorStateConfig} config
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  constructor(config, editorState) {
    this.config = config;
    this.editorState = editorState;

    /** @type {import('@milkdown/prose/view').EditorView | undefined} */
    this.editorView = undefined;

    /** @type {(CodeBlockHighlightSpan[] | undefined)[]} */
    this.decorationSpansForCodeBlocks = [];

    /** @type {DecorationSet | undefined} */
    this.decorationSet = undefined;

    /** @type {HighlightProvider[]} */
    this.highlightProviders = [];

    this.codeOnlyIteration = 0;
    this.codeOrPositionsIteration = 0;

    this.invalidateAll = true;
    this.invalidateDecorationSet = true;

    this.updateDecorations(editorState);
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/state').EditorState} oldEditorState
   * @param {import('@milkdown/prose/state').EditorState} newEditorState
   */
  apply = (tr, oldEditorState, newEditorState) => {
    this.editorState = newEditorState;
    this.invalidateDecorationSet = tr.docChanged;
    this.updateDecorations(newEditorState);
  };

  /**
   * @param {import('@milkdown/prose/view').EditorView} editorView
   */
  initView = (editorView) => {
    this.editorView = editorView;
    this.invalidateAll = true;
    this.updateDecorations(this.editorState);
  };

  /**
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  updateDecorations = (editorState) => {
    const codeBlockRegions = getCodeBlockRegionsOfEditorState(editorState);
    if (!codeBlockRegions) return;

    if (!this.invalidateAll && !this.invalidateDecorationSet &&
      this.codeOrPositionsIteration === codeBlockRegions.codeOrPositionsIteration)
      return;

    let decorationsRebuilt = false;
    if (this.invalidateAll || this.codeOnlyIteration !== codeBlockRegions.codeOnlyIteration) {
      decorationsRebuilt = true;
      this.decorationSpansForCodeBlocks = [];
      for (const provider of this.highlightProviders) {
        const blockHighlights = provider({
          invalidate: this.invalidate,
          editorState,
          codeBlockRegions: codeBlockRegions.codeBlocks
        });

        if (blockHighlights?.length) {
          for (let iBlock = 0; iBlock < blockHighlights.length; iBlock++) {
            const highlights = blockHighlights[iBlock];
            if (!highlights?.length) continue;
            const existingHighlightsForBlock = this.decorationSpansForCodeBlocks[iBlock];
            this.decorationSpansForCodeBlocks[iBlock] = existingHighlightsForBlock ?
              existingHighlightsForBlock.concat(highlights) :
              highlights;
          }
        }
      }
    }

    if (this.invalidateAll || this.invalidateDecorationSet || decorationsRebuilt) {
      this.codeOnlyIteration = codeBlockRegions.codeOnlyIteration;
      const decorations = deriveDecorationsForSpans(this.decorationSpansForCodeBlocks, codeBlockRegions.codeBlocks);
      this.decorationSet = decorations && DecorationSet.create(editorState.doc, decorations);
    }

    this.invalidateAll = false;
    this.invalidateDecorationSet = false;
  };

  invalidate = () => {
    if (this.invalidateAll) return;

    this.invalidateAll = true;
    this.editorView?.dispatch(
      this.editorView.state.tr.setMeta('redraw invalidated decorations', true));
  };

  /**
   * @param {HighlightProvider} highlightProvider
   */
  addHighlightProvider = (highlightProvider) => {
    this.highlightProviders.push(highlightProvider);
    const self = this;

    this.invalidateAll = true;
    this.updateDecorations(this.editorState);

    return removeTooltipProvider;

    function removeTooltipProvider() {
      const index = self.highlightProviders.indexOf(highlightProvider);
      if (index >= 0) self.highlightProviders.splice(index, 1);
      this.invalidateFlag = true;
      self.updateDecorations(self.editorState);
    }
  };
}

const key = new PluginKey('CODE_HIGHLIGHT_DECORATIONS_SERVICE');
export const codeHighlightPlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => new CodeHighlightService(config, editorState),
    apply: (tr, pluginState, oldState, newState) => {
      pluginState?.apply(tr, oldState, newState);
      return pluginState;
    }
  },
  props: {
    decorations: (editorState) => {
      /** @type {CodeHighlightService | undefined} */
      const pluginState = key.getState(editorState);
      return pluginState?.decorationSet;
    }
  },
  view: (editorView) => {
    /** @type {CodeHighlightService | undefined} */
    const pluginState = key.getState(editorView.state);
    pluginState?.initView(editorView);
    return {};
  }
});

/**
 * @param {CodeHighlightService['decorationSpansForCodeBlocks']} decorationsOfBlocks
 * @param {import('../state-block-regions/find-code-blocks').CodeBlockNodeset[]} tsBlocks
 */
function deriveDecorationsForSpans(decorationsOfBlocks, tsBlocks) {
  const decorationsArray = [];
  for (let iBlock = 0; iBlock < tsBlocks.length; iBlock++) {
    const blockDecorations = decorationsOfBlocks[iBlock];
    if (!blockDecorations?.length) continue;
    const tsBlock = tsBlocks[iBlock];
    for (const deco of blockDecorations) {
      decorationsArray.push(Decoration.inline(
        tsBlock.script.pos + 1 + deco.from,
        tsBlock.script.pos + 1 + deco.to,
        { class: deco.class }
      ));
    }
  }
  if (decorationsArray.length) return decorationsArray;
}

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 * @param {HighlightProvider} highlightProvider
 */
export function addCodeHighlightProvider(editorState, highlightProvider) {
  const pluginState = codeHighlightPlugin.getState(editorState);
  pluginState?.addHighlightProvider(highlightProvider);
}
