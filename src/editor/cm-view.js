// @ts-check

import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';

import { cmSetup } from './cm-setup';
import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';
import { applyModifier } from '../unicode-styles/apply-modifier';
import { makeEncodedURL } from '../url-encoded/make-encoded-url';

const UPDATE_LOCATION_TIMEOUT_SLIDING = 400;
const UPDATE_LOCATION_TIMEOUT_MAX = 1500;

/**
 * @typedef {{
 *  state: EditorLogicalState;
 *  onChange(handler: (provisional:EditorLogicalState) => EditorLogicalState | undefined): void;
 * }} EditorController
 */

/** 
 * @typedef {{
 *  text: string;
 *  selection: { start: number, end: number, cursor: number };
 *  currentModifiers: { modifiers: string[], fullModifiers: string };
 * }} EditorLogicalState
 */

/**
 * @param {{
 *  initialText: string,
 *  host: HTMLElement
 * }} _
 */
export function cmView({ initialText, host }) {

  let updateLocationTimeoutSlide;
  let updateLocationTimeoutMax;

  const cmEditorView = new EditorView({
    doc: initialText,
    extensions: [
      ...cmSetup(),
      EditorState.transactionFilter.of(tr => {
        if (!tr.docChanged) return tr;
        const textOld = tr.startState.doc.toString();
        const textNew = tr.newDoc.toString();
        const textParts = [];
        let pos = 0;
        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          if (fromA > pos)
            textParts.push(textOld.slice(pos, fromA));

          textParts.push({
            posOld: fromA, posNew: fromB,
            textOld: textOld.slice(fromA, toA),
            textNew: textNew.slice(fromB, toB)
          });

          pos = toA;
        });
        if (pos < textOld.length)
          textParts.push(textOld.slice(pos));

        const changesOnly = /** @type {{ posOld: number, posNew: number, textOld: string, textNew: string }[]} */(textParts.filter(p => typeof p !== 'string'));
        if (changesOnly.length === 1) {
          // is this typing inside formatted area?
          const oldModifiers = getModifiersTextSection(textOld, changesOnly[0].posOld, changesOnly[0].posOld + changesOnly[0].textOld.length);
          const newModifiers = getModifiersTextSection(textNew, changesOnly[0].posNew, changesOnly[0].posNew + changesOnly[0].textNew.length);

          if (newModifiers?.text && !newModifiers?.parsed?.fullModifiers && oldModifiers?.parsed?.fullModifiers) {
            console.log(
              'typing inside formatted area, should auto-format  ',
              newModifiers.text,
              ' to ',
              applyModifier(newModifiers.text, oldModifiers.parsed.fullModifiers)
            );

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
            ]
          }
        }

        console.log('edits ', textParts);

        return [
          tr
        ];
      }),

      EditorView.updateListener.of((v) => {
        updateModifierButtonsForSelection();
        clearTimeout(updateLocationTimeoutSlide);
        updateLocationTimeoutSlide = setTimeout(updateLocation, UPDATE_LOCATION_TIMEOUT_SLIDING);
        if (!updateLocationTimeoutMax)
          updateLocationTimeoutMax = setTimeout(updateLocation, UPDATE_LOCATION_TIMEOUT_MAX);
      })
    ],
    parent: host
  });

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
