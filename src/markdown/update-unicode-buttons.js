// @ts-check

import { editorStateCtx } from '@milkdown/core';
import { getSelectionModifiersForDocument } from './get-selection-modifiers';
import { queryDOMForUnicodeModifierButtons } from '../format-actions/query-dom-for-unicode-modifier-buttons';

/**
 * @param {import("@milkdown/ctx").Ctx} ctx
 */
export function updateUnicodeButtons(ctx) {
  const editorState = ctx.get(editorStateCtx);

  const selMods = getSelectionModifiersForDocument(editorState);
  console.log('selection modifiers ', selMods);

  const modifiers = selMods.modifiers;

  const buttons = queryDOMForUnicodeModifierButtons();

  const btnPressedClassNameRegexp = /\s*\bpressed\b\s*/g;

  for (const btn of buttons) {
    if (btn.id) {
      var pressed = modifiers && modifiers.indexOf(btn.id) >= 0;

      if (pressed && !(btnPressedClassNameRegexp.test(btn.className || ''))) btn.className = (btn.className || '').trim() + ' pressed';
      else if (btnPressedClassNameRegexp.test(btn.className || '')) btn.className = btn.className.replace(btnPressedClassNameRegexp, ' ');
    }
  }

}