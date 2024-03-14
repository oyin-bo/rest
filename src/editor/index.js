// @ts-check

import { parseLocation } from '../url-encoded/parse-location';
import { parsePathPayload } from '../url-encoded/parse-path-payload';
import { cmEditorView } from './cm-view';
import { updateModifierButtonsForSelection } from '../format-actions/update-modifier-buttons-to-selection';
import { addButtonHandlers } from '../format-actions/add-button-handlers';
import { makeEncodedURL } from '../url-encoded/make-encoded-url';
import { applyModifier } from '../unicode-styles/apply-modifier';
import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';
import { Annotation, AnnotationType } from '@codemirror/state';

const UPDATE_LOCATION_TIMEOUT_SLIDING = 400;
const UPDATE_LOCATION_TIMEOUT_MAX = 1500;


export function initCodeMirror() {
  const urlData = parseLocation();
  const payload = parsePathPayload(urlData.payload);
  let verbEditMode = payload.impliedVerb ? '' : payload.verb;

  const existingTextarea = /** @type {HTMLTextAreaElement} */(document.querySelector('#content textarea'));

  let updateLocationTimeoutSlide;
  let updateLocationTimeoutMax;

  let text = existingTextarea.value;
  if (!text) {
    text = payload.body || '';
    if (payload.addr || (!payload.impliedVerb && payload.verb)) {
      const headerLine =
        (!payload.verb || payload.impliedVerb ? '' : payload.verb + ' ') +
        (payload.addr || '');
      text = headerLine + (text ? '\n' + text : '');
    }
  }

  const parent = /** @type {HTMLTextAreaElement} */(existingTextarea.parentElement);
  existingTextarea.remove();

  const cmView = cmEditorView({
    initial: { text },
    host: parent,
    transactionFilter: tr => {
      if (!tr.docChanged) return tr;
      if (!tr.isUserEvent('input')) return tr;

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
    },
    updateListener: tr => {
      updateModifierButtonsForSelection(cmView);
      clearTimeout(updateLocationTimeoutSlide);
      updateLocationTimeoutSlide = setTimeout(updateLocation, UPDATE_LOCATION_TIMEOUT_SLIDING);
      if (!updateLocationTimeoutMax)
        updateLocationTimeoutMax = setTimeout(updateLocation, UPDATE_LOCATION_TIMEOUT_MAX);
    }
  });


  // TODO: updateFontSizeToContent(view.dom, text);

  cmView.focus();
  setTimeout(() => {
    cmView.update([]);

    addButtonHandlers(cmView);
    updateModifierButtonsForSelection(cmView);
  });

  return cmView;

  function updateLocation() {
    updateModifierButtonsForSelection(cmView);

    clearTimeout(updateLocationTimeoutSlide);
    updateLocationTimeoutSlide = 0;
    clearTimeout(updateLocationTimeoutMax);
    updateLocationTimeoutMax = 0;

    const text = cmView.state.doc.toString();
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