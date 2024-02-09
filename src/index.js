// @ts-check

import { basicSetup, minimalSetup, EditorView } from 'codemirror';
import { build } from './build';
import { cmSetup } from './cm-setup';
import { addButtonHandlers } from './format-actions/add-button-handlers';
import { updateModifierButtonsForSelection } from './format-actions/update-modifier-buttons-to-selection';
import { parsePathPayload } from './url-encoded/parse-path-payload';
import { parseLocation } from './url-encoded/parse-location';
import { makeEncodedURL } from './url-encoded/make-encoded-url';

const UPDATE_LOCATION_TIMEOUT_SLIDING = 400;
const UPDATE_LOCATION_TIMEOUT_MAX = 1500;

if (typeof process !== 'undefined' && process && process.argv) build();
else initCodeMirror();

/** @type {EditorView} */
export var cmView;

function initCodeMirror() {
  const urlData = parseLocation();
  const payload = parsePathPayload(urlData.payload);
  let verb = payload.impliedVerb ? '' : payload.verb;

  const existingTextarea = /** @type {HTMLTextAreaElement} */(document.querySelector('#content textarea'));

  let updateLocationTimeoutSlide;
  let updateLocationTimeoutMax;

  const text = existingTextarea.value ||
    [
      //payload.impliedVerb ? '' : payload.verb,
      payload.addr,
      payload.body
    ].filter(Boolean).join('\n');

  const parent = /** @type {HTMLTextAreaElement} */(existingTextarea.parentElement);
  existingTextarea.remove();

  cmView = new EditorView({
    doc: text,
    extensions: [
      ...cmSetup(),
      EditorView.updateListener.of((v) => {
        updateModifierButtonsForSelection();
        clearTimeout(updateLocationTimeoutSlide);
        updateLocationTimeoutSlide = setTimeout(updateLocation, UPDATE_LOCATION_TIMEOUT_SLIDING);
        if (!updateLocationTimeoutMax)
          updateLocationTimeoutMax = setTimeout(updateLocation, UPDATE_LOCATION_TIMEOUT_MAX);
      })
    ],
    parent
  });

  // TODO: updateFontSizeToContent(view.dom, text);

  cmView.focus();
  setTimeout(() => {
    cmView.update([]);

    addButtonHandlers();
    updateModifierButtonsForSelection();
  });

  function updateLocation() {
    clearTimeout(updateLocationTimeoutSlide);
    updateLocationTimeoutSlide = 0;
    clearTimeout(updateLocationTimeoutMax);
    updateLocationTimeoutMax = 0;

    const text = cmView.state.doc.toString();
    const url = makeEncodedURL(verb, '', text);

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