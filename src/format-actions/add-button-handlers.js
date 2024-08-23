// @ts-check

import { applyModifierToSelection } from './apply-modifier-to-selection';

export function addButtonHandlers() {
  var buttonsArray = document.getElementsByTagName('button');
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
      if (evt.preventDefault) evt.preventDefault();
      if (evt.stopPropagation) evt.stopPropagation();
      if ('cancelBubble' in evt) evt.cancelBubble = true;

      handleClick();
    }

    /** @param {MouseEvent} evt */
    function btn_mouseup(evt) {
      if (evt.preventDefault) evt.preventDefault();
      if (evt.stopPropagation) evt.stopPropagation();
      if ('cancelBubble' in evt) evt.cancelBubble = true;
    }

    /** @param {MouseEvent} evt */
    function btn_click(evt) {
      if (evt.preventDefault) evt.preventDefault();
      if (evt.stopPropagation) evt.stopPropagation();
      if ('cancelBubble' in evt) evt.cancelBubble = true;
    }

    function handleClick() {
      var modifier = btn.id;
      var remove = (btn.className || '').indexOf('pressed') >= 0;
      applyModifierToSelection(modifier, remove);
    }
  }
}