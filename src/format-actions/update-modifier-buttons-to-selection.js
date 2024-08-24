// @ts-check

import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';
import { getCurrentSelection } from './get-current-selection';
import { queryDOMForUnicodeModifierButtons } from './query-dom-for-unicode-modifier-buttons';

const btnPressedClassNameRegexp = /\s*\bpressed\b\s*/g;

/**
 * @param {import('../editor/init-code-mirror').EditorViewExtended} cmView
 */
export function updateModifierButtonsForSelection(cmView) {
  const selection = getCurrentSelection(cmView);
  const modifiers =
    cmView.residualModifiers?.from === selection.from &&
      cmView.residualModifiers?.to === selection.to ? cmView.residualModifiers.modifiers :
      getModifiersTextSection(selection.text, selection.from, selection.to)?.parsed.modifiers;

  const buttons = queryDOMForUnicodeModifierButtons();

  for (const btn of buttons) {
    if (btn.id) {
      var pressed = modifiers && modifiers.indexOf(btn.id) >= 0;

      if (pressed && !(btnPressedClassNameRegexp.test(btn.className || ''))) btn.className = (btn.className || '').trim() + ' pressed';
      else if (btnPressedClassNameRegexp.test(btn.className || '')) btn.className = btn.className.replace(btnPressedClassNameRegexp, ' ');
    }
  }
}