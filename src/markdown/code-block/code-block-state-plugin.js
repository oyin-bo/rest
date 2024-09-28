// @ts-check

import { defaultValueCtx, editorStateCtx, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';
import { ReplaceAroundStep, ReplaceStep } from '@milkdown/prose/transform';

import { withPromiseOrSync } from '../../with-promise-or-sync';
import { findCodeBlocks, findOverlappingCodeBlocks, getTransactionCodeBlocks } from './find-code-blocks';
import { makeLanguageService } from './lang-service';
import { codeBlockExecutionState } from './schema';

/**
 * @typedef {import('./find-code-blocks').CodeBlockNodeset & {
 *  ast?: import('typescript').SourceFile,
 *  transformedCode?: string,
 *  executionStarted?: number,
 *  executionEnded?: number,
 *  succeeded?: boolean,
 *  error?: any,
 *  result?: any
 * }} CodeBlockState
 */

/**
 * @typedef {{
 *  current: number,
 *  blocks: CodeBlockState[],
 *  program?: import('typescript').Program
 * }} DocumentCodeState
 */

const setLargeResultAreaText = 'setLargeResultAreaText';

/**
 * @param {import("@milkdown/ctx").Ctx} ctx
 */
export function createCodeBlockStatePlugin(ctx) {
  const pluginKey = new PluginKey('FILTER_RESULT_EDITING');
  const pluginFilterEditing = new Plugin({
    key: pluginKey,
    filterTransaction: (tr, state) => {
      // let the code result changes flow normally
      if (tr.getMeta(setLargeResultAreaText)) return true;

      const codeBlockNodes = getTransactionCodeBlocks(tr);

      for (const step of tr.steps) {
        if (!(step instanceof ReplaceStep) && !(step instanceof ReplaceAroundStep)) {
          continue;
        }

        const overlapping = findOverlappingCodeBlocks(step, codeBlockNodes);
        console.log('overlapping', overlapping, tr);

        if (!overlapping) {
          continue;
        }

        if (overlapping.only) {
          // TODO: if result.isSignificant, then expand the step to the whole of result
          // otherwise, exclude the result ONLY from the step

          // temporary implementation, fault whole transaction if results affected
          if (overlapping.only.executionState?.overlap && overlapping.only.executionState.overlap) {
            return false;
          }
        } else {
          // TODO: for the [leading AND trailing], if result.isSignificant, then expand the step to the whole of result
          // otherwise -
          //  * for [leading] exclude both the code and the result from the step
          //  * for [trailing] exclude the result ONLY from the step

          // TODO: for the overlapping.whollyContained, leave them alone

          // temporary implementation, fault whole transaction if results affected
          if (overlapping.leading?.executionState?.overlap ||
            overlapping.trailing?.result?.overlap ||
            overlapping.whollyContained?.length
          ) {
            return false;
          }
        }
      }

      return true;
    },
    state: {
      init: () => /** @type {{ docState: DocumentCodeState } | null} */(null),
      apply: (tr, prev) => {

        if (!prev) {
          const docState = { current: 0, blocks: findCodeBlocks(tr.doc) };
          processDocState(ctx, tr.doc, docState);
          return { docState };
        }

        if (!tr.docChanged) return prev;

        const docState = prev.docState;
        updateDocState(ctx, tr.doc, docState, findCodeBlocks(tr.doc));
        return { docState };
      }
    }
  });

  return pluginFilterEditing;

  /**
 * @param {import("@milkdown/ctx").Ctx} ctx
 * @param {import("prosemirror-model").Node} doc
 * @param {DocumentCodeState} docState
 */
  function processDocState(ctx, doc, docState) {
    return withPromiseOrSync(makeLanguageService(), ls => processWithContext(ls, docState, ctx, doc));
  }

  /**
   * @param {import("@milkdown/ctx").Ctx} ctx
   * @param {import("prosemirror-model").Node} doc
   * @param {DocumentCodeState} docState
   * @param {import("./find-code-blocks").CodeBlockNodeset[]} newCodeBlockNodes
   */
  function updateDocState(ctx, doc, docState, newCodeBlockNodes) {
    if (docState.blocks.length === newCodeBlockNodes.length) {
      let changed = false;
      for (let i = 0; i < docState.blocks.length; i++) {
        if (docState.blocks[i].code !== newCodeBlockNodes[i].code) {
          changed = true;
          break;
        }
      }

      if (!changed) {
        for (let i = 0; i < docState.blocks.length; i++) {
          const existingNode = docState.blocks[i];
          const newNodeset = newCodeBlockNodes[i];
          existingNode.block = newNodeset.block;
          existingNode.backtick = newNodeset.backtick;
          existingNode.script = newNodeset.script;
          existingNode.executionState = newNodeset.executionState;
        }
        return;
      }
    }

    const prevBlocks = docState.blocks;
    docState.blocks = newCodeBlockNodes;
    docState.program = undefined;

    return withPromiseOrSync(makeLanguageService(), processWithTS);

    /**
     * @param {Awaited<ReturnType<typeof makeLanguageService>>} ls
     */
    async function processWithTS(ls) {
      processWithContext(ls, docState, ctx, doc);
    }
  }

  /**
   * @param {Awaited<ReturnType<typeof makeLanguageService>>} ls
   * @param {DocumentCodeState} docState
   * @param {import("@milkdown/ctx").Ctx} ctx
   * @param {import("prosemirror-model").Node} doc
   */
  async function processWithContext(ls, docState, ctx, doc) {
    const current = docState.current;

    await new Promise(resolve => setTimeout(resolve, 10));

    ls.scripts = {};

    for (let i = 0; i < docState.blocks.length; i++) {
      const node = docState.blocks[i];
      ls.scripts['code' + (i + 1) + '.ts'] = node.code;
    }

    docState.program = ls.languageService.getProgram();
    for (let i = 0; i < docState.blocks.length; i++) {
      const node = docState.blocks[i];
      node.ast = docState.program?.getSourceFile('code' + (i + 1) + '.ts');
    }

    for (let iBlock = 0; iBlock < docState.blocks.length; iBlock++) {
      if (docState.current !== current) return;

      const block = docState.blocks[iBlock];

      try {
        if (!block.ast) {
          block.succeeded = false;
          block.error = 'No AST';
          continue;
        }

        //block.transformedCode = ls.languageService.transformCode(block.ast);
        block.executionStarted = Date.now();
        block.result = await execScriptIsolated(block.code);
        block.executionEnded = Date.now();
        block.succeeded = true;
        console.log('result', block);

        let resultText =
          typeof block.result === 'function' ? block.result.toString() :
          !block.result ? typeof block.result + (String(block.result) === typeof block.result ? '' : ' ' + String(block.result)) :
            JSON.stringify(block.result, null, 2);
        setResultStateText(block, resultText);

      } catch (error) {
        block.error = error;
        block.succeeded = false;
        console.log('result', block);

        const errorText = error?.stack ? error.stack : String(error);

        setResultStateText(block, errorText);
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * @param {CodeBlockState} block
   * @param {string} text
   */
  function setResultStateText(block, text) {
    const editorView = ctx.get(editorViewCtx);
    if (block.executionState) {
      const tr = text ?
        editorView.state.tr
          .replaceRangeWith(
            block.executionState.pos + 1,
            block.executionState.pos + block.executionState.node.nodeSize - 1,
            editorView.state.schema.text(text)) :
        editorView.state.tr
          .deleteRange(block.executionState.pos + 1,
            block.executionState.pos + block.executionState.node.nodeSize - 1);
      tr.setMeta(setLargeResultAreaText, true);

      editorView.dispatch(tr);
      console.log('replaced execution_state with result ', tr);
    } else {
      const newExecutionStateNode = codeBlockExecutionState.type(ctx).create(
        {},
        !text ? undefined : editorView.state.schema.text(text));

      const tr = editorView.state.tr
        .insert(
          block.script.pos + block.script.node.nodeSize,
          newExecutionStateNode);
      tr.setMeta(setLargeResultAreaText, true);
      editorView.dispatch(tr);
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
}

