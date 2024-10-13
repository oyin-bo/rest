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

    this.invalidateFlag = true;

    this.updateDecorations(editorState);
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/state').EditorState} oldEditorState
   * @param {import('@milkdown/prose/state').EditorState} newEditorState
   */
  apply = (tr, oldEditorState, newEditorState) => {
    this.editorState = newEditorState;
    this.invalidateFlag = true;
    this.updateDecorations(newEditorState);
  };

  /**
   * @param {import('@milkdown/prose/view').EditorView} editorView
   */
  initView = (editorView) => {
    this.editorView = editorView;
    this.invalidateFlag = true;
    this.updateDecorations(this.editorState);
  };

  /**
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  updateDecorations = (editorState) => {
    const codeBlockRegions = getCodeBlockRegionsOfEditorState(editorState);
    if (!codeBlockRegions) return;

    if (!this.invalidateFlag && this.codeOrPositionsIteration === codeBlockRegions.codeOrPositionsIteration)
      return;

    if (this.invalidateFlag || this.codeOnlyIteration !== codeBlockRegions.codeOnlyIteration) {
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

    this.invalidateFlag = false;

    const decorations = deriveDecorationsForSpans(this.decorationSpansForCodeBlocks, codeBlockRegions.codeBlocks);
    this.decorationSet = decorations && DecorationSet.create(editorState.doc, decorations);
  };

  invalidate = () => {
    if (this.invalidateFlag) return;

    this.invalidateFlag = true;
    this.editorView?.dispatch(
      this.editorView.state.tr.setMeta('redraw invalidated decorations', true));
  };

  /**
   * @param {HighlightProvider} highlightProvider
   */
  addHighlightProvider = (highlightProvider) => {
    this.highlightProviders.push(highlightProvider);
    const self = this;

    this.invalidateFlag = true;
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
