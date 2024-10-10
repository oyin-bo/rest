// @ts-check

import { getCodeBlockRegionsOfEditorView } from '../../state-block-regions';
import { execIsolation } from '../exec-isolation';
import { setLargeResultAreaTextMeta } from './plugin-runtime-old';
import { setResultStateContent } from './set-result-state-content';

export function createRemoteExecutionRuntime() {

  return {
    executeCodeBlocks
  };

  /** @type {ReturnType<import('../exec-isolation').execIsolation> | undefined} */
  var isolation;

  var debounceExecTimeout;

  /**
   * @param {import("@milkdown/prose/view").EditorView} editorView
   */
  async function executeCodeBlocks(editorView) {
    const codeBlockRegions = getCodeBlockRegionsOfEditorView(editorView);
    if (!codeBlockRegions) return;

    const codeOnlyIteration = codeBlockRegions.codeOnlyIteration;

    clearTimeout(debounceExecTimeout);
    debounceExecTimeout = setTimeout(() => {
      const codeBlockRegions = getCodeBlockRegionsOfEditorView(editorView);
      if (codeBlockRegions?.codeOnlyIteration !== codeOnlyIteration) return;

      executeCodeBlocksWorker(editorView);
    }, 300);
  }

  /**
   * @param {import("@milkdown/prose/view").EditorView} editorView
   */
  async function executeCodeBlocksWorker(editorView) {
    let codeBlockRegions = getCodeBlockRegionsOfEditorView(editorView);
    if (!codeBlockRegions) return;

    const codeOnlyIteration = codeBlockRegions.codeOnlyIteration;

    await new Promise(resolve => setTimeout(resolve, 10));
    codeBlockRegions = getCodeBlockRegionsOfEditorView(editorView);
    if (!codeBlockRegions || codeBlockRegions.codeOnlyIteration !== codeOnlyIteration) return;

    for (let iBlock = 0; iBlock < codeBlockRegions.codeBlocks.length; iBlock++) {
      codeBlockRegions = getCodeBlockRegionsOfEditorView(editorView);
      if (!codeBlockRegions || codeBlockRegions.codeOnlyIteration !== codeOnlyIteration) return;

      if (codeBlockRegions.codeBlocks[iBlock].language !== 'JavaScript') continue;

      try {
        const executionStarted = Date.now();
        if (!isolation) isolation = execIsolation();
        const result = await isolation.execScriptIsolated(codeBlockRegions.codeBlocks[iBlock].code);

        codeBlockRegions = getCodeBlockRegionsOfEditorView(editorView);
        if (!codeBlockRegions || codeBlockRegions.codeOnlyIteration !== codeOnlyIteration) return;

        const executionEnded = Date.now();
        const succeeded = true;
        // console.log('result', block);

        let resultText =
          typeof result === 'undefined' ? 'OK' : // '\u1d3c\u1d37' :
            typeof result === 'function' ? result.toString() :
              !result ? typeof result + (String(result) === typeof result ? '' : ' ' + String(result)) :
                JSON.stringify(result, null, 2);

        setResultStateContent(editorView, codeBlockRegions.codeBlocks[iBlock], resultText, setLargeResultAreaTextMeta);

      } catch (error) {
        codeBlockRegions = getCodeBlockRegionsOfEditorView(editorView);
        if (!codeBlockRegions || codeBlockRegions.codeOnlyIteration !== codeOnlyIteration) return;

        //const error = error;
        const succeeded = false;
        // console.log('result', block);

        const errorText = error?.stack ? error.stack : String(error);

        setResultStateContent(editorView, codeBlockRegions.codeBlocks[iBlock], errorText, setLargeResultAreaTextMeta);
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

}