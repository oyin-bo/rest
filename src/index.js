// @ts-check

import { basicSetup, minimalSetup, EditorView } from 'codemirror';
import { build } from './build';
import { cmSetup } from './cm-setup';
import { addButtonHandlers } from './format-actions/add-button-handlers';

if (typeof process !== 'undefined' && process && process.argv) build();
else initCodeMirror();

/** @type {EditorView} */
export var cmView;

function initCodeMirror() {
  const existingTextarea = /** @type {HTMLTextAreaElement} */(document.querySelector('#content textarea'));
  const text = existingTextarea.value ||
    `TTY.wtf`;
  const parent = /** @type {HTMLTextAreaElement} */(existingTextarea.parentElement);
  existingTextarea.remove();

  cmView = new EditorView({
    doc: text,
    extensions: cmSetup(),
    parent
  });

  // TODO: updateFontSizeToContent(view.dom, text);

  cmView.focus();
  setTimeout(() => {
    cmView.update([]);

    addButtonHandlers();
  });
}