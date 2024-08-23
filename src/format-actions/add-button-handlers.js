// @ts-check

import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';
import { applyModifierToSelection } from './apply-modifier-to-selection';
import { getCurrentSelection } from './get-current-selection';
import { queryDOMForModifierButtons } from './query-dom-for-modifier-buttons';
import { updateModifierButtonsForSelection } from './update-modifier-buttons-to-selection';

export function addButtonHandlers() {
  const buttonsArray = queryDOMForModifierButtons();
  for (var i = 0; i < buttonsArray.length; i++) {
    addHandler(buttonsArray[i]);
  }

  /** @param {HTMLButtonElement} btn */
  function addHandler(btn) {
    btn.onmousedown = btn_onmousedown;
    btn.onmouseup = btn_mouseup;
    btn.onclick = btn_click;

    /** @param {MouseEvent} evt */
    function btn_onmousedown(evt) {
      evt.preventDefault?.();
      evt.stopPropagation?.();
      if ('cancelBubble' in evt) evt.cancelBubble = true;

      handleClick();
    }

    /** @param {MouseEvent} evt */
    function btn_mouseup(evt) {
      evt.preventDefault?.();
      evt.stopPropagation?.();
      if ('cancelBubble' in evt) evt.cancelBubble = true;
    }

    /** @param {MouseEvent} evt */
    function btn_click(evt) {
      evt.preventDefault?.();
      evt.stopPropagation?.();
      if ('cancelBubble' in evt) evt.cancelBubble = true;
    }

    function handleClick() {
      var modifier = btn.id;
      applyModifierCommand(modifier);
    }
  }
}

/** @param {string} mod */
function applyModifierCommand(mod) {
  var selection = getCurrentSelection();
  if (!selection.text) return; // TODO: can we apply to the current word instead?

  var modifiers = getModifiersTextSection(selection.text, selection.startPos, selection.endPos);
  var remove = false;
  if (modifiers && modifiers.parsed) {
    for (var i = 0; i < modifiers.parsed.length; i++) {
      var parsChunk = modifiers.parsed[i];
      if (typeof parsChunk === 'string') continue;
      if (parsChunk.fullModifiers.indexOf(mod) >= 0) {
        remove = true;
        break;
      }
    }
  }

  return applyModifierToSelection(mod, remove);
}