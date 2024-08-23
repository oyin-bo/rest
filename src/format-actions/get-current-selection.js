// @ts-check

import { cmView } from '..';

export function getCurrentSelection() {
  const { from, to } = cmView.state.selection.main;
  const selection = cmView.state.sliceDoc(from, to);
  return { text: selection, startPos: from, endPos: to };
}