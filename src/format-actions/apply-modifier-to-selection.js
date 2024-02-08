// @ts-check

import { cmView } from '..';
import { applyModifier } from '../unicode-styles/apply-modifier';

export function applyModifierToSelection(modifier, remove) {
  const { from, to } = cmView.state.selection.main;
  const selection = cmView.state.sliceDoc(from, to);
  const modifiedSelection = applyModifier(selection, modifier, remove);
  if (modifiedSelection === selection) return;

  cmView.dispatch(
    {
      changes: { from, to, insert: modifiedSelection },
    }
  );
}
