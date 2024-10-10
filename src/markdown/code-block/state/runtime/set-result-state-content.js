// @ts-check

import { codeBlockExecutionState } from '../../schema';

/**
 * @param {import('@milkdown/prose/view').EditorView} editorView
 * @param {import('../../state-block-regions/find-code-blocks').CodeBlockNodeset} block
 * @param {string} text
 * @param {any} meta
 */
export function setResultStateContent(editorView, block, text, meta) {
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
    tr.setMeta('set result state text', { text, block });
    tr.setMeta(meta, true);
    tr.setMeta('addToHistory', false);

    editorView.dispatch(tr);
    // console.log('replaced execution_state with result ', tr);
  } else {
    const nodeType = editorView.state.schema.nodes['code_block_execution_state'];
    const newExecutionStateNode =nodeType.create(
      {},
      !text ? undefined : editorView.state.schema.text(text));

    const tr = editorView.state.tr
      .insert(
        block.script.pos + block.script.node.nodeSize,
        newExecutionStateNode);
    tr.setMeta('create result state block and set its value', { text, block });
    tr.setMeta(meta, true);
    tr.setMeta('addToHistory', false);
    editorView.dispatch(tr);
  }
}
