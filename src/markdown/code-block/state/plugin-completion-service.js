// @ts-check

import { Plugin, PluginKey, Transaction } from '@milkdown/prose/state';
import { ReplaceAroundStep, ReplaceStep } from '@milkdown/prose/transform';
import { Decoration, DecorationSet } from '@milkdown/prose/view';

import { getCodeBlockRegionsOfEditorState } from '../state-block-regions';
import { hideTooltipTemporarilyForEditorState, releaseHiddenTooltipForEditorState } from './plugin-tooltip-service';

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
 *  recommended?: boolean,
 *  element: HTMLElement,
 *  apply: string | (() => void)
 * }} CodeCompletion
 */

const SELECTED_COMPLETION_MENU_ITEM_CLASS = 'completions-menu-item-selected';

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
     *  completions: CodeCompletion[],
     *  menuElement: HTMLElement | undefined,
     *  selectedCompletion: number | undefined
     * } | undefined}
     */
    this.currentCompletions = undefined;
    this.tooltipsHidden = false;
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/state').EditorState} oldEditorState
   * @param {import('@milkdown/prose/state').EditorState} newEditorState
   */
  apply = (tr, oldEditorState, newEditorState) => {
    this.editorState = newEditorState;

    // detect when to pop, detect when to apply
    if (!tr.docChanged) {
      if (tr.selectionSet) {
        this.closeCompletions('cancel');
      }
      return;
    }

    if (this.currentCompletions) {
      // check if need to close completions, or maybe update completions
      // check if need to open completions
      const inserted = insertedInTransaction(tr);
      const shouldCloseCompletions =
        inserted &&
        inserted.text.length === 1 &&
        /[\s\p{P}\.]/ui.test(inserted.text);
      
      if (shouldCloseCompletions) {
        this.closeCompletions('cancel');
      } else {
        this.updateCompletions();
      }
    } else {
      // check if need to open completions
      const inserted = insertedInTransaction(tr);
      const shouldOpenCompletions =
        inserted &&
        [...inserted.text].length === 1 &&
        /\p{L}/ui.test(inserted.text);

      if (shouldOpenCompletions) {
        this.showCompletions();
      }
    }
  };

  updateCompletions = () => {
    this.decorations = undefined;
    if (!this.editorView) return;
    const codeBlockRegions = getCodeBlockRegionsOfEditorState(this.editorState);
    if (!codeBlockRegions) return;

    const documentCursorOffset = this.editorState.selection.head;
    let iBlock = 0;
    for (iBlock = 0; iBlock < codeBlockRegions.codeBlocks.length; iBlock++) {
      const block = codeBlockRegions.codeBlocks[iBlock];
      if (documentCursorOffset >= block.script.pos && documentCursorOffset <= block.script.pos + block.script.node.nodeSize) {
        break;
      }
    }

    if (iBlock >= codeBlockRegions.codeBlocks.length) return;

    const scriptCursorOffset = documentCursorOffset - (codeBlockRegions.codeBlocks[iBlock].script.pos + 1);
    for (const provider of this.tooltipProviders) {
      const completions = provider({
        editorView: this.editorView,
        editorState: this.editorState,
        codeBlockIndex: iBlock,
        codeBlockRegion: codeBlockRegions.codeBlocks[iBlock],
        codeOffset: scriptCursorOffset
      });
      if (!completions?.completions.length) continue;

      if (!this.tooltipsHidden) {
        hideTooltipTemporarilyForEditorState(this.editorState);
        this.tooltipsHidden = true;
      }

      this.currentCompletions = {
        codeBlockIndex: iBlock,
        scriptCursorOffset,
        scriptTargetStart: completions.targetStart,
        scriptTargetEnd: completions.targetEnd,
        completions: completions.completions,
        menuElement: undefined,
        selectedCompletion: undefined
      };

      this.decorations = DecorationSet.create(this.editorView.state.doc, [
        Decoration.widget(
          codeBlockRegions.codeBlocks[iBlock].script.pos + 1 + completions.targetStart,
          (editorView, getPos) => {
            const completionsMenuElement = document.createElement('div');
            completionsMenuElement.className = 'completions-menu';
            completionsMenuElement.style.position = 'absolute';
            completionsMenuElement.style.display = 'inline-block';
            if (this.currentCompletions) this.currentCompletions.menuElement = completionsMenuElement;
            for (let iCo = 0; iCo < completions.completions.length; iCo++) {
              const coEl = completions.completions[iCo];
              coEl.element.classList.add('completions-menu-item');
              coEl.element.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.editorView) return;
                this.updateCompletionIndex(iCo);
                this.closeCompletions('accept');
                this.editorView.dispatch(this.editorState.tr.setMeta('confirming completion by click', coEl));
              });

              completionsMenuElement.appendChild(coEl.element);
              if (coEl.recommended &&
                this.currentCompletions && typeof this.currentCompletions.selectedCompletion !== 'number') {
                this.currentCompletions.selectedCompletion = iCo;
                coEl.element.classList.add('completions-menu-item-selected');
              }
            }
            return completionsMenuElement;
          }
        )
      ]);

    }
  };

  /**
   * @param {KeyboardEvent} event 
   */
  handleKeyDown = (event) => {
    if (!this.editorView) return;

    let applied = false;
    if (this.currentCompletions) {
      switch (event.key) {
        case 'Enter':
          this.closeCompletions('accept');
          applied = true;
          break;

        case 'Escape':
          this.closeCompletions('cancel');
          applied = true;
          break;

        case 'Tab':
        case 'Space':
        case 'Dot':
        case 'QuestionMark':
          this.closeCompletions('proceed');
          applied = true;
          break;

        case 'ArrowUp':
          this.highlightCompletionUp();
          applied = true;
          break;

        case 'ArrowDown':
          this.highlightCompletionDown();
          applied = true;
          break;
      }
    } else {
      let key = event.key;
      if (event.altKey && !/alt/i.test(key || '')) key = 'Alt+' + event.key;
      if (event.shiftKey && !/shift/i.test(key || '')) key = 'Shift+' + event.key;
      if (event.ctrlKey && !/ctrl|control/i.test(key || '')) key = 'Ctrl+' + event.key;
      if (event.metaKey && !/meta|cmd|win/i.test(key || '')) key = 'Meta+' + event.key;
      switch (key) {
        case 'Ctrl+Space':
        case 'Alt+Space':
        case 'Alt+Escape':
          this.showCompletions();
          applied = true;
          break;
      }
    }

    if (applied) {
      this.editorView.dispatch(this.editorState.tr.setMeta('refresh completions decorations', true));
      return true;
    }
  };

  showCompletions = () => {
    this.updateCompletions();
  };

  /**
   * @param {'accept' | 'cancel' | 'proceed'} closeMode 
   */
  closeCompletions = (closeMode) => {
    if (!this.currentCompletions || !this.editorView) return;

    if (closeMode === 'accept') {
      const chosen = this.currentCompletions.completions[
        this.currentCompletions.selectedCompletion || 0
      ];

      if (!chosen?.apply) return;

      if (typeof chosen.apply === 'function') {
        chosen.apply();
      } else if (typeof chosen.apply === 'string') {
        const codeBlockRegions = getCodeBlockRegionsOfEditorState(this.editorState);
        if (codeBlockRegions) {
          const block = codeBlockRegions.codeBlocks[this.currentCompletions.codeBlockIndex];
          if (block) {
            this.editorView.dispatch(
              this.editorState.tr.replaceRangeWith(
                block.script.pos + 1 + this.currentCompletions.scriptTargetStart,
                block.script.pos + 1 + this.currentCompletions.scriptTargetEnd,
                this.editorState.schema.text(
                  chosen.apply
                )
              )
            );
          }
        }
      }
    }

    if (this.tooltipsHidden) {
      releaseHiddenTooltipForEditorState(this.editorState);
      this.tooltipsHidden = false;
    }

    this.decorations = undefined;
    this.currentCompletions = undefined;
  };

  highlightCompletionUp = () => {
    if (!this.currentCompletions) return;
    let nextSelect =
      typeof this.currentCompletions.selectedCompletion !== 'number' ? this.currentCompletions.completions.length - 1 :
        this.currentCompletions.selectedCompletion ? this.currentCompletions.selectedCompletion - 1 :
          this.currentCompletions.completions.length - 1;
    this.updateCompletionIndex(nextSelect);
  };

  highlightCompletionDown = () => {
    if (!this.currentCompletions) return;
    let nextSelect =
      typeof this.currentCompletions.selectedCompletion !== 'number' ? 0 :
        this.currentCompletions.selectedCompletion < this.currentCompletions.completions.length - 1 ? this.currentCompletions.selectedCompletion + 1 :
          0;
    this.updateCompletionIndex(nextSelect);
  };

  /**
   * @param {number} nextSelect
   */
  updateCompletionIndex = (nextSelect) => {
    if (!this.currentCompletions) return;
    if (this.currentCompletions.selectedCompletion === nextSelect) return;
    if (typeof this.currentCompletions.selectedCompletion === 'number') {
      this.currentCompletions.completions[this.currentCompletions.selectedCompletion].element.classList.remove(SELECTED_COMPLETION_MENU_ITEM_CLASS);
    }
    this.currentCompletions.selectedCompletion = nextSelect;
    const nextElement = this.currentCompletions.completions[this.currentCompletions.selectedCompletion].element;
    nextElement.classList.add(SELECTED_COMPLETION_MENU_ITEM_CLASS);
    if (this.currentCompletions.menuElement) {
      const parentBox = this.currentCompletions.menuElement.getBoundingClientRect();
      const nextBox = nextElement.getBoundingClientRect();
      const completelyVisible = nextBox.top >= parentBox.top && nextBox.bottom <= parentBox.bottom;
      if (!completelyVisible) {
        nextElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
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
 * @param {Transaction} tr
 */
function insertedInTransaction(tr) {
  let insertedText = '';
  let insertedStart = 0;
  let insertedEnd = 0;
  let insertCount = 0;
  for (const step of tr.steps) {
    if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
      if (step.slice.content.childCount !== 1) return;
      const stepInsertedText = step.slice.content.firstChild?.textContent || '';
      if (stepInsertedText) {
        insertedText = stepInsertedText;
        insertedStart = step.from;
        insertedEnd = step.to;
        insertCount++;
      }
    }
  }

  return insertCount === 1 ? { text: insertedText, from: insertedStart, to: insertedEnd } : undefined;
}

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

