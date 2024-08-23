// @ts-check

import { applyModifier } from '../unicode-styles/apply-modifier';

/**
 * @param {import('codemirror').EditorView} cmView
 * @param {string} modifier
 * @param {boolean} [remove]
 */
export function applyModifierToSelection(cmView, modifier, remove) {
  const { from, to } = cmView.state.selection.main;
  const selection = cmView.state.sliceDoc(from, to);
  const modifiedSelection = applyModifier(selection, modifier, remove);
  if (modifiedSelection === selection) return;

  cmView.dispatch(
    {
      changes: { from, to, insert: modifiedSelection },
    }
  );

  return true;
}
