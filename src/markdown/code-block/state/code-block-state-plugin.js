// @ts-check

import { defaultValueCtx, editorStateCtx, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/core';
import { Plugin, PluginKey, Selection, TextSelection, Transaction } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { ReplaceAroundStep, ReplaceStep } from '@milkdown/prose/transform';

import { withPromiseOrSync } from '../../../with-promise-or-sync';
import { makeLanguageService } from '../lang-service';
import { codeBlockExecutionState } from '../schema';
import { findCodeBlocks, findOverlappingCodeBlocks, getTransactionCodeBlocks } from '../state-block-regions/find-code-blocks';
import { modifiesExecutionStateBlocks } from './modifies-execution-state-blocks';
import { execIsolation } from './exec-isolation';
import { getSyntaxDecorations } from './get-syntax-decorations';

/**
 * @typedef {import('../state-block-regions/find-code-blocks').CodeBlockNodeset & {
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
 *  ts?: import('typescript'),
 *  languageService?: import('typescript').LanguageService,
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
    },
    props: {
      decorations(state) {
        const decorations = getSyntaxDecorations(this.getState(state)?.docState);
        const decorationSet = DecorationSet.create(state.doc, decorations);
        return decorationSet;
      }
    },
    view: editorView => {
      /**
       * @type {undefined | {
       *  pageX: number, pageY: number,
       *  scriptIndex: number,
       *  nodePos: number, nodeLength: number
       * }}
       */
      let currentTooltip;
      const tooltipElem = document.createElement('div');
      tooltipElem.className = 'code-block-tooltip';
      tooltipElem.style.display = 'none';

      document.body.appendChild(tooltipElem);
      editorView.dom.addEventListener('mousedown', e => {
        updateTooltip(e, true);
      });
      editorView.dom.addEventListener('mousemove', e => {
        updateTooltip(e);
      });

      return {
        update: () => {
          updateTooltip(undefined);
        }
      };

      /**
       * @param {MouseEvent | undefined} withMouse
       * @param {boolean} [force]
       */
      function updateTooltip(withMouse, force) {
        const editorView = ctx.get(editorViewCtx);
        /** @type {DocumentCodeState} */
        const docState = pluginKey.getState(editorView.state)?.docState;
        if (!docState?.languageService) return;

        if (!withMouse) {
          if (!currentTooltip) return;
          // check if currentTooltip is still valid
          const currentTooltipGeoPos = getPos({ x: currentTooltip.pageX, y: currentTooltip.pageY });
          if (typeof currentTooltipGeoPos?.pos !== 'number') return;
          const currentTooltipDocumentPos =
            docState.blocks[currentTooltip.scriptIndex]?.script.pos + 1 +
            currentTooltip.nodePos;
          if (currentTooltipGeoPos.pos >= currentTooltipDocumentPos &&
            currentTooltipGeoPos.pos < currentTooltipDocumentPos + currentTooltip.nodeLength) {
            return;
          }

          tooltipElem.style.display = 'none';
          tooltipElem.style.left = '0';
          tooltipElem.style.top = '0';
          currentTooltip = undefined;
        } else {
          const mouseGeoPos = getPos({ x: withMouse.pageX, y: withMouse.pageY });
          if (typeof mouseGeoPos?.pos !== 'number') {
            if (force && currentTooltip) {
              currentTooltip = undefined;
              tooltipElem.style.display = 'none';
            }
            return;
          }

          for (let i = 0; i < docState.blocks.length; i++) {
            const block = docState.blocks[i];
            const scriptPos = block.script.pos + 1;
            if (mouseGeoPos.pos < scriptPos || mouseGeoPos.pos > scriptPos + block.script.node.nodeSize) continue;

            const scriptBlockPos = mouseGeoPos.pos - scriptPos;

            const codeBlockFileName = codeBlockVirtualFileName(docState, i);

            const diag =
              docState.languageService.getSyntacticDiagnostics(codeBlockFileName)?.find(
                synt => synt.start <= scriptBlockPos && synt.start + synt.length >= scriptBlockPos) ||
              docState.languageService.getSemanticDiagnostics(codeBlockFileName)?.find(
                sem => typeof sem.start === 'number' && sem.start <= scriptBlockPos && typeof sem.length === 'number' && sem.start + sem.length >= scriptBlockPos);
            let tooltipContentElem;
            let span;
            if (diag) {
              tooltipContentElem = renderDiag(diag);
              span = { start: diag.start, length: diag.length };
            } else {
              const quickInfo = docState.languageService.getQuickInfoAtPosition(codeBlockFileName, scriptBlockPos);
              tooltipContentElem = renderQuickInfo(quickInfo);
              span = quickInfo?.textSpan;
            }
            if (!tooltipContentElem || typeof span?.start !== 'number' || !span.length) {
              return;
            }

            const { bottom, left } = editorView.coordsAtPos(scriptPos + 1 + span.start);
            const parentBox = (tooltipElem.offsetParent || tooltipElem.parentElement || document.body).getBoundingClientRect();
            tooltipElem.style.display = 'block';
            tooltipElem.style.transform =
              'translate(' +
              Math.max(0, left - parentBox.left - 20) + 'px' +
              ',' +
              (bottom - parentBox.top + 64) + 'px' +
              ')';
            tooltipElem.textContent = '';
            tooltipElem.appendChild(tooltipContentElem);

            currentTooltip = {
              pageX: withMouse.pageX,
              pageY: withMouse.pageY,
              scriptIndex: docState.blocks.indexOf(block),
              nodePos: span.start,
              nodeLength: span.length
            };
            return;
          }

          if (force && currentTooltip) {
            currentTooltip = undefined;
            tooltipElem.style.display = 'none';
          }
        }
      }

      /**
       * @param {import('typescript').QuickInfo | undefined} quickInfo
       */
      function renderQuickInfo(quickInfo) {
        if (!quickInfo) return;
        const quickInfoElem = document.createElement('div');
        quickInfoElem.className = 'code-block-tooltip-quick-info';
        if (quickInfo.documentation) {
          const docsElem = document.createElement('div');
          for (const dp of quickInfo.documentation) {
            const dpElem = document.createElement('div');
            dpElem.className = 'code-block-tooltip-doc-' + dp.kind;
            dpElem.textContent = dp.text;
            docsElem.appendChild(dpElem);
          }
          quickInfoElem.appendChild(docsElem)
        }

        if (quickInfo.displayParts) {
          const displayPartsElem = document.createElement('div');
          for (const dp of quickInfo.displayParts) {
            const dpElem = document.createElement('span');
            dpElem.className =
              'code-block-tooltip-display-' + dp.kind +
              ' ts-' + dp.kind;
            dpElem.textContent = dp.text;
            displayPartsElem.appendChild(dpElem);
          }
          quickInfoElem.appendChild(displayPartsElem);
        }

        return quickInfoElem;
      }

      /**
       * @param {import('typescript').Diagnostic} diag
       */
      function renderDiag(diag) {
        const diagElem = document.createElement('div');
        diagElem.className = 'code-block-tooltip-diag-' + diag.category;
        diagElem.textContent =
          (diag.code ? 'TS' + diag.code + ': ' : '') +
          diag.messageText;

        return diagElem;
      }

      function getPos({ x, y }) {
        const editorView = ctx.get(editorViewCtx);
        return editorView.posAtCoords({ left: x, top: y });
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
   * @param {import("../state-block-regions/find-code-blocks").CodeBlockNodeset[]} newCodeBlockNodes
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

        if (docState.blocks.length && !docState.blocks[0].executionStarted)
          return processDocState(ctx, doc, docState);

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

      updateAst(docState, ls);

      if (!liveExecutionState) liveExecutionState = createLiveExecutionState(ctx);
      liveExecutionState.executeCodeBlocks(docState).then(() => {
        const editorView = ctx.get(editorViewCtx);
        const tr = editorView.state.tr;
        tr.setMeta(setSyntaxDecorations, true);
        editorView.dispatch(tr);
      });

      ls.libdtsLoadedAsync?.then(() => {
        const editorView = ctx.get(editorViewCtx);
        const tr = editorView.state.tr;
        tr.setMeta(setSyntaxDecorations, true);
        editorView.dispatch(tr);
      });
    });
  }

}

/**
 * 
 * @param {DocumentCodeState} docState
 * @param {Awaited<ReturnType<typeof makeLanguageService>>} ls 
 */
function updateAst(docState, ls) {
  ls.scripts = {};

  for (let i = 0; i < docState.blocks.length; i++) {
    const node = docState.blocks[i];
    ls.scripts[codeBlockVirtualFileName(docState, i)] = node.code;
  }

  docState.ts = ls.ts;
  docState.languageService = ls.languageService;
  docState.program = ls.languageService.getProgram();
  for (let i = 0; i < docState.blocks.length; i++) {
    const node = docState.blocks[i];
    node.ast = docState.program?.getSourceFile(codeBlockVirtualFileName(docState, i));
  }
}

/**
 * @param {DocumentCodeState} docState
 * @param {number} index
 */
export function codeBlockVirtualFileName(docState, index) {
  return 'code' + (index + 1) + '.js';
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
   * @param {DocumentCodeState} docState
   */
  async function executeCodeBlocks(docState) {
    const current = docState.current;

    await new Promise(resolve => setTimeout(resolve, 10));
    if (docState.current !== current) return;

    const ts = docState.ts;
    if (!ts) return;

    /**
     * @typedef {{
     *  statement: import('typescript').ImportDeclaration;
     *  variableNames: string[];
     *  moduleName: string;
     *  moduleNameStartPos: number;
     *  moduleNameEndPos: number;
     * }} ImportLocation
     */

    /**
     * @typedef {{
     *  statement: import('typescript').DeclarationStatement
     * }} VariableDeclaration
     */

    /**
     * @typedef {{
     *  imports: ImportLocation[];
     *  variables: VariableDeclaration[];
     * }} BlockAstTransformLocations
     */

    const astTransforms = [];

    for (let iBlock = 0; iBlock < docState.blocks.length; iBlock++) {
      /**
       * @type {BlockAstTransformLocations}
       */
      const transform = {
        imports: [],
        variables: []
      };
      astTransforms.push(transform);

      const block = docState.blocks[iBlock];
      if (!block.ast) continue;

      for (const st of block.ast.statements) {
        if (ts.isImportDeclaration(st)) {
          if (st.importClause && ts.isStringLiteral(st.moduleSpecifier)) {
            /** @type {string[]} */
            const names = [];
            if (st.importClause.name)
              names.push(st.importClause.name.text);
            if (st.importClause.namedBindings) {
              if (st.importClause.namedBindings.kind === ts.SyntaxKind.NamespaceImport) {
                names.push(st.importClause.namedBindings.name.text);
              } else if (st.importClause.namedBindings.elements?.length) {
                for (const el of st.importClause.namedBindings.elements) {
                  names.push(el.name.text);
                }
              }
            }

            if (names.length) {
              transform.imports.push({
                statement: st,
                variableNames: names,
                moduleName: st.moduleSpecifier.text,
                moduleNameStartPos: st.moduleSpecifier.pos,
                moduleNameEndPos: st.moduleSpecifier.end
              })
            }
          }
        }

        if (ts.isDeclarationStatement(st)) {
          // need to strip const/let/var and convert into: globalThis.XYZ = ...
          transform.variables.push({
            statement: st
          });
        } else if (ts.isFunctionDeclaration(st)) {
          // need an assignment lifted to the top of the module: globalThis.FUNC1 = FUNC1
        }
      }
    }

    if (astTransforms.length)
      console.log('transforms ', astTransforms);

    for (let iBlock = 0; iBlock < docState.blocks.length; iBlock++) {
      if (docState.current !== current) return;

      const block = docState.blocks[iBlock];

      try {
        if (!block.ast) {
          block.succeeded = false;
          block.error = 'No AST';
          continue;
        }

        // interrogate last statement - pull into the result output

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
        setResultStateText(docState, block, resultText);

      } catch (error) {
        block.error = error;
        block.succeeded = false;
        console.log('result', block);

        const errorText = error?.stack ? error.stack : String(error);

        setResultStateText(docState, block, errorText);
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * @param {DocumentCodeState} docState
  * @param {CodeBlockState} block
  * @param {string} text
  */
  function setResultStateText(docState, block, text) {
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

    const updatedCodeBlockLocations = findCodeBlocks(editorView.state.doc);
    for (let i = 0; i < docState.blocks.length; i++) {
      docState.blocks[i].block = updatedCodeBlockLocations[i].block;
      docState.blocks[i].backtick = updatedCodeBlockLocations[i].backtick;
      docState.blocks[i].script = updatedCodeBlockLocations[i].script;
      docState.blocks[i].executionState = updatedCodeBlockLocations[i].executionState;
    }
  }
}

