// @ts-check

import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';

import { cmSetup } from './cm-setup';
import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';
import { applyModifier } from '../unicode-styles/apply-modifier';
import { makeEncodedURL } from '../url-encoded/make-encoded-url';

/**
 * @typedef {{
 *  state: EditorLogicalState;
 *  onChange(
 *    handler: 
 *      (args: {
 *        previous: EditorLogicalState,
 *        provisional: EditorLogicalState,
 *        changes: (string | EditorStateChange)[]
 *      }) => EditorLogicalState | undefined): void;
 * }} EditorController
 */

/**
 * @typedef {{
 *  oldOffset: number;
 *  oldText: string;
 *  newOffset: number;
 *  newText: string;
 * }} EditorStateChange
 */

/** 
 * @typedef {{
 *  text: string;
 *  selection: { start: number, end: number, cursor: number };
 * }} EditorLogicalState
 */

/**
 * @param {{
 *  initial?: Partial<EditorLogicalState>,
 *  host: HTMLElement
 * }} _
 */
export function cmView({ initial, host }) {

  let state = {
    text: initial?.text || '',
    selection: {
      start: typeof initial?.selection?.start === 'number' && initial?.selection?.start >= 0 ?
        initial.selection.start :
        0,
      end: typeof initial?.selection?.end === 'number' && initial?.selection?.end >= 0 ?
        initial.selection.end :
        0,
      cursor: typeof initial?.selection?.cursor === 'number' && initial?.selection?.cursor >= 0 ?
        initial.selection.cursor :
        0
    }
  };

  /**
   * @type {Set<Parameters<EditorController['onChange']>[0]>}
   */
  const onChangeHandlerSet = new Set();

  const cmEditorView = new EditorView({
    doc: state.text,
    extensions: [
      ...cmSetup(),
      EditorState.transactionFilter.of(handleTransactionFilter),
      EditorView.updateListener.of(handleUpdateListener)
    ],
    parent: host
  });

  /**
   * @param {import("@codemirror/view").ViewUpdate} v
   */
  function handleUpdateListener(v) {
  }

  
  /**
   * @param {import("@codemirror/state").Transaction} tr
   */
  function handleTransactionFilter(tr) {
    // TODO: selection change?
    if (!tr.docChanged) return tr;

    const textOld = tr.startState.doc.toString();
    const textNew = tr.newDoc.toString();
    /** @type {(string | EditorStateChange)[]} */
    const changes = [];
    let pos = 0;
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      if (fromA > pos)
        changes.push(textOld.slice(pos, fromA));

      changes.push({
        oldOffset: fromA, newOffset: fromB,
        oldText: textOld.slice(fromA, toA),
        newText: textNew.slice(fromB, toB)
      });

      pos = toA;
    });
    if (pos < textOld.length)
      changes.push(textOld.slice(pos));

    const changeHandlerArgs = {
      previous: {
        text: textOld,
        selection: {
          start: tr.startState.selection.main.from,
          end: tr.startState.selection.main.to,
          cursor: tr.startState.selection.main.head
        }
      },
      provisional: {
        text: textNew,
        selection: {
          start: tr.newSelection.main.from,
          end: tr.newSelection.main.to,
          cursor: tr.newSelection.main.head
        }
      },
      changes
    };

    for (const onChangeHandler of onChangeHandlerSet) {
      const updatedState = onChangeHandler(changeHandlerArgs);
      if (updatedState) changeHandlerArgs.provisional = updatedState;
    }
    
    if (changeHandlerArgs.provisional.text !== textNew ||
      changeHandlerArgs.provisional.selection.start !== tr.newSelection.main.from ||
      changeHandlerArgs.provisional.selection.end !== tr.newSelection.main.to ||
      changeHandlerArgs.provisional.selection.cursor !== tr.newSelection.main.head) {
      
      return [
        tr,
        {
          changes: {
            from: changesOnly[0].posNew,
            to: changesOnly[0].posNew + changesOnly[0].textNew.length,
            insert: applyModifier(newModifiers.text, oldModifiers.parsed.fullModifiers)
          },
          sequential: true
        }
      ];

    }

    console.log('edits ', textParts);

    return [
      tr
    ];
  };

  function updateLocation() {
    clearTimeout(updateLocationTimeoutSlide);
    updateLocationTimeoutSlide = 0;
    clearTimeout(updateLocationTimeoutMax);
    updateLocationTimeoutMax = 0;

    const text = cmEditorView.state.doc.toString();
    // TODO: figure out if the verb/address need to be handled
    const url = makeEncodedURL(verbEditMode, '', text);

    switch (urlData.source) {
      case 'path':

        history.replaceState(
          null,
          'unused-string',
          location.protocol + '//' + location.host + '/' + url);
        break;

      case 'hash':
      default: // update hash
        location.hash = '#' + url
        break;
    }
  }
}
