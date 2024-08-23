// @ts-check

/**
 * @typedef {{
 *  text: string,
 *  selectionStart: number,
 *  selectionEnd: number,
 *  cursorPosition: number
 * }} EditorState
 */

/**
 * @param {{
 *  initialText: string,
 *  onChange?: () => void
 * }} _
 * @returns {() => EditorState}
 */
export function initTTY(options) {

  const cmView = new EditorView({
    doc: text,
    extensions: [
      ...cmSetup(),
      EditorView.updateListener.of((v) => {
        if (typeof options.onChange === 'function')
          options.onChange();
      })
    ],
    parent
  });

  cmView.focus();
  setTimeout(() => {
    cmView.update([]);

    addButtonHandlers();
    updateModifierButtonsForSelection();
  });

  function updateLocation() {

  }

}