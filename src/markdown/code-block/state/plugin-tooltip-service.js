// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { getCodeBlockRegionsOfEditorView } from '../state-block-regions';

/**
 * @typedef {(args: {
 *  editorView: import('@milkdown/prose/view').EditorView,
 *  editorState: import('@milkdown/prose/state').EditorState,
 *  codeBlockIndex: number,
 *  codeBlockRegion: import('../state-block-regions/find-code-blocks').CodeBlockNodeset,
 *  codeOffset: number
 * }) => TooltipContent | undefined} TooltipProvider
 */

/**
 * @typedef {{
 *  element: HTMLElement,
 *  highlightFrom: number,
 *  highlightTo: number
 * }} TooltipContent
 */

class CodeTooltipService {
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
     * @type {undefined | {
     *  pageX: number, pageY: number,
     *  codeBlockIndex: number,
     *  highlightFrom: number, highlightTo: number
     * }}
     */
    this.currentTooltip = undefined;

    /**
     * @type {HTMLElement | undefined}
     */
    this.tooltipElem = undefined;

    /**
     * @type {TooltipProvider[]}
     */
    this.tooltipProviders = [];
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/state').EditorState} oldEditorState
   * @param {import('@milkdown/prose/state').EditorState} newEditorState
   */
  apply = (tr, oldEditorState, newEditorState) => {
    // view already processes the updates, maybe we skip this one?
  };

  /**
   * @param {import('@milkdown/prose/view').EditorView} editorView
   */
  initView = (editorView) => {
    this.editorView = editorView;
    this.tooltipElem = document.createElement('div');
    this.tooltipElem.className = 'code-block-tooltip';
    this.tooltipElem.style.display = 'none';

    document.body.appendChild(this.tooltipElem);
    editorView.dom.addEventListener('mousedown', e => {
      this.updateTooltip(e, true);
    });
    editorView.dom.addEventListener('mousemove', e => {
      this.updateTooltip(e);
    });
  };

  /**
 * @param {MouseEvent | undefined} withMouse
 * @param {boolean} [force]
 */
  updateTooltip = (withMouse, force) => {
    // this should never happen, update only comes when view is alread initialised
    if (!this.editorView || !this.tooltipElem) return;

    const codeBlockRegions = getCodeBlockRegionsOfEditorView(this.editorView);
    if (!codeBlockRegions) return;

    if (!withMouse) {
      if (!this.currentTooltip) return;
      // check if currentTooltip is still valid
      const currentTooltipGeoPos = this.editorView.posAtCoords({
        left: this.currentTooltip.pageX,
        top: this.currentTooltip.pageY
      });

      if (typeof currentTooltipGeoPos?.pos !== 'number') return;
      const currentTooltipDocumentPos =
        codeBlockRegions.codeBlocks[this.currentTooltip.codeBlockIndex]?.script.pos + 1 +
        this.currentTooltip.highlightFrom;
      if (currentTooltipGeoPos.pos >= currentTooltipDocumentPos &&
        currentTooltipGeoPos.pos < currentTooltipDocumentPos + this.currentTooltip.highlightTo - this.currentTooltip.highlightFrom) {
        return;
      }

      this.tooltipElem.style.display = 'none';
      this.tooltipElem.style.left = '0';
      this.tooltipElem.style.top = '0';
      this.currentTooltip = undefined;
    } else {
      const mouseGeoPos = this.editorView.posAtCoords({
        left: withMouse.pageX,
        top: withMouse.pageY
      });

      if (typeof mouseGeoPos?.pos !== 'number') {
        if (force && this.currentTooltip) {
          this.currentTooltip = undefined;
          this.tooltipElem.style.display = 'none';
        }
        return;
      }

      for (let iBlock = 0; iBlock < codeBlockRegions.codeBlocks.length; iBlock++) {
        const codeBlockRegion = codeBlockRegions.codeBlocks[iBlock];
        const scriptPos = codeBlockRegion.script.pos + 1;
        if (mouseGeoPos.pos < scriptPos || mouseGeoPos.pos > scriptPos + codeBlockRegion.script.node.nodeSize) continue;

        const scriptBlockPos = mouseGeoPos.pos - scriptPos;

        for (const provider of this.tooltipProviders) {
          const providerInfo = provider({
            editorView: this.editorView,
            editorState: this.editorView.state,
            codeBlockIndex: iBlock,
            codeBlockRegion,
            codeOffset: scriptBlockPos
          });

          if (!providerInfo?.element) continue;

          const highlightFromCoords = this.editorView.coordsAtPos(
            scriptPos + providerInfo.highlightFrom);
          const highlightToCoords = this.editorView.coordsAtPos(
            scriptPos + providerInfo.highlightTo);
          
          const left = Math.min(highlightFromCoords.left, highlightToCoords.left);
          const bottom = Math.max(highlightFromCoords.bottom, highlightToCoords.bottom);

          const parentBox = (this.tooltipElem.offsetParent || this.tooltipElem.parentElement || document.body).getBoundingClientRect();
          this.tooltipElem.style.display = 'block';
          this.tooltipElem.style.transform =
            'translate(' +
            Math.max(0, left - parentBox.left - 20) + 'px' +
            ',' +
            (bottom - parentBox.top + 64) + 'px' +
            ')';
          this.tooltipElem.textContent = '';
          this.tooltipElem.appendChild(providerInfo.element);

          this.currentTooltip = {
            pageX: withMouse.pageX,
            pageY: withMouse.pageY,
            codeBlockIndex: iBlock,
            highlightFrom: providerInfo.highlightFrom,
            highlightTo: providerInfo.highlightTo - providerInfo.highlightFrom
          };
          return;

        }
      }

      if (force && this.currentTooltip) {
        this.currentTooltip = undefined;
        this.tooltipElem.style.display = 'none';
      }
    }
  };

  /**
   * @param {TooltipProvider} tooltipProvider
   */
  addTooltipProvider = (tooltipProvider) => {
    this.tooltipProviders.push(tooltipProvider);
    const self = this;

    this.updateTooltip(undefined);

    return removeTooltipProvider;

    function removeTooltipProvider() {
      const index = self.tooltipProviders.indexOf(tooltipProvider);
      if (index >= 0) self.tooltipProviders.splice(index, 1);
      this.updateTooltip(undefined);
    }
  };
}

const key = new PluginKey('TOOLTIP_SERVICE');
export const tooltipServicePlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => new CodeTooltipService(config, editorState),
    apply: (tr, pluginState, oldState, newState) => {
      pluginState.apply(tr, oldState, newState);
      return pluginState;
    }
  },
  view: (editorView) => {
    const pluginState = tooltipServicePlugin.getState(editorView.state);
    pluginState?.initView(editorView);

    return {
      update: (editorView, editorState) => {
        const pluginState = tooltipServicePlugin.getState(editorState);
        pluginState?.updateTooltip(undefined);
      }
    };
  }
});

/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 * @param {TooltipProvider} tooltipProvider
 */
export function addTooltipProviderToEditorState(editorState, tooltipProvider) {
  const pluginState = tooltipServicePlugin.getState(editorState);
  return pluginState?.addTooltipProvider(tooltipProvider);
}

/**
 * @param {import('@milkdown/prose/view').EditorView} editorView
 * @param {TooltipProvider} tooltipProvider
 */
export function addTooltipProviderToEditorView(editorView, tooltipProvider) {
  return addTooltipProviderToEditorState(editorView.state, tooltipProvider);
}