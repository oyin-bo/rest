// @ts-check

import { defaultConfig } from '.';

/**
 * @typedef {import("prosemirror-view").NodeView & ReturnType<import('prosemirror-view').MarkViewConstructor>} BaseNodeClass
 */

/**
 * @implements {BaseNodeClass}
 */
export class ProseMirrorCodeBlock {
  /**
   * @param {import("prosemirror-model").Node} node
   * @param {import("prosemirror-view").EditorView} view
   * @param {() => number | undefined} getPos
   * @param {typeof defaultConfig} config
   */
  constructor(node, view, getPos, config) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.config = config;

    this.dom = document.createElement('div');
    this.dom.className = 'code-block code-block-language-' + node.attrs.params;

    this.toolbarHost = document.createElement('div');
    this.dom.appendChild(this.toolbarHost);

    this.toolbarShadow = this.toolbarHost.attachShadow({ mode: 'open' });

    this.toolbarDOM = document.createElement('div');
    this.toolbarDOM.className = 'code-block-toolbar';
    this.toolbarDOM.style.userSelect = 'none';

    this.toolbarShadow.appendChild(this.toolbarDOM);

    this.contentDOM = document.createElement('code');
    this.contentDOM.setAttribute('data-content-dom', 'true');
    this.contentDOM.className = 'code-block-content';

    this.bindAttrs(node);

    this.dom.appendChild(this.contentDOM);

    this.bottomBar = document.createElement('div');
    this.bottomBar.className = 'code-block-bottom-bar';
    this.bottomBar.style.userSelect = 'none';

    this.dom.appendChild(this.bottomBar);
  }

  /**
   * @param {import("prosemirror-model").Node} updatedNode
   */
  update(updatedNode) {
    if (updatedNode.type !== this.node.type)
      return false;

    if (updatedNode.sameMarkup(this.node) && updatedNode.content.eq(this.node.content))
      return false;

    this.node = updatedNode;

    this.bindAttrs(this.node);

    return true;
  }

  /**
   * @param {import("prosemirror-model").Node} node
   */
  bindAttrs(node) {
    //this.contentDOM.textContent = node.textContent;
    this.toolbarDOM.textContent = '```' + node.attrs.language;
  }

  ignoreMutation(mutation) {
    if (!this.dom || !this.contentDOM)
      return true

    if (mutation.type === 'selection')
      return false

    if (this.contentDOM === mutation.target && mutation.type === 'attributes')
      return true

    if (this.contentDOM.contains(mutation.target))
      return false

    return true
  }
}