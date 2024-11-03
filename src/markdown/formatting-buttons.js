// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';
import { commonmark, toggleEmphasisCommand, toggleStrongCommand } from '@milkdown/kit/preset/commonmark';

import { getSelectionModifiersForDocument } from './unicode-formatting/get-selection-modifiers';

export const FORMATTING_BUTTONS_PRESS_SERIES_TIMEOUT = 2400;

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

    /** @type {undefined | { action: string, time: number, [other: string]: any }} */
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

    function getHeading() {
    }

    function selectionWiithinCodeBlock() {
      const { from, to } = editorView.state.selection;
      let withinCodeBlock = false;
      editorView.state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'code_block') {
          withinCodeBlock = true;
        }
      });
      return withinCodeBlock;
    }

    /** @param {MouseEvent} e */
    function handleBoldItalicClick(e) {
      e.preventDefault();
      e.stopPropagation();

      if (selectionWiithinCodeBlock()) return;

      const boldItalic = getBoldItalic();
      const now = Date.now();

      if (latestPress?.action === 'bold-italic' && now - latestPress.time < FORMATTING_BUTTONS_PRESS_SERIES_TIMEOUT) {
        editorView.dispatch(editorView.state.tr.setMeta('bold-italic', false));

        const newSet =
          latestPress.set === 'bold' ? 'italic' :
            latestPress.set === 'italic' ? 'bold-italic' :
              latestPress.set === 'bold-italic' ? 'none' : 'bold';

        const tr = editorView.state.tr;
        if (newSet === 'bold' || newSet === 'bold-italic') tr.addMark(editorView.state.selection.from, editorView.state.selection.to, editorView.state.schema.marks.strong.create());
        else tr.removeMark(editorView.state.selection.from, editorView.state.selection.to, editorView.state.schema.marks.strong);

        if (newSet === 'italic' || newSet === 'bold-italic') tr.addMark(editorView.state.selection.from, editorView.state.selection.to, editorView.state.schema.marks.emphasis.create());
        else tr.removeMark(editorView.state.selection.from, editorView.state.selection.to, editorView.state.schema.marks.emphasis);

        editorView.dispatch(tr);

        latestPress = { action: 'bold-italic', time: now, set: newSet };
      } else {
        if (boldItalic.bold || boldItalic.italic) {
          editorView.dispatch(
            editorView.state.tr
              .removeMark(editorView.state.selection.from, editorView.state.selection.to, editorView.state.schema.marks.strong)
              .removeMark(editorView.state.selection.from, editorView.state.selection.to, editorView.state.schema.marks.italic)
          );
          latestPress = { action: 'bold-italic', time: now, set: 'none' };
        } else {
          editorView.dispatch(
            editorView.state.tr
              .addMark(editorView.state.selection.from, editorView.state.selection.to, editorView.state.schema.marks.strong.create())
          );
          latestPress = { action: 'bold-italic', time: now, set: 'bold' };
        }
      }
    }

    /** @param {MouseEvent} e */
    function handleHeadingClick(e) {
      e.preventDefault();
      e.stopPropagation();

      if (selectionWiithinCodeBlock()) return;
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