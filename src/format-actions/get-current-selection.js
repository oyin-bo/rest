// @ts-check

/**
 * @param {import('codemirror').EditorView} cmView
 */
export function getCurrentSelection(cmView) {
  const { from, to } = cmView.state.selection.main;
  const selectionText = cmView.state.sliceDoc(from, to);
  return { text: cmView.state.doc.toString(), selectionText, startPos: from, endPos: to };
}