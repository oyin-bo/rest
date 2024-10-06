// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { ReplaceAroundStep, ReplaceStep } from '@milkdown/prose/transform';
import { DecorationSet } from '@milkdown/prose/view';

import { getCodeBlockRegionsOfEditorView } from '../state-block-regions';

/**
 * @typedef {(args: {
 *  editorView: import('@milkdown/prose/view').EditorView,
 *  editorState: import('@milkdown/prose/state').EditorState,
 *  codeBlockIndex: number,
 *  codeBlockRegion: import('../state-block-regions/find-code-blocks').CodeBlockNodeset,
 *  codeOffset: number
 * }) => CodeCompletionSet | undefined} CompletionProvider
 */

/**
 * @typedef {{
 *  targetStart: number,
 *  targetEnd: number,
 *  completions: CodeCompletion[]
 * }} CodeCompletionSet
 */

/**
 * @typedef {{
 *  element: HTMLElement,
 *  apply(): void
 * }} CodeCompletion
 */

class CodeCompletionService {
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
     * @type {CompletionProvider[]}
     */
    this.tooltipProviders = [];

    /**
     * @type {DecorationSet | undefined}
     */
    this.decorations = undefined;

    /**
     * @type {{
     *  codeBlockIndex: number,
     *  scriptCursorOffset: number,
     *  scriptTargetStart: number,
     *  scriptTargetEnd: number,
     *  completions: CodeCompletion[]
     * } | undefined}
     */
    this.currentCompletions = undefined;
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/state').EditorState} oldEditorState
   * @param {import('@milkdown/prose/state').EditorState} newEditorState
   */
  apply = (tr, oldEditorState, newEditorState) => {
    // detect when to pop, detect when to apply
    if (!tr.docChanged && !tr.selectionSet) return;
    if (this.currentCompletions) {
      // check if need to close completions, or maybe update completions
    } else {
      // check if need to open completions
      let shouldOpenCompletions = false;
      for (const step of tr.steps) {
        if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
          const insertedText = step.slice.content.firstChild?.textContent || '';
          if (/\p{L}/ui.test(insertedText)) {
            shouldOpenCompletions = true;
            break;
          }
        }
      }
    }
  };

  /**
   * @param {KeyboardEvent} event 
   */
  handleKeyDown = (event) => {
    if (this.currentCompletions) {
      switch (event.key) {
        case 'Enter':
          this.closeCompletions('accept');
          return true;
        case 'Escape':
          this.closeCompletions('cancel');
          return true;
        case 'Tab':
        case 'Space':
        case 'Dot':
        case 'QuestionMark':
          this.closeCompletions('proceed');
          return true;
        case 'ArrowUp':
          this.highlightCompletionUp();
          return true;
        case 'ArrowDown':
          this.highlightCompletionDown();
          return true;
      }
    } else {
      switch (event.key) {
        case 'Ctrl+Space':
        case 'Alt+Space':
        case 'Alt+Escape':
          this.showCompletions();
          return true;
      }
    }
  };

  showCompletions = () => {
  };

  /**
   * @param {'accept' | 'cancel' | 'proceed'} closeMode 
   */
  closeCompletions = (closeMode) => {
  };

  highlightCompletionUp = () => {
  };

  highlightCompletionDown = () => {
  };

  /**
   * @param {CompletionProvider} completionProvider
   */
  addCompletionProvider = (completionProvider) => {
    this.tooltipProviders.push(completionProvider);

    if (this.editorView) this.editorView.dispatch(
      this.editorView.state.tr.setMeta('added completion provider', completionProvider));

    const self = this;

    return removeCompletionProvider;

    function removeCompletionProvider() {
      const index = self.tooltipProviders.indexOf(completionProvider);
      if (index >= 0) self.tooltipProviders.splice(index, 1);

      if (self.editorView) this.editorView.dispatch(
        self.editorView.state.tr.setMeta('removed completion provider', completionProvider));
    }
  };
}

const key = new PluginKey('COMPLETION_SERVICE');
export const completionServicePlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => new CodeCompletionService(config, editorState),
    apply: (tr, pluginState, oldState, newState) => {
      pluginState.apply(tr, oldState, newState);
      return pluginState;
    }
  },
  props: {
    decorations: (editorState) => {
      const pluginState = completionServicePlugin.getState(editorState);
      return pluginState?.decorations;
    },
    handleKeyDown: (view, event) => {
      const pluginState = completionServicePlugin.getState(view.state);
      return pluginState?.handleKeyDown(event);
    }
  },
  view: (editorView) => {
    const pluginState = completionServicePlugin.getState(editorView.state);
    if (pluginState) pluginState.editorView = editorView;

    return {};
  }
});

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 * @param {CompletionProvider} completionProvider
 */
export function addCompletionProviderToEditorState(editorState, completionProvider) {
  const pluginState = completionServicePlugin.getState(editorState);
  return pluginState?.addCompletionProvider(completionProvider);
}

/**
 * @param {import('@milkdown/prose/view').EditorView} editorView
 * @param {CompletionProvider} completionProvider
 */
export function addCompletionProviderToEditorView(editorView, completionProvider) {
  return addCompletionProviderToEditorState(editorView.state, completionProvider);
}

