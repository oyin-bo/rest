// @ts-check

import { parseLocation } from '../url-encoded/parse-location';
import { parsePathPayload } from '../url-encoded/parse-path-payload';
import { cmEditorView } from './cm-view';
import { updateModifierButtonsForSelection } from '../format-actions/update-modifier-buttons-to-selection';
import { addButtonHandlers, applyModifierCommand } from '../format-actions/add-button-handlers';
import { makeEncodedURL } from '../url-encoded/make-encoded-url';
import { applyModifier } from '../unicode-styles/apply-modifier';
import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';
import { runParseRanges } from '../unicode-styles/run-parse-ranges';
import { updateFontSizeToContent } from '../font-size';
import { getHostSlots } from '../mode-switcher/show-mode-switcher';

const UPDATE_LOCATION_TIMEOUT_SLIDING = 400;
const UPDATE_LOCATION_TIMEOUT_MAX = 1500;

/**
 * @typedef {import('codemirror').EditorView & {
 *  residualModifiers?: { modifiers: string[], from: number, to: number }
 * }} EditorViewExtended
 */


/**
 * @param {HTMLElement} host
 * @param {string} text
 */
export function initCodeMirror(host, text) {
  // const urlData = parseLocation();
  //const payload = parsePathPayload(urlData.payload);
  // let verbEditMode = payload.impliedVerb ? '' : payload.verb;

  // const { text_textarea: textarea } = getHostSlots();

  // const existingTextarea = /** @type {HTMLTextAreaElement} */(textarea);

  let updateLocationTimeoutSlide;
  let updateLocationTimeoutMax;

  // TODO: process already-typed text
  // let text = existingTextarea.value;
  // if (!text) {
  //   text = payload.body || '';
  //   if (payload.addr || (!payload.impliedVerb && payload.verb)) {
  //     const headerLine =
  //       (!payload.verb || payload.impliedVerb ? '' : payload.verb + ' ') +
  //       (payload.addr || '');
  //     text = headerLine + (text ? '\n' + text : '');
  //   }
  // }

  // // const parent = /** @type {HTMLTextAreaElement} */(existingTextarea.parentElement);
  // existingTextarea.remove();

  /** @type {EditorViewExtended} */
  const cmView = cmEditorView({
    initial: { text },
    host: host,
    keymap: [
      {
        key: 'ctrl-b',
        run: () => {
          applyModifierCommand(cmView, 'bold');
          return true;
        }
      },
      {
        key: 'mod-b',
        run: () => {
          applyModifierCommand(cmView, 'bold');
          return true;
        }
      },
      {
        key: 'ctrl-i',
        run: () => {
          applyModifierCommand(cmView, 'italic');
          return true;
        }
      },
      {
        key: 'mod-i',
        run: () => {
          applyModifierCommand(cmView, 'italic');
          return true;
        }
      }
    ],
    transactionFilter: applyFormattingToUserEdits,
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

  if (updateFontSizeToContent(host, cmView.state.doc.toString())) {
    cmView.requestMeasure();
  }

  setTimeout(() => {
    if (updateFontSizeToContent(host, cmView.state.doc.toString())) {
      cmView.requestMeasure();
    }
  }, 10);

  return cmView;

  /**
   * @param {import('@codemirror/state').Transaction} tr 
   * @returns 
   */
  function applyFormattingToUserEdits(tr) {
    if (!tr.docChanged) return tr;
    if (!tr.isUserEvent('input')) return tr;

    const textOld = tr.startState.doc.toString();
    const textNew = tr.newDoc.toString();

    /** @type {( string | { fromOld: number, fromNew: number, textOld: string, textNew: string } )[]} */
    const textParts = [];
    let pos = 0;
    tr.changes.iterChanges((fromOld, toOld, fromNew, toNew, inserted) => {
      if (fromOld > pos)
        textParts.push(textOld.slice(pos, fromOld));

      textParts.push({
        fromOld: fromOld, fromNew: fromNew,
        textOld: textOld.slice(fromOld, toOld),
        textNew: textNew.slice(fromNew, toNew)
      });

      pos = toOld;
    });
    if (pos < textOld.length)
      textParts.push(textOld.slice(pos));

    const changesOnly = /** @type {{ fromOld: number, fromNew: number, textOld: string, textNew: string }[]} */ (textParts.filter(p => typeof p !== 'string'));
    if (changesOnly.length === 1) {
      // is this typing inside formatted area?
      const oldFullModifiers =
        cmView.residualModifiers?.from === changesOnly[0].fromOld &&
          cmView.residualModifiers?.to == changesOnly[0].fromOld + changesOnly[0].textOld.length ?
          cmView.residualModifiers.modifiers.join('') :
          getModifiersTextSection(
            textOld,
            changesOnly[0].fromOld,
            changesOnly[0].fromOld + changesOnly[0].textOld.length
          )?.parsed?.fullModifiers;

      const newModifiers = getModifiersTextSection(textNew, changesOnly[0].fromNew, changesOnly[0].fromNew + changesOnly[0].textNew.length);

      if (newModifiers?.text && !newModifiers?.parsed?.fullModifiers && oldFullModifiers) {
        console.log(
          'typing inside formatted area, should auto-format  ',
          newModifiers.text,
          ' to ',
          applyModifier(newModifiers.text, oldFullModifiers)
        );

        cmView.residualModifiers = undefined;

        return [
          tr,
          {
            changes: {
              from: changesOnly[0].fromNew,
              to: changesOnly[0].fromNew + changesOnly[0].textNew.length,
              insert: applyModifier(newModifiers.text, oldFullModifiers)
            },
            sequential: true
          }
        ];
      }
    }

    console.log('edits ', textParts);

    cmView.residualModifiers = undefined;

    return [
      tr
    ];
  }

  function updateLocation() {
    updateModifierButtonsForSelection(cmView);
    if (updateFontSizeToContent(host, cmView.state.doc.toString())) {
      cmView.requestMeasure();
    }

    clearTimeout(updateLocationTimeoutSlide);
    updateLocationTimeoutSlide = 0;
    clearTimeout(updateLocationTimeoutMax);
    updateLocationTimeoutMax = 0;

    const text = cmView.state.doc.toString();
    updateLocationTo(text, verbEditMode);    
  }
}

/**
 * @param {string} text
 * @param {string} verb
 */
export function updateLocationTo(text, verb) {
  // TODO: figure out if the verb/address need to be handled
  const url = makeEncodedURL(verb, '', text);
  const urlData = parseLocation();

  const title = text.split('\n').map(str => str.trim()).filter(Boolean)[0];
  if (title) {
    const parsedTitle = runParseRanges(title);
    const normalizedTitle =
      (parsedTitle ? parsedTitle.map(entry => typeof entry === 'string' ? entry : entry.plain).join('') : title);

    document.title = '…' + normalizedTitle.replace(/^[\.…]+/, '') + ' 🍹';
  } else {
    document.title = '…type to yourself 🍹'
  }

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