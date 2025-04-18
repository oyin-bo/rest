// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import hljs from 'highlight.js';

import { getCodeBlockRegionsOfEditorState } from '../state-block-regions';

/**
 * @typedef {{
 *  codeHighlights(args: {
 *    invalidate: () => void,
 *    editorState: import('@milkdown/prose/state').EditorState,
 *    codeBlockRegions: import('../state-block-regions/find-code-blocks').CodeBlockNodeset[]
 *  }): (CodeBlockHighlightSpan[] | null | undefined)[] | null | undefined,
 *  selectionHighlights?(args: {
 *    editorState: import('@milkdown/prose/state').EditorState,
 *    codeBlockRegions: import('../state-block-regions/find-code-blocks').CodeBlockNodeset[],
 *    selectionRelative: { iBlock: number, offset: number }
 *  }): (CodeBlockHighlightSpan[] | null | undefined)[] | null | undefined,
 * }} HighlightProvider
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
    /** @type {typeof this.decorationSpansForCodeBlocks} */
    this.selectionDecorationSpansForCodeBlocks = [];

    /** @type {DecorationSet | undefined} */
    this.decorationSet = undefined;

    /** @type {HighlightProvider[]} */
    this.highlightProviders = [];

    this.codeOnlyIteration = 0;
    this.codeOrPositionsIteration = 0;
    /** @type {{ iBlock: number, offset: number } | undefined} */
    this.selectionRelative = undefined;

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

    const selectionChanged =
      (!this.selectionRelative !== !codeBlockRegions.selectionRelative) ||
      (this.selectionRelative && codeBlockRegions.selectionRelative &&
        (this.selectionRelative.iBlock !== codeBlockRegions.selectionRelative.iBlock ||
          this.selectionRelative.offset !== codeBlockRegions.selectionRelative.offset));

    if (!this.invalidateAll && !this.invalidateDecorationSet &&
      this.codeOrPositionsIteration === codeBlockRegions.codeOrPositionsIteration &&
      !selectionChanged)
      return;

    let decorationsRebuilt = false;
    if (this.invalidateAll || this.codeOnlyIteration !== codeBlockRegions.codeOnlyIteration) {
      decorationsRebuilt = true;
      this.decorationSpansForCodeBlocks = [];
      for (const provider of this.highlightProviders) {
        const blockHighlights = provider.codeHighlights({
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

      for (let iBlock = 0; iBlock < codeBlockRegions.codeBlocks.length; iBlock++) {
        if (this.decorationSpansForCodeBlocks[iBlock]?.length) continue;
        const block = codeBlockRegions.codeBlocks[iBlock];
        const highlights = fallbackHighlight(
          block.code,
          block.language || block.langSpecified
        );

        if (highlights?.length) {
          this.decorationSpansForCodeBlocks[iBlock] = highlights;
          // console.log('fallback highlights ', highlights, block);
        }
      }
    }

    if (selectionChanged || decorationsRebuilt) {
      this.selectionRelative = codeBlockRegions.selectionRelative;
      decorationsRebuilt = true;

      this.selectionDecorationSpansForCodeBlocks = [];
      if (codeBlockRegions.selectionRelative) {
        for (const provider of this.highlightProviders) {
          const blockHighlights = provider.selectionHighlights?.({
            editorState,
            codeBlockRegions: codeBlockRegions.codeBlocks,
            selectionRelative: codeBlockRegions.selectionRelative
          }) || [];

          for (let iBlock = 0; iBlock < blockHighlights.length; iBlock++) {
            const highlights = blockHighlights[iBlock] || [];
            const existingHighlightsForBlock = this.decorationSpansForCodeBlocks[iBlock];
            this.selectionDecorationSpansForCodeBlocks[iBlock] = existingHighlightsForBlock ?
              existingHighlightsForBlock.concat(highlights) :
              highlights;
          }
        }
      }
    }

    if (this.invalidateAll || this.invalidateDecorationSet || decorationsRebuilt) {
      this.codeOnlyIteration = codeBlockRegions.codeOnlyIteration;
      let decorations =
        (deriveDecorationsForSpans(this.decorationSpansForCodeBlocks, codeBlockRegions.codeBlocks) || [])
          .concat(deriveDecorationsForSpans(this.selectionDecorationSpansForCodeBlocks, codeBlockRegions.codeBlocks) || [])
          .concat(addDecorationsForLineNumbers(codeBlockRegions.codeBlocks) || []);

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

/** @param {import('../state-block-regions/find-code-blocks').CodeBlockNodeset[]} codeBlocks */
function addDecorationsForLineNumbers(codeBlocks) {
  const decorationsArray = [];
  let maxLineCount = 0;
  let decimalDigits = 0;

  codeBlocks.map((block, iBlock) => {
    let pos = 0;
    let lineNumber = 1;
    let blockLineCount = 0;

    const lineStart = /\n|\r\n|\r/g;
    while (true) {
      blockLineCount++;
      (lineNumber => {
        decorationsArray.push(Decoration.widget(
          block.script.pos + 1 + pos,
          () => {

            if (!decimalDigits) decimalDigits = maxLineCount.toFixed().length;

            const span = document.createElement('span');
            span.className = 'line-number';
            if (blockLineCount <= 1) return span;

            span.style.minWidth = (decimalDigits + 1) + 'ch';

            const numSpan = document.createElement('span');
            numSpan.className = 'line-number-inner';
            if (blockLineCount > 1) {
              numSpan.innerText = lineNumber.toString();
            }
            span.appendChild(numSpan);

            return span;
          },
          { side: -1 }
        ));
      })(lineNumber);

      const nextMatch = lineStart.exec(block.code);
      if (!nextMatch) break;
      pos = nextMatch.index + nextMatch[0].length;
      lineNumber++;
    }
    maxLineCount = Math.max(maxLineCount, lineNumber);
  });

  if (decorationsArray.length) return decorationsArray;
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

/**
 * @param {string} code
 * @param {string | null | undefined} lang
 */
export function fallbackHighlight(code, lang) {

  /** @typedef {import('highlight.js').Emitter } EmitterInterface */
  /** @implements {EmitterInterface} */
  class Emitter {
    /** @type {string[]} */
    scopes = [];
    text = '';
    /** @type {(CodeBlockHighlightSpan & { textContent: string, kind?: string })[]} */
    spans = [];
    pos = 0;

    constructor(opts) {
      this.opts = opts;
      this.pos = 0;
    }

    startScope = (name) => {
      this.scopes.push('hi-' + name);
    };

    endScope = () => {
      this.scopes.pop();
    };

    addText = (text) => {
      if (!this.spans.length) {
        const posText = code.indexOf(text);
        if (posText > 0) {
          this.spans.push({
            from: 0,
            to: posText,
            class: '',
            textContent: code.slice(0, posText),
            kind: 'lead-space'
          });
        }
        this.pos = posText;
      }

      if (this.scopes.length) {
        this.spans.push({
          from: this.pos,
          to: this.pos + text.length,
          class: this.scopes.join(' '),
          textContent: text,
          kind: 'add-text-whole'
        });
        this.pos += text.length;
      } else {
        const regexIdentifier = /[a-z_][a-z0-9_]*/gi;
        let chunkPos = 0;
        while (true) {
          const matchId = regexIdentifier.exec(text);
          if (!matchId) break;
          if (matchId.index > chunkPos) {
            this.spans.push({
              from: this.pos + chunkPos,
              to: this.pos + matchId.index,
              class: '',
              textContent: text.slice(chunkPos, matchId.index),
              kind: 'add-text-between-identifiers'
            });
          }

          this.spans.push({
            from: this.pos + matchId.index,
            to: this.pos + matchId.index + matchId[0].length,
            class: 'hi-identifier',
            textContent: matchId[0],
            kind: 'add-text-identifier'
          });

          chunkPos = matchId.index + matchId[0].length;
        }
        if (chunkPos < text.length) {
          this.spans.push({
            from: this.pos + chunkPos,
            to: this.pos + text.length,
            class: '',
            textContent: text.slice(chunkPos),
            kind: 'add-text-remaining'
          });
        }

        this.pos += text.length;
      }
    };

    toHTML = () => {
      return /** @type {*} */(this.spans);
    };

    finalize = () => {
    };

    __addSublanguage = () => {
    };

    openNode = (name) => {
      this.scopes.push('hi-' + name);
    };

    closeNode = () => {
      this.scopes.pop();
    };
  }

  hljs.configure({
    __emitter: Emitter 
  });

  /** @type {((CodeBlockHighlightSpan & { textContent: string })[]) & { language?: string | null }} */
  let spans;
  try {
    const hl = lang ? hljs.highlight(code, { language: lang }) : hljs.highlightAuto(code);
    spans = /** @type {*} */(hl.value);
    spans.language = hl.language || lang;

    return spans;
  } catch (errLang) {
    spans = [];

    try {
      const hlAuto = hljs.highlightAuto(code);
      spans = /** @type {*} */(hlAuto.value);
      spans.language = hlAuto.language || lang;
      return spans;
    } catch (errAuto) {
      console.error('Highlight.js has crashed on auto language and specific language ', { errAuto, errLang, code, lang });
      return spans;
    }
  }
}