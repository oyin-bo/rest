// @ts-check

import { initCodeMirror } from './editor';
import { version } from '../package.json';
import { showModeSwitcher } from './mode-switcher';
import { parseLocation } from './url-encoded/parse-location';
import { parsePathPayload } from './url-encoded/parse-path-payload';

/** @type {import('codemirror').EditorView & { residualModifiers?: string } } */
export var cmView;

if (typeof window !== 'undefined' && typeof window?.alert === 'function') {
  const versionDIV = document.getElementById('version');
  if (versionDIV) versionDIV.textContent = 'v' + version;

  const urlData = parseLocation();
  const payload = parsePathPayload(urlData.payload);
  let verbEditMode = payload.impliedVerb ? '' : payload.verb;

  // TODO: toggle the mode

  const editorView = window['editorView'] = initCodeMirror();

  const moreModes = document.getElementById('moreModes');
  if (moreModes) {
    moreModes.addEventListener('click', () => {
      showModeSwitcher(editorView);
    });
  }
}
