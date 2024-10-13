// @ts-check

import { codeBlockExecutionState } from '../../schema';

/**
 * @param {import('@milkdown/prose/view').EditorView} editorView
 * @param {import('../../state-block-regions/find-code-blocks').CodeBlockNodeset} block
 * @param {string} text
 * @param {any} meta
 */
export function setResultStateContent(editorView, block, text, meta) {
  const tr = setResultStateContentToTransaction(editorView.state, editorView.state.tr, block, text, meta);
  editorView.dispatch(tr);
}


/**
 * @param {import('@milkdown/prose/state').EditorState} editorState
 * @param {import('@milkdown/prose/state').Transaction} tr
 * @param {import('../../state-block-regions/find-code-blocks').CodeBlockNodeset} block
 * @param {string} text
 * @param {any} meta
 */
export function setResultStateContentToTransaction(editorState, tr, block, text, meta) {
  if (block.executionState) {
    const startPos = tr.mapping.map(block.executionState.pos + 1);
    const endPos = tr.mapping.map(block.executionState.pos + block.executionState.node.nodeSize - 1);

    tr = text ?
      tr.replaceRangeWith(
          startPos,
          endPos,
          editorState.schema.text(text)) :
      tr.deleteRange(
        startPos,
        endPos);
    tr.setMeta('set result state text', { text, block });
    tr.setMeta(meta, true);
    tr.setMeta('addToHistory', false);

    return tr;
    // console.log('replaced execution_state with result ', tr);
  } else {
    const nodeType = editorState.schema.nodes['code_block_execution_state'];
    const newExecutionStateNode = nodeType.create(
      {},
      !text ? undefined : editorState.schema.text(text));
    
    const insertPos = tr.mapping.map(block.script.pos + block.script.node.nodeSize);

    tr = tr
      .insert(
        insertPos,
        newExecutionStateNode);
    tr.setMeta('create result state block and set its value', { text, block });
    tr.setMeta(meta, true);
    tr.setMeta('addToHistory', false);
    return tr;
  }
}
