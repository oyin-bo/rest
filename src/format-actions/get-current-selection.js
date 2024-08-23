// @ts-check

/**
 * @param {import('codemirror').EditorView} cmView
 */
export function getCurrentSelection(cmView) {
  const { from, to } = cmView.state.selection.main;
  const selection = cmView.state.sliceDoc(from, to);
  return { text: selection, startPos: from, endPos: to };
}