// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { getSelectionModifiersForDocument } from './unicode-formatting/get-selection-modifiers';

const key = new PluginKey('FORMATTING_BUTTONS');
/** @type {import('@milkdown/prose/state').PluginSpec} */
export const formattingButtonsPlugin = new Plugin({
  key,
  view: (editorView) => {
    const {
      boldItalicToggle,
      headingToggle,
      listToggle,
      codeInsert,
      dividerInsert,
      unicodeFormatToggle
    } = Array.from(
      document.getElementById('format-tools')?.getElementsByTagName('button') || [])
      .reduce((acc, button) => {
        const id = button.id;
        if (!id) return acc;
        acc[id] = button;
        return acc;
      }, /** @type {Record<string, HTMLButtonElement>} */({}));
    
    if (boldItalicToggle) boldItalicToggle.onmousedown = handleBoldItalicClick;
    if (headingToggle) headingToggle.onmousedown = handleHeadingClick;
    if (listToggle) listToggle.onmousedown = handleListClick;
    if (codeInsert) codeInsert.onmousedown = handleCodeInsert;
    if (dividerInsert) dividerInsert.onmousedown = handleDividerInsert;
    if (unicodeFormatToggle) unicodeFormatToggle.onmousedown = handleUnicodeFormatToggle;

    return {
      update: (view, prevState) => {
        updateButtons(view, prevState);
      }
    };

    var latestPress;

    /**
     * @param {import('@milkdown/prose/view').EditorView} view
     * @param {import('@milkdown/prose/state').EditorState} prevState
     */
    function updateButtons(view, prevState) {

      // const selMods = getSelectionModifiersForDocument(editorView.state);
      // const currentBoldItalic =
      //   selMods.modifiers.indexOf('bold') >= 0 ? (
      //     selMods.modifiers.indexOf('italic') >= 0 ? 'bold-italic' : 'bold'
      //   ) : (
      //     selMods.modifiers.indexOf('italic') >= 0 ? 'italic' : ''
      //   );

      const boldItalicCurrent = getBoldItalic();
      if (boldItalicToggle) boldItalicToggle.className = boldItalicCurrent.className;
    }

    function getBoldItalic() {
      let hasBold = editorView.state.doc.rangeHasMark(
        editorView.state.selection.from,
        editorView.state.selection.to,
        editorView.state.schema.marks.strong);
      let hasItalic = editorView.state.doc.rangeHasMark(
        editorView.state.selection.from,
        editorView.state.selection.to,
        editorView.state.schema.marks.emphasis);

      editorView.state.doc.nodesBetween(
        editorView.state.selection.from,
        editorView.state.selection.to,
        (node, pos) => {
          if (node.marks) {
            for (let m of node.marks) {
              if (m.type.name === 'strong') hasBold = true;
              if (m.type.name === 'emphasis') hasItalic = true;
            }
          }
        });

      return { bold: hasBold, italic: hasItalic, className: hasBold ? (hasItalic ? 'bold-italic' : 'bold') : (hasItalic ? 'italic' : '') };
    }

    /** @param {MouseEvent} e */
    function handleBoldItalicClick(e) {
      e.preventDefault();
      e.stopPropagation();

      // TODO: handle bold italic click
    }

    /** @param {MouseEvent} e */
    function handleHeadingClick(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    /** @param {MouseEvent} e */
    function handleListClick(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    /** @param {MouseEvent} e */
    function handleCodeInsert(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    /** @param {MouseEvent} e */
    function handleDividerInsert(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    /** @param {MouseEvent} e */
    function handleUnicodeFormatToggle(e) {
      e.preventDefault();
      e.stopPropagation();
    }


  }
});