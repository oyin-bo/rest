// @ts-check

import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';
import { getCurrentSelection } from './get-current-selection';
import { queryDOMForModifierButtons } from './query-dom-for-modifier-buttons';

const btnPressedClassNameRegexp = /\s*\bpressed\b\s*/g;

/**
 * @param {import('codemirror').EditorView} cmView
 */
export function updateModifierButtonsForSelection(cmView) {
  const selection = getCurrentSelection(cmView);
  const modTextSection = getModifiersTextSection(selection.text, selection.startPos, selection.endPos);

  const buttons = queryDOMForModifierButtons();

  for (const btn of buttons) {
    if (btn.id) {
      var pressed = modTextSection && modTextSection.parsed && modTextSection.parsed.modifiers.indexOf(btn.id) >= 0;

      if (pressed && !(btnPressedClassNameRegexp.test(btn.className || ''))) btn.className = (btn.className || '').trim() + ' pressed';
      else if (btnPressedClassNameRegexp.test(btn.className || '')) btn.className = btn.className.replace(btnPressedClassNameRegexp, ' ');
    }
  }
}