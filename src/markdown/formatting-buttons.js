// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { getSelectionModifiersForDocument } from './unicode-formatting/get-selection-modifiers';
import { getCodeBlockRegionsOfEditorState } from './code-block/state-block-regions';
import { applyUnicodeModifiers } from './unicode-formatting/apply-unicode-modifiers';

export const FORMATTING_BUTTONS_PRESS_SERIES_TIMEOUT = 2400;

const key = new PluginKey('FORMATTING_BUTTONS');
/** @type {import('@milkdown/prose/state').PluginSpec} */
export const formattingButtonsPlugin = new Plugin({
  key,
  view: (editorView) => {
    const {
      boldItalicToggle,
      headingToggle,
      codeInsert,
      dividerInsert,
      unicodeFormatToggle,
      unicodeSubsection,
      uniBoldItalicToggle,
      uniUnderlineToggle,
      uniJoyToggle,
      uniWtfToggle,
      uniCursiveSuperToggle,
      uniRpxToggle,
      uniKhazadToggle
    } = Array.from(
        /** @type {NodeListOf<HTMLElement>} */
      (document.getElementById('format-tools')?.querySelectorAll('button, span') || []))
        .reduce((acc, button) => {
        const id = button.id;
        if (!id) return acc;
        const idCanonicalized = id.replace(/\-[a-z]/, (dashLetter) => dashLetter.charAt(1).toUpperCase());
        acc[idCanonicalized] = button;
        return acc;
      }, /** @type {Record<string, HTMLElement>} */({}));
    
    if (boldItalicToggle) boldItalicToggle.onmousedown = handleBoldItalicClick;
    if (headingToggle) headingToggle.onmousedown = handleHeadingClick;
    if (codeInsert) codeInsert.onmousedown = handleCodeInsert;
    if (dividerInsert) dividerInsert.onmousedown = handleDividerInsert;
    if (unicodeFormatToggle) unicodeFormatToggle.onmousedown = handleUnicodeFormatToggle;
    if (uniBoldItalicToggle) uniBoldItalicToggle.onmousedown = handleUnicodeBoldItalicClick;
    if (uniUnderlineToggle) uniUnderlineToggle.onmousedown = handleUnicodeUnderlineToggle;
    if (uniJoyToggle) uniJoyToggle.onmousedown = handleUnicodeJoyToggle;
    if (uniWtfToggle) uniWtfToggle.onmousedown = handleUnicodeWtfToggle;
    if (uniCursiveSuperToggle) uniCursiveSuperToggle.onmousedown = handleUnicodeCursiveSuperToggle;
    if (uniRpxToggle) uniRpxToggle.onmousedown = handleUnicodeRpxToggle;
    if (uniKhazadToggle) uniKhazadToggle.onmousedown = handleUnicodeKhazadToggle;


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

      const headingCurrent = getHeading();
      if (headingToggle) headingToggle.className = headingCurrent ? `h${headingCurrent}` : '';
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
      /** @type {number | undefined} */
      let headingLevel;
      editorView.state.doc.nodesBetween(
        editorView.state.selection.from,
        editorView.state.selection.to,
        (node, pos) => {
          if (node.type.name === 'heading') {
            if (typeof headingLevel === 'undefined' || headingLevel < node.attrs.level) {
              headingLevel = node.attrs.level;
            }
          }
        });
      
      return headingLevel;
    }

    function selectionWithinCodeBlock() {
      const { from, to } = editorView.state.selection;
      /** @type {{ node: import('@milkdown/prose/model').Node, pos: number } | undefined} */
      let withinCodeBlock;
      editorView.state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'code_block') {
          withinCodeBlock = { node, pos };
        }
      });
      return withinCodeBlock;
    }

    /** @param {MouseEvent} e */
    function handleBoldItalicClick(e) {
      e.preventDefault();
      e.stopPropagation();

      if (selectionWithinCodeBlock()) return;

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

      if (selectionWithinCodeBlock()) return;

      const headingLevel = getHeading();
      const now = Date.now();

      let newLevel = headingLevel ? 0 : 1;
      if (latestPress?.action === 'heading' && now - latestPress.time < FORMATTING_BUTTONS_PRESS_SERIES_TIMEOUT) {
        newLevel = headingLevel === 6 ? 0 : (headingLevel || 0) + 1;
      }

      /** @type {number | undefined} */
      let nodeToChangePos;
      editorView.state.doc.nodesBetween(
        editorView.state.selection.from,
        editorView.state.selection.to,
        (node, pos) => {
          if (node.type.name === 'heading' || node.type.name === 'paragraph') {
            if (!nodeToChangePos)
              nodeToChangePos = pos;
          }
        });
      
      if (typeof nodeToChangePos !== 'number') return;

      if (newLevel) {
        editorView.dispatch(
          editorView.state.tr.setNodeMarkup(
            nodeToChangePos,
            editorView.state.schema.nodes.heading, { level: newLevel })
        );
      } else {
        if (headingLevel) {
          editorView.dispatch(
            editorView.state.tr.setNodeMarkup(
              nodeToChangePos,
              editorView.state.schema.nodes.paragraph)
          );
        }
      }

      latestPress = { action: 'heading', time: now, level: newLevel };

    }

    /** @param {MouseEvent} e */
    function handleCodeInsert(e) {
      e.preventDefault();
      e.stopPropagation();

      const codeBlockNode = selectionWithinCodeBlock();
      if (codeBlockNode) {
        const regions = getCodeBlockRegionsOfEditorState(editorView.state);
        const selectedRegion = regions?.codeBlocks.find(block => codeBlockNode.pos >= block.block.pos && codeBlockNode.pos < block.block.pos + block.block.node.nodeSize);
        if (!selectedRegion) return;

        let tr = editorView.state.tr;
        tr = tr.delete(selectedRegion.block.pos, selectedRegion.block.node.nodeSize);
        if (selectedRegion.code) {
          tr = tr.insert(
            selectedRegion.block.pos,
            editorView.state.schema.node(
              'paragraph',
              null,
              editorView.state.schema.text(selectedRegion.code)));
        }

        editorView.dispatch(tr);
      } else {
        let tr = editorView.state.tr;
        tr = tr.insert(
          editorView.state.selection.anchor,
          editorView.state.schema.node(
            'code_block',
            null,
            [
              editorView.state.schema.node('code_block_backtick_language'),
              editorView.state.schema.node('code_block_script'),
              editorView.state.schema.node('code_block_execution_state'),
            ]));
        editorView.dispatch(tr);
      }
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

      if (unicodeSubsection?.classList.contains('slide')) unicodeSubsection.classList.remove('slide');
      else unicodeSubsection?.classList.add('slide');
    }

    /**
     * @param {MouseEvent} e
     * @param {string[]} cycle
     */
    function handleUnicodeCycle(e, cycle) {
      e.preventDefault();
      e.stopPropagation();

      const selMod = getSelectionModifiersForDocument(editorView.state, {
        from: editorView.state.selection.anchor,
        to: editorView.state.selection.head,
        expandToText: true
      });

      const now = Date.now();
      const action = cycle.join(':');

      let applyModifier;
      let exclusive = false;
      if (latestPress?.action === action && now - latestPress.time < FORMATTING_BUTTONS_PRESS_SERIES_TIMEOUT) {
        // iterate cycle[0] -> cycle[1] -> ... -> none
        applyModifier = cycle[cycle.indexOf(latestPress.modifier) + 1] || '';
        exclusive = true;
      } else {
        if (selMod.modifiers.some(m => cycle.indexOf(m) >= 0)) {
          applyModifier = undefined;
        } else {
          applyModifier = cycle[0];
        }
      }

      const apply = applyUnicodeModifiers(
        editorView.state,
        () => {
          const result =
            applyModifier === 'bolditalic' ? {
              add: ['bold', 'italic'],
              remove: []
            } :
              {
                add: applyModifier ? [applyModifier] : [],
                remove:
                  !applyModifier ? cycle :
                    exclusive ? cycle.filter(mod => mod !== applyModifier) :
                      []
              };
          
          editorView.focus();
          editorView.updateRoot();
          editorView.focus();

          console.log('apply modifier button ', result, applyModifier + ' of ' + cycle.join('/'));
          return result;
        },
        {
          from: editorView.state.selection.anchor,
          to: editorView.state.selection.head,
          expandToText: true
        });

      if (apply) editorView.dispatch(apply);

      latestPress = { action, time: now, modifier: applyModifier };
      unicodeSubsection.classList.remove('slide');
    }

    /**
     * @param {MouseEvent} e
     * @param {string} modifier
     */
    function handleUnicodeToggle(e, modifier) {
      const apply = applyUnicodeModifiers(editorView.state, modifier, {
        from: editorView.state.selection.anchor,
        to: editorView.state.selection.head,
        expandToText: true
      });

      if (apply) editorView.dispatch(apply);

      // const selMod = getSelectionModifiersForDocument(editorView.state, {
      //   from: editorView.state.selection.anchor,
      //   to: editorView.state.selection.head,
      //   expandToText: true
      // });

      const now = Date.now();

      // if (selMod.modifiers.some(m => m === modifier)) {
      //   // clear modifier
      // } else {
      //   // set modifier
      // }

      latestPress = { action: modifier, time: now };
      unicodeSubsection.classList.remove('slide');
    }

    /** @param {MouseEvent} e */
    function handleUnicodeBoldItalicClick(e) {
      handleUnicodeCycle(e, ['bold', 'italic', 'bolditalic']);
    }

    /** @param {MouseEvent} e */
    function handleUnicodeUnderlineToggle(e) {
      handleUnicodeToggle(e, 'underline');
    }

    /** @param {MouseEvent} e */
    function handleUnicodeJoyToggle(e) {
      handleUnicodeToggle(e, 'joy');
    }

    /** @param {MouseEvent} e */
    function handleUnicodeWtfToggle(e) {
      handleUnicodeCycle(e, ['wide', 'typewriter', 'fractur']);
    }

    /** @param {MouseEvent} e */
    function handleUnicodeCursiveSuperToggle(e) {
      handleUnicodeCycle(e, ['cursive', 'super']);
    }

    /** @param {MouseEvent} e */
    function handleUnicodeRpxToggle(e) {
      handleUnicodeCycle(e, ['round', 'plate', 'box']);
    }

    /** @param {MouseEvent} e */
    function handleUnicodeKhazadToggle(e) {
      handleUnicodeToggle(e, 'khazad');
    }


  }
});