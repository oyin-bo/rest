// @ts-check

import { defaultValueCtx, editorStateCtx, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { ReplaceAroundStep, ReplaceStep } from '@milkdown/prose/transform';

import { withPromiseOrSync } from '../../../with-promise-or-sync';
import { makeLanguageService } from '../lang-service';
import { codeBlockExecutionState } from '../schema';
import { findCodeBlocks, findOverlappingCodeBlocks, getTransactionCodeBlocks } from './find-code-blocks';
import { modifiesExecutionStateBlocks } from './modifies-execution-state-blocks';
import { execIsolation } from './exec-isolation';

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
const setSyntaxDecorations = 'setSyntaxDecorations';

/**
 * @param {import("@milkdown/ctx").Ctx} ctx
 */
export function createCodeBlockStatePlugin(ctx) {
  const pluginKey = new PluginKey('CODE_BLOCK_STATE');
  const codeBlockStatePlugin = new Plugin({
    key: pluginKey,
    filterTransaction: (tr, state) => {
      // let the code result changes flow normally
      if (tr.getMeta(setLargeResultAreaText)) return true;

      return !modifiesExecutionStateBlocks(tr);
    },
    state: {
      init: () => /** @type {{ docState: DocumentCodeState, decorations?: DecorationSet } | null} */(null),
      apply: (tr, prev) => {
        /** @type {DecorationSet | undefined} */
        const decorations = tr.getMeta(setSyntaxDecorations);

        if (!prev) {
          const docState = { current: 0, blocks: findCodeBlocks(tr.doc) };
          processDocState(ctx, tr.doc, docState);
          return { docState, decorations };
        }

        if (!tr.docChanged) {
          if (prev.decorations === decorations)
            return prev;
          else
            return { ...prev, decorations };
        }

        const docState = prev.docState;
        updateDocState(ctx, tr.doc, docState, findCodeBlocks(tr.doc));
        return { docState, decorations };
      }
    },
    props: {
      decorations(state) {
        return this.getState(state)?.decorations;
      }
    }
  });

  return codeBlockStatePlugin;

  /** @type {ReturnType<typeof makeLanguageService> | undefined} */
  var ls;

  /**
   * @template T
   * @param {(ls: Awaited<ReturnType<typeof makeLanguageService>>) => T} callback
   * @returns {T | Promise<T>}
   */
  function withLanguageService(callback) {
    if (!ls) ls = makeLanguageService();
    return withPromiseOrSync(ls, callback);
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

    return processDocState(ctx, doc, docState);
  }

  /** @type {ReturnType<typeof createLiveExecutionState> | undefined} */
  var liveExecutionState;

  /**
* @param {import("@milkdown/ctx").Ctx} ctx
* @param {import("prosemirror-model").Node} doc
* @param {DocumentCodeState} docState
*/
  function processDocState(ctx, doc, docState) {
    const current = docState.current;
    return withLanguageService(ls => {
      if (docState.current !== current) return;

      applySyntaxDecorations(ctx, doc, docState, ls);

      if (!liveExecutionState) liveExecutionState = createLiveExecutionState(ctx);
      liveExecutionState.executeCodeBlocks(ls, docState, doc).then(() => {
        const currentDoc = ctx.get(editorStateCtx).doc;
        applySyntaxDecorations(ctx, currentDoc, docState, ls);
      });
    });
  }

  /**
  * @param {import("@milkdown/ctx").Ctx} ctx
  * @param {import("prosemirror-model").Node} doc
  * @param {DocumentCodeState} docState
  * @param {Awaited<ReturnType<typeof makeLanguageService>>} ls
  */
  function applySyntaxDecorations(ctx, doc, docState, ls) {
    let decorations = [];

    for (let i = 0; i < docState.blocks.length; i++) {
      const { script, code, ast } = docState.blocks[i];
      if (!ast) continue;

      ast.forEachChild(tsNode => {
        const classNames = [];
        for (const syntaxKindName in ls.ts.SyntaxKind) {
          const syntaxKind = ls.ts.SyntaxKind[syntaxKindName];
          if (typeof syntaxKind === 'number' && (syntaxKind & tsNode.kind) === tsNode.kind) {
            classNames.push('ts-' + syntaxKindName);
          }
        }

        decorations.push(Decoration.node(
          script.pos + tsNode.pos,
          script.pos + tsNode.end,
          { class: classNames.join(' ') }
        ));
      });
    }

    const editorView = ctx.get(editorViewCtx);
    const tr = editorView.state.tr;
    const decSet = DecorationSet.create(doc, decorations)
    tr.setMeta(setSyntaxDecorations, decSet);
    
    if (decorations.length) {
      console.log('decorations calculated ', decorations, decSet);
    }

    editorView.dispatch(tr);
  }
}

/**
 * @param {DocumentCodeState} docState
 * @param {number} index
 */
function codeBlockVirtualFileName(docState, index) {
  return 'code' + (index + 1) + '.ts';
}

/**
 * @param {import("@milkdown/ctx").Ctx} ctx
 */
function createLiveExecutionState(ctx) {

  return {
    executeCodeBlocks
  };

  /** @type {ReturnType<import('./exec-isolation').execIsolation> | undefined} */
  var isolation;

  /**
   * @param {Awaited<ReturnType<typeof makeLanguageService>>} ls
   * @param {DocumentCodeState} docState
   * @param {import("prosemirror-model").Node} doc
   */
  async function executeCodeBlocks(ls, docState, doc) {
    const current = docState.current;

    await new Promise(resolve => setTimeout(resolve, 10));

    ls.scripts = {};

    for (let i = 0; i < docState.blocks.length; i++) {
      const node = docState.blocks[i];
      ls.scripts[codeBlockVirtualFileName(docState, i)] = node.code;
    }

    docState.program = ls.languageService.getProgram();
    for (let i = 0; i < docState.blocks.length; i++) {
      const node = docState.blocks[i];
      node.ast = docState.program?.getSourceFile(codeBlockVirtualFileName(docState, i));
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
        if (!isolation) isolation = execIsolation();
        block.result = await isolation.execScriptIsolated(block.code);
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
  
}

