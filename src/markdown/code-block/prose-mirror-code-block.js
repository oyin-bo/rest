// @ts-check

import { defaultConfig } from '.';
import { Fragment } from 'prosemirror-model';

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
    this.dom.className = 'code-block code-block-language-' + (node.attrs.params || 'none');

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

    this.bottomBarHost = document.createElement('div');
    this.bottomBarShadow = this.bottomBarHost.attachShadow({ mode: 'open' });

    this.bottomBar = document.createElement('div');
    this.bottomBar.className = 'code-block-bottom-bar';
    this.bottomBar.style.userSelect = 'none';

    this.bottomRunButton = document.createElement('button');
    this.bottomRunButton.className = 'code-block-run-button';
    this.bottomRunButton.textContent = 'run>';
    this.bottomBar.appendChild(this.bottomRunButton);

    this.bottomSmallStatusLabel = document.createElement('span');
    this.bottomSmallStatusLabel.className = 'code-block-small-status-label';
    this.bottomBar.appendChild(this.bottomSmallStatusLabel);

    this.bottomRunButton.onmousedown = this.handleBottomRunButtonMouseDown;

    this.bottomBarShadow.appendChild(this.bottomBar);

    this.dom.appendChild(this.bottomBarHost);
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
    this.toolbarDOM.textContent = '```' + (node.attrs.language || '');
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

  handleBottomRunButtonMouseDown = (e) => {
    e.preventDefault?.();
    e.stopPropagation?.();

    this.execScript(this.contentDOM.textContent || '');
  };

  scriptExecution;

      /**
     * @param {string} scriptText
     */
  async execScript(scriptText) {
    if (!scriptText) return;

    this.scriptExecution = {};
    this.bottomRunButton.disabled = true;
    this.bottomRunButton.textContent = 'running ...';
    this.bottomSmallStatusLabel.textContent = '';
    this.setLargeResultAreaText('', 'run-script-result run-script-result-running');
    const startRun = Date.now();

    try {
      const result = await execScriptIsolated(scriptText);

      try {
        if (result === null)
          this.setLargeResultAreaText('null', 'run-script-result run-script-result-error');
        else if (result === undefined)
          this.setLargeResultAreaText('void', 'run-script-result run-script-result-error');
        else if (typeof result === 'object' || typeof result === 'string')
          this.setLargeResultAreaText(JSON.stringify(result, null, 2), 'run-script-result run-script-result-error');
        else
          this.setLargeResultAreaText(typeof result + ': ' + String(result), 'run-script-result run-script-result-error');
      } catch (jsonError) {
        try {
        } catch (error) {
          this.setLargeResultAreaText('Result could not be displayed: ' + (error?.stack || error), 'run-script-result run-script-result-error');
        }
      }

      this.bottomRunButton.disabled = false;
      this.bottomRunButton.textContent = 'run ⏵';
      this.bottomSmallStatusLabel.textContent = `completed in ${Date.now() - startRun} ms`;
    } catch (err) {
      this.setLargeResultAreaText(err?.stack || err, 'run-script-result run-script-result-error');
      
      this.bottomRunButton.disabled = false;
      this.bottomRunButton.textContent = 'run ⏵';
      this.bottomSmallStatusLabel.textContent = `failed in ${Date.now() - startRun} ms`;
    }

  }

  /**
   * @param {string} text
   * @param {string} className
   */
  setLargeResultAreaText(text, className) {
    const pos = this.view.posAtDOM(this.dom, 0);
    const node = this.view.state.doc.nodeAt(pos);

    if (!node) return;

    /** @type {typeof node | undefined} */
    let nextNode;
    this.view.state.doc.nodesBetween(
      pos + node.nodeSize + 1,
      pos + node.nodeSize + 3,
      (nodeArg, pos) => {
        if (nodeArg !== node && !nextNode)
          nextNode = nodeArg;
      });
    
    if (!nextNode) return;

    let tr = this.view.state.tr;
    if (nextNode.type.name === 'code_block_result') {
      tr = tr.delete(pos + node.nodeSize, pos + node.nodeSize + nextNode.nodeSize);
    }
    if (text) {
      const insertNode = this.view.state.schema.nodes['code_block_result'].createAndFill(
        {},
        this.view.state.schema.text(text));

      if (insertNode) {
        tr = tr.insert(
          pos + node.nodeSize,
          insertNode);
      }
    }

    tr.setMeta('setLargeResultAreaText', false);

    this.view.dispatch(tr);

    // this.view.state.doc.nodesBetween(0, this.view.state.doc.nodeSize, (node, pos) => {
    //   if (node === this.node) {
    //     this.view.state.tr.setNodeMarkup
    //     this.view.dispatch(this.view.state.tr.setNodeMarkup(pos, null, { ...node.attrs, result: text }));
    //   }
    // });
  }
}


/** @type {HTMLIFrameElement & { runThis(code: string); }} */
var ifr;

/** @param {string} scriptText */
async function execScriptIsolated(scriptText) {
  if (!ifr) {
    ifr = /** @type {typeof ifr} */(document.createElement('iframe'));
    ifr.style.cssText =
      'position: absolute; left: -200px; top: -200px; width: 20px; height: 20px; pointer-events: none; opacity: 0.01;'

    ifr.src = 'about:blank';

    document.body.appendChild(ifr);

    await new Promise(resolve => setTimeout(resolve, 10));

    ifr.contentDocument?.write(
      '<script>window.runThis = function(code) { return eval(code) }</script>'
    );

    ifr.runThis = /** @type {*} */(ifr.contentWindow).runThis;
    delete /** @type {*} */(ifr.contentWindow).runThis;
  }

  return await ifr.runThis(scriptText)
}
